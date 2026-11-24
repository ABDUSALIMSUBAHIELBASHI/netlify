const http = require("node:http");
const next = require("next");
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const emojiRegex = require("emoji-regex");
const { Server: SocketServer } = require("socket.io");
require("@next/env").loadEnvConfig(__dirname, process.env.NODE_ENV !== "production");

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT) || 4000;
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/HPELAF1282025";
const jwtSecret = process.env.CHAT_JWT_SECRET || (dev ? "local-development-only-change-this-secret" : "");
const cookieName = "pharmacy_chat";
const cookieMaxAge = 7 * 24 * 60 * 60 * 1000;
const maxImageBytes = 6 * 1024 * 1024;
const maxMediaBytes = 12 * 1024 * 1024;
const maxBackupBatchBytes = 14 * 1024 * 1024;
const supportedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const supportedVideoTypes = ["video/mp4", "video/webm"];
const supportedAudioTypes = ["audio/mp4", "audio/webm", "audio/ogg", "audio/mpeg", "audio/wav"];
const supportedMediaTypes = [...supportedImageTypes, ...supportedVideoTypes, ...supportedAudioTypes];
const emojiPattern = emojiRegex();
const objectIdPattern = /^[a-f\d]{24}$/i;
const callIdPattern = /^[a-zA-Z0-9_-]{16,64}$/;
const maxSessionDescriptionLength = 64 * 1024;
const maxIceCandidateLength = 8 * 1024;

function loadCallIceServers() {
  const raw = process.env.CHAT_ICE_SERVERS;
  if (!raw) return [{ urls: "stun:stun.l.google.com:19302" }];

  let servers;
  try {
    servers = JSON.parse(raw);
  } catch {
    throw new Error("CHAT_ICE_SERVERS must be a JSON array of ICE server objects.");
  }
  const validServer = (server) => {
    if (!server || typeof server !== "object" || Array.isArray(server)) return false;
    const urlsValid = typeof server.urls === "string" && server.urls.length > 0
      || Array.isArray(server.urls) && server.urls.length > 0 && server.urls.every((url) => typeof url === "string" && url.length > 0);
    return urlsValid
      && (server.username === undefined || typeof server.username === "string")
      && (server.credential === undefined || typeof server.credential === "string");
  };
  if (!Array.isArray(servers) || !servers.length || servers.length > 8 || !servers.every(validServer)) {
    throw new Error("CHAT_ICE_SERVERS must contain between 1 and 8 valid ICE server objects.");
  }
  return servers;
}

const callIceServers = loadCallIceServers();

if (!jwtSecret) {
  throw new Error("CHAT_JWT_SECRET must be set when NODE_ENV=production.");
}

mongoose.set("strictQuery", true);

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  displayName: { type: String, required: true, trim: true, maxlength: 80 },
  passwordHash: { type: String, required: true },
  avatar: {
    data: { type: Buffer },
    contentType: { type: String, enum: supportedImageTypes },
  },
  privacy: {
    presenceVisibility: { type: String, enum: ["everyone", "contacts", "nobody"], default: "everyone" },
    allowMessageRequests: { type: Boolean, default: true },
  },
}, { timestamps: true });

const conversationSchema = new mongoose.Schema({
  kind: { type: String, enum: ["direct", "group", "community"], required: true },
  title: { type: String, trim: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 500, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "ChatUser", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "ChatUser", required: true }],
  directKey: { type: String, unique: true, sparse: true },
  archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "ChatUser" }],
  pendingFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "ChatUser" }],
  spamBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "ChatUser" }],
  lastReadAt: { type: Map, of: Date, default: {} },
}, { timestamps: true });

const imageSchema = new mongoose.Schema({
  data: { type: Buffer },
  contentType: { type: String, enum: supportedImageTypes },
  size: { type: Number, min: 0 },
}, { _id: false });

const mediaSchema = new mongoose.Schema({
  data: { type: Buffer },
  contentType: { type: String, enum: [...supportedVideoTypes, ...supportedAudioTypes] },
  fileName: { type: String, maxlength: 160 },
  size: { type: Number, min: 0 },
}, { _id: false });

const reactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatUser", required: true },
  emoji: { type: String, required: true, maxlength: 32 },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatConversation", required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatUser", required: true },
  body: { type: String, default: "", maxlength: 4000 },
  image: imageSchema,
  media: mediaSchema,
  editedAt: { type: Date },
  deletedAt: { type: Date },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "ChatUser" }],
  reactions: { type: [reactionSchema], default: [] },
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "ChatUser" }],
}, { timestamps: true });

messageSchema.index({ savedBy: 1, createdAt: -1 });

const backupSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatUser", required: true, index: true },
  conversationCount: { type: Number, required: true, default: 0 },
  messageCount: { type: Number, required: true, default: 0 },
}, { timestamps: true });

const backupMessageSchema = new mongoose.Schema({
  backupId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatBackup", required: true, index: true },
  sourceMessageId: { type: mongoose.Schema.Types.ObjectId, required: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatConversation", required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatUser", required: true },
  body: { type: String, default: "", maxlength: 4000 },
  image: imageSchema,
  media: mediaSchema,
  editedAt: { type: Date },
  deletedAt: { type: Date },
  reactions: { type: [reactionSchema], default: [] },
  createdAt: { type: Date, required: true },
}, { timestamps: false });

const reactionEventSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatConversation", required: true },
  messageId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatUser", required: true },
  action: { type: String, enum: ["added", "changed", "removed"], required: true },
  emoji: { type: String, required: true, maxlength: 32 },
  previousEmoji: { type: String, maxlength: 32 },
  createdAt: { type: Date, default: Date.now, required: true },
}, { timestamps: false });

reactionEventSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });

const User = mongoose.models.ChatUser || mongoose.model("ChatUser", userSchema);
const Conversation = mongoose.models.ChatConversation || mongoose.model("ChatConversation", conversationSchema);
const Message = mongoose.models.ChatMessage || mongoose.model("ChatMessage", messageSchema);
const ChatBackup = mongoose.models.ChatBackup || mongoose.model("ChatBackup", backupSchema);
const ChatBackupMessage = mongoose.models.ChatBackupMessage || mongoose.model("ChatBackupMessage", backupMessageSchema);
const ReactionEvent = mongoose.models.ChatReactionEvent || mongoose.model("ChatReactionEvent", reactionEventSchema);

const nextApp = next({ dev, dir: __dirname });
const nextHandler = nextApp.getRequestHandler();
const web = express();
const httpServer = http.createServer(web);
const io = new SocketServer(httpServer);
const activeSockets = new Map();
const callSessions = new Map();
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxImageBytes, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!supportedImageTypes.includes(file.mimetype)) {
      callback(new Error("Choose a JPG, PNG, WebP, or GIF image."));
      return;
    }
    callback(null, true);
  },
});
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxMediaBytes, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!supportedMediaTypes.includes(file.mimetype)) {
      callback(new Error("Choose a supported image, video, or audio file."));
      return;
    }
    callback(null, true);
  },
});

web.disable("x-powered-by");
web.use(cookieParser());
web.use(express.json({ limit: "16kb" }));
web.use("/api/chat", (request, response, nextMiddleware) => {
  const origin = request.get("origin");
  if (origin && new URL(origin).host !== request.get("host")) {
    response.status(403).json({ error: "Cross-origin chat requests are not allowed." });
    return;
  }
  nextMiddleware();
});

function publicUser(user) {
  const id = user._id.toString();
  const avatarVersion = user.updatedAt ? new Date(user.updatedAt).getTime() : "";
  return {
    id,
    displayName: user.displayName,
    avatarUrl: user.avatar?.contentType ? `/api/chat/avatars/${id}?v=${avatarVersion}` : "",
  };
}

const publicMessageProjection = "_id conversationId senderId body image.contentType image.size media.contentType media.fileName media.size editedAt deletedAt deletedFor reactions savedBy createdAt";

function makeMessage(message, userId) {
  const sender = message.senderId?.displayName
    ? publicUser(message.senderId)
    : null;
  const senderId = sender?.id || message.senderId.toString();
  const deleted = Boolean(message.deletedAt);
  const reactionCounts = new Map();
  for (const reaction of message.reactions || []) {
    const count = reactionCounts.get(reaction.emoji) || { emoji: reaction.emoji, count: 0, reacted: false };
    count.count += 1;
    count.reacted ||= userId && reaction.userId.toString() === userId.toString();
    reactionCounts.set(reaction.emoji, count);
  }
  return {
    id: message._id.toString(),
    conversationId: message.conversationId?._id?.toString() || message.conversationId.toString(),
    conversationTitle: message.conversationId?.title || "",
    senderId,
    sender,
    body: deleted ? "" : message.body,
    imageUrl: !deleted && message.image?.contentType ? `/api/chat/images/${message._id}` : "",
    mediaUrl: !deleted && message.media?.contentType ? `/api/chat/media/${message._id}` : "",
    mediaType: message.media?.contentType || "",
    mediaName: message.media?.fileName || "",
    imageSize: message.image?.size || 0,
    mediaSize: message.media?.size || 0,
    edited: Boolean(message.editedAt),
    deleted,
    isSaved: !deleted && userId ? idInList(message.savedBy, userId) : false,
    reactions: [...reactionCounts.values()],
    createdAt: message.createdAt,
  };
}

async function loadPublicMessage(messageId, userId) {
  const message = await Message.findById(messageId)
    .select(publicMessageProjection)
    .populate("senderId", "_id displayName")
    .lean();
  return message ? makeMessage(message, userId) : null;
}

function setAuthCookie(response, userId) {
  const token = jwt.sign({ sub: userId.toString() }, jwtSecret, { expiresIn: "7d" });
  response.cookie(cookieName, token, {
    httpOnly: true,
    secure: !dev,
    sameSite: "lax",
    maxAge: cookieMaxAge,
    path: "/",
  });
}

async function requireUser(request, response, nextMiddleware) {
  const token = request.cookies[cookieName];
  if (!token) {
    response.status(401).json({ error: "Sign in to use chat." });
    return;
  }

  try {
    const claims = jwt.verify(token, jwtSecret);
    if (typeof claims === "string" || !objectIdPattern.test(claims.sub || "")) {
      response.status(401).json({ error: "Your session has expired. Please sign in again." });
      return;
    }
    const user = await User.findById(claims.sub).select("_id email displayName avatar.contentType updatedAt").lean();
    if (!user) {
      response.status(401).json({ error: "Your chat account was not found. Please sign in again." });
      return;
    }
    request.chatUser = user;
    nextMiddleware();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      response.status(401).json({ error: "Your session has expired. Please sign in again." });
      return;
    }
    nextMiddleware(error);
  }
}

async function requireMembership(conversationId, userId) {
  if (!objectIdPattern.test(conversationId)) return null;
  return Conversation.findOne({ _id: conversationId, members: userId });
}

function imageTypeIsValid(buffer, type) {
  if (type === "image/jpeg") return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (type === "image/png") return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === "image/gif") return buffer.length > 6 && ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6));
  if (type === "image/webp") return buffer.length > 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  return false;
}

function mediaTypeIsValid(buffer, type) {
  if (supportedImageTypes.includes(type)) return imageTypeIsValid(buffer, type);
  if (type === "video/mp4") return buffer.length > 12 && buffer.toString("ascii", 4, 8) === "ftyp";
  if (type === "video/webm" || type === "audio/webm") {
    return buffer.length > 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  }
  if (type === "audio/ogg") return buffer.length > 4 && buffer.toString("ascii", 0, 4) === "OggS";
  if (type === "audio/mp4") return buffer.length > 12 && buffer.toString("ascii", 4, 8) === "ftyp";
  if (type === "audio/wav") return buffer.length > 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WAVE";
  if (type === "audio/mpeg") return buffer.length > 3 && (buffer.toString("ascii", 0, 3) === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0));
  return false;
}

function isValidReactionEmoji(value) {
  if (typeof value !== "string" || Buffer.byteLength(value) > 32) return false;
  const matches = value.match(emojiPattern);
  return matches?.length === 1 && matches[0] === value;
}

function toNodeBuffer(data) {
  return Buffer.isBuffer(data)
    ? data
    : Buffer.from(data.buffer || data, data.byteOffset || 0, data.byteLength);
}

function getAttachmentBytes(attachment) {
  if (typeof attachment?.size === "number") return attachment.size;
  return attachment?.data ? toNodeBuffer(attachment.data).byteLength : 0;
}

function idInList(list, userId) {
  return (list || []).some((id) => id.toString() === userId.toString());
}

function getLastReadAt(conversation, userId) {
  const saved = conversation.lastReadAt;
  return (saved instanceof Map ? saved.get(userId) : saved?.[userId]) || conversation.createdAt;
}

const api = express.Router();

api.get("/health", (_request, response) => {
  response.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

api.post("/auth/register", async (request, response, nextMiddleware) => {
  try {
    const email = String(request.body.email || "").trim().toLowerCase();
    const displayName = String(request.body.fullName || "").trim();
    const password = String(request.body.password || "");
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      response.status(400).json({ error: "Enter a valid email address." });
      return;
    }
    if (!displayName || displayName.length > 80) {
      response.status(400).json({ error: "Enter a name of 80 characters or fewer." });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      response.status(400).json({ error: "Use a password between 8 and 128 characters." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let user;
    try {
      user = await User.create({ email, displayName, passwordHash });
    } catch (error) {
      if (error.code === 11000) {
        response.status(409).json({ error: "An account with this email already exists." });
        return;
      }
      throw error;
    }
    setAuthCookie(response, user._id);
    response.status(201).json({ user: publicUser(user) });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.post("/auth/login", async (request, response, nextMiddleware) => {
  try {
    const email = String(request.body.email || "").trim().toLowerCase();
    const password = String(request.body.password || "");
    const user = await User.findOne({ email });
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!passwordMatches) {
      response.status(401).json({ error: "Email or password is incorrect." });
      return;
    }
    setAuthCookie(response, user._id);
    response.json({ user: publicUser(user) });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.post("/auth/logout", (_request, response) => {
  response.clearCookie(cookieName, { httpOnly: true, secure: !dev, sameSite: "lax", path: "/" });
  response.sendStatus(204);
});

api.get("/auth/me", requireUser, (request, response) => {
  response.json({ user: publicUser(request.chatUser), email: request.chatUser.email });
});

api.use(requireUser);

api.get("/calls/config", (_request, response) => {
  response.json({ iceServers: callIceServers });
});

api.get("/settings", async (request, response, nextMiddleware) => {
  try {
    const user = await User.findById(request.chatUser._id).select("privacy").lean();
    response.json({
      settings: {
        presenceVisibility: user?.privacy?.presenceVisibility || "everyone",
        allowMessageRequests: user?.privacy?.allowMessageRequests !== false,
      },
    });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.patch("/settings", async (request, response, nextMiddleware) => {
  const updates = {};
  if (Object.prototype.hasOwnProperty.call(request.body, "presenceVisibility")) {
    if (!["everyone", "contacts", "nobody"].includes(request.body.presenceVisibility)) {
      response.status(400).json({ error: "Choose a valid active-status privacy option." });
      return;
    }
    updates["privacy.presenceVisibility"] = request.body.presenceVisibility;
  }
  if (Object.prototype.hasOwnProperty.call(request.body, "allowMessageRequests")) {
    if (typeof request.body.allowMessageRequests !== "boolean") {
      response.status(400).json({ error: "Choose whether to allow message requests." });
      return;
    }
    updates["privacy.allowMessageRequests"] = request.body.allowMessageRequests;
  }
  if (!Object.keys(updates).length) {
    response.status(400).json({ error: "Choose a chat setting to update." });
    return;
  }
  try {
    await User.updateOne({ _id: request.chatUser._id }, { $set: updates }, { runValidators: true });
    await refreshPresenceVisibility(request.chatUser._id.toString()).catch((error) => {
      console.error("Unable to refresh chat presence privacy:", error);
    });
    const user = await User.findById(request.chatUser._id).select("privacy").lean();
    response.json({
      settings: {
        presenceVisibility: user?.privacy?.presenceVisibility || "everyone",
        allowMessageRequests: user?.privacy?.allowMessageRequests !== false,
      },
    });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.put("/profile/avatar", imageUpload.single("avatar"), async (request, response, nextMiddleware) => {
  try {
    if (!request.file) {
      response.status(400).json({ error: "Choose a profile photo to upload." });
      return;
    }
    if (!imageTypeIsValid(request.file.buffer, request.file.mimetype)) {
      response.status(400).json({ error: "The selected file is not a supported image." });
      return;
    }
    const user = await User.findByIdAndUpdate(
      request.chatUser._id,
      { $set: { avatar: { data: request.file.buffer, contentType: request.file.mimetype } } },
      { new: true, runValidators: true },
    ).select("_id displayName avatar.contentType updatedAt");
    response.json({ user: publicUser(user) });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.delete("/profile/avatar", async (request, response, nextMiddleware) => {
  try {
    const user = await User.findByIdAndUpdate(
      request.chatUser._id,
      { $unset: { avatar: 1 } },
      { new: true },
    ).select("_id displayName avatar.contentType updatedAt");
    response.json({ user: publicUser(user) });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.get("/avatars/:userId", async (request, response, nextMiddleware) => {
  try {
    if (!objectIdPattern.test(request.params.userId)) {
      response.sendStatus(404);
      return;
    }
    const user = await User.findById(request.params.userId).select("avatar.data avatar.contentType").lean();
    if (!user?.avatar?.data || !user.avatar.contentType) {
      response.sendStatus(404);
      return;
    }
    response.type(user.avatar.contentType);
    response.set("Cache-Control", "private, max-age=300");
    response.send(toNodeBuffer(user.avatar.data));
  } catch (error) {
    nextMiddleware(error);
  }
});

api.get("/users", async (request, response, nextMiddleware) => {
  try {
    const users = await User.find({ _id: { $ne: request.chatUser._id } })
      .select("_id displayName avatar.contentType updatedAt")
      .sort({ displayName: 1 })
      .limit(500)
      .lean();
    response.json({ users: users.map(publicUser) });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.get("/conversations", async (request, response, nextMiddleware) => {
  try {
    const conversations = await Conversation.find({ members: request.chatUser._id })
      .populate("members", "_id displayName avatar.contentType updatedAt")
      .sort({ updatedAt: -1 })
      .lean();
    const userId = request.chatUser._id.toString();
    const conversationsWithUnread = await Promise.all(conversations.map(async (conversation) => ({
      ...conversation,
      unreadCount: await Message.countDocuments({
        conversationId: conversation._id,
        senderId: { $ne: request.chatUser._id },
        deletedFor: { $ne: request.chatUser._id },
        createdAt: { $gt: getLastReadAt(conversation, userId) },
      }),
    })));
    response.json({
      conversations: conversationsWithUnread.map((conversation) => ({
        id: conversation._id.toString(),
        kind: conversation.kind,
        title: conversation.title || "",
        description: conversation.description || "",
        unreadCount: conversation.unreadCount,
        isArchived: idInList(conversation.archivedBy, userId),
        isSpam: idInList(conversation.spamBy, userId),
        isRequest: idInList(conversation.pendingFor, userId),
        requestSent: conversation.kind === "direct"
          && (conversation.pendingFor || []).length > 0
          && !idInList(conversation.pendingFor, userId),
        requestBlocked: conversation.kind === "direct"
          && (conversation.spamBy || []).some((id) => id.toString() !== userId),
        updatedAt: conversation.updatedAt,
        members: conversation.members.map((member) => publicUser(member)),
      })),
    });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.post("/conversations/direct", async (request, response, nextMiddleware) => {
  try {
    const targetUserId = String(request.body.targetUserId || "");
    if (!objectIdPattern.test(targetUserId) || targetUserId === request.chatUser._id.toString()) {
      response.status(400).json({ error: "Choose another registered person." });
      return;
    }
    const memberIds = [request.chatUser._id.toString(), targetUserId].sort();
    const directKey = memberIds.join(":");
    const existingConversation = await Conversation.findOne({ directKey });
    if (existingConversation) {
      response.json({ conversationId: existingConversation._id.toString() });
      return;
    }
    const targetUser = await User.findById(targetUserId).select("_id privacy.allowMessageRequests");
    if (!targetUser) {
      response.status(404).json({ error: "That chat member was not found." });
      return;
    }
    if (targetUser.privacy?.allowMessageRequests === false) {
      response.status(403).json({ error: "This person is not accepting new message requests." });
      return;
    }
    const conversation = await Conversation.findOneAndUpdate(
      { directKey },
      {
        $setOnInsert: {
          kind: "direct",
          directKey,
          createdBy: request.chatUser._id,
          members: memberIds,
          pendingFor: [targetUserId],
          lastReadAt: { [request.chatUser._id.toString()]: new Date() },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    for (const memberId of memberIds) io.to(`user:${memberId}`).emit("conversation:created");
    response.json({ conversationId: conversation._id.toString() });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.post("/conversations/group", async (request, response, nextMiddleware) => {
  try {
    const title = String(request.body.title || "").trim();
    const kind = request.body.kind === "community" ? "community" : "group";
    const description = String(request.body.description || "").trim();
    const memberIds = Array.isArray(request.body.memberIds)
      ? [...new Set(request.body.memberIds.map(String))]
      : [];
    if (!title || title.length > 80) {
      response.status(400).json({ error: "Enter a group name of 80 characters or fewer." });
      return;
    }
    if (description.length > 500) {
      response.status(400).json({ error: "Community descriptions must be 500 characters or fewer." });
      return;
    }
    if (!memberIds.length || memberIds.some((id) => !objectIdPattern.test(id) || id === request.chatUser._id.toString())) {
      response.status(400).json({ error: "Choose at least one other group member." });
      return;
    }
    const foundMembers = await User.countDocuments({ _id: { $in: memberIds } });
    if (foundMembers !== memberIds.length) {
      response.status(400).json({ error: "One or more selected chat members no longer exist." });
      return;
    }
    const conversation = await Conversation.create({
      kind,
      title,
      description,
      createdBy: request.chatUser._id,
      members: [...memberIds, request.chatUser._id.toString()],
      lastReadAt: Object.fromEntries([...memberIds, request.chatUser._id.toString()].map((id) => [id, new Date()])),
    });
    for (const memberId of conversation.members) io.to(`user:${memberId.toString()}`).emit("conversation:created");
    response.status(201).json({ conversationId: conversation._id.toString() });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.post("/conversations/:conversationId/archive", async (request, response, nextMiddleware) => {
  try {
    const conversation = await requireMembership(request.params.conversationId, request.chatUser._id);
    if (!conversation) {
      response.status(404).json({ error: "Conversation not found." });
      return;
    }
    await Conversation.updateOne(
      { _id: conversation._id },
      { $addToSet: { archivedBy: request.chatUser._id } },
    );
    io.to(`user:${request.chatUser._id.toString()}`).emit("conversation:created");
    response.sendStatus(204);
  } catch (error) {
    nextMiddleware(error);
  }
});

api.post("/conversations/:conversationId/unarchive", async (request, response, nextMiddleware) => {
  try {
    const conversation = await requireMembership(request.params.conversationId, request.chatUser._id);
    if (!conversation) {
      response.status(404).json({ error: "Conversation not found." });
      return;
    }
    await Conversation.updateOne(
      { _id: conversation._id },
      { $pull: { archivedBy: request.chatUser._id, spamBy: request.chatUser._id } },
    );
    io.to(`user:${request.chatUser._id.toString()}`).emit("conversation:created");
    response.sendStatus(204);
  } catch (error) {
    nextMiddleware(error);
  }
});

api.post("/conversations/:conversationId/request/accept", async (request, response, nextMiddleware) => {
  try {
    const conversation = await requireMembership(request.params.conversationId, request.chatUser._id);
    if (!conversation || conversation.kind !== "direct" || !idInList(conversation.pendingFor, request.chatUser._id)) {
      response.status(404).json({ error: "Message request not found." });
      return;
    }
    await Conversation.updateOne(
      { _id: conversation._id },
      { $pull: { pendingFor: request.chatUser._id, spamBy: request.chatUser._id } },
    );
    for (const memberId of conversation.members) io.to(`user:${memberId.toString()}`).emit("conversation:created");
    response.sendStatus(204);
  } catch (error) {
    nextMiddleware(error);
  }
});

api.post("/conversations/:conversationId/request/spam", async (request, response, nextMiddleware) => {
  try {
    const conversation = await requireMembership(request.params.conversationId, request.chatUser._id);
    if (!conversation || conversation.kind !== "direct" || !idInList(conversation.pendingFor, request.chatUser._id)) {
      response.status(404).json({ error: "Message request not found." });
      return;
    }
    await Conversation.updateOne(
      { _id: conversation._id },
      { $pull: { pendingFor: request.chatUser._id }, $addToSet: { spamBy: request.chatUser._id } },
    );
    for (const memberId of conversation.members) io.to(`user:${memberId.toString()}`).emit("conversation:created");
    response.sendStatus(204);
  } catch (error) {
    nextMiddleware(error);
  }
});

api.get("/messages/saved", async (request, response, nextMiddleware) => {
  try {
    const userId = request.chatUser._id;
    const query = { savedBy: userId, deletedAt: { $exists: false }, deletedFor: { $ne: userId } };
    if (request.query.before) {
      if (!objectIdPattern.test(String(request.query.before))) {
        response.status(400).json({ error: "The saved-message cursor is invalid." });
        return;
      }
      const cursor = await Message.findOne({ _id: request.query.before, savedBy: userId }).select("_id createdAt").lean();
      if (!cursor) {
        response.status(400).json({ error: "The saved-message cursor was not found." });
        return;
      }
      query.$or = [
        { createdAt: { $lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, _id: { $lt: cursor._id } },
      ];
    }
    const results = await Message.find(query)
      .select(publicMessageProjection)
      .populate("senderId", "_id displayName")
      .populate("conversationId", "_id title kind members")
      .sort({ createdAt: -1, _id: -1 })
      .limit(51)
      .lean();
    const accessibleResults = results.filter((message) => idInList(message.conversationId?.members, userId));
    const hasMore = results.length > 50;
    const pageMessages = accessibleResults.slice(0, 50);
    const directMemberIds = [...new Set(pageMessages
      .filter((message) => message.conversationId.kind === "direct")
      .map((message) => message.conversationId.members.find((memberId) => memberId.toString() !== userId.toString())?.toString())
      .filter(Boolean))];
    const directMembers = directMemberIds.length
      ? await User.find({ _id: { $in: directMemberIds } }).select("_id displayName").lean()
      : [];
    const directNames = new Map(directMembers.map((member) => [member._id.toString(), member.displayName]));
    response.json({
      messages: pageMessages.map((message) => {
        const conversation = message.conversationId;
        const otherMemberId = conversation.kind === "direct"
          ? conversation.members.find((memberId) => memberId.toString() !== userId.toString())?.toString()
          : "";
        return {
          ...makeMessage(message, userId),
          conversationTitle: conversation.kind === "direct"
            ? directNames.get(otherMemberId) || "Direct chat"
            : conversation.title || "Group chat",
        };
      }),
      hasMore,
      nextCursor: hasMore && pageMessages.length ? pageMessages[pageMessages.length - 1]._id.toString() : "",
    });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.get("/conversations/:conversationId/messages", async (request, response, nextMiddleware) => {
  try {
    const conversation = await requireMembership(request.params.conversationId, request.chatUser._id);
    if (!conversation) {
      response.status(404).json({ error: "Conversation not found." });
      return;
    }
    const query = { conversationId: conversation._id, deletedFor: { $ne: request.chatUser._id } };
    if (request.query.before) {
      if (!objectIdPattern.test(String(request.query.before))) {
        response.status(400).json({ error: "The history cursor is invalid." });
        return;
      }
      const cursor = await Message.findOne({ _id: request.query.before, conversationId: conversation._id }).select("_id createdAt").lean();
      if (!cursor) {
        response.status(400).json({ error: "The history cursor was not found." });
        return;
      }
      query.$or = [
        { createdAt: { $lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, _id: { $lt: cursor._id } },
      ];
    }
    const results = await Message.find(query)
      .select(publicMessageProjection)
      .populate("senderId", "_id displayName")
      .sort({ createdAt: -1 })
      .limit(101)
      .lean();
    const hasMore = results.length > 100;
    const pageMessages = results.slice(0, 100);
    await Conversation.updateOne(
      { _id: conversation._id },
      { $set: { [`lastReadAt.${request.chatUser._id.toString()}`]: new Date() } },
    );
    response.json({
      messages: pageMessages.reverse().map((message) => makeMessage(message, request.chatUser._id)),
      hasMore,
      nextCursor: hasMore ? pageMessages[pageMessages.length - 1]._id.toString() : "",
    });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.post("/conversations/:conversationId/messages", mediaUpload.single("media"), async (request, response, nextMiddleware) => {
  try {
    const conversation = await requireMembership(request.params.conversationId, request.chatUser._id);
    if (!conversation) {
      response.status(404).json({ error: "Conversation not found." });
      return;
    }
    const userId = request.chatUser._id.toString();
    if (idInList(conversation.pendingFor, userId)) {
      response.status(403).json({ error: "Accept this message request before replying." });
      return;
    }
    if ((conversation.spamBy || []).some((id) => id.toString() !== userId)) {
      response.status(403).json({ error: "This conversation does not accept messages." });
      return;
    }
    if (conversation.kind === "direct" && (conversation.pendingFor || []).length) {
      const existingMessages = await Message.countDocuments({ conversationId: conversation._id });
      if (existingMessages > 0) {
        response.status(403).json({ error: "Wait for the recipient to accept your message request." });
        return;
      }
    }
    const body = String(request.body.body || "").trim();
    if (body.length > 4000) {
      response.status(400).json({ error: "Messages must be 4,000 characters or fewer." });
      return;
    }
    if (!body && !request.file) {
      response.status(400).json({ error: "Write a message or attach media." });
      return;
    }
    if (request.file && supportedImageTypes.includes(request.file.mimetype) && request.file.size > maxImageBytes) {
      response.status(413).json({ error: "Images must be 6 MB or smaller." });
      return;
    }
    if (request.file && !mediaTypeIsValid(request.file.buffer, request.file.mimetype)) {
      response.status(400).json({ error: "The selected file is not a supported image, video, or audio clip." });
      return;
    }

    const isImage = request.file && supportedImageTypes.includes(request.file.mimetype);
    const image = isImage
      ? { data: request.file.buffer, contentType: request.file.mimetype, size: request.file.size }
      : undefined;
    const media = request.file && !isImage
      ? {
        data: request.file.buffer,
        contentType: request.file.mimetype,
        fileName: String(request.file.originalname || "attachment").replace(/[^\w .()-]/g, "_").slice(0, 160),
        size: request.file.size,
      }
      : undefined;
    const message = await Message.create({
      conversationId: conversation._id,
      senderId: request.chatUser._id,
      body,
      image,
      media,
    });
    conversation.updatedAt = message.createdAt;
    if (!(conversation.lastReadAt instanceof Map)) {
      conversation.lastReadAt = new Map(Object.entries(conversation.lastReadAt || {}));
    }
    conversation.lastReadAt.set(userId, new Date());
    await conversation.save();
    const populatedMessage = await Message.findById(message._id)
      .select(publicMessageProjection)
      .populate("senderId", "_id displayName")
      .lean();
    const result = makeMessage(populatedMessage, request.chatUser._id);
    io.to(`conversation:${conversation._id}`).emit("chat:message", { conversationId: conversation._id.toString() });
    response.status(201).json({ message: result });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.patch("/messages/:messageId", async (request, response, nextMiddleware) => {
  try {
    if (!objectIdPattern.test(request.params.messageId)) {
      response.status(404).json({ error: "Message not found." });
      return;
    }
    const message = await Message.findById(request.params.messageId)
      .select("conversationId senderId body image.contentType media.contentType deletedAt deletedFor");
    if (!message || !await requireMembership(message.conversationId.toString(), request.chatUser._id)) {
      response.status(404).json({ error: "Message not found." });
      return;
    }
    if (message.senderId.toString() !== request.chatUser._id.toString()) {
      response.status(403).json({ error: "You can only edit your own messages." });
      return;
    }
    if (message.deletedAt || idInList(message.deletedFor, request.chatUser._id)) {
      response.status(409).json({ error: "Deleted messages cannot be edited." });
      return;
    }
    const body = typeof request.body?.body === "string" ? request.body.body.trim() : "";
    if (body.length > 4000 || (!body && !message.image && !message.media)) {
      response.status(400).json({ error: "Enter message text of up to 4,000 characters." });
      return;
    }
    const updateResult = await Message.updateOne(
      { _id: message._id, senderId: request.chatUser._id, deletedAt: { $exists: false }, deletedFor: { $ne: request.chatUser._id } },
      { $set: { body, editedAt: new Date() } },
    );
    if (!updateResult.matchedCount) {
      response.status(409).json({ error: "Deleted messages cannot be edited." });
      return;
    }
    const result = await loadPublicMessage(message._id, request.chatUser._id);
    io.to(`conversation:${message.conversationId}`).emit("chat:message", { conversationId: message.conversationId.toString(), preserveScroll: true });
    response.json({ message: result });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.delete("/messages/:messageId/me", async (request, response, nextMiddleware) => {
  try {
    if (!objectIdPattern.test(request.params.messageId)) {
      response.status(404).json({ error: "Message not found." });
      return;
    }
    const message = await Message.findById(request.params.messageId).select("conversationId deletedAt deletedFor");
    if (!message || !await requireMembership(message.conversationId.toString(), request.chatUser._id)) {
      response.status(404).json({ error: "Message not found." });
      return;
    }
    if (message.deletedAt) {
      response.status(409).json({ error: "Deleted messages cannot be removed again." });
      return;
    }
    const result = await Message.updateOne(
      { _id: message._id, deletedAt: { $exists: false } },
      { $addToSet: { deletedFor: request.chatUser._id } },
    );
    if (!result.matchedCount) {
      response.status(409).json({ error: "This message has already been deleted." });
      return;
    }
    const userId = request.chatUser._id.toString();
    io.to(`user:${userId}`).emit("chat:message-hidden", { messageId: message._id.toString() });
    io.to(`user:${userId}`).emit("chat:saved");
    response.sendStatus(204);
  } catch (error) {
    nextMiddleware(error);
  }
});

api.delete("/messages/:messageId", async (request, response, nextMiddleware) => {
  try {
    if (!objectIdPattern.test(request.params.messageId)) {
      response.status(404).json({ error: "Message not found." });
      return;
    }
    const message = await Message.findById(request.params.messageId).select("conversationId senderId savedBy deletedAt");
    if (!message || !await requireMembership(message.conversationId.toString(), request.chatUser._id)) {
      response.status(404).json({ error: "Message not found." });
      return;
    }
    if (message.senderId.toString() !== request.chatUser._id.toString()) {
      response.status(403).json({ error: "You can only delete your own messages." });
      return;
    }
    if (message.deletedAt) {
      response.status(409).json({ error: "This message has already been deleted." });
      return;
    }
    const savedUserIds = [...(message.savedBy || [])];
    const deletedAt = new Date();
    const result = await Message.updateOne(
      { _id: message._id, senderId: request.chatUser._id, deletedAt: { $exists: false } },
      { $set: { body: "", deletedAt, reactions: [] }, $unset: { image: 1, media: 1, savedBy: 1 } },
    );
    if (!result.modifiedCount) {
      response.status(409).json({ error: "This message has already been deleted." });
      return;
    }
    for (const savedUserId of savedUserIds) io.to(`user:${savedUserId.toString()}`).emit("chat:saved");
    const publicMessage = await loadPublicMessage(message._id, request.chatUser._id);
    io.to(`conversation:${message.conversationId}`).emit("chat:message", { conversationId: message.conversationId.toString(), preserveScroll: true });
    response.json({ message: publicMessage });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.put("/messages/:messageId/saved", async (request, response, nextMiddleware) => {
  try {
    if (!objectIdPattern.test(request.params.messageId)) {
      response.status(404).json({ error: "Message not found." });
      return;
    }
    const message = await Message.findById(request.params.messageId).select("conversationId deletedAt deletedFor");
    if (!message || !await requireMembership(message.conversationId.toString(), request.chatUser._id)) {
      response.status(404).json({ error: "Message not found." });
      return;
    }
    if (message.deletedAt || idInList(message.deletedFor, request.chatUser._id)) {
      response.status(409).json({ error: "Deleted messages cannot be saved." });
      return;
    }
    const updateResult = await Message.updateOne(
      { _id: message._id, deletedAt: { $exists: false }, deletedFor: { $ne: request.chatUser._id } },
      { $addToSet: { savedBy: request.chatUser._id } },
    );
    if (!updateResult.matchedCount) {
      response.status(409).json({ error: "Deleted messages cannot be saved." });
      return;
    }
    io.to(`user:${request.chatUser._id.toString()}`).emit("chat:saved");
    response.json({ isSaved: true });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.delete("/messages/:messageId/saved", async (request, response, nextMiddleware) => {
  try {
    if (!objectIdPattern.test(request.params.messageId)) {
      response.status(404).json({ error: "Message not found." });
      return;
    }
    const message = await Message.findById(request.params.messageId).select("conversationId");
    if (!message || !await requireMembership(message.conversationId.toString(), request.chatUser._id)) {
      response.status(404).json({ error: "Message not found." });
      return;
    }
    await Message.updateOne({ _id: message._id }, { $pull: { savedBy: request.chatUser._id } });
    io.to(`user:${request.chatUser._id.toString()}`).emit("chat:saved");
    response.sendStatus(204);
  } catch (error) {
    nextMiddleware(error);
  }
});

api.put("/messages/:messageId/reactions", async (request, response, nextMiddleware) => {
  try {
    if (!objectIdPattern.test(request.params.messageId)) {
      response.status(404).json({ error: "Message not found." });
      return;
    }
    const emoji = request.body?.emoji;
    if (!isValidReactionEmoji(emoji)) {
      response.status(400).json({ error: "Choose a supported reaction." });
      return;
    }
    const message = await Message.findById(request.params.messageId)
      .select("conversationId deletedAt deletedFor reactions");
    if (!message || !await requireMembership(message.conversationId.toString(), request.chatUser._id)) {
      response.status(404).json({ error: "Message not found." });
      return;
    }
    if (message.deletedAt || idInList(message.deletedFor, request.chatUser._id)) {
      response.status(409).json({ error: "Deleted messages cannot be reacted to." });
      return;
    }
    const userId = request.chatUser._id;
    const ownReactionIndex = (message.reactions || []).findIndex((reaction) => reaction.userId.toString() === userId.toString());
    const previousEmoji = ownReactionIndex >= 0 ? message.reactions[ownReactionIndex].emoji : "";
    const action = ownReactionIndex < 0 ? "added" : previousEmoji === emoji ? "removed" : "changed";
    let updateResult;
    if (action === "removed") {
      updateResult = await Message.updateOne(
        { _id: message._id, deletedAt: { $exists: false }, deletedFor: { $ne: userId }, "reactions.userId": userId },
        { $pull: { reactions: { userId } } },
      );
    } else if (action === "changed") {
      updateResult = await Message.updateOne(
        { _id: message._id, deletedAt: { $exists: false }, deletedFor: { $ne: userId }, "reactions.userId": userId },
        { $set: { "reactions.$.emoji": emoji } },
      );
    } else {
      updateResult = await Message.updateOne(
        { _id: message._id, deletedAt: { $exists: false }, deletedFor: { $ne: userId }, "reactions.userId": { $ne: userId } },
        { $push: { reactions: { userId, emoji } } },
      );
    }
    if (!updateResult.matchedCount) {
      response.status(409).json({ error: "The message changed before your reaction could be saved." });
      return;
    }
    await ReactionEvent.create({
      conversationId: message.conversationId,
      messageId: message._id,
      userId,
      action,
      emoji: action === "removed" ? previousEmoji : emoji,
      ...(action === "changed" ? { previousEmoji } : {}),
    });
    const publicMessage = await loadPublicMessage(message._id, request.chatUser._id);
    io.to(`conversation:${message.conversationId}`).emit("chat:message", { conversationId: message.conversationId.toString(), preserveScroll: true });
    response.json({ message: publicMessage });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.get("/reaction-history", async (request, response, nextMiddleware) => {
  try {
    const conversationIds = await Conversation.find({ members: request.chatUser._id }).distinct("_id");
    if (!conversationIds.length) {
      response.json({ events: [], hasMore: false, nextCursor: "" });
      return;
    }

    const filter = { conversationId: { $in: conversationIds } };
    if (request.query.before) {
      if (!objectIdPattern.test(String(request.query.before))) {
        response.status(400).json({ error: "The reaction history cursor is invalid." });
        return;
      }
      const cursorEvent = await ReactionEvent.findOne({
        _id: request.query.before,
        conversationId: { $in: conversationIds },
      }).select("_id createdAt").lean();
      if (!cursorEvent) {
        response.status(400).json({ error: "The reaction history cursor is invalid." });
        return;
      }
      filter.$or = [
        { createdAt: { $lt: cursorEvent.createdAt } },
        { createdAt: cursorEvent.createdAt, _id: { $lt: cursorEvent._id } },
      ];
    }

    const limit = 50;
    const page = await ReactionEvent.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate("userId", "displayName")
      .populate({
        path: "conversationId",
        select: "title kind members",
        populate: { path: "members", select: "displayName" },
      })
      .lean();
    const hasMore = page.length > limit;
    const pageEvents = page.slice(0, limit);
    const hiddenMessageIds = await Message.find({
      _id: { $in: pageEvents.map((event) => event.messageId) },
      deletedFor: request.chatUser._id,
    }).distinct("_id");
    const hidden = new Set(hiddenMessageIds.map((id) => id.toString()));

    response.json({
      events: pageEvents
        .filter((event) => !hidden.has(event.messageId.toString()))
        .map((event) => ({
          id: event._id.toString(),
          messageId: event.messageId.toString(),
          conversationTitle: event.conversationId?.title
            || (event.conversationId?.kind === "direct"
              ? event.conversationId.members?.find((member) => member._id.toString() !== request.chatUser._id.toString())?.displayName || "Direct chat"
              : "Group chat"),
          userName: event.userId?.displayName || "Former member",
          action: event.action,
          emoji: event.emoji,
          previousEmoji: event.previousEmoji || "",
          createdAt: event.createdAt,
        })),
      hasMore,
      nextCursor: hasMore && pageEvents.length ? pageEvents[pageEvents.length - 1]._id.toString() : "",
    });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.get("/images/:messageId", async (request, response, nextMiddleware) => {
  try {
    if (!objectIdPattern.test(request.params.messageId)) {
      response.sendStatus(404);
      return;
    }
    const message = await Message.findById(request.params.messageId)
      .select("conversationId image deletedFor")
      .lean();
    if (!message?.image?.data || idInList(message.deletedFor, request.chatUser._id) || !await requireMembership(message.conversationId.toString(), request.chatUser._id)) {
      response.sendStatus(404);
      return;
    }
    response.type(message.image.contentType);
    response.set("Cache-Control", "private, max-age=300");
    response.set("X-Content-Type-Options", "nosniff");
    response.send(toNodeBuffer(message.image.data));
  } catch (error) {
    nextMiddleware(error);
  }
});

api.get("/media/:messageId", async (request, response, nextMiddleware) => {
  try {
    if (!objectIdPattern.test(request.params.messageId)) {
      response.sendStatus(404);
      return;
    }
    const message = await Message.findById(request.params.messageId).select("conversationId media deletedFor").lean();
    if (!message?.media?.data || idInList(message.deletedFor, request.chatUser._id) || !await requireMembership(message.conversationId.toString(), request.chatUser._id)) {
      response.sendStatus(404);
      return;
    }
    response.type(message.media.contentType);
    response.set("Cache-Control", "private, max-age=300");
    response.set("X-Content-Type-Options", "nosniff");
    response.send(toNodeBuffer(message.media.data));
  } catch (error) {
    nextMiddleware(error);
  }
});

api.get("/storage", async (request, response, nextMiddleware) => {
  try {
    const conversationIds = await Conversation.distinct("_id", { members: request.chatUser._id });
    const messages = await Message.find({
      senderId: request.chatUser._id,
      conversationId: { $in: conversationIds },
      deletedFor: { $ne: request.chatUser._id },
      $or: [{ "image.contentType": { $exists: true } }, { "media.contentType": { $exists: true } }],
    })
      .select("_id conversationId body image.contentType image.size media.contentType media.fileName media.size createdAt")
      .populate("conversationId", "title kind")
      .sort({ createdAt: -1 })
      .lean();
    const items = messages.flatMap((message) => {
      const conversation = message.conversationId;
      const title = conversation?.title || "Direct conversation";
      const itemsForMessage = [];
      if (message.image?.contentType) {
        itemsForMessage.push({
          messageId: message._id.toString(),
          conversationTitle: title,
          kind: "image",
          contentType: message.image.contentType,
          size: message.image.size || 0,
          createdAt: message.createdAt,
          url: `/api/chat/images/${message._id}`,
        });
      }
      if (message.media?.contentType) {
        itemsForMessage.push({
          messageId: message._id.toString(),
          conversationTitle: title,
          kind: message.media.contentType.startsWith("video/") ? "video" : "audio",
          contentType: message.media.contentType,
          fileName: message.media.fileName || "",
          size: message.media.size || 0,
          createdAt: message.createdAt,
          url: `/api/chat/media/${message._id}`,
        });
      }
      return itemsForMessage;
    });
    response.json({
      storage: {
        files: items.length,
        bytes: items.reduce((total, item) => total + item.size, 0),
        items,
      },
    });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.delete("/storage/:messageId", async (request, response, nextMiddleware) => {
  try {
    if (!objectIdPattern.test(request.params.messageId)) {
      response.sendStatus(404);
      return;
    }
    const conversationIds = await Conversation.distinct("_id", { members: request.chatUser._id });
    const message = await Message.findOne({
      _id: request.params.messageId,
      senderId: request.chatUser._id,
      conversationId: { $in: conversationIds },
      deletedFor: { $ne: request.chatUser._id },
    }).select("_id conversationId body image.contentType media.contentType").lean();
    if (!message || (!message.image?.contentType && !message.media?.contentType)) {
      response.sendStatus(404);
      return;
    }
    if (!message.body) {
      await Message.deleteOne({ _id: message._id, senderId: request.chatUser._id });
    } else {
      await Message.updateOne(
        { _id: message._id, senderId: request.chatUser._id },
        { $unset: { image: 1, media: 1 } },
      );
    }
    io.to(`conversation:${message.conversationId}`).emit("chat:message", {
      conversationId: message.conversationId.toString(),
    });
    response.sendStatus(204);
  } catch (error) {
    nextMiddleware(error);
  }
});

api.get("/history/backups", async (request, response, nextMiddleware) => {
  try {
    const backups = await ChatBackup.find({ ownerId: request.chatUser._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    response.json({
      backups: backups.map((backup) => ({
        id: backup._id.toString(),
        conversationCount: backup.conversationCount,
        messageCount: backup.messageCount,
        createdAt: backup.createdAt,
      })),
    });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.post("/history/backups", async (request, response, nextMiddleware) => {
  let backup;
  try {
    const conversationIds = await Conversation.distinct("_id", { members: request.chatUser._id });
    backup = await ChatBackup.create({
      ownerId: request.chatUser._id,
      conversationCount: conversationIds.length,
      messageCount: 0,
    });
    const cursor = Message.find({
      conversationId: { $in: conversationIds },
      deletedFor: { $ne: request.chatUser._id },
    })
      .select("_id conversationId senderId body image media editedAt deletedAt reactions createdAt")
      .lean()
      .cursor();
    let batch = [];
    let batchBytes = 0;
    let messageCount = 0;
    async function flushBatch() {
      if (!batch.length) return;
      await ChatBackupMessage.insertMany(batch);
      batch = [];
      batchBytes = 0;
    }
    for await (const message of cursor) {
      const messageBytes = getAttachmentBytes(message.image) + getAttachmentBytes(message.media);
      if (batch.length && batchBytes + messageBytes > maxBackupBatchBytes) await flushBatch();
      batch.push({
        backupId: backup._id,
        sourceMessageId: message._id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        body: message.body,
        image: message.image,
        media: message.media,
        editedAt: message.editedAt,
        deletedAt: message.deletedAt,
        reactions: message.reactions || [],
        createdAt: message.createdAt,
      });
      batchBytes += messageBytes;
      messageCount += 1;
      if (batch.length >= 100 || batchBytes >= maxBackupBatchBytes) await flushBatch();
    }
    await flushBatch();
    backup.messageCount = messageCount;
    await backup.save();
    response.status(201).json({
      backup: {
        id: backup._id.toString(),
        conversationCount: backup.conversationCount,
        messageCount: backup.messageCount,
        createdAt: backup.createdAt,
      },
    });
  } catch (error) {
    if (backup) {
      await ChatBackupMessage.deleteMany({ backupId: backup._id });
      await ChatBackup.deleteOne({ _id: backup._id });
    }
    nextMiddleware(error);
  }
});

api.post("/history/backups/:backupId/restore", async (request, response, nextMiddleware) => {
  try {
    if (!objectIdPattern.test(request.params.backupId)) {
      response.status(404).json({ error: "Chat backup not found." });
      return;
    }
    const backup = await ChatBackup.findOne({ _id: request.params.backupId, ownerId: request.chatUser._id });
    if (!backup) {
      response.status(404).json({ error: "Chat backup not found." });
      return;
    }
    const conversationIds = await Conversation.distinct("_id", { members: request.chatUser._id });
    const cursor = ChatBackupMessage.find({
      backupId: backup._id,
      conversationId: { $in: conversationIds },
    }).lean().cursor();
    let operations = [];
    let batchBytes = 0;
    let restored = 0;
    async function flushOperations() {
      if (!operations.length) return;
      restored += operations.length;
      await Message.bulkWrite(operations, { ordered: false });
      operations = [];
      batchBytes = 0;
    }
    for await (const message of cursor) {
      const messageBytes = getAttachmentBytes(message.image) + getAttachmentBytes(message.media);
      if (operations.length && batchBytes + messageBytes > maxBackupBatchBytes) await flushOperations();
      const setFields = {
        senderId: message.senderId,
        body: message.body,
        reactions: message.reactions || [],
        createdAt: message.createdAt,
      };
      const unsetFields = {};
      if (message.image) setFields.image = message.image;
      else unsetFields.image = 1;
      if (message.media) setFields.media = message.media;
      else unsetFields.media = 1;
      if (message.editedAt) setFields.editedAt = message.editedAt;
      else unsetFields.editedAt = 1;
      if (message.deletedAt) {
        setFields.deletedAt = message.deletedAt;
        unsetFields.savedBy = 1;
      } else {
        unsetFields.deletedAt = 1;
      }
      operations.push({
        updateOne: {
          filter: { _id: message.sourceMessageId, conversationId: message.conversationId },
          update: { $set: setFields, $unset: unsetFields },
          upsert: true,
        },
      });
      batchBytes += messageBytes;
      if (operations.length >= 100 || batchBytes >= maxBackupBatchBytes) await flushOperations();
    }
    await flushOperations();
    await Conversation.updateMany({ _id: { $in: conversationIds } }, { $set: { updatedAt: new Date() } });
    for (const conversationId of conversationIds) {
      io.to(`conversation:${conversationId}`).emit("chat:message", { conversationId: conversationId.toString() });
    }
    response.json({ restored });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.delete("/history/backups/:backupId", async (request, response, nextMiddleware) => {
  try {
    if (!objectIdPattern.test(request.params.backupId)) {
      response.sendStatus(404);
      return;
    }
    const backup = await ChatBackup.findOne({ _id: request.params.backupId, ownerId: request.chatUser._id }).select("_id");
    if (!backup) {
      response.sendStatus(404);
      return;
    }
    await ChatBackupMessage.deleteMany({ backupId: backup._id });
    await ChatBackup.deleteOne({ _id: backup._id, ownerId: request.chatUser._id });
    response.sendStatus(204);
  } catch (error) {
    nextMiddleware(error);
  }
});

web.use("/api/chat", api);

web.use((error, _request, response, _nextMiddleware) => {
  if (error instanceof multer.MulterError) {
    response.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400)
      .json({
        error: error.code === "LIMIT_FILE_SIZE"
          ? error.field === "media"
            ? "Media files must be 12 MB or smaller."
            : "Images must be 6 MB or smaller."
          : error.message,
      });
    return;
  }
  if ([
    "Choose a JPG, PNG, WebP, or GIF image.",
    "Choose a supported image, video, or audio file.",
    "The selected file is not a supported image, video, or audio clip.",
  ].includes(error.message)) {
    response.status(400).json({ error: error.message });
    return;
  }
  if (error.name === "SyntaxError" && error.status === 400) {
    response.status(400).json({ error: "The request body is not valid JSON." });
    return;
  }
  if (error.name === "ValidationError" || error.name === "CastError") {
    response.status(400).json({ error: "The chat request contains invalid data." });
    return;
  }
  console.error("Chat server request failed:", error);
  response.status(500).json({ error: "The chat request failed. Please try again." });
});

async function getVisibleOnlineUserIds(viewerId) {
  const activeIds = [...activeSockets.keys()];
  if (!activeIds.length) return [];
  const [users, contactIds] = await Promise.all([
    User.find({ _id: { $in: activeIds } }).select("_id privacy.presenceVisibility").lean(),
    Conversation.distinct("members", { members: viewerId }),
  ]);
  const visibilityById = new Map(users.map((user) => [
    user._id.toString(),
    user.privacy?.presenceVisibility || "everyone",
  ]));
  const contacts = new Set(contactIds.map((id) => id.toString()));
  return activeIds.filter((targetId) => {
    if (targetId === viewerId.toString()) return true;
    const visibility = visibilityById.get(targetId) || "everyone";
    return visibility === "everyone" || (visibility === "contacts" && contacts.has(targetId));
  });
}

async function notifyPresenceChange(targetId, online) {
  let visibleViewers = online ? null : new Set();
  if (online) {
    const user = await User.findById(targetId).select("privacy.presenceVisibility").lean();
    const visibility = user?.privacy?.presenceVisibility || "everyone";
    if (visibility === "nobody") return;
    if (visibility === "contacts") {
      visibleViewers = new Set((await Conversation.distinct("members", { members: targetId })).map((id) => id.toString()));
    }
  }
  for (const viewerId of activeSockets.keys()) {
    if (viewerId !== targetId) {
      const canSee = online && (!visibleViewers || visibleViewers.has(viewerId));
      io.to(`user:${viewerId}`).emit("presence:update", { userId: targetId, online: canSee });
    }
  }
}

async function refreshPresenceVisibility(targetId) {
  const user = await User.findById(targetId).select("privacy.presenceVisibility").lean();
  const visibility = user?.privacy?.presenceVisibility || "everyone";
  const contacts = visibility === "contacts"
    ? new Set((await Conversation.distinct("members", { members: targetId })).map((id) => id.toString()))
    : null;
  for (const viewerId of activeSockets.keys()) {
    if (viewerId !== targetId) {
      const online = activeSockets.has(targetId)
        && (visibility === "everyone" || (visibility === "contacts" && contacts.has(viewerId)));
      io.to(`user:${viewerId}`).emit("presence:update", { userId: targetId, online });
    }
  }
}

io.use(async (socket, nextSocket) => {
  try {
    const cookies = Object.fromEntries((socket.handshake.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      }));
    const token = cookies[cookieName];
    if (!token) throw new Error("Sign in to use live chat.");
    const claims = jwt.verify(token, jwtSecret);
    const user = typeof claims === "string" ? null : await User.findById(claims.sub).select("_id");
    if (!user) throw new Error("Your chat session is invalid.");
    socket.data.userId = user._id.toString();
    const conversations = await Conversation.find({ members: user._id }).select("_id members").lean();
    socket.data.conversations = conversations;
    socket.data.conversationIds = conversations.map((conversation) => conversation._id.toString());
    nextSocket();
  } catch (error) {
    nextSocket(new Error(error.message || "Chat authentication failed."));
  }
});

function validCallDescription(description, type) {
  return description
    && description.type === type
    && typeof description.sdp === "string"
    && description.sdp.length > 0
    && description.sdp.length <= maxSessionDescriptionLength;
}

function validCallCandidate(candidate) {
  return candidate
    && typeof candidate === "object"
    && typeof candidate.candidate === "string"
    && candidate.candidate.length <= maxIceCandidateLength
    && (candidate.sdpMid === null || typeof candidate.sdpMid === "string")
    && (candidate.sdpMLineIndex === null || Number.isInteger(candidate.sdpMLineIndex));
}

function finishCallSession(callId, reason) {
  const session = callSessions.get(callId);
  if (!session) return;
  if (session.timeout) clearTimeout(session.timeout);
  callSessions.delete(callId);
  const result = { callId, conversationId: session.conversationId, reason };
  io.to(`user:${session.callerId}`).emit("call:ended", result);
  io.to(`user:${session.calleeId}`).emit("call:ended", result);
}

io.on("connection", async (socket) => {
  const userId = socket.data.userId;
  const conversations = socket.data.conversations;
  socket.join(`user:${userId}`);
  for (const conversationId of socket.data.conversationIds) socket.join(`conversation:${conversationId}`);

  const sockets = activeSockets.get(userId) || new Set();
  const wasOnline = sockets.size > 0;
  sockets.add(socket.id);
  activeSockets.set(userId, sockets);

  const onlineUserIds = await getVisibleOnlineUserIds(userId);
  socket.emit("presence:sync", { onlineUserIds });
  if (!wasOnline) await notifyPresenceChange(userId, true);

  socket.on("conversation:join", async (conversationId, acknowledge) => {
    const reply = typeof acknowledge === "function" ? acknowledge : () => {};
    try {
      const conversation = await requireMembership(conversationId, userId);
      if (!conversation) {
        reply({ error: "Conversation not found." });
        return;
      }
      const room = `conversation:${conversation._id}`;
      await socket.join(room);
      const memberIds = conversation.members.map((memberId) => memberId.toString());
      const visibleIds = new Set(await getVisibleOnlineUserIds(userId));
      reply({ onlineUserIds: memberIds.filter((memberId) => visibleIds.has(memberId)) });
    } catch (error) {
      console.error("Unable to join chat conversation:", error);
      reply({ error: "Unable to join this conversation." });
    }
  });

  socket.on("call:offer", async (data, acknowledge) => {
    const reply = typeof acknowledge === "function" ? acknowledge : () => {};
    try {
      if (!data || !objectIdPattern.test(String(data.conversationId || "")) || !callIdPattern.test(String(data.callId || "")) || !validCallDescription(data.offer, "offer")) {
        reply({ error: "The call invitation is invalid." });
        return;
      }
      const conversation = await requireMembership(data.conversationId, userId);
      if (!conversation || conversation.kind !== "direct") {
        reply({ error: "Calls are available in direct conversations only." });
        return;
      }
      if ((conversation.pendingFor || []).length || (conversation.spamBy || []).length) {
        reply({ error: "Resolve the message request before calling." });
        return;
      }
      const calleeId = conversation.members.find((memberId) => memberId.toString() !== userId)?.toString();
      if (!calleeId || !activeSockets.has(calleeId)) {
        reply({ error: "This person is not available for a call right now." });
        return;
      }
      if (callSessions.has(data.callId) || [...callSessions.values()].some((session) => (
        session.callerId === userId || session.calleeId === userId
        || session.callerId === calleeId || session.calleeId === calleeId
      ))) {
        reply({ error: "One of you is already on a call." });
        return;
      }
      const caller = await User.findById(userId).select("displayName").lean();
      const session = {
        callId: data.callId,
        conversationId: conversation._id.toString(),
        callerId: userId,
        calleeId,
        timeout: null,
      };
      session.timeout = setTimeout(() => finishCallSession(data.callId, "no-answer"), 45_000);
      session.timeout.unref();
      callSessions.set(data.callId, session);
      io.to(`user:${calleeId}`).emit("call:incoming", {
        callId: data.callId,
        conversationId: session.conversationId,
        callerId: userId,
        callerName: caller?.displayName || "Chat member",
        offer: data.offer,
      });
      reply({ ok: true });
    } catch (error) {
      console.error("Unable to start chat audio call:", error);
      reply({ error: "Unable to start the call. Please try again." });
    }
  });

  socket.on("call:answer", (data, acknowledge) => {
    const reply = typeof acknowledge === "function" ? acknowledge : () => {};
    if (!data || !callIdPattern.test(String(data.callId || "")) || !validCallDescription(data.answer, "answer")) {
      reply({ error: "The call answer is invalid." });
      return;
    }
    const session = callSessions.get(data.callId);
    if (!session || session.conversationId !== data.conversationId || session.calleeId !== userId) {
      reply({ error: "This call is no longer available." });
      return;
    }
    if (session.timeout) clearTimeout(session.timeout);
    session.timeout = null;
    io.to(`user:${session.callerId}`).emit("call:answer", { callId: data.callId, answer: data.answer });
    reply({ ok: true });
  });

  socket.on("call:decline", (data, acknowledge) => {
    const reply = typeof acknowledge === "function" ? acknowledge : () => {};
    const session = data && callSessions.get(data.callId);
    if (!session || session.conversationId !== data.conversationId || session.calleeId !== userId) {
      reply({ error: "This call is no longer available." });
      return;
    }
    finishCallSession(data.callId, "declined");
    reply({ ok: true });
  });

  socket.on("call:candidate", (data, acknowledge) => {
    const reply = typeof acknowledge === "function" ? acknowledge : () => {};
    if (!data || !callIdPattern.test(String(data.callId || "")) || !validCallCandidate(data.candidate)) {
      reply({ error: "The call network candidate is invalid." });
      return;
    }
    const session = callSessions.get(data.callId);
    if (!session || session.conversationId !== data.conversationId) {
      reply({ error: "This call is no longer available." });
      return;
    }
    const peerId = session.callerId === userId
      ? session.calleeId
      : session.calleeId === userId
        ? session.callerId
        : "";
    if (!peerId) {
      reply({ error: "You are not a participant in this call." });
      return;
    }
    io.to(`user:${peerId}`).emit("call:candidate", { callId: data.callId, candidate: data.candidate });
    reply({ ok: true });
  });

  socket.on("call:media-state", (data, acknowledge) => {
    const reply = typeof acknowledge === "function" ? acknowledge : () => {};
    const session = data && callSessions.get(data.callId);
    if (!session || session.conversationId !== data.conversationId) {
      reply({ error: "This call is no longer available." });
      return;
    }
    const peerId = session.callerId === userId
      ? session.calleeId
      : session.calleeId === userId
        ? session.callerId
        : "";
    if (!peerId) {
      reply({ error: "You are not a participant in this call." });
      return;
    }
    io.to(`user:${peerId}`).emit("call:media-state", {
      callId: session.callId,
      cameraEnabled: data.cameraEnabled === true,
      sharingScreen: data.sharingScreen === true,
      onHold: data.onHold === true,
    });
    reply({ ok: true });
  });

  socket.on("call:end", (data, acknowledge) => {
    const reply = typeof acknowledge === "function" ? acknowledge : () => {};
    const session = data && callSessions.get(data.callId);
    if (!session || session.conversationId !== data.conversationId
      || (session.callerId !== userId && session.calleeId !== userId)) {
      reply({ error: "This call is no longer available." });
      return;
    }
    finishCallSession(data.callId, "ended");
    reply({ ok: true });
  });

  socket.on("disconnect", () => {
    const userSockets = activeSockets.get(userId);
    if (!userSockets) return;
    userSockets.delete(socket.id);
    if (userSockets.size) return;
    for (const [callId, session] of callSessions) {
      if (session.callerId === userId || session.calleeId === userId) {
        finishCallSession(callId, "disconnected");
      }
    }
    activeSockets.delete(userId);
    refreshPresenceVisibility(userId).catch((error) => {
      console.error("Unable to publish chat presence update:", error);
    });
  });
});

web.use((request, response) => nextHandler(request, response));

async function start() {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log(`MongoDB connected (${mongoose.connection.name}).`);
  await nextApp.prepare();
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Pharmacy ELAF server listening on http://localhost:${port}`);
    console.log(`Chat API ready. Local images and chat records are stored in MongoDB.`);
  });
}

start().catch(async (error) => {
  console.error(`Unable to start Pharmacy ELAF server: ${error.message}`);
  await mongoose.disconnect();
  process.exitCode = 1;
});

process.on("SIGINT", () => {
  httpServer.close(() => {
    mongoose.disconnect().finally(() => process.exit(0));
  });
});

process.on("SIGTERM", () => {
  httpServer.close(() => {
    mongoose.disconnect().finally(() => process.exit(0));
  });
});

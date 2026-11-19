const http = require("node:http");
const next = require("next");
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const { Server: SocketServer } = require("socket.io");
require("@next/env").loadEnvConfig(__dirname, process.env.NODE_ENV !== "production");

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT) || 3000;
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/HPELAF1282025";
const jwtSecret = process.env.CHAT_JWT_SECRET || (dev ? "local-development-only-change-this-secret" : "");
const cookieName = "pharmacy_chat";
const cookieMaxAge = 7 * 24 * 60 * 60 * 1000;
const maxImageBytes = 6 * 1024 * 1024;
const objectIdPattern = /^[a-f\d]{24}$/i;

if (!jwtSecret) {
  throw new Error("CHAT_JWT_SECRET must be set when NODE_ENV=production.");
}

mongoose.set("strictQuery", true);

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  displayName: { type: String, required: true, trim: true, maxlength: 80 },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

const conversationSchema = new mongoose.Schema({
  kind: { type: String, enum: ["direct", "group"], required: true },
  title: { type: String, trim: true, maxlength: 80 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "ChatUser", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "ChatUser", required: true }],
  directKey: { type: String, unique: true, sparse: true },
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatConversation", required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatUser", required: true },
  body: { type: String, default: "", maxlength: 4000 },
  image: {
    data: { type: Buffer },
    contentType: { type: String, enum: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
  },
}, { timestamps: true });

const User = mongoose.models.ChatUser || mongoose.model("ChatUser", userSchema);
const Conversation = mongoose.models.ChatConversation || mongoose.model("ChatConversation", conversationSchema);
const Message = mongoose.models.ChatMessage || mongoose.model("ChatMessage", messageSchema);

const nextApp = next({ dev, dir: __dirname });
const nextHandler = nextApp.getRequestHandler();
const web = express();
const httpServer = http.createServer(web);
const io = new SocketServer(httpServer);
const activeSockets = new Map();
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxImageBytes, files: 1 },
  fileFilter: (_request, file, callback) => {
    const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!supportedTypes.includes(file.mimetype)) {
      callback(new Error("Choose a JPG, PNG, WebP, or GIF image."));
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
  return {
    id: user._id.toString(),
    displayName: user.displayName,
  };
}

function makeMessage(message) {
  const sender = message.senderId?.displayName
    ? publicUser(message.senderId)
    : null;
  const senderId = sender?.id || message.senderId.toString();
  return {
    id: message._id.toString(),
    conversationId: message.conversationId.toString(),
    senderId,
    sender,
    body: message.body,
    imageUrl: message.image?.contentType ? `/api/chat/images/${message._id}` : "",
    createdAt: message.createdAt,
  };
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
    const user = await User.findById(claims.sub).select("_id email displayName").lean();
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
  response.json({ user: publicUser(request.chatUser) });
});

api.use(requireUser);

api.get("/users", async (request, response, nextMiddleware) => {
  try {
    const users = await User.find({ _id: { $ne: request.chatUser._id } })
      .select("_id displayName")
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
      .populate("members", "_id displayName")
      .sort({ updatedAt: -1 })
      .lean();
    response.json({
      conversations: conversations.map((conversation) => ({
        id: conversation._id.toString(),
        kind: conversation.kind,
        title: conversation.title || "",
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
    const targetUser = await User.findById(targetUserId).select("_id");
    if (!targetUser) {
      response.status(404).json({ error: "That chat member was not found." });
      return;
    }
    const memberIds = [request.chatUser._id.toString(), targetUserId].sort();
    const directKey = memberIds.join(":");
    const conversation = await Conversation.findOneAndUpdate(
      { directKey },
      {
        $setOnInsert: { kind: "direct", directKey, createdBy: request.chatUser._id, members: memberIds },
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
    const memberIds = Array.isArray(request.body.memberIds)
      ? [...new Set(request.body.memberIds.map(String))]
      : [];
    if (!title || title.length > 80) {
      response.status(400).json({ error: "Enter a group name of 80 characters or fewer." });
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
      kind: "group",
      title,
      createdBy: request.chatUser._id,
      members: [...memberIds, request.chatUser._id.toString()],
    });
    for (const memberId of conversation.members) io.to(`user:${memberId.toString()}`).emit("conversation:created");
    response.status(201).json({ conversationId: conversation._id.toString() });
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
    const messages = await Message.find({ conversationId: conversation._id })
      .select("_id conversationId senderId body image.contentType createdAt")
      .populate("senderId", "_id displayName")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    response.json({ messages: messages.reverse().map(makeMessage) });
  } catch (error) {
    nextMiddleware(error);
  }
});

api.post("/conversations/:conversationId/messages", imageUpload.single("image"), async (request, response, nextMiddleware) => {
  try {
    const conversation = await requireMembership(request.params.conversationId, request.chatUser._id);
    if (!conversation) {
      response.status(404).json({ error: "Conversation not found." });
      return;
    }
    const body = String(request.body.body || "").trim();
    if (body.length > 4000) {
      response.status(400).json({ error: "Messages must be 4,000 characters or fewer." });
      return;
    }
    if (!body && !request.file) {
      response.status(400).json({ error: "Write a message or attach an image." });
      return;
    }
    if (request.file && !imageTypeIsValid(request.file.buffer, request.file.mimetype)) {
      response.status(400).json({ error: "The selected file is not a supported image." });
      return;
    }

    const image = request.file
      ? { data: request.file.buffer, contentType: request.file.mimetype }
      : undefined;
    const message = await Message.create({
      conversationId: conversation._id,
      senderId: request.chatUser._id,
      body,
      image,
    });
    conversation.updatedAt = message.createdAt;
    await conversation.save();
    const populatedMessage = await Message.findById(message._id)
      .select("_id conversationId senderId body image.contentType createdAt")
      .populate("senderId", "_id displayName")
      .lean();
    const result = makeMessage(populatedMessage);
    io.to(`conversation:${conversation._id}`).emit("chat:message", result);
    response.status(201).json({ message: result });
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
      .select("conversationId image")
      .lean();
    if (!message?.image?.data || !await requireMembership(message.conversationId.toString(), request.chatUser._id)) {
      response.sendStatus(404);
      return;
    }
    response.type(message.image.contentType);
    response.set("Cache-Control", "private, max-age=300");
    const data = message.image.data;
    const imageBuffer = Buffer.isBuffer(data)
      ? data
      : Buffer.from(data.buffer || data, data.byteOffset || 0, data.byteLength);
    response.send(imageBuffer);
  } catch (error) {
    nextMiddleware(error);
  }
});

web.use("/api/chat", api);

web.use((error, _request, response, _nextMiddleware) => {
  if (error instanceof multer.MulterError) {
    response.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400)
      .json({ error: error.code === "LIMIT_FILE_SIZE" ? "Images must be 6 MB or smaller." : error.message });
    return;
  }
  if (error.message === "Choose a JPG, PNG, WebP, or GIF image.") {
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

io.on("connection", async (socket) => {
  const userId = socket.data.userId;
  const conversations = socket.data.conversations;
  socket.join(`user:${userId}`);
  for (const conversationId of socket.data.conversationIds) socket.join(`conversation:${conversationId}`);

  const sockets = activeSockets.get(userId) || new Set();
  const wasOnline = sockets.size > 0;
  sockets.add(socket.id);
  activeSockets.set(userId, sockets);

  const onlineUserIds = [...activeSockets.keys()];
  socket.emit("presence:sync", { onlineUserIds });
  if (!wasOnline) io.emit("presence:update", { userId, online: true });
  for (const conversation of conversations) {
    if (!wasOnline) {
      socket.to(`conversation:${conversation._id}`).emit("presence:update", { userId, online: true });
    }
  }

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
      reply({ onlineUserIds: memberIds.filter((memberId) => activeSockets.has(memberId)) });
    } catch (error) {
      console.error("Unable to join chat conversation:", error);
      reply({ error: "Unable to join this conversation." });
    }
  });

  socket.on("disconnect", () => {
    const userSockets = activeSockets.get(userId);
    if (!userSockets) return;
    userSockets.delete(socket.id);
    if (userSockets.size) return;
    activeSockets.delete(userId);
    io.emit("presence:update", { userId, online: false });
    for (const conversationId of socket.data.conversationIds) {
      socket.to(`conversation:${conversationId}`).emit("presence:update", { userId, online: false });
    }
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

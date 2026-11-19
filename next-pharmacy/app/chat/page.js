"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { io } from "socket.io-client";
import "./chat.css";

const maxImageBytes = 6 * 1024 * 1024;

async function chatRequest(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || "The chat request failed.");
    error.status = response.status;
    throw error;
  }
  return result;
}

function getErrorMessage(error) {
  return error?.message || "Something went wrong. Please try again.";
}

function getInitials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "?";
}

function Avatar({ profile, group = false, small = false }) {
  if (group) {
    return <span className={`chat-avatar chat-avatar-group${small ? " chat-avatar-small" : ""}`} aria-hidden="true">👥</span>;
  }
  if (profile?.avatar_url) {
    return <Image className={`chat-avatar${small ? " chat-avatar-small" : ""}`} src={profile.avatar_url} alt="" width={small ? 34 : 43} height={small ? 34 : 43} unoptimized />;
  }
  return (
    <span className={`chat-avatar chat-avatar-initials${small ? " chat-avatar-small" : ""}`} aria-hidden="true">
      {getInitials(profile?.display_name)}
    </span>
  );
}

function mapMessage(message) {
  return {
    id: message.id,
    conversation_id: message.conversationId,
    sender_id: message.senderId,
    body: message.body,
    imageUrl: message.imageUrl,
    created_at: message.createdAt,
    sender: message.sender ? { display_name: message.sender.displayName } : null,
  };
}

async function fetchConversations(userId) {
  const { conversations } = await chatRequest("/api/chat/conversations");
  return conversations.map((conversation) => {
    const members = conversation.members.map((member) => ({
      user_id: member.id,
      profile: { id: member.id, display_name: member.displayName },
    }));
    const otherMember = members.find((member) => member.user_id !== userId);
    return {
      ...conversation,
      members,
      displayTitle: conversation.kind === "group" ? conversation.title : otherMember?.profile?.display_name || "Direct chat",
      otherMember,
    };
  });
}

function AuthPanel() {
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register" && password.length < 8) {
        throw new Error("Use a password with at least 8 characters.");
      }
      await chatRequest(`/api/chat/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, fullName: fullName.trim() }),
      });
      window.location.reload();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="chat-auth-page">
      <Link className="chat-back-link" href="/">← Back to Pharmacy ELAF</Link>
      <section className="chat-auth-card">
        <div className="chat-brand-mark">✚</div>
        <p className="chat-eyebrow">PHARMACY ELAF · PRIVATE CHAT</p>
        <h1>Stay close, wherever you are.</h1>
        <p className="chat-auth-intro">Create a free chat account to message family, friends, and the Pharmacy ELAF team.</p>
        <div className="chat-auth-tabs" role="tablist" aria-label="Account options">
          <button type="button" className={mode === "login" ? "selected" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button>
          <button type="button" className={mode === "register" ? "selected" : ""} onClick={() => { setMode("register"); setError(""); }}>Create account</button>
        </div>
        <form className="chat-auth-form" onSubmit={submit}>
          {mode === "register" && (
            <label>
              Full name
              <input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required maxLength={80} />
            </label>
          )}
          <label>
            Email address
            <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
          </label>
          {error && <p className="chat-alert chat-alert-error" role="alert">{error}</p>}
          <button className="chat-primary-button chat-auth-submit" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "register" ? "Create free account" : "Sign in to chat"}
          </button>
        </form>
        <p className="chat-auth-footnote">Your password is hashed before it is stored. Chat accounts are separate from device-only storefront accounts.</p>
      </section>
    </main>
  );
}

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [directory, setDirectory] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [messageState, setMessageState] = useState({ conversationId: "", items: [] });
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [pageError, setPageError] = useState("");
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [mobileListOpen, setMobileListOpen] = useState(true);
  const messageEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const socketRef = useRef(null);
  const activeConversationRef = useRef("");

  const userId = user?.id || "";
  const ownName = user?.displayName || "Pharmacy ELAF member";
  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) || null,
    [conversations, activeConversationId],
  );
  const messages = useMemo(
    () => (messageState.conversationId === activeConversationId ? messageState.items : []),
    [messageState, activeConversationId],
  );
  const loadingMessages = Boolean(activeConversationId && messageState.conversationId !== activeConversationId && !pageError);
  const filteredDirectory = useMemo(() => {
    const query = directoryQuery.trim().toLowerCase();
    return directory.filter((profile) => profile.display_name.toLowerCase().includes(query));
  }, [directory, directoryQuery]);

  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    let mounted = true;
    chatRequest("/api/chat/auth/me")
      .then(({ user: currentUser }) => {
        if (mounted) setUser(currentUser);
      })
      .catch((error) => {
        if (mounted && error.status !== 401) setPageError(getErrorMessage(error));
      })
      .finally(() => {
        if (mounted) setAuthLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    const socket = io({ withCredentials: true });
    socketRef.current = socket;
    socket.on("presence:sync", ({ onlineUserIds: ids }) => setOnlineUserIds(ids || []));
    socket.on("presence:update", ({ userId: changedUserId, online }) => {
      setOnlineUserIds((current) => online
        ? [...new Set([...current, changedUserId])]
        : current.filter((id) => id !== changedUserId));
    });
    socket.on("connect_error", (error) => setPageError(getErrorMessage(error)));
    socket.on("conversation:created", () => setReloadKey((key) => key + 1));
    socket.on("chat:message", ({ conversationId }) => {
      if (activeConversationRef.current === conversationId) setReloadKey((key) => key + 1);
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    async function loadChatData() {
      setLoadingChat(true);
      setPageError("");
      try {
        const [{ users }, nextConversations] = await Promise.all([
          chatRequest("/api/chat/users"),
          fetchConversations(userId),
        ]);
        if (cancelled) return;
        setDirectory(users.map((profile) => ({
          id: profile.id,
          display_name: profile.displayName,
          avatar_url: null,
        })));
        setConversations(nextConversations);
        setActiveConversationId((current) => (
          current && nextConversations.some((conversation) => conversation.id === current)
            ? current
            : nextConversations[0]?.id || ""
        ));
      } catch (error) {
        if (!cancelled) setPageError(getErrorMessage(error));
      } finally {
        if (!cancelled) setLoadingChat(false);
      }
    }
    loadChatData();
    return () => { cancelled = true; };
  }, [userId, reloadKey]);

  useEffect(() => {
    if (!userId || !activeConversationId) return undefined;
    socketRef.current?.emit("conversation:join", activeConversationId, (result) => {
      if (result?.onlineUserIds) setOnlineUserIds((current) => [...new Set([...current, ...result.onlineUserIds])]);
    });
    let cancelled = false;
    async function loadMessages() {
      try {
        const { messages: results } = await chatRequest(`/api/chat/conversations/${activeConversationId}/messages`);
        if (!cancelled) setMessageState({ conversationId: activeConversationId, items: results.map(mapMessage) });
      } catch (error) {
        if (!cancelled) {
          setMessageState({ conversationId: activeConversationId, items: [] });
          setPageError(getErrorMessage(error));
        }
      }
    }
    loadMessages();
    return () => { cancelled = true; };
  }, [activeConversationId, userId, reloadKey]);

  useEffect(() => {
    if (!attachment) return undefined;
    return () => URL.revokeObjectURL(attachment.previewUrl);
  }, [attachment]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeConversationId]);

  async function openDirectChat(profile) {
    setPageError("");
    try {
      const { conversationId } = await chatRequest("/api/chat/conversations/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: profile.id }),
      });
      setActiveConversationId(conversationId);
      setMobileListOpen(false);
      setContactPickerOpen(false);
      setDirectoryQuery("");
      setReloadKey((key) => key + 1);
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  }

  async function createGroup(event) {
    event.preventDefault();
    setPageError("");
    if (!groupTitle.trim() || groupMemberIds.length === 0) {
      setPageError("Add a group name and at least one person.");
      return;
    }
    try {
      const { conversationId } = await chatRequest("/api/chat/conversations/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: groupTitle.trim(), memberIds: groupMemberIds }),
      });
      setActiveConversationId(conversationId);
      setMobileListOpen(false);
      setGroupDialogOpen(false);
      setGroupTitle("");
      setGroupMemberIds([]);
      setReloadKey((key) => key + 1);
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  }

  function chooseImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setPageError("Choose a JPG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > maxImageBytes) {
      setPageError("Images must be 6 MB or smaller.");
      return;
    }
    setPageError("");
    setAttachment({ file, previewUrl: URL.createObjectURL(file) });
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!activeConversation || sending) return;
    const body = draft.trim();
    if (!body && !attachment) return;
    setSending(true);
    setPageError("");
    try {
      const formData = new FormData();
      formData.set("body", body);
      if (attachment) formData.set("image", attachment.file);
      const { message } = await chatRequest(`/api/chat/conversations/${activeConversation.id}/messages`, {
        method: "POST",
        body: formData,
      });
      setMessageState((current) => current.conversationId === activeConversation.id
        ? {
          ...current,
          items: current.items.some((item) => item.id === message.id) ? current.items : [...current.items, mapMessage(message)],
        }
        : current);
      setDraft("");
      setAttachment(null);
      setReloadKey((key) => key + 1);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setSending(false);
    }
  }

  async function signOut() {
    try {
      await chatRequest("/api/chat/auth/logout", { method: "POST" });
      window.location.reload();
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  }

  if (authLoading) {
    return <main className="chat-loading-page"><span className="chat-spinner" />Connecting to local chat server…</main>;
  }
  if (!user) return <AuthPanel />;

  const onlineCount = activeConversation
    ? activeConversation.members.filter((member) => member.user_id !== userId && onlineUserIds.includes(member.user_id)).length
    : 0;
  const headerProfile = activeConversation?.otherMember?.profile;

  return (
    <main className="chat-page">
      <header className="chat-topbar">
        <Link className="chat-top-brand" href="/" aria-label="Back to Pharmacy ELAF">
          <span className="chat-brand-mark">✚</span>
          <span><strong>Pharmacy ELAF</strong><small>TEAM CHAT</small></span>
        </Link>
        <div className="chat-top-user">
          <Avatar profile={{ display_name: ownName }} small />
          <span>{ownName}</span>
          <button type="button" className="chat-quiet-button" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <div className={`chat-shell${mobileListOpen ? " chat-mobile-list-open" : ""}`}>
        <aside className={`chat-sidebar${contactPickerOpen ? " chat-sidebar-contacts" : ""}`}>
          <div className="chat-sidebar-heading">
            <div><p className="chat-eyebrow">YOUR PEOPLE</p><h1>{contactPickerOpen ? "Start a chat" : "Messages"}</h1></div>
            <button type="button" className="chat-icon-button" onClick={() => { setContactPickerOpen((open) => !open); setDirectoryQuery(""); }} aria-label={contactPickerOpen ? "Close contacts" : "Find a person"} title="New chat">＋</button>
          </div>
          <div className="chat-sidebar-actions">
            <button type="button" className="chat-secondary-button" onClick={() => { setGroupDialogOpen(true); setContactPickerOpen(false); }}>
              <span>👥</span> New group
            </button>
          </div>
          {contactPickerOpen ? (
            <div className="chat-contact-picker">
              <label className="chat-search"><span aria-hidden="true">⌕</span><input value={directoryQuery} onChange={(event) => setDirectoryQuery(event.target.value)} placeholder="Search registered people" aria-label="Search registered people" /></label>
              <p className="chat-list-label">REGISTERED CHAT MEMBERS</p>
              <div className="chat-list-scroll">
                {filteredDirectory.map((profile) => (
                  <button type="button" className="chat-person-row" key={profile.id} onClick={() => openDirectChat(profile)}>
                    <Avatar profile={profile} />
                    <span className="chat-person-copy"><strong>{profile.display_name}</strong><small>Start a private chat</small></span>
                    <span className="chat-person-arrow">›</span>
                  </button>
                ))}
                {!filteredDirectory.length && <p className="chat-empty-list">No members found. They can create a free chat account to join.</p>}
              </div>
            </div>
          ) : (
            <>
              <label className="chat-search"><span aria-hidden="true">⌕</span><input value={directoryQuery} onChange={(event) => setDirectoryQuery(event.target.value)} placeholder="Search chats" aria-label="Search chats" /></label>
              <p className="chat-list-label">RECENT</p>
              <div className="chat-list-scroll">
                {conversations.filter((conversation) => conversation.displayTitle.toLowerCase().includes(directoryQuery.toLowerCase())).map((conversation) => (
                  <button type="button" key={conversation.id} className={`chat-conversation-row${conversation.id === activeConversationId ? " active" : ""}`} onClick={() => { setActiveConversationId(conversation.id); setMobileListOpen(false); }}>
                    <Avatar profile={conversation.otherMember?.profile} group={conversation.kind === "group"} />
                    <span className="chat-person-copy"><strong>{conversation.displayTitle}</strong><small>{conversation.kind === "group" ? `${conversation.members.length} members` : "Private conversation"}</small></span>
                    {conversation.members.some((member) => member.user_id !== userId && onlineUserIds.includes(member.user_id)) && <span className="chat-online-dot" title="Online" />}
                  </button>
                ))}
                {!conversations.length && !loadingChat && <div className="chat-empty-list"><span>💬</span><strong>Your conversations start here</strong><p>Find a registered member or create a group with family, friends, or your team.</p></div>}
                {loadingChat && <div className="chat-empty-list">Loading conversations…</div>}
              </div>
            </>
          )}
          {pageError && <p className="chat-inline-alert" role="alert">{pageError}</p>}
          <div className="chat-sidebar-footer"><span className="chat-secure-dot" /> Private conversations · local MongoDB</div>
        </aside>

        <section className="chat-main" aria-label="Conversation">
          {activeConversation ? (
            <>
              <header className="chat-conversation-header">
                <div className="chat-conversation-identity">
                  <button type="button" className="chat-mobile-back" onClick={() => setMobileListOpen(true)} aria-label="Back to conversations">‹</button>
                  <Avatar profile={headerProfile} group={activeConversation.kind === "group"} />
                  <div>
                    <h2>{activeConversation.displayTitle}</h2>
                    <p>{activeConversation.kind === "group" ? `${activeConversation.members.length} members${onlineCount ? ` · ${onlineCount} online` : ""}` : onlineCount ? "Online now" : "Private conversation"}</p>
                  </div>
                </div>
                <span className="chat-live-indicator"><i /> Live</span>
              </header>
              {pageError && <p className="chat-inline-alert" role="alert">{pageError}</p>}
              <div className="chat-messages">
                <div className="chat-message-date">Messages are visible only to conversation members</div>
                {loadingMessages && <div className="chat-message-loading"><span className="chat-spinner" /> Loading messages…</div>}
                {!loadingMessages && !messages.length && <div className="chat-first-message"><Avatar profile={headerProfile} group={activeConversation.kind === "group"} /><strong>Say hello to {activeConversation.displayTitle}</strong><p>Your messages and shared images will appear here.</p></div>}
                {messages.map((message) => (
                  <article className={`chat-message${message.sender_id === userId ? " own" : ""}`} key={message.id}>
                    {message.sender_id !== userId && activeConversation.kind === "group" && <span className="chat-message-sender">{message.sender?.display_name || "Team member"}</span>}
                    {message.imageUrl && <a className="chat-message-image" href={message.imageUrl} target="_blank" rel="noreferrer"><Image src={message.imageUrl} alt="Shared in chat" width={560} height={260} unoptimized /></a>}
                    {message.body && <p>{message.body}</p>}
                    <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
                  </article>
                ))}
                <div ref={messageEndRef} />
              </div>
              <form className="chat-composer" onSubmit={sendMessage}>
                {attachment && <div className="chat-attachment-preview"><Image src={attachment.previewUrl} alt="Selected image preview" width={34} height={34} unoptimized /><span>{attachment.file.name}</span><button type="button" onClick={() => setAttachment(null)} aria-label="Remove selected image">×</button></div>}
                <div className="chat-composer-row">
                  <input ref={imageInputRef} className="chat-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseImage} />
                  <button type="button" className="chat-attach-button" onClick={() => imageInputRef.current?.click()} aria-label="Attach an image" title="Attach an image">＋</button>
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message…" aria-label="Write a message" rows={1} maxLength={4000} />
                  <button className="chat-send-button" type="submit" disabled={sending || (!draft.trim() && !attachment)} aria-label="Send message">{sending ? "…" : "➤"}</button>
                </div>
                <p className="chat-composer-hint">Share text or an image up to 6 MB · max 4,000 characters</p>
              </form>
            </>
          ) : (
            <div className="chat-welcome">
              <div className="chat-welcome-art">💬</div>
              <p className="chat-eyebrow">TOGETHER, EVERYWHERE</p>
              <h2>Good conversations make a great team.</h2>
              <p>Start a private conversation or bring family, friends, and Pharmacy ELAF teammates together in a group.</p>
              <button type="button" className="chat-primary-button" onClick={() => setContactPickerOpen(true)}>Find people</button>
            </div>
          )}
        </section>
      </div>

      {groupDialogOpen && (
        <div className="chat-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setGroupDialogOpen(false); }}>
          <form className="chat-group-modal" onSubmit={createGroup} aria-labelledby="create-group-title">
            <button type="button" className="chat-modal-close" onClick={() => setGroupDialogOpen(false)} aria-label="Close">×</button>
            <p className="chat-eyebrow">BRING EVERYONE TOGETHER</p><h2 id="create-group-title">Create a group</h2>
            <label className="chat-field-label">Group name<input value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} required maxLength={80} placeholder="Family, friends, or Pharmacy ELAF team" /></label>
            <p className="chat-field-label">Choose people <span>({groupMemberIds.length} selected)</span></p>
            <div className="chat-group-people">
              {directory.map((profile) => (
                <label className="chat-group-person" key={profile.id}>
                  <input type="checkbox" checked={groupMemberIds.includes(profile.id)} onChange={(event) => setGroupMemberIds((current) => event.target.checked ? [...current, profile.id] : current.filter((id) => id !== profile.id))} />
                  <Avatar profile={profile} small /><span>{profile.display_name}</span>
                </label>
              ))}
              {!directory.length && <p className="chat-empty-list">Other people can join by creating a free chat account.</p>}
            </div>
            {pageError && <p className="chat-alert chat-alert-error" role="alert">{pageError}</p>}
            <button className="chat-primary-button chat-auth-submit" type="submit" disabled={!groupTitle.trim() || !groupMemberIds.length}>Create group chat</button>
          </form>
        </div>
      )}
    </main>
  );
}

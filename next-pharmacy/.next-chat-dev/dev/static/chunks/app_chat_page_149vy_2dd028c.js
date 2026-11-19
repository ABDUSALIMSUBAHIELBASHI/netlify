(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/app/chat/page.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ChatPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$image$2d$component$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Image__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/image-component.js [app-client] (ecmascript) <export Image as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/socket.io-client/build/esm/index.js [app-client] (ecmascript) <locals>");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
const maxImageBytes = 6 * 1024 * 1024;
async function chatRequest(url, options = {}) {
    const response = await fetch(url, {
        credentials: "same-origin",
        ...options
    });
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
    return name.trim().split(/\s+/).slice(0, 2).map((part)=>part[0] || "").join("").toUpperCase() || "?";
}
function Avatar({ profile, group = false, small = false }) {
    if (group) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: `chat-avatar chat-avatar-group${small ? " chat-avatar-small" : ""}`,
            "aria-hidden": "true",
            children: "👥"
        }, void 0, false, {
            fileName: "[project]/app/chat/page.js",
            lineNumber: 33,
            columnNumber: 12
        }, this);
    }
    if (profile?.avatar_url) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$image$2d$component$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Image__as__default$3e$__["default"], {
            className: `chat-avatar${small ? " chat-avatar-small" : ""}`,
            src: profile.avatar_url,
            alt: "",
            width: small ? 34 : 43,
            height: small ? 34 : 43,
            unoptimized: true
        }, void 0, false, {
            fileName: "[project]/app/chat/page.js",
            lineNumber: 36,
            columnNumber: 12
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `chat-avatar chat-avatar-initials${small ? " chat-avatar-small" : ""}`,
        "aria-hidden": "true",
        children: getInitials(profile?.display_name)
    }, void 0, false, {
        fileName: "[project]/app/chat/page.js",
        lineNumber: 39,
        columnNumber: 5
    }, this);
}
_c = Avatar;
function mapMessage(message) {
    return {
        id: message.id,
        conversation_id: message.conversationId,
        sender_id: message.senderId,
        body: message.body,
        imageUrl: message.imageUrl,
        created_at: message.createdAt,
        sender: message.sender ? {
            display_name: message.sender.displayName
        } : null
    };
}
async function fetchConversations(userId) {
    const { conversations } = await chatRequest("/api/chat/conversations");
    return conversations.map((conversation)=>{
        const members = conversation.members.map((member)=>({
                user_id: member.id,
                profile: {
                    id: member.id,
                    display_name: member.displayName
                }
            }));
        const otherMember = members.find((member)=>member.user_id !== userId);
        return {
            ...conversation,
            members,
            displayTitle: conversation.kind === "group" ? conversation.title : otherMember?.profile?.display_name || "Direct chat",
            otherMember
        };
    });
}
function AuthPanel() {
    _s();
    const [mode, setMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("login");
    const [fullName, setFullName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [email, setEmail] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [password, setPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [busy, setBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
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
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                    fullName: fullName.trim()
                })
            });
            window.location.reload();
        } catch (submitError) {
            setError(getErrorMessage(submitError));
        } finally{
            setBusy(false);
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "chat-auth-page",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                className: "chat-back-link",
                href: "/",
                children: "← Back to Pharmacy ELAF"
            }, void 0, false, {
                fileName: "[project]/app/chat/page.js",
                lineNumber: 105,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: "chat-auth-card",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "chat-brand-mark",
                        children: "✚"
                    }, void 0, false, {
                        fileName: "[project]/app/chat/page.js",
                        lineNumber: 107,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "chat-eyebrow",
                        children: "PHARMACY ELAF · PRIVATE CHAT"
                    }, void 0, false, {
                        fileName: "[project]/app/chat/page.js",
                        lineNumber: 108,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        children: "Stay close, wherever you are."
                    }, void 0, false, {
                        fileName: "[project]/app/chat/page.js",
                        lineNumber: 109,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "chat-auth-intro",
                        children: "Create a free chat account to message family, friends, and the Pharmacy ELAF team."
                    }, void 0, false, {
                        fileName: "[project]/app/chat/page.js",
                        lineNumber: 110,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "chat-auth-tabs",
                        role: "tablist",
                        "aria-label": "Account options",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: mode === "login" ? "selected" : "",
                                onClick: ()=>{
                                    setMode("login");
                                    setError("");
                                },
                                children: "Sign in"
                            }, void 0, false, {
                                fileName: "[project]/app/chat/page.js",
                                lineNumber: 112,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: mode === "register" ? "selected" : "",
                                onClick: ()=>{
                                    setMode("register");
                                    setError("");
                                },
                                children: "Create account"
                            }, void 0, false, {
                                fileName: "[project]/app/chat/page.js",
                                lineNumber: 113,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/chat/page.js",
                        lineNumber: 111,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                        className: "chat-auth-form",
                        onSubmit: submit,
                        children: [
                            mode === "register" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                children: [
                                    "Full name",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        autoComplete: "name",
                                        value: fullName,
                                        onChange: (event)=>setFullName(event.target.value),
                                        required: true,
                                        maxLength: 80
                                    }, void 0, false, {
                                        fileName: "[project]/app/chat/page.js",
                                        lineNumber: 119,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/chat/page.js",
                                lineNumber: 117,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                children: [
                                    "Email address",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "email",
                                        autoComplete: "email",
                                        value: email,
                                        onChange: (event)=>setEmail(event.target.value),
                                        required: true
                                    }, void 0, false, {
                                        fileName: "[project]/app/chat/page.js",
                                        lineNumber: 124,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/chat/page.js",
                                lineNumber: 122,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                children: [
                                    "Password",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "password",
                                        autoComplete: mode === "register" ? "new-password" : "current-password",
                                        value: password,
                                        onChange: (event)=>setPassword(event.target.value),
                                        minLength: 8,
                                        required: true
                                    }, void 0, false, {
                                        fileName: "[project]/app/chat/page.js",
                                        lineNumber: 128,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/chat/page.js",
                                lineNumber: 126,
                                columnNumber: 11
                            }, this),
                            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "chat-alert chat-alert-error",
                                role: "alert",
                                children: error
                            }, void 0, false, {
                                fileName: "[project]/app/chat/page.js",
                                lineNumber: 130,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "chat-primary-button chat-auth-submit",
                                type: "submit",
                                disabled: busy,
                                children: busy ? "Please wait…" : mode === "register" ? "Create free account" : "Sign in to chat"
                            }, void 0, false, {
                                fileName: "[project]/app/chat/page.js",
                                lineNumber: 131,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/chat/page.js",
                        lineNumber: 115,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "chat-auth-footnote",
                        children: "Your password is hashed before it is stored. Chat accounts are separate from device-only storefront accounts."
                    }, void 0, false, {
                        fileName: "[project]/app/chat/page.js",
                        lineNumber: 135,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/chat/page.js",
                lineNumber: 106,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/chat/page.js",
        lineNumber: 104,
        columnNumber: 5
    }, this);
}
_s(AuthPanel, "qRNI02ZfVUrmPXbNZSrQsBc2sCc=");
_c1 = AuthPanel;
function ChatPage() {
    _s1();
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [authLoading, setAuthLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [directory, setDirectory] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [conversations, setConversations] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [activeConversationId, setActiveConversationId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [messageState, setMessageState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        conversationId: "",
        items: []
    });
    const [onlineUserIds, setOnlineUserIds] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loadingChat, setLoadingChat] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [sending, setSending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [draft, setDraft] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [attachment, setAttachment] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [pageError, setPageError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [contactPickerOpen, setContactPickerOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [directoryQuery, setDirectoryQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [groupDialogOpen, setGroupDialogOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [groupTitle, setGroupTitle] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [groupMemberIds, setGroupMemberIds] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [reloadKey, setReloadKey] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [mobileListOpen, setMobileListOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const messageEndRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const imageInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const socketRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const activeConversationRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])("");
    const userId = user?.id || "";
    const ownName = user?.displayName || "Pharmacy ELAF member";
    const activeConversation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ChatPage.useMemo[activeConversation]": ()=>conversations.find({
                "ChatPage.useMemo[activeConversation]": (conversation)=>conversation.id === activeConversationId
            }["ChatPage.useMemo[activeConversation]"]) || null
    }["ChatPage.useMemo[activeConversation]"], [
        conversations,
        activeConversationId
    ]);
    const messages = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ChatPage.useMemo[messages]": ()=>messageState.conversationId === activeConversationId ? messageState.items : []
    }["ChatPage.useMemo[messages]"], [
        messageState,
        activeConversationId
    ]);
    const loadingMessages = Boolean(activeConversationId && messageState.conversationId !== activeConversationId && !pageError);
    const filteredDirectory = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ChatPage.useMemo[filteredDirectory]": ()=>{
            const query = directoryQuery.trim().toLowerCase();
            return directory.filter({
                "ChatPage.useMemo[filteredDirectory]": (profile)=>profile.display_name.toLowerCase().includes(query)
            }["ChatPage.useMemo[filteredDirectory]"]);
        }
    }["ChatPage.useMemo[filteredDirectory]"], [
        directory,
        directoryQuery
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPage.useEffect": ()=>{
            activeConversationRef.current = activeConversationId;
        }
    }["ChatPage.useEffect"], [
        activeConversationId
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPage.useEffect": ()=>{
            let mounted = true;
            chatRequest("/api/chat/auth/me").then({
                "ChatPage.useEffect": ({ user: currentUser })=>{
                    if (mounted) setUser(currentUser);
                }
            }["ChatPage.useEffect"]).catch({
                "ChatPage.useEffect": (error)=>{
                    if (mounted && error.status !== 401) setPageError(getErrorMessage(error));
                }
            }["ChatPage.useEffect"]).finally({
                "ChatPage.useEffect": ()=>{
                    if (mounted) setAuthLoading(false);
                }
            }["ChatPage.useEffect"]);
            return ({
                "ChatPage.useEffect": ()=>{
                    mounted = false;
                }
            })["ChatPage.useEffect"];
        }
    }["ChatPage.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPage.useEffect": ()=>{
            if (!userId) return undefined;
            const socket = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["io"])({
                withCredentials: true
            });
            socketRef.current = socket;
            socket.on("presence:sync", {
                "ChatPage.useEffect": ({ onlineUserIds: ids })=>setOnlineUserIds(ids || [])
            }["ChatPage.useEffect"]);
            socket.on("presence:update", {
                "ChatPage.useEffect": ({ userId: changedUserId, online })=>{
                    setOnlineUserIds({
                        "ChatPage.useEffect": (current)=>online ? [
                                ...new Set([
                                    ...current,
                                    changedUserId
                                ])
                            ] : current.filter({
                                "ChatPage.useEffect": (id)=>id !== changedUserId
                            }["ChatPage.useEffect"])
                    }["ChatPage.useEffect"]);
                }
            }["ChatPage.useEffect"]);
            socket.on("connect_error", {
                "ChatPage.useEffect": (error)=>setPageError(getErrorMessage(error))
            }["ChatPage.useEffect"]);
            socket.on("conversation:created", {
                "ChatPage.useEffect": ()=>setReloadKey({
                        "ChatPage.useEffect": (key)=>key + 1
                    }["ChatPage.useEffect"])
            }["ChatPage.useEffect"]);
            socket.on("chat:message", {
                "ChatPage.useEffect": ({ conversationId })=>{
                    if (activeConversationRef.current === conversationId) setReloadKey({
                        "ChatPage.useEffect": (key)=>key + 1
                    }["ChatPage.useEffect"]);
                }
            }["ChatPage.useEffect"]);
            return ({
                "ChatPage.useEffect": ()=>{
                    socket.disconnect();
                    socketRef.current = null;
                }
            })["ChatPage.useEffect"];
        }
    }["ChatPage.useEffect"], [
        userId
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPage.useEffect": ()=>{
            if (!userId) return undefined;
            let cancelled = false;
            async function loadChatData() {
                setLoadingChat(true);
                setPageError("");
                try {
                    const [{ users }, nextConversations] = await Promise.all([
                        chatRequest("/api/chat/users"),
                        fetchConversations(userId)
                    ]);
                    if (cancelled) return;
                    setDirectory(users.map({
                        "ChatPage.useEffect.loadChatData": (profile)=>({
                                id: profile.id,
                                display_name: profile.displayName,
                                avatar_url: null
                            })
                    }["ChatPage.useEffect.loadChatData"]));
                    setConversations(nextConversations);
                    setActiveConversationId({
                        "ChatPage.useEffect.loadChatData": (current)=>current && nextConversations.some({
                                "ChatPage.useEffect.loadChatData": (conversation)=>conversation.id === current
                            }["ChatPage.useEffect.loadChatData"]) ? current : nextConversations[0]?.id || ""
                    }["ChatPage.useEffect.loadChatData"]);
                } catch (error) {
                    if (!cancelled) setPageError(getErrorMessage(error));
                } finally{
                    if (!cancelled) setLoadingChat(false);
                }
            }
            loadChatData();
            return ({
                "ChatPage.useEffect": ()=>{
                    cancelled = true;
                }
            })["ChatPage.useEffect"];
        }
    }["ChatPage.useEffect"], [
        userId,
        reloadKey
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPage.useEffect": ()=>{
            if (!userId || !activeConversationId) return undefined;
            socketRef.current?.emit("conversation:join", activeConversationId, {
                "ChatPage.useEffect": (result)=>{
                    if (result?.onlineUserIds) setOnlineUserIds({
                        "ChatPage.useEffect": (current)=>[
                                ...new Set([
                                    ...current,
                                    ...result.onlineUserIds
                                ])
                            ]
                    }["ChatPage.useEffect"]);
                }
            }["ChatPage.useEffect"]);
            let cancelled = false;
            async function loadMessages() {
                try {
                    const { messages: results } = await chatRequest(`/api/chat/conversations/${activeConversationId}/messages`);
                    if (!cancelled) setMessageState({
                        conversationId: activeConversationId,
                        items: results.map(mapMessage)
                    });
                } catch (error) {
                    if (!cancelled) {
                        setMessageState({
                            conversationId: activeConversationId,
                            items: []
                        });
                        setPageError(getErrorMessage(error));
                    }
                }
            }
            loadMessages();
            return ({
                "ChatPage.useEffect": ()=>{
                    cancelled = true;
                }
            })["ChatPage.useEffect"];
        }
    }["ChatPage.useEffect"], [
        activeConversationId,
        userId,
        reloadKey
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPage.useEffect": ()=>{
            if (!attachment) return undefined;
            return ({
                "ChatPage.useEffect": ()=>URL.revokeObjectURL(attachment.previewUrl)
            })["ChatPage.useEffect"];
        }
    }["ChatPage.useEffect"], [
        attachment
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPage.useEffect": ()=>{
            messageEndRef.current?.scrollIntoView({
                behavior: "smooth"
            });
        }
    }["ChatPage.useEffect"], [
        messages,
        activeConversationId
    ]);
    async function openDirectChat(profile) {
        setPageError("");
        try {
            const { conversationId } = await chatRequest("/api/chat/conversations/direct", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    targetUserId: profile.id
                })
            });
            setActiveConversationId(conversationId);
            setMobileListOpen(false);
            setContactPickerOpen(false);
            setDirectoryQuery("");
            setReloadKey((key)=>key + 1);
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
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    title: groupTitle.trim(),
                    memberIds: groupMemberIds
                })
            });
            setActiveConversationId(conversationId);
            setMobileListOpen(false);
            setGroupDialogOpen(false);
            setGroupTitle("");
            setGroupMemberIds([]);
            setReloadKey((key)=>key + 1);
        } catch (error) {
            setPageError(getErrorMessage(error));
        }
    }
    function chooseImage(event) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (![
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ].includes(file.type)) {
            setPageError("Choose a JPG, PNG, WebP, or GIF image.");
            return;
        }
        if (file.size > maxImageBytes) {
            setPageError("Images must be 6 MB or smaller.");
            return;
        }
        setPageError("");
        setAttachment({
            file,
            previewUrl: URL.createObjectURL(file)
        });
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
                body: formData
            });
            setMessageState((current)=>current.conversationId === activeConversation.id ? {
                    ...current,
                    items: current.items.some((item)=>item.id === message.id) ? current.items : [
                        ...current.items,
                        mapMessage(message)
                    ]
                } : current);
            setDraft("");
            setAttachment(null);
            setReloadKey((key)=>key + 1);
        } catch (error) {
            setPageError(getErrorMessage(error));
        } finally{
            setSending(false);
        }
    }
    async function signOut() {
        try {
            await chatRequest("/api/chat/auth/logout", {
                method: "POST"
            });
            window.location.reload();
        } catch (error) {
            setPageError(getErrorMessage(error));
        }
    }
    if (authLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
            className: "chat-loading-page",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "chat-spinner"
                }, void 0, false, {
                    fileName: "[project]/app/chat/page.js",
                    lineNumber: 384,
                    columnNumber: 48
                }, this),
                "Connecting to local chat server…"
            ]
        }, void 0, true, {
            fileName: "[project]/app/chat/page.js",
            lineNumber: 384,
            columnNumber: 12
        }, this);
    }
    if (!user) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthPanel, {}, void 0, false, {
        fileName: "[project]/app/chat/page.js",
        lineNumber: 386,
        columnNumber: 21
    }, this);
    const onlineCount = activeConversation ? activeConversation.members.filter((member)=>member.user_id !== userId && onlineUserIds.includes(member.user_id)).length : 0;
    const headerProfile = activeConversation?.otherMember?.profile;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "chat-page",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "chat-topbar",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        className: "chat-top-brand",
                        href: "/",
                        "aria-label": "Back to Pharmacy ELAF",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "chat-brand-mark",
                                children: "✚"
                            }, void 0, false, {
                                fileName: "[project]/app/chat/page.js",
                                lineNumber: 397,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                        children: "Pharmacy ELAF"
                                    }, void 0, false, {
                                        fileName: "[project]/app/chat/page.js",
                                        lineNumber: 398,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("small", {
                                        children: "TEAM CHAT"
                                    }, void 0, false, {
                                        fileName: "[project]/app/chat/page.js",
                                        lineNumber: 398,
                                        columnNumber: 47
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/chat/page.js",
                                lineNumber: 398,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/chat/page.js",
                        lineNumber: 396,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "chat-top-user",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Avatar, {
                                profile: {
                                    display_name: ownName
                                },
                                small: true
                            }, void 0, false, {
                                fileName: "[project]/app/chat/page.js",
                                lineNumber: 401,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: ownName
                            }, void 0, false, {
                                fileName: "[project]/app/chat/page.js",
                                lineNumber: 402,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: "chat-quiet-button",
                                onClick: signOut,
                                children: "Sign out"
                            }, void 0, false, {
                                fileName: "[project]/app/chat/page.js",
                                lineNumber: 403,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/chat/page.js",
                        lineNumber: 400,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/chat/page.js",
                lineNumber: 395,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `chat-shell${mobileListOpen ? " chat-mobile-list-open" : ""}`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                        className: `chat-sidebar${contactPickerOpen ? " chat-sidebar-contacts" : ""}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "chat-sidebar-heading",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "chat-eyebrow",
                                                children: "YOUR PEOPLE"
                                            }, void 0, false, {
                                                fileName: "[project]/app/chat/page.js",
                                                lineNumber: 410,
                                                columnNumber: 18
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                                children: contactPickerOpen ? "Start a chat" : "Messages"
                                            }, void 0, false, {
                                                fileName: "[project]/app/chat/page.js",
                                                lineNumber: 410,
                                                columnNumber: 61
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/chat/page.js",
                                        lineNumber: 410,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        className: "chat-icon-button",
                                        onClick: ()=>{
                                            setContactPickerOpen((open)=>!open);
                                            setDirectoryQuery("");
                                        },
                                        "aria-label": contactPickerOpen ? "Close contacts" : "Find a person",
                                        title: "New chat",
                                        children: "＋"
                                    }, void 0, false, {
                                        fileName: "[project]/app/chat/page.js",
                                        lineNumber: 411,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/chat/page.js",
                                lineNumber: 409,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "chat-sidebar-actions",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: "chat-secondary-button",
                                    onClick: ()=>{
                                        setGroupDialogOpen(true);
                                        setContactPickerOpen(false);
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "👥"
                                        }, void 0, false, {
                                            fileName: "[project]/app/chat/page.js",
                                            lineNumber: 415,
                                            columnNumber: 15
                                        }, this),
                                        " New group"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/chat/page.js",
                                    lineNumber: 414,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/chat/page.js",
                                lineNumber: 413,
                                columnNumber: 11
                            }, this),
                            contactPickerOpen ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "chat-contact-picker",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "chat-search",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                "aria-hidden": "true",
                                                children: "⌕"
                                            }, void 0, false, {
                                                fileName: "[project]/app/chat/page.js",
                                                lineNumber: 420,
                                                columnNumber: 46
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                value: directoryQuery,
                                                onChange: (event)=>setDirectoryQuery(event.target.value),
                                                placeholder: "Search registered people",
                                                "aria-label": "Search registered people"
                                            }, void 0, false, {
                                                fileName: "[project]/app/chat/page.js",
                                                lineNumber: 420,
                                                columnNumber: 79
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/chat/page.js",
                                        lineNumber: 420,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "chat-list-label",
                                        children: "REGISTERED CHAT MEMBERS"
                                    }, void 0, false, {
                                        fileName: "[project]/app/chat/page.js",
                                        lineNumber: 421,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "chat-list-scroll",
                                        children: [
                                            filteredDirectory.map((profile)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    type: "button",
                                                    className: "chat-person-row",
                                                    onClick: ()=>openDirectChat(profile),
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Avatar, {
                                                            profile: profile
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/chat/page.js",
                                                            lineNumber: 425,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "chat-person-copy",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                    children: profile.display_name
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/chat/page.js",
                                                                    lineNumber: 426,
                                                                    columnNumber: 56
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("small", {
                                                                    children: "Start a private chat"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/chat/page.js",
                                                                    lineNumber: 426,
                                                                    columnNumber: 95
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/chat/page.js",
                                                            lineNumber: 426,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "chat-person-arrow",
                                                            children: "›"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/chat/page.js",
                                                            lineNumber: 427,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, profile.id, true, {
                                                    fileName: "[project]/app/chat/page.js",
                                                    lineNumber: 424,
                                                    columnNumber: 19
                                                }, this)),
                                            !filteredDirectory.length && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "chat-empty-list",
                                                children: "No members found. They can create a free chat account to join."
                                            }, void 0, false, {
                                                fileName: "[project]/app/chat/page.js",
                                                lineNumber: 430,
                                                columnNumber: 47
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/chat/page.js",
                                        lineNumber: 422,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/chat/page.js",
                                lineNumber: 419,
                                columnNumber: 13
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "chat-search",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                "aria-hidden": "true",
                                                children: "⌕"
                                            }, void 0, false, {
                                                fileName: "[project]/app/chat/page.js",
                                                lineNumber: 435,
                                                columnNumber: 46
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                value: directoryQuery,
                                                onChange: (event)=>setDirectoryQuery(event.target.value),
                                                placeholder: "Search chats",
                                                "aria-label": "Search chats"
                                            }, void 0, false, {
                                                fileName: "[project]/app/chat/page.js",
                                                lineNumber: 435,
                                                columnNumber: 79
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/chat/page.js",
                                        lineNumber: 435,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "chat-list-label",
                                        children: "RECENT"
                                    }, void 0, false, {
                                        fileName: "[project]/app/chat/page.js",
                                        lineNumber: 436,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "chat-list-scroll",
                                        children: [
                                            conversations.filter((conversation)=>conversation.displayTitle.toLowerCase().includes(directoryQuery.toLowerCase())).map((conversation)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    type: "button",
                                                    className: `chat-conversation-row${conversation.id === activeConversationId ? " active" : ""}`,
                                                    onClick: ()=>{
                                                        setActiveConversationId(conversation.id);
                                                        setMobileListOpen(false);
                                                    },
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Avatar, {
                                                            profile: conversation.otherMember?.profile,
                                                            group: conversation.kind === "group"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/chat/page.js",
                                                            lineNumber: 440,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "chat-person-copy",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                                    children: conversation.displayTitle
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/chat/page.js",
                                                                    lineNumber: 441,
                                                                    columnNumber: 56
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("small", {
                                                                    children: conversation.kind === "group" ? `${conversation.members.length} members` : "Private conversation"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/chat/page.js",
                                                                    lineNumber: 441,
                                                                    columnNumber: 100
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/chat/page.js",
                                                            lineNumber: 441,
                                                            columnNumber: 21
                                                        }, this),
                                                        conversation.members.some((member)=>member.user_id !== userId && onlineUserIds.includes(member.user_id)) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "chat-online-dot",
                                                            title: "Online"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/chat/page.js",
                                                            lineNumber: 442,
                                                            columnNumber: 132
                                                        }, this)
                                                    ]
                                                }, conversation.id, true, {
                                                    fileName: "[project]/app/chat/page.js",
                                                    lineNumber: 439,
                                                    columnNumber: 19
                                                }, this)),
                                            !conversations.length && !loadingChat && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "chat-empty-list",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "💬"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/chat/page.js",
                                                        lineNumber: 445,
                                                        columnNumber: 92
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                        children: "Your conversations start here"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/chat/page.js",
                                                        lineNumber: 445,
                                                        columnNumber: 107
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        children: "Find a registered member or create a group with family, friends, or your team."
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/chat/page.js",
                                                        lineNumber: 445,
                                                        columnNumber: 153
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/chat/page.js",
                                                lineNumber: 445,
                                                columnNumber: 59
                                            }, this),
                                            loadingChat && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "chat-empty-list",
                                                children: "Loading conversations…"
                                            }, void 0, false, {
                                                fileName: "[project]/app/chat/page.js",
                                                lineNumber: 446,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/chat/page.js",
                                        lineNumber: 437,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/chat/page.js",
                                lineNumber: 434,
                                columnNumber: 13
                            }, this),
                            pageError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "chat-inline-alert",
                                role: "alert",
                                children: pageError
                            }, void 0, false, {
                                fileName: "[project]/app/chat/page.js",
                                lineNumber: 450,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "chat-sidebar-footer",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "chat-secure-dot"
                                    }, void 0, false, {
                                        fileName: "[project]/app/chat/page.js",
                                        lineNumber: 451,
                                        columnNumber: 48
                                    }, this),
                                    " Private conversations · local MongoDB"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/chat/page.js",
                                lineNumber: 451,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/chat/page.js",
                        lineNumber: 408,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "chat-main",
                        "aria-label": "Conversation",
                        children: activeConversation ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                                    className: "chat-conversation-header",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "chat-conversation-identity",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    type: "button",
                                                    className: "chat-mobile-back",
                                                    onClick: ()=>setMobileListOpen(true),
                                                    "aria-label": "Back to conversations",
                                                    children: "‹"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/chat/page.js",
                                                    lineNumber: 459,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Avatar, {
                                                    profile: headerProfile,
                                                    group: activeConversation.kind === "group"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/chat/page.js",
                                                    lineNumber: 460,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                            children: activeConversation.displayTitle
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/chat/page.js",
                                                            lineNumber: 462,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            children: activeConversation.kind === "group" ? `${activeConversation.members.length} members${onlineCount ? ` · ${onlineCount} online` : ""}` : onlineCount ? "Online now" : "Private conversation"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/chat/page.js",
                                                            lineNumber: 463,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/chat/page.js",
                                                    lineNumber: 461,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/chat/page.js",
                                            lineNumber: 458,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "chat-live-indicator",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {}, void 0, false, {
                                                    fileName: "[project]/app/chat/page.js",
                                                    lineNumber: 466,
                                                    columnNumber: 55
                                                }, this),
                                                " Live"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/chat/page.js",
                                            lineNumber: 466,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/chat/page.js",
                                    lineNumber: 457,
                                    columnNumber: 15
                                }, this),
                                pageError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "chat-inline-alert",
                                    role: "alert",
                                    children: pageError
                                }, void 0, false, {
                                    fileName: "[project]/app/chat/page.js",
                                    lineNumber: 468,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "chat-messages",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "chat-message-date",
                                            children: "Messages are visible only to conversation members"
                                        }, void 0, false, {
                                            fileName: "[project]/app/chat/page.js",
                                            lineNumber: 470,
                                            columnNumber: 17
                                        }, this),
                                        loadingMessages && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "chat-message-loading",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "chat-spinner"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/chat/page.js",
                                                    lineNumber: 471,
                                                    columnNumber: 75
                                                }, this),
                                                " Loading messages…"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/chat/page.js",
                                            lineNumber: 471,
                                            columnNumber: 37
                                        }, this),
                                        !loadingMessages && !messages.length && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "chat-first-message",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Avatar, {
                                                    profile: headerProfile,
                                                    group: activeConversation.kind === "group"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/chat/page.js",
                                                    lineNumber: 472,
                                                    columnNumber: 94
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                    children: [
                                                        "Say hello to ",
                                                        activeConversation.displayTitle
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/chat/page.js",
                                                    lineNumber: 472,
                                                    columnNumber: 172
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    children: "Your messages and shared images will appear here."
                                                }, void 0, false, {
                                                    fileName: "[project]/app/chat/page.js",
                                                    lineNumber: 472,
                                                    columnNumber: 235
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/chat/page.js",
                                            lineNumber: 472,
                                            columnNumber: 58
                                        }, this),
                                        messages.map((message)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                                                className: `chat-message${message.sender_id === userId ? " own" : ""}`,
                                                children: [
                                                    message.sender_id !== userId && activeConversation.kind === "group" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "chat-message-sender",
                                                        children: message.sender?.display_name || "Team member"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/chat/page.js",
                                                        lineNumber: 475,
                                                        columnNumber: 93
                                                    }, this),
                                                    message.imageUrl && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                        className: "chat-message-image",
                                                        href: message.imageUrl,
                                                        target: "_blank",
                                                        rel: "noreferrer",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$image$2d$component$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Image__as__default$3e$__["default"], {
                                                            src: message.imageUrl,
                                                            alt: "Shared in chat",
                                                            width: 560,
                                                            height: 260,
                                                            unoptimized: true
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/chat/page.js",
                                                            lineNumber: 476,
                                                            columnNumber: 133
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/chat/page.js",
                                                        lineNumber: 476,
                                                        columnNumber: 42
                                                    }, this),
                                                    message.body && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        children: message.body
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/chat/page.js",
                                                        lineNumber: 477,
                                                        columnNumber: 38
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("time", {
                                                        dateTime: message.created_at,
                                                        children: new Date(message.created_at).toLocaleTimeString([], {
                                                            hour: "numeric",
                                                            minute: "2-digit"
                                                        })
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/chat/page.js",
                                                        lineNumber: 478,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, message.id, true, {
                                                fileName: "[project]/app/chat/page.js",
                                                lineNumber: 474,
                                                columnNumber: 19
                                            }, this)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            ref: messageEndRef
                                        }, void 0, false, {
                                            fileName: "[project]/app/chat/page.js",
                                            lineNumber: 481,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/chat/page.js",
                                    lineNumber: 469,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                                    className: "chat-composer",
                                    onSubmit: sendMessage,
                                    children: [
                                        attachment && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "chat-attachment-preview",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$image$2d$component$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Image__as__default$3e$__["default"], {
                                                    src: attachment.previewUrl,
                                                    alt: "Selected image preview",
                                                    width: 34,
                                                    height: 34,
                                                    unoptimized: true
                                                }, void 0, false, {
                                                    fileName: "[project]/app/chat/page.js",
                                                    lineNumber: 484,
                                                    columnNumber: 73
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: attachment.file.name
                                                }, void 0, false, {
                                                    fileName: "[project]/app/chat/page.js",
                                                    lineNumber: 484,
                                                    columnNumber: 174
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    type: "button",
                                                    onClick: ()=>setAttachment(null),
                                                    "aria-label": "Remove selected image",
                                                    children: "×"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/chat/page.js",
                                                    lineNumber: 484,
                                                    columnNumber: 209
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/chat/page.js",
                                            lineNumber: 484,
                                            columnNumber: 32
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "chat-composer-row",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    ref: imageInputRef,
                                                    className: "chat-file-input",
                                                    type: "file",
                                                    accept: "image/jpeg,image/png,image/webp,image/gif",
                                                    onChange: chooseImage
                                                }, void 0, false, {
                                                    fileName: "[project]/app/chat/page.js",
                                                    lineNumber: 486,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    type: "button",
                                                    className: "chat-attach-button",
                                                    onClick: ()=>imageInputRef.current?.click(),
                                                    "aria-label": "Attach an image",
                                                    title: "Attach an image",
                                                    children: "＋"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/chat/page.js",
                                                    lineNumber: 487,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                                    value: draft,
                                                    onChange: (event)=>setDraft(event.target.value),
                                                    placeholder: "Write a message…",
                                                    "aria-label": "Write a message",
                                                    rows: 1,
                                                    maxLength: 4000
                                                }, void 0, false, {
                                                    fileName: "[project]/app/chat/page.js",
                                                    lineNumber: 488,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    className: "chat-send-button",
                                                    type: "submit",
                                                    disabled: sending || !draft.trim() && !attachment,
                                                    "aria-label": "Send message",
                                                    children: sending ? "…" : "➤"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/chat/page.js",
                                                    lineNumber: 489,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/chat/page.js",
                                            lineNumber: 485,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "chat-composer-hint",
                                            children: "Share text or an image up to 6 MB · max 4,000 characters"
                                        }, void 0, false, {
                                            fileName: "[project]/app/chat/page.js",
                                            lineNumber: 491,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/chat/page.js",
                                    lineNumber: 483,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/chat/page.js",
                            lineNumber: 456,
                            columnNumber: 13
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "chat-welcome",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "chat-welcome-art",
                                    children: "💬"
                                }, void 0, false, {
                                    fileName: "[project]/app/chat/page.js",
                                    lineNumber: 496,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "chat-eyebrow",
                                    children: "TOGETHER, EVERYWHERE"
                                }, void 0, false, {
                                    fileName: "[project]/app/chat/page.js",
                                    lineNumber: 497,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    children: "Good conversations make a great team."
                                }, void 0, false, {
                                    fileName: "[project]/app/chat/page.js",
                                    lineNumber: 498,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    children: "Start a private conversation or bring family, friends, and Pharmacy ELAF teammates together in a group."
                                }, void 0, false, {
                                    fileName: "[project]/app/chat/page.js",
                                    lineNumber: 499,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: "chat-primary-button",
                                    onClick: ()=>setContactPickerOpen(true),
                                    children: "Find people"
                                }, void 0, false, {
                                    fileName: "[project]/app/chat/page.js",
                                    lineNumber: 500,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/chat/page.js",
                            lineNumber: 495,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/chat/page.js",
                        lineNumber: 454,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/chat/page.js",
                lineNumber: 407,
                columnNumber: 7
            }, this),
            groupDialogOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "chat-modal-backdrop",
                role: "presentation",
                onMouseDown: (event)=>{
                    if (event.target === event.currentTarget) setGroupDialogOpen(false);
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    className: "chat-group-modal",
                    onSubmit: createGroup,
                    "aria-labelledby": "create-group-title",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            className: "chat-modal-close",
                            onClick: ()=>setGroupDialogOpen(false),
                            "aria-label": "Close",
                            children: "×"
                        }, void 0, false, {
                            fileName: "[project]/app/chat/page.js",
                            lineNumber: 509,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "chat-eyebrow",
                            children: "BRING EVERYONE TOGETHER"
                        }, void 0, false, {
                            fileName: "[project]/app/chat/page.js",
                            lineNumber: 510,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            id: "create-group-title",
                            children: "Create a group"
                        }, void 0, false, {
                            fileName: "[project]/app/chat/page.js",
                            lineNumber: 510,
                            columnNumber: 68
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "chat-field-label",
                            children: [
                                "Group name",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    value: groupTitle,
                                    onChange: (event)=>setGroupTitle(event.target.value),
                                    required: true,
                                    maxLength: 80,
                                    placeholder: "Family, friends, or Pharmacy ELAF team"
                                }, void 0, false, {
                                    fileName: "[project]/app/chat/page.js",
                                    lineNumber: 511,
                                    columnNumber: 59
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/chat/page.js",
                            lineNumber: 511,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "chat-field-label",
                            children: [
                                "Choose people ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: [
                                        "(",
                                        groupMemberIds.length,
                                        " selected)"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/chat/page.js",
                                    lineNumber: 512,
                                    columnNumber: 59
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/chat/page.js",
                            lineNumber: 512,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "chat-group-people",
                            children: [
                                directory.map((profile)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "chat-group-person",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "checkbox",
                                                checked: groupMemberIds.includes(profile.id),
                                                onChange: (event)=>setGroupMemberIds((current)=>event.target.checked ? [
                                                            ...current,
                                                            profile.id
                                                        ] : current.filter((id)=>id !== profile.id))
                                            }, void 0, false, {
                                                fileName: "[project]/app/chat/page.js",
                                                lineNumber: 516,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Avatar, {
                                                profile: profile,
                                                small: true
                                            }, void 0, false, {
                                                fileName: "[project]/app/chat/page.js",
                                                lineNumber: 517,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: profile.display_name
                                            }, void 0, false, {
                                                fileName: "[project]/app/chat/page.js",
                                                lineNumber: 517,
                                                columnNumber: 53
                                            }, this)
                                        ]
                                    }, profile.id, true, {
                                        fileName: "[project]/app/chat/page.js",
                                        lineNumber: 515,
                                        columnNumber: 17
                                    }, this)),
                                !directory.length && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "chat-empty-list",
                                    children: "Other people can join by creating a free chat account."
                                }, void 0, false, {
                                    fileName: "[project]/app/chat/page.js",
                                    lineNumber: 520,
                                    columnNumber: 37
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/chat/page.js",
                            lineNumber: 513,
                            columnNumber: 13
                        }, this),
                        pageError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "chat-alert chat-alert-error",
                            role: "alert",
                            children: pageError
                        }, void 0, false, {
                            fileName: "[project]/app/chat/page.js",
                            lineNumber: 522,
                            columnNumber: 27
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            className: "chat-primary-button chat-auth-submit",
                            type: "submit",
                            disabled: !groupTitle.trim() || !groupMemberIds.length,
                            children: "Create group chat"
                        }, void 0, false, {
                            fileName: "[project]/app/chat/page.js",
                            lineNumber: 523,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/chat/page.js",
                    lineNumber: 508,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/chat/page.js",
                lineNumber: 507,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/chat/page.js",
        lineNumber: 394,
        columnNumber: 5
    }, this);
}
_s1(ChatPage, "xLb9RA2syP2xcyD8bXZOyUUrTFU=");
_c2 = ChatPage;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "Avatar");
__turbopack_context__.k.register(_c1, "AuthPanel");
__turbopack_context__.k.register(_c2, "ChatPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=app_chat_page_149vy_2dd028c.js.map
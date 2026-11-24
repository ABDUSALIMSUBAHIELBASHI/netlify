# Pharmacy ELAF Next.js

The default page serves the complete Pharmacy ELAF HTML app, preserved as `public/legacy/index.html`. The component-based Next.js rewrite remains available at `/workspace`.

## Run locally

From the project root, run:

```powershell
npm run dev
```

Open [http://localhost:4000](http://localhost:4000) to use the complete original app. Open [http://localhost:4000/workspace](http://localhost:4000/workspace) for the component-based version, or [http://localhost:4000/chat](http://localhost:4000/chat) for chat.

## Local MongoDB chat

The Node.js server stores shared Pharmacy ELAF/chat accounts, conversations, messages, and profile photos in MongoDB. Register or sign in on either the default storefront or `/chat`; the same MongoDB account session is used by both. The Chat and Messages interface includes a confirmation-based sign-out that ends active calls and stops recordings before clearing the session. Profile photos can be uploaded from the device or taken with its camera; photos are validated, limited to 6 MB, and served only to signed-in chat accounts. The default local database URI is `mongodb://localhost:27017/HPELAF1282025`. It does not contain a MongoDB password.

Existing browser-only accounts and passwords are not imported. On loading the legacy storefront, stored local password fields are removed; existing profile records are retained and can be associated with a newly registered shared account by using the same email. Passwords are hashed in MongoDB. Email-based password reset and email/SMS OTP delivery are not configured. Product, order, profile, team, and dashboard data remain in browser local storage and are not synchronized to MongoDB.

The chat interface supports English, French, Arabic, Kinyarwanda, and Kiswahili. Its language selector shares the `pharmacy_dash_lang` preference with the dashboard; message content is not automatically translated.

Chat styling uses Tailwind CSS v4 utilities for responsive layouts, alongside reduced-motion-aware animations and a Pharmacy ELAF green theme. Tailwind's global preflight is omitted so the storefront's existing styles are unaffected.

From PowerShell, use one terminal in the project folder:

```powershell
cd .\netlify\next-pharmacy
npm install
npm run dev
```

`npm run dev` uses Nodemon to run `server.js`; that single Node server serves Next.js, the chat API, and Socket.IO together. MongoDB must be running first. Check with `Get-Service MongoDB` and `Test-NetConnection localhost -Port 27017`. Stop the app with `Ctrl+C`. Do not start `node server.js`, `nodemon server.js`, and `npm run dev` simultaneously because they would compete for the same port.

Free chat registration supports direct/group conversations, message requests, unread and archived/spam folders, communities, and private active-status controls. Members can upload or take JPG, PNG, WebP, and GIF images up to 6 MB, or record/upload supported video and audio clips up to 12 MB. Media access is checked against conversation membership, and storage management can remove your own shared media. Camera and microphone access requires browser permission and a secure context (localhost or HTTPS).

Messages support editing, private saved-message bookmarks, and emoji reactions. Text messages can be opened in WhatsApp with a prefilled share link; the user reviews and sends them from WhatsApp. This does not sync WhatsApp inboxes or send messages automatically. New reaction changes are recorded as an audit history without message text and shown in dashboard history; only members of the relevant chat can view its events. Existing reactions are not backfilled because their original event times were not stored. Delete-for-me hides that message's reaction events from that user's history.

The Delete dialog lets any participant remove a message only from their own chat; senders can also delete their message for everyone, which replaces it with a shared deletion notice and removes its attached media and current reactions. Historical reaction audit events contain no message text. Cancel leaves the message unchanged. Delete-for-me also hides the message from that account's saved messages, media list, and history backup without changing what other participants see.

The chat display settings let each browser adjust page brightness and accent color; they do not change the device or monitor brightness. The chat interface includes subtle transitions and respects reduced-motion preferences. Reactions use a searchable emoji picker in both conversations and saved messages, and selecting your own existing reaction removes it.

Direct conversations support in-browser audio/video calls, with shortcuts in the recent-chat list and conversation header. Incoming calls can be answered or declined in Pharmacy ELAF chat; this web app does not control WhatsApp call state. Calls start with the camera off; participants can answer or decline incoming calls, cancel outgoing calls, turn on a permitted camera, mute the microphone, adjust speaker playback, put the call on hold and resume it, share their screen, or end the call. Hold pauses local audio/video transmission and playback, and notifies the other participant; resume restores the caller's existing mute, camera, and sharing choices. If nobody answers within 45 seconds, both participants see a voice- or video-specific no-answer dialog. Screen sharing requires browser support and a direct user action; the browser controls which screen or window is shared. If camera access is unavailable, the call can continue as audio and screen sharing remains available when the browser supports it. Calls require microphone permission and work only while both participants are connected to the same running Node server. Camera, microphone, and screen-capture access require browser permission and a secure context (localhost or HTTPS); support for screen capture varies by browser and device. Connection failures show an internet-connection prompt. The default Google STUN server may not establish connections on restrictive networks; production deployments should configure TURN servers. Set `CHAT_ICE_SERVERS` to a JSON array, for example:

```text
CHAT_ICE_SERVERS=[{"urls":"stun:stun.example.net:3478"},{"urls":"turn:turn.example.net:3478","username":"short-lived-user","credential":"short-lived-password"}]
```

ICE server configuration is sent to signed-in clients, so do not use long-lived TURN credentials; configure provider-issued, limited-duration credentials. Active call sessions are held in memory: they end on server restart and are not shared across multiple server instances.

Chat history backups are created and restored on the server and can be managed from chat settings. They are stored in the same MongoDB database as chat, so they are not disaster-recovery backups if that database is lost. The marketplace shortcut opens the existing Pharmacy ELAF shop.

For a custom database name or a production server, copy `.env.local.example` to `.env.local` and set `MONGODB_URI` and a long random `CHAT_JWT_SECRET`. Do not commit `.env.local`. The development-only signing key is not suitable for production.

## Deployment

The chat now requires a persistent Node.js server and MongoDB, so it cannot run as the previous static Netlify export or on Netlify Drop. To make chat available to people on the internet, deploy the Node server to a Node.js host and use a secured MongoDB Atlas connection string; do not expose a local MongoDB port publicly. Set `MONGODB_URI`, `CHAT_JWT_SECRET`, and `NODE_ENV=production` in the hosting provider's environment settings. Configure `CHAT_ICE_SERVERS` with STUN/TURN endpoints and short-lived TURN credentials for reliable calls across networks. The local URI only works on this computer.

## Included

- Product catalog with search and category filters
- Inventory admin tools for adding, editing, and removing products
- Cart, payment-method selection, and local order history
- Google Sheets Manager for inventory and submitted-order sync
- Local team directory and profile details
- MongoDB-backed direct/group/community chat with requests, unread/archive/spam folders, privacy controls, profile photos, image/video/audio sharing, message edit/delete/save and full emoji reactions, browser display settings, audio/video calls with screen sharing, media management, server-side history backups, and five interface languages
- Basic arithmetic calculator and QR-code creation
- Dashboard quick links, responsive layout, and light/dark theme

In the original app, browser data is stored locally and Google Sheets sync requires a deployed Apps Script web-app URL. The component-based workspace also stores orders, profile details, and the team directory in browser local storage; its Chat link opens the shared sign-in page. Existing local accounts are not automatically migrated. Neither storefront version includes a card/PayPal gateway.

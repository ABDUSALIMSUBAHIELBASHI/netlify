# Pharmacy ELAF Next.js

The default page serves the complete Pharmacy ELAF HTML app, preserved as `public/legacy/index.html`. The component-based Next.js rewrite remains available at `/workspace`.

## Run locally

From the project root, run:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the complete original app. Open [http://localhost:3000/workspace](http://localhost:3000/workspace) for the component-based version, or [http://localhost:3000/chat](http://localhost:3000/chat) for chat.

## Local MongoDB chat

The chat runs in the Node.js server and stores accounts, conversations, messages, and images in MongoDB. The default local database URI is `mongodb://localhost:27017/HPELAF1282025`. It does not contain a MongoDB password. Existing storefront accounts remain device-local and are not migrated to chat.

From PowerShell, use one terminal in the project folder:

```powershell
cd .\netlify\next-pharmacy
npm install
npm run dev
```

`npm run dev` uses Nodemon to run `server.js`; that single Node server serves Next.js, the chat API, and Socket.IO together. MongoDB must be running first. Check with `Get-Service MongoDB` and `Test-NetConnection localhost -Port 27017`. Stop the app with `Ctrl+C`. Do not start `node server.js`, `nodemon server.js`, and `npm run dev` simultaneously because they would compete for the same port.

Free chat registration supports direct/group conversations, live online status, and private JPG, PNG, WebP, and GIF sharing up to 6 MB. Passwords are bcrypt-hashed, sessions use HTTP-only cookies, and image access is checked against conversation membership.

For a custom database name or a production server, copy `.env.local.example` to `.env.local` and set `MONGODB_URI` and a long random `CHAT_JWT_SECRET`. Do not commit `.env.local`. The development-only signing key is not suitable for production.

## Deployment

The chat now requires a persistent Node.js server and MongoDB, so it cannot run as the previous static Netlify export or on Netlify Drop. To make chat available to people on the internet, deploy the Node server to a Node.js host and use a secured MongoDB Atlas connection string; do not expose a local MongoDB port publicly. Set `MONGODB_URI`, `CHAT_JWT_SECRET`, and `NODE_ENV=production` in the hosting provider's environment settings. The local URI only works on this computer.

## Included

- Product catalog with search and category filters
- Inventory admin tools for adding, editing, and removing products
- Cart, payment-method selection, and local order history
- Google Sheets Manager for inventory and submitted-order sync
- Local team directory and profile details
- MongoDB-backed direct and group chat with online presence and private image sharing
- Basic arithmetic calculator and QR-code creation
- Dashboard quick links, responsive layout, and light/dark theme

In the original app, browser data is stored locally and Google Sheets sync requires a deployed Apps Script web-app URL. The component-based workspace also stores orders, profile details, and the team directory in browser local storage. The chat has a separate MongoDB-backed account system; existing local accounts are not automatically migrated. Neither storefront version includes a card/PayPal gateway or server-backed login system.

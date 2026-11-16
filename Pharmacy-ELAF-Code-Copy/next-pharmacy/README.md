# Pharmacy ELAF Next.js

The default page serves the complete Pharmacy ELAF HTML app, preserved as `public/legacy/index.html`. The component-based Next.js rewrite remains available at `/workspace`.

## Run locally

From the project root, run:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the complete original app. Open [http://localhost:3000/workspace](http://localhost:3000/workspace) for the component-based version. Start only one development server at a time; stop it with `Ctrl+C` in the terminal running it.

## Deploy to Netlify

This project is configured for a static Netlify deployment. To deploy from a Git repository, connect the repository to Netlify and use the repository root; `netlify.toml` builds from `next-pharmacy` and publishes its `out` folder.

To deploy manually, run `npm run build` from `next-pharmacy`, then upload the generated `next-pharmacy/out` folder at [Netlify Drop](https://app.netlify.com/drop).

## Included

- Product catalog with search and category filters
- Inventory admin tools for adding, editing, and removing products
- Cart, payment-method selection, and local order history
- Google Sheets Manager for inventory and submitted-order sync
- Local team directory and profile details
- Basic arithmetic calculator and QR-code creation
- Dashboard quick links, responsive layout, and light/dark theme

In the original app, browser data is stored locally and Google Sheets sync requires a deployed Apps Script web-app URL. The component-based workspace also stores orders, profile details, and the team directory in browser local storage. Neither version includes a card/PayPal gateway or server-backed login system.

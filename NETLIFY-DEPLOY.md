# Deploy the static site to Netlify

The Netlify build publishes the same top-level `index.html` as the GitHub Pages
project at `https://abdusalimsubahielbashi.github.io/netlify/`. The build copies
only that page into `netlify-dist`, so repository source files are not included
in the published site.

## Create the Netlify site

1. Sign in at [Netlify](https://app.netlify.com/).
2. Select **Add new site** → **Import an existing project**.
3. Connect GitHub and select `ABDUSALIMSUBAHIELBASHI/netlify`.
4. Choose the `main` branch and deploy. The checked-in `netlify.toml` supplies
   the build command and publish directory.
5. Open the generated `*.netlify.app` address when the first deploy finishes.

The Netlify address is separate from the GitHub Pages address. The existing
GitHub Pages site remains available at
`https://abdusalimsubahielbashi.github.io/netlify/`.

## Build locally

From the repository root:

```powershell
npm run build:netlify
```

The output is written to `netlify-dist`. Netlify rebuilds and publishes it
automatically whenever a commit is pushed to `main`.

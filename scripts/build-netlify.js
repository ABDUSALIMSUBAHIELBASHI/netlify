const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const publishDirectory = path.join(projectRoot, "netlify-dist");

fs.mkdirSync(publishDirectory, { recursive: true });
fs.copyFileSync(
  path.join(projectRoot, "index.html"),
  path.join(publishDirectory, "index.html"),
);

console.log("Prepared the static site in netlify-dist.");

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const DIST_PAGES = path.join(process.cwd(), "dist-pages");
const PORT = 4174;
const BASE = "/krunditark.ee";

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function buildPagesIfNeeded() {
  if (!fs.existsSync(DIST_PAGES)) {
    console.log("dist-pages/ not found, building Pages-base bundle for E2E...");
    execSync("npx vite build --outDir dist-pages", {
      stdio: "inherit",
      cwd: process.cwd(),
      shell: true,
      env: { ...process.env, VITE_BASE_PATH: "/krunditark.ee/" },
    });
  }
}

buildPagesIfNeeded();

const server = require("http").createServer((req, res) => {
  const urlPath = req.url.split("?")[0];

  if (!urlPath.startsWith(BASE)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const relativePath = urlPath.slice(BASE.length) || "/index.html";
  const filePath = path.join(DIST_PAGES, relativePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Pages-base preview at http://localhost:${PORT}${BASE}/`);
});

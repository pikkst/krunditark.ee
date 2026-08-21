const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

function buildIfNeeded() {
  const distPath = path.join(process.cwd(), "dist");
  if (!fs.existsSync(distPath)) {
    console.log("dist/ not found, building for E2E...");
    execSync("npm run build", { stdio: "inherit", cwd: process.cwd(), shell: true });
  }
}

buildIfNeeded();

const child = spawn("npx", ["vite", "preview", "--port", "4173"], {
  stdio: "inherit",
  cwd: process.cwd(),
  shell: true,
});

child.on("exit", (code) => process.exit(code));

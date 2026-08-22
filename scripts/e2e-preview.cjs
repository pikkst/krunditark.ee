const { execSync, spawn } = require("child_process");

console.log("Rebuilding for E2E...");
execSync("npm run build", { stdio: "inherit", cwd: process.cwd(), shell: true });

const child = spawn("npx", ["vite", "preview", "--port", "4173"], {
  stdio: "inherit",
  cwd: process.cwd(),
  shell: true,
});

child.on("exit", (code) => process.exit(code));

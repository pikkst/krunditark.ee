import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, "../..");

function walk(dir: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (/\.(ts|tsx|js|json)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

describe("environment contract", () => {
  const envExamplePath = join(root, ".env.example");
  const gitignorePath = join(root, ".gitignore");

  it("has .env.example with placeholder values only", () => {
    expect(existsSync(envExamplePath)).toBe(true);
    const content = readFileSync(envExamplePath, "utf-8");

    const viteVars = content.match(/^VITE_[A-Z_]+=/gm) ?? [];
    expect(viteVars.length).toBeGreaterThan(0);

    for (const raw of viteVars) {
      const name = raw.slice(0, raw.indexOf("="));
      const forbidden = [
        "VITE_GEMINI_API_KEY",
        "VITE_SUPABASE_SERVICE_ROLE_KEY",
        "VITE_SUPABASE_SERVICE_ROLE",
        "VITE_PAYMENT_SECRET",
        "VITE_STRIPE_SECRET",
        "VITE_MONTONIO_SECRET",
      ];
      expect(forbidden).not.toContain(name);
    }
  });

  it("does not contain real-looking secret values in .env.example", () => {
    const content = readFileSync(envExamplePath, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex === -1) continue;
      const value = trimmed.slice(equalsIndex + 1);
      if (!value) continue;

      expect(value).not.toMatch(/^sb_publishable_[A-Za-z0-9]{20,}$/);
      expect(value).not.toMatch(/^[A-Za-z0-9+/]{40,}={0,2}$/);
    }
  });

  it("gitignores real env and local Supabase state/secrets", () => {
    expect(existsSync(gitignorePath)).toBe(true);
    const content = readFileSync(gitignorePath, "utf-8");

    expect(content).toMatch(/^\.env(\..*)?$/m);
    expect(content).toMatch(/^\.env\.local$/m);
    expect(content).toMatch(/^\.env\.\*\.local$/m);
  });

  it("does not ignore .env.example", () => {
    const content = readFileSync(gitignorePath, "utf-8");
    expect(content).not.toMatch(/^\.env\.example$/m);
  });

  it("does not reference forbidden VITE_ secret prefixes in source", () => {
    const forbidden = [
      "VITE_GEMINI_API_KEY",
      "VITE_SUPABASE_SERVICE_ROLE_KEY",
      "VITE_SUPABASE_SERVICE_ROLE",
      "VITE_PAYMENT_SECRET",
      "VITE_STRIPE_SECRET",
      "VITE_MONTONIO_SECRET",
    ];

    const scanRoots = [join(root, "src"), join(root, "vite.config.ts")];
    const tsconfigPath = join(root, "tsconfig.json");
    if (existsSync(tsconfigPath) && statSync(tsconfigPath).isFile()) {
      scanRoots.push(tsconfigPath);
    }

    let source = "";
    for (const entry of scanRoots) {
      if (statSync(entry).isDirectory()) {
        const files = walk(entry).filter((f) => !f.endsWith("env-contract.test.ts"));
        source += files.map((f) => readFileSync(f, "utf-8")).join("\n") + "\n";
      } else {
        source += readFileSync(entry, "utf-8") + "\n";
      }
    }

    for (const token of forbidden) {
      expect(source).not.toContain(token);
    }
  });
});

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

describe("Supabase project layout", () => {
  test("config.toml exists", () => {
    expect(existsSync(join(root, "supabase", "config.toml"))).toBe(true);
  });

  test("migrations directory exists", () => {
    expect(existsSync(join(root, "supabase", "migrations"))).toBe(true);
  });

  test("functions directory exists", () => {
    expect(existsSync(join(root, "supabase", "functions"))).toBe(true);
  });

  test("gitignore ignores Supabase local state", () => {
    const gitignore = readFileSync(join(root, ".gitignore"), "utf-8");
    expect(gitignore).toMatch(/supabase\/\.temp\//);
    expect(gitignore).toMatch(/supabase\/\.branches\//);
  });

  test("config.toml enables anonymous sign-ins", () => {
    const config = readFileSync(join(root, "supabase", "config.toml"), "utf-8");
    expect(config).toMatch(/enable_anonymous_sign_ins\s*=\s*true/);
  });

  test("config.toml exposes internal schemas in search path", () => {
    const config = readFileSync(join(root, "supabase", "config.toml"), "utf-8");
    expect(config).toMatch(
      /extra_search_path\s*=\s*\[.*"public".*"geo".*"rules".*"analysis".*"private".*"extensions".*\]/s
    );
  });
});

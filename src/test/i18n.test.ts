import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, "../..");
const localesDir = join(root, "src/locales");

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const CRITICAL_KEYS = [
  "app.name",
  "tagline",
  "landing.title",
  "landing.subtitle",
  "landing.description",
  "landing.search.placeholder",
  "landing.search.button",
  "header.brand",
  "locale.switchLabel",
  "locale.et",
  "locale.ru",
  "locale.en",
];

describe("i18n catalogs", () => {
  const locales = readdirSync(localesDir).filter((dir) => {
    const full = join(localesDir, dir);
    return readdirSync(full).some((f) => f === "common.json");
  });

  const catalogs: Record<string, string[]> = {};
  for (const locale of locales) {
    const content = readJson(join(localesDir, locale, "common.json"));
    catalogs[locale] = flattenKeys(content);
  }

  it("has et, ru, and en catalogs", () => {
    expect(catalogs["et"]).toBeDefined();
    expect(catalogs["ru"]).toBeDefined();
    expect(catalogs["en"]).toBeDefined();
  });

  it("ET catalog contains all current shell keys", () => {
    for (const key of CRITICAL_KEYS) {
      expect(catalogs["et"]).toContain(key);
    }
  });

  it("ET catalog has no empty values", () => {
    const etContent = readJson(join(localesDir, "et", "common.json"));
    const emptyKeys: string[] = [];
    function checkEmpty(obj: Record<string, unknown>, prefix = ""): void {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === "string" && value.trim() === "") {
          emptyKeys.push(fullKey);
        } else if (value && typeof value === "object" && !Array.isArray(value)) {
          checkEmpty(value as Record<string, unknown>, fullKey);
        }
      }
    }
    checkEmpty(etContent);
    expect(emptyKeys).toEqual([]);
  });

  it("reports missing critical keys in RU and EN", () => {
    for (const locale of ["ru", "en"]) {
      const localeKeys = new Set(catalogs[locale] ?? []);
      const missingCritical = CRITICAL_KEYS.filter((k) => !localeKeys.has(k));
      if (missingCritical.length > 0) {
        console.error(`[i18n] Missing critical ${locale} keys: ${missingCritical.join(", ")}`);
      }
      expect(missingCritical).toEqual([]);
    }
  });

  it("warns about non-critical missing keys in RU and EN without failing", () => {
    const etKeys = new Set(catalogs["et"] ?? []);
    for (const locale of ["ru", "en"]) {
      const localeKeys = new Set(catalogs[locale] ?? []);
      const missingNonCritical = [...etKeys].filter(
        (k) => !CRITICAL_KEYS.includes(k) && !localeKeys.has(k)
      );
      if (missingNonCritical.length > 0) {
        console.warn(
          `[i18n] Missing non-critical ${locale} keys: ${missingNonCritical.join(", ")}`
        );
      }
    }
  });
});

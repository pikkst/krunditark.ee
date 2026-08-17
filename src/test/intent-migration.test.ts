import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260815000009_add_intent_code_to_projects.sql"
);

const sql = readFileSync(migrationPath, "utf-8");

describe("intent code migration (KT-024)", () => {
  test("migration file exists", () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  test("creates intent_code enum with all supported codes", () => {
    expect(sql).toMatch(/CREATE\s+TYPE\s+public\.intent_code\s+AS\s+ENUM/i);
    expect(sql).toMatch(/build/i);
    expect(sql).toMatch(/pre_purchase/i);
    expect(sql).toMatch(/understand_parcel/i);
    expect(sql).toMatch(/existing_building_modification/i);
    expect(sql).toMatch(/professional/i);
  });

  test("uses idempotent DO block for enum creation", () => {
    expect(sql).toMatch(/DO\s+\$\$\s*BEGIN/i);
    expect(sql).toMatch(/IF NOT EXISTS.*pg_type.*typname.*intent_code/i);
  });

  test("adds intent_code column as nullable text/enum", () => {
    expect(sql).toMatch(
      /ALTER\s+TABLE\s+public\.projects\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+intent_code/i
    );
    expect(sql).toMatch(/public\.intent_code/i);
  });

  test("adds check constraint for valid intent codes", () => {
    expect(sql).toMatch(/DROP\s+CONSTRAINT\s+IF\s+EXISTS\s+projects_intent_code_valid/i);
    expect(sql).toMatch(/ADD\s+CONSTRAINT\s+projects_intent_code_valid/i);
    expect(sql).toMatch(/CHECK\s*\(\s*intent_code\s+IN/i);
  });

  test("creates index for intent-based queries", () => {
    expect(sql).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_projects_intent_code/i);
    expect(sql).toMatch(/ON\s+public\.projects\s+\(intent_code\)/i);
  });

  test("creates partial index for non-null intent codes", () => {
    expect(sql).toMatch(/WHERE\s+intent_code\s+IS\s+NOT\s+NULL/i);
  });

  test("grants enum usage to authenticated role", () => {
    expect(sql).toMatch(/GRANT\s+USAGE\s+ON\s+TYPE\s+public\.intent_code\s+TO\s+authenticated/i);
  });

  test("does not reference ownership/proof language incorrectly", () => {
    expect(sql).not.toMatch(/intent_code represents ownership/i);
  });
});

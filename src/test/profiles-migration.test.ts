import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260815000001_create_profiles_role.sql"
);

const sql = readFileSync(migrationPath, "utf-8");

describe("profiles/role migration (KT-012)", () => {
  test("migration file exists", () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  test("creates user_role enum with user and admin values", () => {
    expect(sql).toMatch(/CREATE\s+TYPE\s+public\.user_role\s+AS\s+ENUM/i);
    expect(sql).toMatch(/'user'/i);
    expect(sql).toMatch(/'admin'/i);
  });

  test("creates profiles table keyed to auth.users", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+public\.profiles/i);
    expect(sql).toMatch(/id\s+uuid\s+PRIMARY\s+KEY\s+REFERENCES\s+auth\.users/i);
    expect(sql).toMatch(/ON\s+DELETE\s+CASCADE/i);
  });

  test("profiles table has required columns", () => {
    expect(sql).toMatch(/display_name\s+text/i);
    expect(sql).toMatch(/role\s+public\.user_role\s+NOT\s+NULL\s+DEFAULT\s+'user'/i);
    expect(sql).toMatch(/created_at\s+timestamptz/i);
    expect(sql).toMatch(/updated_at\s+timestamptz/i);
  });

  test("creates trigger to auto-create profile on auth user creation", () => {
    expect(sql).toMatch(/handle_new_user/i);
    expect(sql).toMatch(/AFTER\s+INSERT\s+ON\s+auth\.users/i);
  });

  test("creates trigger to update updated_at automatically", () => {
    expect(sql).toMatch(/update_updated_at_column/i);
    expect(sql).toMatch(/BEFORE\s+UPDATE\s+ON\s+public\.profiles/i);
  });

  test("creates trigger to prevent client role changes", () => {
    expect(sql).toMatch(/prevent_client_role_change/i);
    expect(sql).toMatch(/auth\.uid\(\)\s+IS\s+NOT\s+NULL/i);
    expect(sql).toMatch(/RAISE\s+EXCEPTION/i);
  });

  test("enables RLS on profiles", () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+public\.profiles\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
  });

  test("creates RLS policies for authenticated users", () => {
    expect(sql).toMatch(/CREATE\s+POLICY\s+profiles_select_own/i);
    expect(sql).toMatch(/CREATE\s+POLICY\s+profiles_update_own/i);
    expect(sql).toMatch(/auth\.uid\(\)\s*=\s*id/i);
  });

  test("grants appropriate permissions to authenticated role", () => {
    expect(sql).toMatch(/GRANT\s+SELECT,\s+UPDATE\s+ON\s+public\.profiles\s+TO\s+authenticated/i);
    expect(sql).toMatch(/GRANT\s+USAGE\s+ON\s+TYPE\s+public\.user_role\s+TO\s+authenticated/i);
  });
});

import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260815000008_create_internal_audit_model.sql"
);

const sql = readFileSync(migrationPath, "utf-8");

describe("internal audit model migration (KT-017)", () => {
  test("migration file exists", () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  test("creates audit_log table with required columns", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+private\.audit_log/i);
    expect(sql).toMatch(/id\s+uuid\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid/i);
    expect(sql).toMatch(/actor_user_id\s+uuid\s+NULL/i);
    expect(sql).toMatch(/actor_type\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/action\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/target_type\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/target_id\s+text\s+NULL/i);
    expect(sql).toMatch(/safe_metadata\s+jsonb\s+NOT\s+NULL\s+DEFAULT\s+'{}'::jsonb/i);
    expect(sql).toMatch(/created_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
  });

  test("audit_log references auth.users for actor_user_id", () => {
    expect(sql).toMatch(
      /actor_user_id\s+uuid\s+NULL\s+REFERENCES\s+auth\.users\s*\(\s*id\s*\)\s+ON\s+DELETE\s+SET\s+NULL/i
    );
  });

  test("audit_log has length check constraints", () => {
    expect(sql).toMatch(/audit_log_actor_type_length/i);
    expect(sql).toMatch(/audit_log_action_length/i);
    expect(sql).toMatch(/audit_log_target_type_length/i);
    expect(sql).toMatch(/audit_log_target_id_length/i);
  });

  test("audit_log target_id length allows nullable long identifiers", () => {
    expect(sql).toMatch(
      /audit_log_target_id_length\s+CHECK\s*\(\s*target_id\s+IS\s+NULL\s+OR\s+char_length\s*\(\s*target_id\s*\)\s+<=\s*200\s*\)/i
    );
  });

  test("creates immutability trigger function for audit_log", () => {
    expect(sql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+private\.prevent_audit_log_mutation/i);
    expect(sql).toMatch(/RETURNS\s+trigger/i);
    expect(sql).toMatch(/LANGUAGE\s+plpgsql/i);
    expect(sql).toMatch(/SECURITY\s+DEFINER/i);
    expect(sql).toMatch(/SET\s+search_path\s*=\s*private/i);
  });

  test("immutability trigger allows inserts", () => {
    expect(sql).toMatch(/TG_OP\s*=\s*'INSERT'\s+THEN\s+RETURN\s+NEW/i);
  });

  test("immutability trigger rejects updates", () => {
    expect(sql).toMatch(/audit_log is immutable/i);
    expect(sql).toMatch(/cannot\s+%s\s+row/i);
    expect(sql).toMatch(/BEFORE\s+UPDATE\s+OR\s+DELETE\s+ON\s+private\.audit_log/i);
  });

  test("creates trigger on audit_log for immutability", () => {
    expect(sql).toMatch(
      /CREATE\s+TRIGGER\s+prevent_audit_log_mutation\s+BEFORE\s+UPDATE\s+OR\s+DELETE\s+ON\s+private\.audit_log\s+FOR\s+EACH\s+ROW\s+EXECUTE\s+FUNCTION\s+private\.prevent_audit_log_mutation\(\)/i
    );
  });

  test("creates indexes for audit log queries", () => {
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_audit_log_actor_type\s+ON\s+private\.audit_log\s+\(\s*actor_type\s*\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_audit_log_action\s+ON\s+private\.audit_log\s+\(\s*action\s*\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_audit_log_target_type\s+ON\s+private\.audit_log\s+\(\s*target_type\s*\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_audit_log_target_id\s+ON\s+private\.audit_log\s+\(\s*target_id\s*\)\s+WHERE\s+target_id\s+IS\s+NOT\s+NULL/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_audit_log_created_at\s+ON\s+private\.audit_log\s+\(\s*created_at\s+DESC\s*\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_audit_log_actor_user_id\s+ON\s+private\.audit_log\s+\(\s*actor_user_id\s*\)\s+WHERE\s+actor_user_id\s+IS\s+NOT\s+NULL/i
    );
  });

  test("enables RLS on audit_log", () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+private\.audit_log\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
  });

  test("blocks anon access to audit_log", () => {
    expect(sql).toMatch(/CREATE\s+POLICY\s+audit_log_no_anon\s+ON\s+private\.audit_log/i);
    expect(sql).toMatch(/TO\s+anon/i);
    expect(sql).toMatch(/USING\s*\(\s*false\s*\)/i);
  });

  test("blocks authenticated access to audit_log", () => {
    expect(sql).toMatch(/CREATE\s+POLICY\s+audit_log_no_authenticated\s+ON\s+private\.audit_log/i);
    expect(sql).toMatch(/TO\s+authenticated/i);
    expect(sql).toMatch(/USING\s*\(\s*false\s*\)/i);
  });

  test("grants service_role access to audit_log", () => {
    expect(sql).toMatch(/GRANT\s+SELECT,\s*INSERT\s+ON\s+private\.audit_log\s+TO\s+service_role/i);
  });

  test("does not expose audit_log through Data API", () => {
    expect(sql).not.toMatch(/GRANT.*TO\s+anon/i);
    expect(sql).not.toMatch(/GRANT.*TO\s+authenticated/i);
  });

  test("safe_metadata defaults to empty object", () => {
    expect(sql).toMatch(/safe_metadata\s+jsonb\s+NOT\s+NULL\s+DEFAULT\s+'{}'::jsonb/i);
  });
});

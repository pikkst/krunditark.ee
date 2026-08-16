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

  test("creates audit_action_codes lookup table with required codes", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+private\.audit_action_codes/i);
    expect(sql).toMatch(/code\s+text\s+PRIMARY\s+KEY/i);
    expect(sql).toMatch(/description\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/'rule\.verify'/i);
    expect(sql).toMatch(/'rule\.retire'/i);
    expect(sql).toMatch(/'source\.promote'/i);
    expect(sql).toMatch(/'source\.disable'/i);
    expect(sql).toMatch(/'source\.manual_refresh'/i);
    expect(sql).toMatch(/'admin\.role_changed'/i);
    expect(sql).toMatch(/'analysis\.invalidated'/i);
    expect(sql).toMatch(/'commerce\.refund'/i);
    expect(sql).toMatch(/'commerce\.manual_entitlement'/i);
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

  test("actor_user_id has no live FK to auth.users", () => {
    expect(sql).toMatch(/actor_user_id\s+uuid\s+NULL/i);
    expect(sql).not.toMatch(/actor_user_id\s+uuid\s+NULL\s+REFERENCES\s+auth\.users/i);
  });

  test("audit_log action is constrained to known codes", () => {
    expect(sql).toMatch(
      /audit_log_action_fk\s+FOREIGN\s+KEY\s*\(\s*action\s*\)\s+REFERENCES\s+private\.audit_action_codes/i
    );
  });

  test("audit_log has length check constraints", () => {
    expect(sql).toMatch(/audit_log_actor_type_length/i);
    expect(sql).toMatch(/audit_log_action_length/i);
    expect(sql).toMatch(/audit_log_target_type_length/i);
    expect(sql).toMatch(/audit_log_target_id_length/i);
  });

  test("creates sanitize_audit_metadata function", () => {
    expect(sql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+private\.sanitize_audit_metadata/i);
    expect(sql).toMatch(/RETURNS\s+jsonb/i);
    expect(sql).toMatch(/LANGUAGE\s+plpgsql/i);
    expect(sql).toMatch(/IMMUTABLE/i);
    expect(sql).toMatch(/forbidden\s+key/i);
    expect(sql).toMatch(
      /authorization|auth|token|secret|password|api_key|apikey|access_token|refresh_token|cookie|credential|bearer|basic|signature|private_key|client_secret|session|jwt/i
    );
  });

  test("creates validate_audit_metadata function with required fields per action", () => {
    expect(sql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+private\.validate_audit_metadata/i);
    expect(sql).toMatch(/RETURNS\s+boolean/i);
    expect(sql).toMatch(/rule\.verify\s+requires\s+rule_version_id\s+and\s+implementation_key/i);
    expect(sql).toMatch(/rule\.retire\s+requires\s+rule_version_id/i);
    expect(sql).toMatch(/source\.promote\s+requires\s+source_id\s+and\s+dataset_version_id/i);
    expect(sql).toMatch(/source\.disable\s+requires\s+source_id/i);
    expect(sql).toMatch(/source\.manual_refresh\s+requires\s+source_id/i);
    expect(sql).toMatch(
      /admin\.role_changed\s+requires\s+target_user_id,\s*new_role,\s*and\s*old_role/i
    );
    expect(sql).toMatch(/analysis\.invalidated\s+requires\s+analysis_id\s+and\s+annotation/i);
    expect(sql).toMatch(/commerce\.refund\s+requires\s+order_id,\s*amount,\s*and\s+reason/i);
    expect(sql).toMatch(
      /commerce\.manual_entitlement\s+requires\s+user_id,\s*entitlement_type,\s*and\s+reason/i
    );
  });

  test("creates log_audit_event canonical writer function", () => {
    expect(sql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+private\.log_audit_event/i);
    expect(sql).toMatch(/p_actor_user_id\s+uuid/i);
    expect(sql).toMatch(/p_actor_type\s+text/i);
    expect(sql).toMatch(/p_action\s+text/i);
    expect(sql).toMatch(/p_target_type\s+text/i);
    expect(sql).toMatch(/p_target_id\s+text/i);
    expect(sql).toMatch(/p_metadata\s+jsonb/i);
    expect(sql).toMatch(/unknown\s+audit\s+action/i);
    expect(sql).toMatch(/sanitize_audit_metadata/i);
    expect(sql).toMatch(/validate_audit_metadata/i);
    expect(sql).toMatch(/RETURNS\s+uuid/i);
  });

  test("log_audit_event inserts actor_user_id without FK", () => {
    expect(sql).toMatch(
      /INSERT\s+INTO\s+private\.audit_log\s*\([\s\S]*?actor_user_id\s*,\s*actor_type\s*,\s*action\s*,\s*target_type\s*,\s*target_id\s*,\s*safe_metadata[\s\S]*?VALUES\s*\(\s*p_actor_user_id/i
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

  test("immutability trigger rejects updates and deletes", () => {
    expect(sql).toMatch(/audit_log is immutable/i);
    expect(sql).toMatch(/cannot\s+%s\s+row/i);
    expect(sql).toMatch(/BEFORE\s+UPDATE\s+OR\s+DELETE\s+ON\s+private\.audit_log/i);
  });

  test("creates trigger on audit_log for immutability", () => {
    expect(sql).toMatch(
      /CREATE\s+TRIGGER\s+prevent_audit_log_mutation\s+BEFORE\s+UPDATE\s+OR\s+DELETE\s+ON\s+private\.audit_log\s+FOR\s+EACH\s+ROW\s+EXECUTE\s+FUNCTION\s+private\.prevent_audit_log_mutation\(\)/i
    );
  });

  test("creates action code validation trigger", () => {
    expect(sql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+private\.validate_audit_action_code/i);
    expect(sql).toMatch(/RETURNS\s+trigger/i);
    expect(sql).toMatch(/LANGUAGE\s+plpgsql/i);
    expect(sql).toMatch(/SECURITY\s+DEFINER/i);
    expect(sql).toMatch(/SET\s+search_path\s*=\s*private/i);
    expect(sql).toMatch(/unknown\s+audit\s+action/i);
    expect(sql).toMatch(
      /CREATE\s+TRIGGER\s+validate_audit_action_code\s+BEFORE\s+INSERT\s+ON\s+private\.audit_log\s+FOR\s+EACH\s+ROW\s+EXECUTE\s+FUNCTION\s+private\.validate_audit_action_code\(\)/i
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

  test("enables RLS on audit_log and audit_action_codes", () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+private\.audit_log\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(sql).toMatch(
      /ALTER\s+TABLE\s+private\.audit_action_codes\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
    );
  });

  test("blocks anon and authenticated access to audit tables", () => {
    expect(sql).toMatch(/CREATE\s+POLICY\s+audit_log_no_anon\s+ON\s+private\.audit_log/i);
    expect(sql).toMatch(/TO\s+anon/i);
    expect(sql).toMatch(/USING\s*\(\s*false\s*\)/i);
    expect(sql).toMatch(/CREATE\s+POLICY\s+audit_log_no_authenticated\s+ON\s+private\.audit_log/i);
    expect(sql).toMatch(/TO\s+authenticated/i);
    expect(sql).toMatch(/USING\s*\(\s*false\s*\)/i);
    expect(sql).toMatch(
      /CREATE\s+POLICY\s+audit_action_codes_no_anon\s+ON\s+private\.audit_action_codes/i
    );
    expect(sql).toMatch(
      /CREATE\s+POLICY\s+audit_action_codes_no_authenticated\s+ON\s+private\.audit_action_codes/i
    );
  });

  test("grants service_role access via canonical function, not direct INSERT", () => {
    expect(sql).toMatch(/GRANT\s+SELECT\s+ON\s+private\.audit_log\s+TO\s+service_role/i);
    expect(sql).toMatch(
      /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+private\.log_audit_event\s*\(\s*uuid\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*jsonb\s*\)\s+TO\s+service_role/i
    );
    expect(sql).not.toMatch(/GRANT\s+INSERT\s+ON\s+private\.audit_log\s+TO\s+service_role/i);
  });

  test("does not expose audit tables through Data API", () => {
    expect(sql).not.toMatch(/GRANT.*TO\s+anon/i);
    expect(sql).not.toMatch(/GRANT.*TO\s+authenticated/i);
  });

  test("safe_metadata defaults to empty object", () => {
    expect(sql).toMatch(/safe_metadata\s+jsonb\s+NOT\s+NULL\s+DEFAULT\s+'{}'::jsonb/i);
  });
});

import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const migrationFiles = [
  "20260815000000_enable_postgis.sql",
  "20260815000001_create_profiles_role.sql",
  "20260815000002_create_project_proposal_model.sql",
  "20260815000003_create_source_data_release_schemas.sql",
  "20260815000004_create_rule_legal_schemas.sql",
  "20260815000005_create_analysis_snapshot_schemas.sql",
  "20260815000006_fix_terminal_child_concurrency.sql",
  "20260815000007_fix_analysis_project_proposal_binding.sql",
  "20260815000008_create_internal_audit_model.sql",
];

const migrations = migrationFiles.map((file) => {
  const path = join(root, "supabase", "migrations", file);
  return { file, sql: readFileSync(path, "utf-8") };
});

describe("RLS clean-start migration suite (KT-018)", () => {
  test("all migration files exist and are non-empty", () => {
    for (const { sql } of migrations) {
      expect(sql.length).toBeGreaterThan(0);
    }
  });

  test("migrations are ordered by timestamp prefix", () => {
    const prefixes = migrationFiles.map((f) => f.split("_")[0]);
    const sorted = [...prefixes].sort();
    expect(prefixes).toEqual(sorted);
  });

  test("all migrations use idempotent DDL", () => {
    for (const { sql } of migrations) {
      const hasIfNotExists = /CREATE\s+(TABLE|EXTENSION|SCHEMA|INDEX)\s+IF\s+NOT\s+EXISTS/i.test(
        sql
      );
      const hasDropIfExists =
        /DROP\s+(TABLE|POLICY|TRIGGER|FUNCTION|CONSTRAINT|EXTENSION)\s+IF\s+EXISTS/i.test(sql);
      const hasCreateOrReplace = /CREATE\s+OR\s+REPLACE\s+FUNCTION/i.test(sql);
      const hasAlterTableDropConstraint =
        /ALTER\s+TABLE\s+.*\s+DROP\s+CONSTRAINT\s+IF\s+EXISTS/i.test(sql);
      expect(
        hasIfNotExists || hasDropIfExists || hasCreateOrReplace || hasAlterTableDropConstraint
      ).toBe(true);
    }
  });

  test("RLS is enabled on all client-accessible public tables", () => {
    const allSql = migrations.map((m) => m.sql).join("\n");
    expect(allSql).toMatch(/ALTER\s+TABLE\s+public\.profiles\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(allSql).toMatch(/ALTER\s+TABLE\s+public\.projects\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(allSql).toMatch(
      /ALTER\s+TABLE\s+public\.project_proposals\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
    );
  });

  test("RLS is enabled on all analysis tables", () => {
    const allSql = migrations.map((m) => m.sql).join("\n");
    expect(allSql).toMatch(/ALTER\s+TABLE\s+analysis\.analyses\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(allSql).toMatch(
      /ALTER\s+TABLE\s+analysis\.analysis_source_versions\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
    );
    expect(allSql).toMatch(
      /ALTER\s+TABLE\s+analysis\.analysis_rule_versions\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
    );
    expect(allSql).toMatch(/ALTER\s+TABLE\s+analysis\.findings\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(allSql).toMatch(
      /ALTER\s+TABLE\s+analysis\.finding_evidence\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
    );
  });

  test("RLS is enabled on all internal tables", () => {
    const allSql = migrations.map((m) => m.sql).join("\n");
    expect(allSql).toMatch(/ALTER\s+TABLE\s+private\.audit_log\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(allSql).toMatch(
      /ALTER\s+TABLE\s+private\.audit_action_codes\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
    );
  });

  test("anon role has no access grants on any table", () => {
    const allSql = migrations.map((m) => m.sql).join("\n");
    const anonGrantMatches = allSql.match(/GRANT\s+.*\s+TO\s+anon/gi) || [];
    expect(anonGrantMatches.length).toBe(0);
  });

  test("authenticated policies use auth.uid() ownership checks", () => {
    const allSql = migrations.map((m) => m.sql).join("\n");
    expect(allSql).toMatch(/auth\.uid\(\)\s*=\s*id/i);
    expect(allSql).toMatch(/auth\.uid\(\)\s*=\s*user_id/i);
    expect(allSql).toMatch(/p\.user_id\s*=\s*auth\.uid\(\)/i);
  });

  test("internal schemas have no grants to anon or authenticated", () => {
    for (const { sql } of migrations) {
      expect(sql).not.toMatch(/GRANT\s+.*\s+TO\s+anon/i);
      expect(sql).not.toMatch(/GRANT\s+.*\s+TO\s+authenticated\s+;\s*$/im);
    }
  });

  test("service_role has access to internal schemas", () => {
    const allSql = migrations.map((m) => m.sql).join("\n");
    expect(allSql).toMatch(/GRANT\s+USAGE\s+ON\s+SCHEMA\s+private\s+TO\s+service_role/i);
    expect(allSql).toMatch(/GRANT\s+USAGE\s+ON\s+SCHEMA\s+rules\s+TO\s+service_role/i);
    expect(allSql).toMatch(/GRANT\s+USAGE\s+ON\s+SCHEMA\s+analysis\s+TO\s+service_role/i);
  });

  test("client-accessible tables grant only to authenticated, not anon", () => {
    const allSql = migrations.map((m) => m.sql).join("\n");
    expect(allSql).toMatch(
      /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s*DELETE\s+ON\s+public\.projects\s+TO\s+authenticated/i
    );
    expect(allSql).toMatch(
      /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s*DELETE\s+ON\s+public\.project_proposals\s+TO\s+authenticated/i
    );
  });

  test("profiles prevents client role change", () => {
    const profilesSql = migrations.find((m) => m.file.includes("create_profiles_role"))!.sql;
    expect(profilesSql).toMatch(/prevent_client_role_change/i);
    expect(profilesSql).toMatch(
      /RAISE\s+EXCEPTION\s+'role\s+cannot\s+be\s+changed\s+through\s+client\s+policy'/i
    );
  });

  test("projects prevents client user_id change", () => {
    const projectsSql = migrations.find((m) =>
      m.file.includes("create_project_proposal_model")
    )!.sql;
    expect(projectsSql).toMatch(/prevent_client_user_id_change/i);
    expect(projectsSql).toMatch(
      /RAISE\s+EXCEPTION\s+'user_id\s+cannot\s+be\s+changed\s+through\s+client\s+policy'/i
    );
  });

  test("analysis schema grants authenticated access for own data", () => {
    const allSql = migrations.map((m) => m.sql).join("\n");
    expect(allSql).toMatch(
      /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s*DELETE\s+ON\s+analysis\.analyses\s+TO\s+authenticated/i
    );
    expect(allSql).toMatch(
      /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s*DELETE\s+ON\s+analysis\.findings\s+TO\s+authenticated/i
    );
  });

  test("audit log is append-only with no direct client grants", () => {
    const auditSql = migrations.find((m) => m.file.includes("create_internal_audit_model"))!.sql;
    expect(auditSql).toMatch(/prevent_audit_log_mutation/i);
    expect(auditSql).toMatch(/audit_log is immutable/i);
    expect(auditSql).not.toMatch(/GRANT\s+INSERT\s+ON\s+private\.audit_log\s+TO\s+service_role/i);
  });

  test("analysis provenance triggers validate data release membership", () => {
    const analysisSql = migrations.find((m) =>
      m.file.includes("create_analysis_snapshot_schemas")
    )!.sql;
    expect(analysisSql).toMatch(/validate_source_version_membership/i);
    expect(analysisSql).toMatch(/validate_evidence_source_provenance/i);
    expect(analysisSql).toMatch(/source version .* is not a member of the analysis data release/i);
  });

  test("completed analyses are immutable", () => {
    const analysisSql = migrations.find((m) =>
      m.file.includes("create_analysis_snapshot_schemas")
    )!.sql;
    expect(analysisSql).toMatch(/prevent_completed_analysis_mutation/i);
    expect(analysisSql).toMatch(/cannot delete completed analysis/i);
    expect(analysisSql).toMatch(/cannot modify completed analysis/i);
  });

  test("rule versions enforce verified/retired immutability", () => {
    const rulesSql = migrations.find((m) => m.file.includes("create_rule_legal_schemas"))!.sql;
    expect(rulesSql).toMatch(/prevent_verified_rule_version_mutation/i);
    expect(rulesSql).toMatch(/cannot modify .* rule version/i);
    expect(rulesSql).toMatch(/prevent_verified_source_link_mutation/i);
  });
});

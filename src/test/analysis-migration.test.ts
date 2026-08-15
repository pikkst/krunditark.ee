import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260815000005_create_analysis_snapshot_schemas.sql"
);

const sql = readFileSync(migrationPath, "utf-8");

describe("analysis snapshot migration (KT-016)", () => {
  test("migration file exists", () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  test("creates analysis_status enum with expected values", () => {
    expect(sql).toMatch(/CREATE\s+TYPE\s+analysis\.analysis_status\s+AS\s+ENUM/i);
    expect(sql).toMatch(/'queued'/i);
    expect(sql).toMatch(/'preparing'/i);
    expect(sql).toMatch(/'evaluating'/i);
    expect(sql).toMatch(/'completed'/i);
    expect(sql).toMatch(/'partial'/i);
    expect(sql).toMatch(/'failed'/i);
  });

  test("creates finding_state enum with expected values", () => {
    expect(sql).toMatch(/CREATE\s+TYPE\s+analysis\.finding_state\s+AS\s+ENUM/i);
    expect(sql).toMatch(/'clear'/i);
    expect(sql).toMatch(/'condition'/i);
    expect(sql).toMatch(/'conflict'/i);
    expect(sql).toMatch(/'unknown'/i);
  });

  test("creates finding_severity enum with expected values", () => {
    expect(sql).toMatch(/CREATE\s+TYPE\s+analysis\.finding_severity\s+AS\s+ENUM/i);
    expect(sql).toMatch(/'info'/i);
    expect(sql).toMatch(/'warning'/i);
    expect(sql).toMatch(/'critical'/i);
  });

  test("creates evidence_type enum with expected values", () => {
    expect(sql).toMatch(/CREATE\s+TYPE\s+analysis\.evidence_type\s+AS\s+ENUM/i);
    expect(sql).toMatch(/'parcel'/i);
    expect(sql).toMatch(/'constraint'/i);
    expect(sql).toMatch(/'planning'/i);
    expect(sql).toMatch(/'source'/i);
    expect(sql).toMatch(/'legal'/i);
    expect(sql).toMatch(/'geometry'/i);
  });

  test("creates analyses table with required columns", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+analysis\.analyses/i);
    expect(sql).toMatch(/id\s+uuid\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid/i);
    expect(sql).toMatch(/project_id\s+uuid\s+NULL/i);
    expect(sql).toMatch(/proposal_id\s+uuid\s+NOT\s+NULL/i);
    expect(sql).toMatch(/parcel_snapshot_id\s+uuid\s+NOT\s+NULL/i);
    expect(sql).toMatch(/data_release_id\s+uuid\s+NOT\s+NULL/i);
    expect(sql).toMatch(/requested_by\s+uuid\s+NULL/i);
    expect(sql).toMatch(/status\s+analysis\.analysis_status\s+NOT\s+NULL\s+DEFAULT\s+'queued'/i);
    expect(sql).toMatch(/analysis_profile_version\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/engine_version\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/input_hash\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/source_completeness\s+jsonb/i);
    expect(sql).toMatch(/started_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
    expect(sql).toMatch(/completed_at\s+timestamptz\s+NULL/i);
    expect(sql).toMatch(/created_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
    expect(sql).not.toMatch(
      /parcel_snapshot_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+geo\.parcel_snapshots/i
    );
  });

  test("creates analysis_source_versions table with required columns", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+analysis\.analysis_source_versions/i);
    expect(sql).toMatch(/analysis_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+analysis\.analyses/i);
    expect(sql).toMatch(
      /source_id\s+text\s+NOT\s+NULL\s+REFERENCES\s+private\.source_definitions/i
    );
    expect(sql).toMatch(
      /source_dataset_version_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+private\.source_dataset_versions/i
    );
    expect(sql).toMatch(/created_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
    expect(sql).toMatch(/PRIMARY\s+KEY\s*\(\s*analysis_id\s*,\s*source_id\s*\)/i);
  });

  test("creates analysis_rule_versions table with required columns", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+analysis\.analysis_rule_versions/i);
    expect(sql).toMatch(/analysis_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+analysis\.analyses/i);
    expect(sql).toMatch(/rule_version_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+rules\.rule_versions/i);
    expect(sql).toMatch(/created_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
    expect(sql).toMatch(/PRIMARY\s+KEY\s*\(\s*analysis_id\s*,\s*rule_version_id\s*\)/i);
  });

  test("creates findings table with required columns", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+analysis\.findings/i);
    expect(sql).toMatch(/id\s+uuid\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid/i);
    expect(sql).toMatch(/analysis_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+analysis\.analyses/i);
    expect(sql).toMatch(/rule_version_id\s+uuid\s+NULL\s+REFERENCES\s+rules\.rule_versions/i);
    expect(sql).toMatch(/code\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/category\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/state\s+analysis\.finding_state\s+NOT\s+NULL/i);
    expect(sql).toMatch(/severity\s+analysis\.finding_severity\s+NOT\s+NULL\s+DEFAULT\s+'info'/i);
    expect(sql).toMatch(/title_key\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/structured_details\s+jsonb/i);
    expect(sql).toMatch(/next_action_code\s+text\s+NULL/i);
    expect(sql).toMatch(/created_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
  });

  test("creates finding_evidence table with required columns", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+analysis\.finding_evidence/i);
    expect(sql).toMatch(/id\s+uuid\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid/i);
    expect(sql).toMatch(/finding_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+analysis\.findings/i);
    expect(sql).toMatch(/evidence_type\s+analysis\.evidence_type\s+NOT\s+NULL/i);
    expect(sql).toMatch(/parcel_snapshot_id\s+uuid\s+NULL/i);
    expect(sql).toMatch(/constraint_snapshot_id\s+uuid\s+NULL/i);
    expect(sql).toMatch(/planning_snapshot_id\s+uuid\s+NULL/i);
    expect(sql).toMatch(/legal_source_id\s+uuid\s+NULL/i);
    expect(sql).toMatch(/source_sync_run_id\s+uuid\s+NULL/i);
    expect(sql).toMatch(/source_dataset_version_id\s+uuid\s+NULL/i);
    expect(sql).toMatch(
      /evidence_geometry\s+extensions\.geometry\s*\(\s*Geometry\s*,\s*3301\s*\)\s+NULL/i
    );
    expect(sql).toMatch(/measurement\s+jsonb\s+NULL/i);
  });

  test("enforces evidence type requires appropriate reference", () => {
    expect(sql).toMatch(/finding_evidence_type_check/i);
    expect(sql).toMatch(
      /evidence_type\s*=\s*'parcel'\s*AND\s*parcel_snapshot_id\s+IS\s+NOT\s+NULL/i
    );
    expect(sql).toMatch(
      /evidence_type\s*=\s*'constraint'\s*AND\s*constraint_snapshot_id\s+IS\s+NOT\s+NULL/i
    );
    expect(sql).toMatch(
      /evidence_type\s*=\s*'planning'\s*AND\s*planning_snapshot_id\s+IS\s+NOT\s+NULL/i
    );
    expect(sql).toMatch(/evidence_type\s*=\s*'legal'\s*AND\s*legal_source_id\s+IS\s+NOT\s+NULL/i);
    expect(sql).toMatch(
      /evidence_type\s*=\s*'geometry'\s*AND\s*evidence_geometry\s+IS\s+NOT\s+NULL/i
    );
  });

  test("creates indexes for analyses queries", () => {
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_analyses_project_id\s+ON\s+analysis\.analyses\s+\(project_id\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_analyses_status_created\s+ON\s+analysis\.analyses\s+\(status\s*,\s*created_at\s+DESC\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_analyses_data_release_id\s+ON\s+analysis\.analyses\s+\(data_release_id\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_analyses_proposal_id\s+ON\s+analysis\.analyses\s+\(proposal_id\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_analyses_parcel_snapshot_id\s+ON\s+analysis\.analyses\s+\(parcel_snapshot_id\)/i
    );
  });

  test("creates indexes for findings queries", () => {
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_findings_analysis_id\s+ON\s+analysis\.findings\s+\(analysis_id\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_findings_state\s+ON\s+analysis\.findings\s+\(state\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_findings_severity\s+ON\s+analysis\.findings\s+\(severity\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_findings_category\s+ON\s+analysis\.findings\s+\(category\)/i
    );
    expect(sql).toMatch(/CREATE\s+INDEX\s+idx_findings_code\s+ON\s+analysis\.findings\s+\(code\)/i);
  });

  test("creates indexes for finding_evidence queries", () => {
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_finding_evidence_finding_id\s+ON\s+analysis\.finding_evidence\s+\(finding_id\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_finding_evidence_evidence_type\s+ON\s+analysis\.finding_evidence\s+\(evidence_type\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_finding_evidence_parcel_snapshot_id\s+ON\s+analysis\.finding_evidence\s+\(parcel_snapshot_id\)\s+WHERE\s+parcel_snapshot_id\s+IS\s+NOT\s+NULL/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_finding_evidence_constraint_snapshot_id\s+ON\s+analysis\.finding_evidence\s+\(constraint_snapshot_id\)\s+WHERE\s+constraint_snapshot_id\s+IS\s+NOT\s+NULL/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_finding_evidence_planning_snapshot_id\s+ON\s+analysis\.finding_evidence\s+\(planning_snapshot_id\)\s+WHERE\s+planning_snapshot_id\s+IS\s+NOT\s+NULL/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_finding_evidence_legal_source_id\s+ON\s+analysis\.finding_evidence\s+\(legal_source_id\)\s+WHERE\s+legal_source_id\s+IS\s+NOT\s+NULL/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_finding_evidence_source_dataset_version_id\s+ON\s+analysis\.finding_evidence\s+\(source_dataset_version_id\)\s+WHERE\s+source_dataset_version_id\s+IS\s+NOT\s+NULL/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_finding_evidence_geometry\s+ON\s+analysis\.finding_evidence\s+USING\s+GIST\s+\(\s*evidence_geometry\s*\)/i
    );
  });

  test("creates indexes for analysis provenance tables", () => {
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_analysis_source_versions_source_id\s+ON\s+analysis\.analysis_source_versions\s+\(source_id\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_analysis_source_versions_dataset_version\s+ON\s+analysis\.analysis_source_versions\s+\(source_dataset_version_id\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_analysis_rule_versions_rule_version_id\s+ON\s+analysis\.analysis_rule_versions\s+\(rule_version_id\)/i
    );
  });

  test("has check constraints on analyses lengths", () => {
    expect(sql).toMatch(/analyses_analysis_profile_version_length/i);
    expect(sql).toMatch(/analyses_engine_version_length/i);
    expect(sql).toMatch(/analyses_input_hash_length/i);
  });

  test("has check constraints on findings lengths", () => {
    expect(sql).toMatch(/findings_code_length/i);
    expect(sql).toMatch(/findings_category_length/i);
    expect(sql).toMatch(/findings_title_key_length/i);
    expect(sql).toMatch(/findings_next_action_code_length/i);
  });

  test("enforces completed_at after started_at", () => {
    expect(sql).toMatch(/analyses_completed_after_started/i);
  });

  test("creates immutability trigger function for completed analyses", () => {
    expect(sql).toMatch(
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+analysis\.prevent_completed_analysis_mutation/i
    );
    expect(sql).toMatch(/RETURNS\s+trigger/i);
    expect(sql).toMatch(/LANGUAGE\s+plpgsql/i);
    expect(sql).toMatch(/SECURITY\s+DEFINER/i);
    expect(sql).toMatch(/SET\s+search_path\s*=\s*analysis/i);
  });

  test("immutability trigger rejects updates to completed analyses", () => {
    expect(sql).toMatch(/OLD\.status\s+IN\s*\(\s*'completed'\s*,\s*'partial'\s*,\s*'failed'\s*\)/i);
    expect(sql).toMatch(/cannot modify completed analysis/i);
  });

  test("immutability trigger rejects deletes of completed analyses", () => {
    expect(sql).toMatch(/cannot delete completed analysis/i);
  });

  test("immutability trigger allows inserts", () => {
    expect(sql).toMatch(/TG_OP\s*=\s*'INSERT'\s+THEN\s+RETURN\s+NEW/i);
  });

  test("creates trigger on analyses for immutability", () => {
    expect(sql).toMatch(
      /CREATE\s+TRIGGER\s+prevent_completed_analysis_mutation\s+BEFORE\s+UPDATE\s+OR\s+DELETE\s+ON\s+analysis\.analyses\s+FOR\s+EACH\s+ROW\s+EXECUTE\s+FUNCTION\s+analysis\.prevent_completed_analysis_mutation\(\)/i
    );
  });

  test("enables RLS on all analysis tables", () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+analysis\.analyses\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(sql).toMatch(
      /ALTER\s+TABLE\s+analysis\.analysis_source_versions\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
    );
    expect(sql).toMatch(
      /ALTER\s+TABLE\s+analysis\.analysis_rule_versions\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
    );
    expect(sql).toMatch(/ALTER\s+TABLE\s+analysis\.findings\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(sql).toMatch(
      /ALTER\s+TABLE\s+analysis\.finding_evidence\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
    );
  });

  test("creates RLS policies for analyses", () => {
    expect(sql).toMatch(/CREATE\s+POLICY\s+analyses_select_own\s+ON\s+analysis\.analyses/i);
    expect(sql).toMatch(/CREATE\s+POLICY\s+analyses_insert_own\s+ON\s+analysis\.analyses/i);
    expect(sql).toMatch(/CREATE\s+POLICY\s+analyses_update_own\s+ON\s+analysis\.analyses/i);
    expect(sql).toMatch(/CREATE\s+POLICY\s+analyses_delete_own\s+ON\s+analysis\.analyses/i);
  });

  test("creates RLS policies for analysis_source_versions", () => {
    expect(sql).toMatch(
      /CREATE\s+POLICY\s+analysis_source_versions_select_own\s+ON\s+analysis\.analysis_source_versions/i
    );
    expect(sql).toMatch(
      /CREATE\s+POLICY\s+analysis_source_versions_insert_own\s+ON\s+analysis\.analysis_source_versions/i
    );
    expect(sql).toMatch(
      /CREATE\s+POLICY\s+analysis_source_versions_delete_own\s+ON\s+analysis\.analysis_source_versions/i
    );
  });

  test("creates RLS policies for analysis_rule_versions", () => {
    expect(sql).toMatch(
      /CREATE\s+POLICY\s+analysis_rule_versions_select_own\s+ON\s+analysis\.analysis_rule_versions/i
    );
    expect(sql).toMatch(
      /CREATE\s+POLICY\s+analysis_rule_versions_insert_own\s+ON\s+analysis\.analysis_rule_versions/i
    );
    expect(sql).toMatch(
      /CREATE\s+POLICY\s+analysis_rule_versions_delete_own\s+ON\s+analysis\.analysis_rule_versions/i
    );
  });

  test("creates RLS policies for findings", () => {
    expect(sql).toMatch(/CREATE\s+POLICY\s+findings_select_own\s+ON\s+analysis\.findings/i);
    expect(sql).toMatch(/CREATE\s+POLICY\s+findings_insert_own\s+ON\s+analysis\.findings/i);
    expect(sql).toMatch(/CREATE\s+POLICY\s+findings_delete_own\s+ON\s+analysis\.findings/i);
  });

  test("creates RLS policies for finding_evidence", () => {
    expect(sql).toMatch(
      /CREATE\s+POLICY\s+finding_evidence_select_own\s+ON\s+analysis\.finding_evidence/i
    );
    expect(sql).toMatch(
      /CREATE\s+POLICY\s+finding_evidence_insert_own\s+ON\s+analysis\.finding_evidence/i
    );
    expect(sql).toMatch(
      /CREATE\s+POLICY\s+finding_evidence_delete_own\s+ON\s+analysis\.finding_evidence/i
    );
  });

  test("RLS policies enforce project ownership", () => {
    expect(sql).toMatch(/public\.projects\s+p\s+WHERE\s+p\.id\s*=\s*analyses\.project_id/i);
    expect(sql).toMatch(/p\.user_id\s*=\s*auth\.uid\(\)/i);
  });

  test("RLS policies chain through analysis for findings and evidence", () => {
    expect(sql).toMatch(
      /analysis\.analyses\s+a\s+JOIN\s+public\.projects\s+p\s+ON\s+p\.id\s*=\s*a\.project_id/i
    );
    expect(sql).toMatch(/a\.id\s*=\s*findings\.analysis_id/i);
    expect(sql).toMatch(
      /analysis\.findings\s+f\s+JOIN\s+analysis\.analyses\s+a\s+ON\s+a\.id\s*=\s*f\.analysis_id/i
    );
    expect(sql).toMatch(/f\.id\s*=\s*finding_evidence\.finding_id/i);
  });

  test("grants service_role access to analysis tables", () => {
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s*DELETE\s+ON\s+analysis\.analyses\s+TO\s+service_role/i
    );
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s*DELETE\s+ON\s+analysis\.analysis_source_versions\s+TO\s+service_role/i
    );
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s*DELETE\s+ON\s+analysis\.analysis_rule_versions\s+TO\s+service_role/i
    );
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s+INSERT,\s*UPDATE,\s+DELETE\s+ON\s+analysis\.findings\s+TO\s+service_role/i
    );
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s+INSERT,\s*UPDATE,\s+DELETE\s+ON\s+analysis\.finding_evidence\s+TO\s+service_role/i
    );
  });

  test("grants authenticated access to analysis tables", () => {
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s*DELETE\s+ON\s+analysis\.analyses\s+TO\s+authenticated/i
    );
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s+INSERT,\s*UPDATE,\s+DELETE\s+ON\s+analysis\.analysis_rule_versions\s+TO\s+authenticated/i
    );
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s+INSERT,\s*UPDATE,\s+DELETE\s+ON\s+analysis\.findings\s+TO\s+authenticated/i
    );
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s+INSERT,\s*UPDATE,\s+DELETE\s+ON\s+analysis\.finding_evidence\s+TO\s+authenticated/i
    );
  });

  test("grants USAGE on analysis schema and enums", () => {
    expect(sql).toMatch(/GRANT\s+USAGE\s+ON\s+SCHEMA\s+analysis\s+TO\s+service_role/i);
    expect(sql).toMatch(/GRANT\s+USAGE\s+ON\s+SCHEMA\s+analysis\s+TO\s+authenticated/i);
    expect(sql).toMatch(
      /GRANT\s+USAGE\s+ON\s+TYPE\s+analysis\.analysis_status\s+TO\s+service_role/i
    );
    expect(sql).toMatch(/GRANT\s+USAGE\s+ON\s+TYPE\s+analysis\.finding_state\s+TO\s+service_role/i);
    expect(sql).toMatch(
      /GRANT\s+USAGE\s+ON\s+TYPE\s+analysis\.finding_severity\s+TO\s+service_role/i
    );
    expect(sql).toMatch(/GRANT\s+USAGE\s+ON\s+TYPE\s+analysis\.evidence_type\s+TO\s+service_role/i);
  });

  test("foreign keys reference correct schemas", () => {
    expect(sql).toMatch(/REFERENCES\s+public\.projects\s*\(\s*id\s*\)/i);
    expect(sql).toMatch(/REFERENCES\s+public\.project_proposals\s*\(\s*id\s*\)/i);
    expect(sql).toMatch(/REFERENCES\s+private\.data_releases\s*\(\s*id\s*\)/i);
    expect(sql).toMatch(/REFERENCES\s+rules\.rule_versions\s*\(\s*id\s*\)/i);
    expect(sql).toMatch(/REFERENCES\s+rules\.legal_sources\s*\(\s*id\s*\)/i);
    expect(sql).not.toMatch(/REFERENCES\s+geo\.parcel_snapshots\s*\(\s*id\s*\)/i);
    expect(sql).not.toMatch(/REFERENCES\s+geo\.constraint_snapshots\s*\(\s*id\s*\)/i);
    expect(sql).not.toMatch(/REFERENCES\s+geo\.planning_snapshots\s*\(\s*id\s*\)/i);
    expect(sql).toMatch(/REFERENCES\s+private\.source_sync_runs\s*\(\s*id\s*\)/i);
    expect(sql).toMatch(/REFERENCES\s+private\.source_dataset_versions\s*\(\s*id\s*\)/i);
  });

  test("defers geo snapshot FK constraints until tables exist", () => {
    expect(sql).not.toMatch(/parcel_snapshot_id\s+uuid\s+.*\s+REFERENCES\s+geo\.parcel_snapshots/i);
    expect(sql).not.toMatch(
      /constraint_snapshot_id\s+uuid\s+.*\s+REFERENCES\s+geo\.constraint_snapshots/i
    );
    expect(sql).not.toMatch(
      /planning_snapshot_id\s+uuid\s+.*\s+REFERENCES\s+geo\.planning_snapshots/i
    );
    expect(sql).toMatch(/Geo snapshot FK constraints[\s\S]*will be added in a later migration/i);
  });

  test("enforces source version membership against parent analysis data release", () => {
    expect(sql).toMatch(
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+analysis\.validate_source_version_membership/i
    );
    expect(sql).toMatch(/private\.data_release_sources/i);
    expect(sql).toMatch(
      /source version % for source % is not a member of the analysis data release/i
    );
    expect(sql).toMatch(
      /CREATE\s+TRIGGER\s+validate_source_version_membership\s+BEFORE\s+INSERT\s+OR\s+UPDATE\s+ON\s+analysis\.analysis_source_versions/i
    );
  });

  test("enforces findings rule_version_id against selected analysis rules", () => {
    expect(sql).toMatch(
      /CONSTRAINT\s+findings_rule_version_fk\s+FOREIGN\s+KEY\s*\(\s*analysis_id\s*,\s*rule_version_id\s*\)\s+REFERENCES\s+analysis\.analysis_rule_versions\s*\(\s*analysis_id\s*,\s*rule_version_id\s*\)/i
    );
  });

  test("enforces finding evidence source provenance against analysis data release", () => {
    expect(sql).toMatch(
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+analysis\.validate_evidence_source_provenance/i
    );
    expect(sql).toMatch(/evidence source version % is not a member of the analysis data release/i);
    expect(sql).toMatch(
      /evidence sync run % does not produce a dataset version in the analysis data release/i
    );
    expect(sql).toMatch(
      /CREATE\s+TRIGGER\s+validate_evidence_source_provenance\s+BEFORE\s+INSERT\s+OR\s+UPDATE\s+ON\s+analysis\.finding_evidence/i
    );
  });

  test("terminal child mutation trigger checks both old and new parents on update", () => {
    expect(sql).toMatch(/v_old_parent_status\s+text/i);
    expect(sql).toMatch(/v_new_parent_status\s+text/i);
    expect(sql).toMatch(
      /SELECT\s+status\s+INTO\s+v_old_parent_status\s+FROM\s+analysis\.analyses\s+WHERE\s+id\s*=\s*COALESCE\s*\(\s*OLD\.analysis_id\s*,\s*NEW\.analysis_id\s*\)/i
    );
    expect(sql).toMatch(
      /SELECT\s+status\s+INTO\s+v_new_parent_status\s+FROM\s+analysis\.analyses\s+WHERE\s+id\s*=\s*NEW\.analysis_id/i
    );
    expect(sql).toMatch(
      /v_old_parent_status\s+IN\s*\(\s*'completed'\s*,\s*'partial'\s*,\s*'failed'\s*\)\s+OR\s+v_new_parent_status\s+IN\s*\(\s*'completed'\s*,\s*'partial'\s*,\s*'failed'\s*\)/i
    );
    expect(sql).toMatch(/cannot delete child rows of terminal analysis/i);
    expect(sql).toMatch(/cannot modify child rows of terminal analysis/i);
    expect(sql).toMatch(/cannot insert child rows for terminal analysis/i);
  });

  test("finding_evidence terminal parent lookup uses findings table", () => {
    expect(sql).toMatch(
      /FROM\s+analysis\.findings\s+f\s+JOIN\s+analysis\.analyses\s+a\s+ON\s+a\.id\s*=\s*f\.analysis_id/i
    );
    expect(sql).toMatch(
      /WHERE\s+f\.id\s*=\s*COALESCE\s*\(\s*OLD\.finding_id\s*,\s*NEW\.finding_id\s*\)/i
    );
    expect(sql).not.toMatch(/FROM\s+analysis\.finding_evidence\s+fe\s+JOIN/i);
  });

  test("finding_evidence terminal check uses finding_id not analysis_id", () => {
    expect(sql).toMatch(/COALESCE\s*\(\s*OLD\.finding_id\s*,\s*NEW\.finding_id\s*\)/i);
    expect(sql).not.toMatch(/NEW\.analysis_id\s*,\s*OLD\.analysis_id/i);
  });
});

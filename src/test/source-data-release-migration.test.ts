import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260815000003_create_source_data_release_schemas.sql"
);

const sql = readFileSync(migrationPath, "utf-8");

describe("source/data-release migration (KT-014)", () => {
  test("migration file exists", () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  test("creates source_type enum with expected values", () => {
    expect(sql).toMatch(/CREATE\s+TYPE\s+private\.source_type\s+AS\s+ENUM/i);
    expect(sql).toMatch(/'WFS'/i);
    expect(sql).toMatch(/'API'/i);
    expect(sql).toMatch(/'download'/i);
    expect(sql).toMatch(/'manual_law'/i);
  });

  test("creates refresh_policy enum with expected values", () => {
    expect(sql).toMatch(/CREATE\s+TYPE\s+private\.refresh_policy\s+AS\s+ENUM/i);
    expect(sql).toMatch(/'monthly_snapshot'/i);
    expect(sql).toMatch(/'weekly_metadata_check'/i);
    expect(sql).toMatch(/'manual_verified'/i);
    expect(sql).toMatch(/'live_lookup'/i);
    expect(sql).toMatch(/'no_replication'/i);
  });

  test("creates sync_trigger_type enum with expected values", () => {
    expect(sql).toMatch(/CREATE\s+TYPE\s+private\.sync_trigger_type\s+AS\s+ENUM/i);
    expect(sql).toMatch(/'scheduled'/i);
    expect(sql).toMatch(/'manual'/i);
    expect(sql).toMatch(/'retry'/i);
  });

  test("creates sync_status enum with expected values", () => {
    expect(sql).toMatch(/CREATE\s+TYPE\s+private\.sync_status\s+AS\s+ENUM/i);
    expect(sql).toMatch(/'queued'/i);
    expect(sql).toMatch(/'fetching'/i);
    expect(sql).toMatch(/'validating'/i);
    expect(sql).toMatch(/'normalizing'/i);
    expect(sql).toMatch(/'candidate'/i);
    expect(sql).toMatch(/'completed'/i);
    expect(sql).toMatch(/'failed'/i);
    expect(sql).toMatch(/'rejected'/i);
  });

  test("creates dataset_version_status enum with expected values", () => {
    expect(sql).toMatch(/CREATE\s+TYPE\s+private\.dataset_version_status\s+AS\s+ENUM/i);
    expect(sql).toMatch(/'candidate'/i);
    expect(sql).toMatch(/'verified'/i);
    expect(sql).toMatch(/'rejected'/i);
    expect(sql).toMatch(/'retired'/i);
  });

  test("creates release_status enum with expected values", () => {
    expect(sql).toMatch(/CREATE\s+TYPE\s+private\.release_status\s+AS\s+ENUM/i);
    expect(sql).toMatch(/'candidate'/i);
    expect(sql).toMatch(/'promoted'/i);
    expect(sql).toMatch(/'rejected'/i);
    expect(sql).toMatch(/'retired'/i);
  });

  test("creates freshness_state enum with expected values", () => {
    expect(sql).toMatch(/CREATE\s+TYPE\s+private\.freshness_state\s+AS\s+ENUM/i);
    expect(sql).toMatch(/'fresh'/i);
    expect(sql).toMatch(/'warning'/i);
    expect(sql).toMatch(/'stale'/i);
    expect(sql).toMatch(/'unknown'/i);
  });

  test("creates source_definitions table with required columns", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+private\.source_definitions/i);
    expect(sql).toMatch(/id\s+text\s+PRIMARY\s+KEY/i);
    expect(sql).toMatch(/name\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/authority\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/source_type\s+private\.source_type\s+NOT\s+NULL/i);
    expect(sql).toMatch(/base_url\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/terms_url\s+text\s+NULL/i);
    expect(sql).toMatch(/attribution_text\s+text\s+NULL/i);
    expect(sql).toMatch(/refresh_policy\s+private\.refresh_policy\s+NOT\s+NULL/i);
    expect(sql).toMatch(/refresh_interval\s+interval\s+NULL/i);
    expect(sql).toMatch(/freshness_warn_after\s+interval\s+NULL/i);
    expect(sql).toMatch(/freshness_critical_after\s+interval\s+NULL/i);
    expect(sql).toMatch(/release_blocking\s+boolean\s+NOT\s+NULL\s+DEFAULT\s+true/i);
    expect(sql).toMatch(/verification_policy\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/normalizer_version\s+text\s+NOT\s+NULL\s+DEFAULT\s+'1'/i);
    expect(sql).toMatch(/enabled\s+boolean\s+NOT\s+NULL\s+DEFAULT\s+true/i);
    expect(sql).toMatch(/last_successful_sync_at\s+timestamptz\s+NULL/i);
    expect(sql).toMatch(/next_sync_due_at\s+timestamptz\s+NULL/i);
    expect(sql).toMatch(/created_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
    expect(sql).toMatch(/updated_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
  });

  test("creates source_sync_runs table with required columns", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+private\.source_sync_runs/i);
    expect(sql).toMatch(/id\s+uuid\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid/i);
    expect(sql).toMatch(
      /source_id\s+text\s+NOT\s+NULL\s+REFERENCES\s+private\.source_definitions/i
    );
    expect(sql).toMatch(/trigger_type\s+private\.sync_trigger_type\s+NOT\s+NULL/i);
    expect(sql).toMatch(/idempotency_key\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/status\s+private\.sync_status\s+NOT\s+NULL\s+DEFAULT\s+'queued'/i);
    expect(sql).toMatch(/started_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
    expect(sql).toMatch(/finished_at\s+timestamptz\s+NULL/i);
    expect(sql).toMatch(/previous_version_id\s+uuid\s+NULL/i);
    expect(sql).toMatch(/candidate_version_id\s+uuid\s+NULL/i);
    expect(sql).toMatch(/http_status\s+integer\s+NULL/i);
    expect(sql).toMatch(/records_fetched\s+bigint\s+NULL/i);
    expect(sql).toMatch(/records_added\s+bigint\s+NULL/i);
    expect(sql).toMatch(/records_changed\s+bigint\s+NULL/i);
    expect(sql).toMatch(/records_removed\s+bigint\s+NULL/i);
    expect(sql).toMatch(/payload_sha256\s+text\s+NULL/i);
    expect(sql).toMatch(/source_version\s+text\s+NULL/i);
    expect(sql).toMatch(/source_updated_at\s+timestamptz\s+NULL/i);
    expect(sql).toMatch(/normalizer_version\s+text\s+NOT\s+NULL\s+DEFAULT\s+'1'/i);
    expect(sql).toMatch(/error_code\s+text\s+NULL/i);
    expect(sql).toMatch(/safe_metadata\s+jsonb\s+NOT\s+NULL\s+DEFAULT\s+'{}'::jsonb/i);
    expect(sql).toMatch(/created_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
  });

  test("enforces unique idempotency key per source on sync runs", () => {
    expect(sql).toMatch(
      /source_sync_runs_unique_source_idempotency\s+UNIQUE\s+\(source_id\s*,\s*idempotency_key\)/i
    );
  });

  test("creates unique (id, source_id) on source_sync_runs for composite FK", () => {
    expect(sql).toMatch(/source_sync_runs_unique_id_source\s+UNIQUE\s+\(id\s*,\s*source_id\)/i);
  });

  test("creates source_dataset_versions table with required columns", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+private\.source_dataset_versions/i);
    expect(sql).toMatch(/id\s+uuid\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid/i);
    expect(sql).toMatch(
      /source_id\s+text\s+NOT\s+NULL\s+REFERENCES\s+private\.source_definitions/i
    );
    expect(sql).toMatch(/version_key\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(
      /status\s+private\.dataset_version_status\s+NOT\s+NULL\s+DEFAULT\s+'candidate'/i
    );
    expect(sql).toMatch(
      /sync_run_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+private\.source_sync_runs/i
    );
    expect(sql).toMatch(
      /previous_version_id\s+uuid\s+NULL\s+REFERENCES\s+private\.source_dataset_versions/i
    );
    expect(sql).toMatch(/retrieved_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
    expect(sql).toMatch(/source_updated_at\s+timestamptz\s+NULL/i);
    expect(sql).toMatch(/promoted_at\s+timestamptz\s+NULL/i);
    expect(sql).toMatch(/payload_sha256\s+text\s+NULL/i);
    expect(sql).toMatch(/normalizer_version\s+text\s+NOT\s+NULL\s+DEFAULT\s+'1'/i);
    expect(sql).toMatch(/record_count\s+bigint\s+NOT\s+NULL\s+DEFAULT\s+0/i);
    expect(sql).toMatch(/validation_summary\s+jsonb\s+NOT\s+NULL\s+DEFAULT\s+'{}'::jsonb/i);
    expect(sql).toMatch(/created_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
  });

  test("enforces same-source relationship between dataset version and sync run", () => {
    expect(sql).toMatch(
      /source_dataset_versions_sync_run_source_fk\s+FOREIGN\s+KEY\s*\(\s*sync_run_id\s*,\s*source_id\s*\)\s+REFERENCES\s+private\.source_sync_runs\s*\(\s*id\s*,\s*source_id\s*\)/i
    );
  });

  test("creates unique (id, source_id) on source_dataset_versions for composite FK", () => {
    expect(sql).toMatch(
      /source_dataset_versions_unique_id_source\s+UNIQUE\s+\(id\s*,\s*source_id\)/i
    );
  });

  test("creates data_releases table with required columns", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+private\.data_releases/i);
    expect(sql).toMatch(/id\s+uuid\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid/i);
    expect(sql).toMatch(/release_key\s+text\s+NOT\s+NULL\s+UNIQUE/i);
    expect(sql).toMatch(/status\s+private\.release_status\s+NOT\s+NULL\s+DEFAULT\s+'candidate'/i);
    expect(sql).toMatch(/created_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
    expect(sql).toMatch(/promoted_at\s+timestamptz\s+NULL/i);
    expect(sql).toMatch(/created_by\s+uuid\s+NULL/i);
    expect(sql).toMatch(/notes\s+text\s+NULL/i);
  });

  test("creates data_release_sources membership table with required columns", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+private\.data_release_sources/i);
    expect(sql).toMatch(
      /data_release_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+private\.data_releases/i
    );
    expect(sql).toMatch(
      /source_id\s+text\s+NOT\s+NULL\s+REFERENCES\s+private\.source_definitions/i
    );
    expect(sql).toMatch(
      /source_dataset_version_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+private\.source_dataset_versions/i
    );
    expect(sql).toMatch(/carried_forward\s+boolean\s+NOT\s+NULL\s+DEFAULT\s+false/i);
    expect(sql).toMatch(
      /freshness_state\s+private\.freshness_state\s+NOT\s+NULL\s+DEFAULT\s+'unknown'/i
    );
    expect(sql).toMatch(/created_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
    expect(sql).toMatch(/PRIMARY\s+KEY\s*\(\s*data_release_id\s*,\s*source_id\s*\)/i);
  });

  test("enforces same-source relationship between release membership and dataset version", () => {
    expect(sql).toMatch(
      /data_release_sources_version_source_fk\s+FOREIGN\s+KEY\s*\(\s*source_dataset_version_id\s*,\s*source_id\s*\)\s+REFERENCES\s+private\.source_dataset_versions\s*\(\s*id\s*,\s*source_id\s*\)/i
    );
  });

  test("enforces unique source version per source", () => {
    expect(sql).toMatch(
      /source_dataset_versions_unique_source_version\s+UNIQUE\s+\(source_id\s*,\s*version_key\)/i
    );
  });

  test("creates indexes for source_definitions queries", () => {
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_source_definitions_enabled\s+ON\s+private\.source_definitions\s+\(enabled\)\s+WHERE\s+enabled\s*=\s*true/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_source_definitions_next_sync\s+ON\s+private\.source_definitions\s+\(next_sync_due_at\)\s+WHERE\s+enabled\s*=\s+true\s+AND\s+next_sync_due_at\s+IS\s+NOT\s+NULL/i
    );
  });

  test("creates indexes for source_sync_runs queries", () => {
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_source_sync_runs_source_started\s+ON\s+private\.source_sync_runs\s+\(source_id\s*,\s*started_at\s+DESC\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_source_sync_runs_status_started\s+ON\s+private\.source_sync_runs\s+\(status\s*,\s*started_at\)/i
    );
  });

  test("creates indexes for source_dataset_versions queries", () => {
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_source_dataset_versions_source_status\s+ON\s+private\.source_dataset_versions\s+\(source_id\s*,\s*status\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_source_dataset_versions_promoted_at\s+ON\s+private\.source_dataset_versions\s+\(promoted_at\)\s+WHERE\s+status\s*=\s*'verified'/i
    );
  });

  test("creates indexes for data_releases queries", () => {
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_data_releases_status_created\s+ON\s+private\.data_releases\s+\(status\s*,\s*created_at\s+DESC\)/i
    );
  });

  test("creates index for data_release_sources queries", () => {
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_data_release_sources_source_version\s+ON\s+private\.data_release_sources\s+\(source_id\s*,\s*source_dataset_version_id\)/i
    );
  });

  test("has check constraints on source_definitions lengths", () => {
    expect(sql).toMatch(/source_definitions_name_length/i);
    expect(sql).toMatch(/source_definitions_authority_length/i);
    expect(sql).toMatch(/source_definitions_base_url_length/i);
    expect(sql).toMatch(/source_definitions_verification_policy_length/i);
  });

  test("has check constraints on source_sync_runs", () => {
    expect(sql).toMatch(/source_sync_runs_idempotency_key_length/i);
    expect(sql).toMatch(/source_sync_runs_error_code_length/i);
    expect(sql).toMatch(/source_sync_runs_http_status_valid/i);
    expect(sql).toMatch(/source_sync_runs_records_nonnegative/i);
    expect(sql).toMatch(/source_sync_runs_finished_after_started/i);
  });

  test("has check constraints on source_dataset_versions", () => {
    expect(sql).toMatch(/source_dataset_versions_version_key_length/i);
    expect(sql).toMatch(/source_dataset_versions_record_count_nonnegative/i);
  });

  test("has check constraint on data_releases release_key length", () => {
    expect(sql).toMatch(/data_releases_release_key_length/i);
  });

  test("has check constraint on data_release_sources carried_forward", () => {
    expect(sql).toMatch(/data_release_sources_carried_forward_requires_version/i);
  });

  test("grants service_role access to private tables", () => {
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s*DELETE\s+ON\s+private\.source_definitions\s+TO\s+service_role/i
    );
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s+DELETE\s+ON\s+private\.source_sync_runs\s+TO\s+service_role/i
    );
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s+DELETE\s+ON\s+private\.source_dataset_versions\s+TO\s+service_role/i
    );
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s+DELETE\s+ON\s+private\.data_releases\s+TO\s+service_role/i
    );
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s+DELETE\s+ON\s+private\.data_release_sources\s+TO\s+service_role/i
    );
  });

  test("grants USAGE on private schema and all private enums to service_role", () => {
    expect(sql).toMatch(/GRANT\s+USAGE\s+ON\s+SCHEMA\s+private\s+TO\s+service_role/i);
    expect(sql).toMatch(/GRANT\s+USAGE\s+ON\s+TYPE\s+private\.source_type\s+TO\s+service_role/i);
    expect(sql).toMatch(/GRANT\s+USAGE\s+ON\s+TYPE\s+private\.refresh_policy\s+TO\s+service_role/i);
    expect(sql).toMatch(
      /GRANT\s+USAGE\s+ON\s+TYPE\s+private\.sync_trigger_type\s+TO\s+service_role/i
    );
    expect(sql).toMatch(/GRANT\s+USAGE\s+ON\s+TYPE\s+private\.sync_status\s+TO\s+service_role/i);
    expect(sql).toMatch(
      /GRANT\s+USAGE\s+ON\s+TYPE\s+private\.dataset_version_status\s+TO\s+service_role/i
    );
    expect(sql).toMatch(/GRANT\s+USAGE\s+ON\s+TYPE\s+private\.release_status\s+TO\s+service_role/i);
    expect(sql).toMatch(
      /GRANT\s+USAGE\s+ON\s+TYPE\s+private\.freshness_state\s+TO\s+service_role/i
    );
  });

  test("does not expose private tables to authenticated or anon", () => {
    expect(sql).not.toMatch(/TO\s+authenticated/i);
    expect(sql).not.toMatch(/TO\s+anon/i);
  });
});

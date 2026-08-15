import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260815000004_create_rule_legal_schemas.sql"
);

const sql = readFileSync(migrationPath, "utf-8");

describe("rule/legal migration (KT-015)", () => {
  test("migration file exists", () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  test("creates rule_status enum with expected values", () => {
    expect(sql).toMatch(/CREATE\s+TYPE\s+rules\.rule_status\s+AS\s+ENUM/i);
    expect(sql).toMatch(/'draft'/i);
    expect(sql).toMatch(/'verified'/i);
    expect(sql).toMatch(/'retired'/i);
  });

  test("creates legal_change_candidate_status enum with expected values", () => {
    expect(sql).toMatch(/CREATE\s+TYPE\s+rules\.legal_change_candidate_status\s+AS\s+ENUM/i);
    expect(sql).toMatch(/'pending'/i);
    expect(sql).toMatch(/'reviewed'/i);
    expect(sql).toMatch(/'accepted'/i);
    expect(sql).toMatch(/'no_rule_change'/i);
  });

  test("creates legal_sources table with required columns", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+rules\.legal_sources/i);
    expect(sql).toMatch(/id\s+uuid\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid/i);
    expect(sql).toMatch(/authority\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/title\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/official_url\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/document_identifier\s+text\s+NULL/i);
    expect(sql).toMatch(/section_reference\s+text\s+NULL/i);
    expect(sql).toMatch(/effective_from\s+date\s+NULL/i);
    expect(sql).toMatch(/effective_to\s+date\s+NULL/i);
    expect(sql).toMatch(/retrieved_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
    expect(sql).toMatch(/content_hash\s+text\s+NULL/i);
    expect(sql).toMatch(/notes\s+text\s+NULL/i);
  });

  test("creates legal_change_candidates table with required columns", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+rules\.legal_change_candidates/i);
    expect(sql).toMatch(/id\s+uuid\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid/i);
    expect(sql).toMatch(/legal_source_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+rules\.legal_sources/i);
    expect(sql).toMatch(
      /previous_legal_source_id\s+uuid\s+NULL\s+REFERENCES\s+rules\.legal_sources/i
    );
    expect(sql).toMatch(/previous_hash\s+text\s+NULL/i);
    expect(sql).toMatch(/new_hash\s+text\s+NULL/i);
    expect(sql).toMatch(/detected_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
    expect(sql).toMatch(/effective_at\s+date\s+NULL/i);
    expect(sql).toMatch(
      /status\s+rules\.legal_change_candidate_status\s+NOT\s+NULL\s+DEFAULT\s+'pending'/i
    );
    expect(sql).toMatch(/review_notes\s+text\s+NULL/i);
    expect(sql).toMatch(/reviewed_by\s+uuid\s+NULL\s+REFERENCES\s+auth\.users/i);
    expect(sql).toMatch(/reviewed_at\s+timestamptz\s+NULL/i);
    expect(sql).toMatch(/created_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
  });

  test("creates rule_definitions table with required columns", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+rules\.rule_definitions/i);
    expect(sql).toMatch(/id\s+uuid\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid/i);
    expect(sql).toMatch(/code\s+text\s+NOT\s+NULL\s+UNIQUE/i);
    expect(sql).toMatch(/title\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/category\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/description\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/created_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
  });

  test("creates rule_versions table with required columns", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+rules\.rule_versions/i);
    expect(sql).toMatch(/id\s+uuid\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid/i);
    expect(sql).toMatch(
      /rule_definition_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+rules\.rule_definitions/i
    );
    expect(sql).toMatch(/version\s+integer\s+NOT\s+NULL\s+DEFAULT\s+1/i);
    expect(sql).toMatch(/implementation_key\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/status\s+rules\.rule_status\s+NOT\s+NULL\s+DEFAULT\s+'draft'/i);
    expect(sql).toMatch(/effective_from\s+date\s+NULL/i);
    expect(sql).toMatch(/effective_to\s+date\s+NULL/i);
    expect(sql).toMatch(/verified_at\s+timestamptz\s+NULL/i);
    expect(sql).toMatch(/verified_by\s+uuid\s+NULL\s+REFERENCES\s+auth\.users/i);
    expect(sql).toMatch(/created_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
  });

  test("creates rule_version_sources join table with required columns", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+rules\.rule_version_sources/i);
    expect(sql).toMatch(/rule_version_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+rules\.rule_versions/i);
    expect(sql).toMatch(/legal_source_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+rules\.legal_sources/i);
    expect(sql).toMatch(/relationship\s+text\s+NOT\s+NULL\s+DEFAULT\s+'implements'/i);
    expect(sql).toMatch(/created_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
    expect(sql).toMatch(/PRIMARY\s+KEY\s*\(\s*rule_version_id\s*,\s*legal_source_id\s*\)/i);
  });

  test("enforces unique rule version per definition", () => {
    expect(sql).toMatch(
      /rule_versions_unique_definition_version\s+UNIQUE\s+\(rule_definition_id\s*,\s*version\)/i
    );
  });

  test("enforces positive rule version", () => {
    expect(sql).toMatch(/rule_versions_version_positive\s+CHECK\s*\(\s*version\s*>\s*0\s*\)/i);
  });

  test("enforces effective date ordering on legal_sources", () => {
    expect(sql).toMatch(/legal_sources_effective_dates/i);
  });

  test("enforces effective date ordering on rule_versions", () => {
    expect(sql).toMatch(/rule_versions_effective_dates/i);
  });

  test("creates indexes for legal_sources queries", () => {
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_legal_sources_authority\s+ON\s+rules\.legal_sources\s+\(authority\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_legal_sources_document_identifier\s+ON\s+rules\.legal_sources\s+\(document_identifier\)\s+WHERE\s+document_identifier\s+IS\s+NOT\s+NULL/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_legal_sources_effective_from\s+ON\s+rules\.legal_sources\s+\(effective_from\)\s+WHERE\s+effective_from\s+IS\s+NOT\s+NULL/i
    );
  });

  test("creates indexes for legal_change_candidates queries", () => {
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_legal_change_candidates_legal_source_id\s+ON\s+rules\.legal_change_candidates\s+\(legal_source_id\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_legal_change_candidates_status\s+ON\s+rules\.legal_change_candidates\s+\(status\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_legal_change_candidates_detected_at\s+ON\s+rules\.legal_change_candidates\s+\(detected_at\s+DESC\)/i
    );
  });

  test("creates indexes for rule_definitions queries", () => {
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_rule_definitions_code\s+ON\s+rules\.rule_definitions\s+\(code\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_rule_definitions_category\s+ON\s+rules\.rule_definitions\s+\(category\)/i
    );
  });

  test("creates indexes for rule_versions queries", () => {
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_rule_versions_definition_status\s+ON\s+rules\.rule_versions\s+\(rule_definition_id\s*,\s*status\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_rule_versions_status\s+ON\s+rules\.rule_versions\s+\(status\)\s+WHERE\s+status\s*=\s*'verified'/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_rule_versions_effective_period\s+ON\s+rules\.rule_versions\s+\(effective_from\s*,\s*effective_to\)\s+WHERE\s+effective_from\s+IS\s+NOT\s+NULL/i
    );
  });

  test("creates index for rule_version_sources queries", () => {
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_rule_version_sources_legal_source_id\s+ON\s+rules\.rule_version_sources\s+\(legal_source_id\)/i
    );
  });

  test("has check constraints on legal_sources lengths", () => {
    expect(sql).toMatch(/legal_sources_authority_length/i);
    expect(sql).toMatch(/legal_sources_title_length/i);
    expect(sql).toMatch(/legal_sources_official_url_length/i);
    expect(sql).toMatch(/legal_sources_document_identifier_length/i);
    expect(sql).toMatch(/legal_sources_section_reference_length/i);
    expect(sql).toMatch(/legal_sources_content_hash_length/i);
    expect(sql).toMatch(/legal_sources_notes_length/i);
  });

  test("has check constraints on legal_change_candidates lengths", () => {
    expect(sql).toMatch(/legal_change_candidates_previous_hash_length/i);
    expect(sql).toMatch(/legal_change_candidates_new_hash_length/i);
    expect(sql).toMatch(/legal_change_candidates_review_notes_length/i);
  });

  test("has check constraints on rule_definitions lengths", () => {
    expect(sql).toMatch(/rule_definitions_code_length/i);
    expect(sql).toMatch(/rule_definitions_title_length/i);
    expect(sql).toMatch(/rule_definitions_category_length/i);
    expect(sql).toMatch(/rule_definitions_description_length/i);
  });

  test("has check constraints on rule_versions", () => {
    expect(sql).toMatch(/rule_versions_version_positive/i);
    expect(sql).toMatch(/rule_versions_implementation_key_length/i);
  });

  test("has check constraint on rule_version_sources relationship length", () => {
    expect(sql).toMatch(/rule_version_sources_relationship_length/i);
  });

  test("grants service_role access to rules tables", () => {
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s*DELETE\s+ON\s+rules\.legal_sources\s+TO\s+service_role/i
    );
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s+DELETE\s+ON\s+rules\.legal_change_candidates\s+TO\s+service_role/i
    );
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s+DELETE\s+ON\s+rules\.rule_definitions\s+TO\s+service_role/i
    );
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s*INSERT,\s+UPDATE,\s+DELETE\s+ON\s+rules\.rule_versions\s+TO\s+service_role/i
    );
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s*INSERT,\s*UPDATE,\s+DELETE\s+ON\s+rules\.rule_version_sources\s+TO\s+service_role/i
    );
  });

  test("grants USAGE on rules schema and enums to service_role", () => {
    expect(sql).toMatch(/GRANT\s+USAGE\s+ON\s+SCHEMA\s+rules\s+TO\s+service_role/i);
    expect(sql).toMatch(/GRANT\s+USAGE\s+ON\s+TYPE\s+rules\.rule_status\s+TO\s+service_role/i);
    expect(sql).toMatch(
      /GRANT\s+USAGE\s+ON\s+TYPE\s+rules\.legal_change_candidate_status\s+TO\s+service_role/i
    );
  });

  test("does not expose rules tables to authenticated or anon", () => {
    expect(sql).not.toMatch(/TO\s+authenticated/i);
    expect(sql).not.toMatch(/TO\s+anon/i);
  });
});

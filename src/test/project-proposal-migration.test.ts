import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260815000002_create_project_proposal_model.sql"
);

const sql = readFileSync(migrationPath, "utf-8");

describe("project/proposal migration (KT-013)", () => {
  test("migration file exists", () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  test("documents that cadastral_id is not ownership proof", () => {
    expect(sql).toMatch(/cadastral_id represents a selected parcel, not ownership proof/i);
  });

  test("creates structure_type enum with supported categories", () => {
    expect(sql).toMatch(/CREATE\s+TYPE\s+public\.structure_type\s+AS\s+ENUM/i);
    expect(sql).toMatch(/detached_house/i);
    expect(sql).toMatch(/sauna/i);
    expect(sql).toMatch(/shed/i);
    expect(sql).toMatch(/garage/i);
    expect(sql).toMatch(/auxiliary_building/i);
  });

  test("creates projects table with required columns", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+public\.projects/i);
    expect(sql).toMatch(/id\s+uuid\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid/i);
    expect(sql).toMatch(/user_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+auth\.users/i);
    expect(sql).toMatch(/ON\s+DELETE\s+CASCADE/i);
    expect(sql).toMatch(/name\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/cadastral_id\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/current_parcel_snapshot_id\s+uuid\s+NULL/i);
    expect(sql).toMatch(/created_at\s+timestamptz/i);
    expect(sql).toMatch(/updated_at\s+timestamptz/i);
    expect(sql).toMatch(/archived_at\s+timestamptz\s+NULL/i);
  });

  test("creates project_proposals table with required columns", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+public\.project_proposals/i);
    expect(sql).toMatch(/project_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+public\.projects/i);
    expect(sql).toMatch(/version\s+integer\s+NOT\s+NULL\s+DEFAULT\s+1/i);
    expect(sql).toMatch(/structure_type\s+public\.structure_type\s+NOT\s+NULL/i);
    expect(sql).toMatch(/intended_use\s+text\s+NULL/i);
    expect(sql).toMatch(
      /footprint\s+extensions\.geometry\s*\(\s*Polygon,\s*3301\s*\)\s+NOT\s+NULL/i
    );
    expect(sql).toMatch(/footprint_area_m2\s+numeric\s+NOT\s+NULL/i);
    expect(sql).toMatch(/height_m\s+numeric\s+NULL/i);
    expect(sql).toMatch(/storeys\s+integer\s+NULL/i);
    expect(sql).toMatch(/width_m\s+numeric\s+NULL/i);
    expect(sql).toMatch(/length_m\s+numeric\s+NULL/i);
    expect(sql).toMatch(/orientation_deg\s+numeric\s+NULL/i);
    expect(sql).toMatch(/user_notes\s+text\s+NULL/i);
    expect(sql).toMatch(/created_at\s+timestamptz/i);
    expect(sql).toMatch(/superseded_at\s+timestamptz\s+NULL/i);
  });

  test("creates indexes for common query patterns", () => {
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_projects_user_id_updated_at\s+ON\s+public\.projects\s+\(user_id,\s*updated_at\s+DESC\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_projects_cadastral_id\s+ON\s+public\.projects\s+\(cadastral_id\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_project_proposals_project_id\s+ON\s+public\.project_proposals\s+\(project_id\)/i
    );
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_project_proposals_footprint\s+ON\s+public\.project_proposals\s+USING\s+GIST\s+\(footprint\)/i
    );
  });

  test("creates trigger to prevent client user_id changes", () => {
    expect(sql).toMatch(/prevent_client_user_id_change/i);
    expect(sql).toMatch(/auth\.uid\(\)\s+IS\s+NOT\s+NULL/i);
    expect(sql).toMatch(/RAISE\s+EXCEPTION\s+'user_id cannot be changed through client policy'/i);
  });

  test("creates trigger to auto-update projects updated_at", () => {
    expect(sql).toMatch(/update_projects_updated_at/i);
    expect(sql).toMatch(/BEFORE\s+UPDATE\s+ON\s+public\.projects/i);
    expect(sql).toMatch(/update_updated_at_column/i);
  });

  test("creates trigger to server-calculate proposal area from geometry", () => {
    expect(sql).toMatch(/calculate_proposal_area/i);
    expect(sql).toMatch(/geo\.st_area_m2/i);
    expect(sql).toMatch(/BEFORE\s+INSERT\s+OR\s+UPDATE\s+ON\s+public\.project_proposals/i);
  });

  test("enables RLS on projects and project_proposals", () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+public\.projects\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(sql).toMatch(
      /ALTER\s+TABLE\s+public\.project_proposals\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
    );
  });

  test("creates RLS policies for projects owner CRUD", () => {
    expect(sql).toMatch(/CREATE\s+POLICY\s+projects_select_own/i);
    expect(sql).toMatch(/CREATE\s+POLICY\s+projects_insert_own/i);
    expect(sql).toMatch(/CREATE\s+POLICY\s+projects_update_own/i);
    expect(sql).toMatch(/CREATE\s+POLICY\s+projects_delete_own/i);
    expect(sql).toMatch(/auth\.uid\(\)\s*=\s*user_id/i);
  });

  test("creates RLS policies for proposals through project ownership", () => {
    expect(sql).toMatch(/CREATE\s+POLICY\s+project_proposals_select_own/i);
    expect(sql).toMatch(/CREATE\s+POLICY\s+project_proposals_insert_own/i);
    expect(sql).toMatch(/CREATE\s+POLICY\s+project_proposals_update_own/i);
    expect(sql).toMatch(/CREATE\s+POLICY\s+project_proposals_delete_own/i);
    expect(sql).toMatch(/EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+public\.projects\s+p/i);
  });

  test("grants appropriate permissions to authenticated role", () => {
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s+INSERT,\s+UPDATE,\s+DELETE\s+ON\s+public\.projects\s+TO\s+authenticated/i
    );
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s+INSERT,\s+UPDATE,\s+DELETE\s+ON\s+public\.project_proposals\s+TO\s+authenticated/i
    );
    expect(sql).toMatch(/GRANT\s+USAGE\s+ON\s+TYPE\s+public\.structure_type\s+TO\s+authenticated/i);
  });

  test("has check constraints for abuse prevention", () => {
    expect(sql).toMatch(/version\s*>\s*0/i);
    expect(sql).toMatch(/ST_IsValid\s*\(\s*footprint\s*\)/i);
    expect(sql).toMatch(/ST_IsEmpty\s*\(\s*footprint\s*\)/i);
    expect(sql).toMatch(/footprint_area_m2\s*>\s*0/i);
    expect(sql).toMatch(/footprint_area_m2\s*<=\s*100000/i);
    expect(sql).toMatch(/height_m\s+IS\s+NULL\s+OR\s+height_m\s*>\s*0/i);
    expect(sql).toMatch(/height_m\s+IS\s+NULL\s+OR\s+height_m\s*<=\s*200/i);
    expect(sql).toMatch(/storeys\s+IS\s+NULL\s+OR\s+storeys\s*>\s*0/i);
    expect(sql).toMatch(/storeys\s+IS\s+NULL\s+OR\s+storeys\s*<=\s*100/i);
    expect(sql).toMatch(/width_m\s+IS\s+NULL\s+OR\s+width_m\s*>\s*0/i);
    expect(sql).toMatch(/width_m\s+IS\s+NULL\s+OR\s+width_m\s*<=\s*2000/i);
    expect(sql).toMatch(/length_m\s+IS\s+NULL\s+OR\s+length_m\s*>\s*0/i);
    expect(sql).toMatch(/length_m\s+IS\s+NULL\s+OR\s+length_m\s*<=\s*2000/i);
    expect(sql).toMatch(
      /orientation_deg\s+IS\s+NULL\s+OR\s*\(\s*orientation_deg\s*>=\s*0\s+AND\s+orientation_deg\s*<\s*360\s*\)/i
    );
  });

  test("has unique version constraint per project", () => {
    expect(sql).toMatch(/project_proposals_unique_version\s+UNIQUE\s+\(project_id,\s*version\)/i);
  });
});

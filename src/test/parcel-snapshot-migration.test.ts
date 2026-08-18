import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260815000010_create_parcel_snapshots.sql"
);

const sql = readFileSync(migrationPath, "utf-8");

describe("parcel snapshot migration (KT-027)", () => {
  test("migration file exists", () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  test("creates geo.parcel_snapshots table with required columns", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?geo\.parcel_snapshots/i);
    expect(sql).toMatch(/id\s+uuid\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid/i);
    expect(sql).toMatch(/cadastral_id\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(
      /source_dataset_version_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+private\.source_dataset_versions/i
    );
    expect(sql).toMatch(
      /source_sync_run_id\s+uuid\s+NOT\s+NULL\s+REFERENCES\s+private\.source_sync_runs/i
    );
    expect(sql).toMatch(/source_object_id\s+text\s+NULL/i);
    expect(sql).toMatch(/geometry\s+extensions\.geometry\s+NOT\s+NULL/i);
    expect(sql).toMatch(/area_m2_source\s+numeric\s+NULL/i);
    expect(sql).toMatch(/area_m2_geometry\s+numeric\s+NOT\s+NULL/i);
    expect(sql).toMatch(/address_text\s+text\s+NULL/i);
    expect(sql).toMatch(/land_use_data\s+jsonb\s+NOT\s+NULL\s+DEFAULT\s+'{}'::jsonb/i);
    expect(sql).toMatch(/source_effective_at\s+timestamptz\s+NULL/i);
    expect(sql).toMatch(/retrieved_at\s+timestamptz\s+NOT\s+NULL\s+DEFAULT\s+now/i);
    expect(sql).toMatch(/normalizer_version\s+text\s+NOT\s+NULL/i);
    expect(sql).toMatch(/content_hash\s+text\s+NOT\s+NULL/i);
  });

  test("enforces SRID 3301 on geometry", () => {
    expect(sql).toMatch(
      /parcel_snapshots_geometry_srid\s+CHECK\s*\(\s*extensions\.ST_SRID\s*\(\s*geometry\s*\)\s*=\s*3301\s*\)/i
    );
  });

  test("enforces non-empty geometry", () => {
    expect(sql).toMatch(
      /parcel_snapshots_geometry_not_empty\s+CHECK\s*\(\s*NOT\s+extensions\.ST_IsEmpty\s*\(\s*geometry\s*\)\s*\)/i
    );
  });

  test("enforces valid geometry", () => {
    expect(sql).toMatch(
      /parcel_snapshots_geometry_valid\s+CHECK\s*\(\s*extensions\.ST_IsValid\s*\(\s*geometry\s*\)\s*\)/i
    );
  });

  test("enforces Polygon or MultiPolygon geometry type", () => {
    expect(sql).toMatch(
      /parcel_snapshots_geometry_type\s+CHECK\s*\([^)]*ST_GeometryType\s*\(\s*geometry\s*\)\s+IN\s*\(\s*'ST_Polygon'\s*,\s*'ST_MultiPolygon'\s*\)/i
    );
  });

  test("enforces positive area_m2_geometry", () => {
    expect(sql).toMatch(
      /parcel_snapshots_area_geometry_positive\s+CHECK\s*\(\s*area_m2_geometry\s*>\s*0\s*\)/i
    );
  });

  test("enforces maximum area_m2_geometry", () => {
    expect(sql).toMatch(
      /parcel_snapshots_area_geometry_max\s+CHECK\s*\(\s*area_m2_geometry\s*<=\s*1000000000\s*\)/i
    );
  });

  test("has length checks for text fields", () => {
    expect(sql).toMatch(
      /parcel_snapshots_cadastral_id_length\s+CHECK\s*\(\s*char_length\s*\(\s*cadastral_id\s*\)\s*<=\s*50\s*\)/i
    );
    expect(sql).toMatch(
      /parcel_snapshots_source_object_id_length\s+CHECK\s*\(\s*source_object_id\s+IS\s+NULL\s+OR\s+char_length\s*\(\s*source_object_id\s*\)\s*<=\s*200\s*\)/i
    );
    expect(sql).toMatch(
      /parcel_snapshots_address_text_length\s+CHECK\s*\(\s*address_text\s+IS\s+NULL\s+OR\s+char_length\s*\(\s*address_text\s*\)\s*<=\s*500\s*\)/i
    );
    expect(sql).toMatch(
      /parcel_snapshots_normalizer_version_length\s+CHECK\s*\(\s*char_length\s*\(\s*normalizer_version\s*\)\s*<=\s*100\s*\)/i
    );
    expect(sql).toMatch(
      /parcel_snapshots_content_hash_length\s+CHECK\s*\(\s*char_length\s*\(\s*content_hash\s*\)\s*<=\s*200\s*\)/i
    );
  });

  test("enforces EPSG:3301 coordinate range on geometry", () => {
    expect(sql).toMatch(/parcel_snapshots_coord_x_range\s+CHECK/i);
    expect(sql).toMatch(/ST_XMin\s*\(\s*geometry\s*\)\s*>=\s*350000/i);
    expect(sql).toMatch(/ST_XMax\s*\(\s*geometry\s*\)\s*<=\s*750000/i);
    expect(sql).toMatch(/ST_YMin\s*\(\s*geometry\s*\)\s*>=\s*5500000/i);
    expect(sql).toMatch(/ST_YMax\s*\(\s*geometry\s*\)\s*<=\s*7000000/i);
  });

  test("enforces geometry complexity vertex limit", () => {
    expect(sql).toMatch(/parcel_snapshots_geometry_complexity\s+CHECK/i);
    expect(sql).toMatch(/ST_NPoints\s*\(\s*geometry\s*\)\s*<=\s*100000/i);
  });

  test("enforces land_use_data size bound", () => {
    expect(sql).toMatch(/parcel_snapshots_land_use_data_size\s+CHECK/i);
    expect(sql).toMatch(/pg_column_size\s*\(\s*land_use_data\s*\)\s*<=\s*65536/i);
  });

  test("creates provenance trigger validating sync run matches dataset version", () => {
    expect(sql).toMatch(/validate_parcel_sync_run/i);
    expect(sql).toMatch(/parcel snapshot sync run .* does not match dataset version/i);
  });

  test("creates trigger to server-calculate area_m2_geometry", () => {
    expect(sql).toMatch(/calculate_parcel_area/i);
    expect(sql).toMatch(/geo\.st_area_m2/i);
    expect(sql).toMatch(/BEFORE\s+INSERT\s+OR\s+UPDATE\s+ON\s+geo\.parcel_snapshots/i);
  });

  test("creates immutability trigger preventing UPDATE/DELETE", () => {
    expect(sql).toMatch(/prevent_parcel_snapshot_mutation/i);
    expect(sql).toMatch(/BEFORE\s+UPDATE\s+OR\s+DELETE\s+ON\s+geo\.parcel_snapshots/i);
    expect(sql).toMatch(/parcel snapshot is immutable/i);
  });

  test("creates unique dedupe index for snapshots with source object ID", () => {
    expect(sql).toMatch(
      /idx_parcel_snapshots_unique_object\s+ON\s+geo\.parcel_snapshots\s+\(\s*source_dataset_version_id\s*,\s*source_object_id\s*\)/i
    );
    expect(sql).toMatch(/WHERE\s+source_object_id\s+IS\s+NOT\s+NULL/i);
  });

  test("creates unique dedupe index for snapshots without source object ID", () => {
    expect(sql).toMatch(
      /idx_parcel_snapshots_unique_content\s+ON\s+geo\.parcel_snapshots\s+\(\s*cadastral_id\s*,\s*source_dataset_version_id\s*\)/i
    );
    expect(sql).toMatch(/WHERE\s+source_object_id\s+IS\s+NULL/i);
  });

  test("creates GiST index on geometry", () => {
    expect(sql).toMatch(
      /idx_parcel_snapshots_geometry\s+ON\s+geo\.parcel_snapshots\s+USING\s+GIST\s+\(\s*geometry\s*\)/i
    );
  });

  test("creates B-tree index on cadastral_id and source_dataset_version_id", () => {
    expect(sql).toMatch(
      /idx_parcel_snapshots_cadastral_version\s+ON\s+geo\.parcel_snapshots\s+\(\s*cadastral_id\s*,\s*source_dataset_version_id\s*\)/i
    );
  });

  test("creates B-tree index on cadastral_id and retrieved_at desc", () => {
    expect(sql).toMatch(
      /idx_parcel_snapshots_cadastral_retrieved\s+ON\s+geo\.parcel_snapshots\s+\(\s*cadastral_id\s*,\s*retrieved_at\s+DESC\s*\)/i
    );
  });

  test("binds projects.current_parcel_snapshot_id to geo.parcel_snapshots", () => {
    expect(sql).toMatch(/projects_current_parcel_snapshot_id_fk/i);
    expect(sql).toMatch(/REFERENCES\s+geo\.parcel_snapshots\s*\(\s*id\s*\)/i);
    expect(sql).toMatch(/ON\s+DELETE\s+SET\s+NULL/i);
  });

  test("binds analyses.parcel_snapshot_id to geo.parcel_snapshots with RESTRICT delete", () => {
    expect(sql).toMatch(/analyses_parcel_snapshot_id_fk/i);
    expect(sql).toMatch(/REFERENCES\s+geo\.parcel_snapshots\s*\(\s*id\s*\)/i);
    expect(sql).toMatch(/ON\s+DELETE\s+RESTRICT/i);
  });

  test("enables RLS on geo.parcel_snapshots", () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+geo\.parcel_snapshots\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
  });

  test("denies anon access to geo.parcel_snapshots", () => {
    expect(sql).toMatch(/parcel_snapshots_no_anon\s+ON\s+geo\.parcel_snapshots/i);
    expect(sql).toMatch(/TO\s+anon\s+USING\s*\(\s*false\s*\)/i);
  });

  test("denies authenticated access to geo.parcel_snapshots", () => {
    expect(sql).toMatch(/parcel_snapshots_no_authenticated\s+ON\s+geo\.parcel_snapshots/i);
    expect(sql).toMatch(/TO\s+authenticated\s+USING\s*\(\s*false\s*\)/i);
  });

  test("grants service_role INSERT/SELECT only on geo.parcel_snapshots", () => {
    expect(sql).toMatch(
      /GRANT\s+SELECT,\s*INSERT\s+ON\s+geo\.parcel_snapshots\s+TO\s+service_role/i
    );
    expect(sql).toMatch(/GRANT\s+USAGE\s+ON\s+SCHEMA\s+geo\s+TO\s+service_role/i);
  });
});

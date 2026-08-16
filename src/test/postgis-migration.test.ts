import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const migrationPath = join(root, "supabase", "migrations", "20260815000000_enable_postgis.sql");

const sql = readFileSync(migrationPath, "utf-8");

describe("PostGIS migration (KT-011)", () => {
  test("migration file exists", () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  test("creates extensions schema and installs PostGIS into it", () => {
    expect(sql).toMatch(/CREATE\s+SCHEMA\s+IF\s+NOT\s+EXISTS\s+extensions/i);
    expect(sql).toMatch(/CREATE\s+EXTENSION\s+postgis\s+WITH\s+SCHEMA\s+extensions/i);
    expect(sql).toMatch(/ALTER\s+EXTENSION\s+postgis\s+SET\s+SCHEMA\s+extensions/i);
  });

  test("asserts PostGIS is installed in the extensions schema", () => {
    expect(sql).toMatch(/pg_extension/i);
    expect(sql).toMatch(/pg_namespace/i);
    expect(sql).toMatch(/ASSERT\s+v_extnamespace\s*=\s*'extensions'/i);
  });

  test("creates documented spatial schemas", () => {
    expect(sql).toMatch(/CREATE\s+SCHEMA\s+IF\s+NOT\s+EXISTS\s+geo/i);
    expect(sql).toMatch(/CREATE\s+SCHEMA\s+IF\s+NOT\s+EXISTS\s+rules/i);
    expect(sql).toMatch(/CREATE\s+SCHEMA\s+IF\s+NOT\s+EXISTS\s+analysis/i);
    expect(sql).toMatch(/CREATE\s+SCHEMA\s+IF\s+NOT\s+EXISTS\s+private/i);
  });

  test("defines required spatial helper functions", () => {
    expect(sql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+geo\.st_area_m2/i);
    expect(sql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+geo\.st_distance_m/i);
    expect(sql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+geo\.st_intersects_3301/i);
    expect(sql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+geo\.st_is_valid_geom/i);
  });

  test("schema-qualifies PostGIS types and functions", () => {
    expect(sql).toMatch(/extensions\.geometry\s*\(/i);
    expect(sql).toMatch(/extensions\.ST_Area/i);
    expect(sql).toMatch(/extensions\.ST_Transform/i);
    expect(sql).toMatch(/extensions\.ST_Distance/i);
    expect(sql).toMatch(/extensions\.ST_Intersects/i);
    expect(sql).toMatch(/extensions\.ST_IsValid/i);
    expect(sql).toMatch(/extensions\.ST_SRID/i);
    expect(sql).toMatch(/extensions\.ST_SetSRID/i);
    expect(sql).toMatch(/extensions\.ST_DWithin/i);
    expect(sql).toMatch(/extensions\.PostGIS_Full_Version/i);
  });

  test("st_is_valid_geom validates SRID without silently relabeling", () => {
    expect(sql).toMatch(/ST_IsValid\s*\(\s*p_geom\s*\)/i);
    expect(sql).toMatch(/ST_SRID\s*\(\s*p_geom\s*\)\s*=\s*p_srid/i);
    expect(sql).not.toMatch(/ST_SetSRID\s*\(\s*p_geom/i);
  });

  test("includes GiST smoke test table and index", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+geo\._postgis_smoke_test/i);
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+idx_postgis_smoke_test_geom\s+ON\s+geo\._postgis_smoke_test\s+USING\s+GIST/i
    );
  });

  test("smoke test inserts sample geometries", () => {
    expect(sql).toMatch(/smoke_polygon_a/i);
    expect(sql).toMatch(/smoke_polygon_b/i);
    expect(sql).toMatch(/smoke_point_c/i);
  });

  test("smoke test disables seqscan to force GiST usage", () => {
    expect(sql).toMatch(/SET\s+LOCAL\s+enable_seqscan\s*=\s*off/i);
  });

  test("smoke test captures EXPLAIN plan with EXECUTE", () => {
    expect(sql).toMatch(/EXECUTE\s+'EXPLAIN\s*\(FORMAT\s+JSON/i);
  });

  test("smoke test asserts GiST index plan path", () => {
    expect(sql).toMatch(/Node\s+Type.*Bitmap\s+Heap\s+Scan/i);
    expect(sql).toMatch(/Node\s+Type.*Index\s+Scan/i);
    expect(sql).toMatch(/Node\s+Type.*Bitmap\s+Index\s+Scan/i);
  });

  test("smoke test verifies core spatial predicates", () => {
    expect(sql).toMatch(/PostGIS_Full_Version/i);
    expect(sql).toMatch(/ST_IsValid/i);
    expect(sql).toMatch(/ST_Area/i);
    expect(sql).toMatch(/ST_Intersects/i);
    expect(sql).toMatch(/ST_DWithin/i);
  });
});

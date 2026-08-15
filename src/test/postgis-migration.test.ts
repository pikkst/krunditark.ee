import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const migrationPath = join(root, "supabase", "migrations", "20260815000000_enable_postgis.sql");

const sql = readFileSync(migrationPath, "utf-8");

describe("PostGIS migration (KT-011)", () => {
  test("migration file exists", () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  test("enables PostGIS extension", () => {
    expect(sql).toMatch(/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+postgis/i);
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

  test("includes GiST smoke test table and index", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+geo\._postgis_smoke_test/i);
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_postgis_smoke_test_geom\s+ON\s+geo\._postgis_smoke_test\s+USING\s+GIST/i
    );
  });

  test("smoke test inserts sample geometries", () => {
    expect(sql).toMatch(/smoke_polygon_a/i);
    expect(sql).toMatch(/smoke_polygon_b/i);
    expect(sql).toMatch(/smoke_point_c/i);
  });

  test("smoke test verifies core spatial predicates", () => {
    expect(sql).toMatch(/PostGIS_Full_Version/i);
    expect(sql).toMatch(/ST_IsValid/i);
    expect(sql).toMatch(/ST_Area/i);
    expect(sql).toMatch(/ST_Intersects/i);
    expect(sql).toMatch(/ST_DWithin/i);
  });
});

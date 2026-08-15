-- KT-011: Enable PostGIS extension and prepare spatial schemas
-- This migration must run against a clean database.
-- Fixes for production issues are forward migrations only.

-- 1. Enable PostGIS extension in the documented extensions schema.
-- Creating the schema explicitly keeps extension placement deterministic.
CREATE SCHEMA IF NOT EXISTS extensions;

-- PostGIS is installed into the extensions schema so internal spatial objects
-- are separated from user-facing tables. IF NOT EXISTS does not relocate an
-- already-installed extension; the assertion below verifies the namespace.
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Verify the installed extension lives in the extensions schema.
-- This assertion fails if PostGIS was previously installed elsewhere and
-- could not be relocated by the statement above.
DO $$
DECLARE
    v_extname text;
    v_extnamespace text;
BEGIN
    SELECT extname, n.nspname
    INTO v_extname, v_extnamespace
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'postgis';

    ASSERT v_extname = 'postgis', 'PostGIS extension is not installed';
    ASSERT v_extnamespace = 'extensions', 'PostGIS extension is not in the extensions schema (found: ' || COALESCE(v_extnamespace, 'null') || ')';
END;
$$;

-- 2. Create documented logical schemas
-- public    -> user-facing account/project resources (RLS-protected)
-- geo       -> normalized official spatial source data/versioned snapshots
-- rules     -> rule definitions, versions, legal references/change review
-- analysis  -> analysis snapshots, findings, evidence, explanations
-- private   -> source registry, sync runs, dataset releases, audit
CREATE SCHEMA IF NOT EXISTS geo;
CREATE SCHEMA IF NOT EXISTS rules;
CREATE SCHEMA IF NOT EXISTS analysis;
CREATE SCHEMA IF NOT EXISTS private;

-- 3. Required spatial helper functions
-- All PostGIS types/functions are schema-qualified to extensions so these
-- definitions are deterministic regardless of the migration session search_path.
-- They wrap PostGIS operations with domain conventions (EPSG:3301 Estonia metric).

CREATE OR REPLACE FUNCTION geo.st_area_m2(p_geom extensions.geometry)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT extensions.ST_Area(extensions.ST_Transform(p_geom, 3301));
$$;

CREATE OR REPLACE FUNCTION geo.st_distance_m(p_a extensions.geometry, p_b extensions.geometry)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT extensions.ST_Distance(
    extensions.ST_Transform(p_a, 3301),
    extensions.ST_Transform(p_b, 3301)
  );
$$;

CREATE OR REPLACE FUNCTION geo.st_intersects_3301(p_a extensions.geometry, p_b extensions.geometry)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT extensions.ST_Intersects(
    extensions.ST_Transform(p_a, 3301),
    extensions.ST_Transform(p_b, 3301)
  );
$$;

-- Validates topology and rejects geometries whose declared SRID does not match
-- the expected CRS. This avoids silently relabeling unknown/mismatched source
-- coordinates, which conflicts with the project GIS policy.
CREATE OR REPLACE FUNCTION geo.st_is_valid_geom(p_geom extensions.geometry, p_srid int DEFAULT 3301)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT extensions.ST_IsValid(p_geom) AND extensions.ST_SRID(p_geom) = p_srid;
$$;

-- 4. GiST smoke test
-- Create a smoke-test table with a GiST index, insert sample geometries,
-- and verify spatial predicates work. The table is intentionally left in place as a
-- lightweight regression artifact; drop it manually if desired.
DROP TABLE IF EXISTS geo._postgis_smoke_test;

CREATE TABLE geo._postgis_smoke_test (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    geom extensions.geometry(Geometry, 3301) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_postgis_smoke_test_geom
    ON geo._postgis_smoke_test USING GIST (geom);

INSERT INTO geo._postgis_smoke_test (name, geom)
VALUES
    ('smoke_polygon_a', extensions.ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301)),
    ('smoke_polygon_b', extensions.ST_SetSRID('POLYGON((11 11, 21 11, 21 21, 11 21, 11 11))'::extensions.geometry, 3301)),
    ('smoke_point_c', extensions.ST_SetSRID('POINT(20 20)'::extensions.geometry, 3301));

-- Verify core PostGIS operations return expected results.
-- Disable sequential scans locally so the planner must use the GiST index for
-- the intersection predicate, providing a real GiST smoke test.
SET LOCAL enable_seqscan = off;

DO $$
DECLARE
    v_version text;
    v_valid boolean;
    v_area numeric;
    v_intersects int;
    v_dwithin int;
    v_plan jsonb;
BEGIN
    -- PostGIS extension is available
    SELECT extensions.PostGIS_Full_Version() INTO v_version;
    ASSERT v_version IS NOT NULL AND v_version != '', 'PostGIS extension not available';

    -- Geometry validation and SRID check work
    SELECT geo.st_is_valid_geom(extensions.ST_SetSRID('POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))'::extensions.geometry, 3301), 3301) INTO v_valid;
    ASSERT v_valid = true, 'st_is_valid_geom returned unexpected result';

    -- Area calculation works for EPSG:3301 geometries
    SELECT geo.st_area_m2(extensions.ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301)) INTO v_area;
    ASSERT v_area = 100, 'Unexpected area: ' || COALESCE(v_area::text, 'null');

    -- Intersection predicate uses GiST index (seqscan disabled above)
    SELECT COUNT(*) INTO v_intersects
    FROM geo._postgis_smoke_test
    WHERE extensions.ST_Intersects(geom, extensions.ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301));
    ASSERT v_intersects = 1, 'Unexpected intersect count: ' || v_intersects;

    -- Verify the planner chose an index path for the spatial predicate.
    -- EXPLAIN (FORMAT JSON) returns a JSON array; capture it with EXECUTE.
    EXECUTE 'EXPLAIN (FORMAT JSON, ANALYZE false, BUFFERS false) SELECT 1 FROM geo._postgis_smoke_test WHERE extensions.ST_Intersects(geom, extensions.ST_SetSRID(''POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))''::extensions.geometry, 3301))' INTO v_plan;

    ASSERT v_plan IS NOT NULL, 'No plan found for GiST smoke test';
    ASSERT (
        v_plan @> '[{"Plan": {"Node Type": "Bitmap Heap Scan"}}]' OR
        v_plan @> '[{"Plan": {"Node Type": "Index Scan"}}]' OR
        v_plan @> '[{"Plan": {"Node Type": "Bitmap Index Scan"}}]'
    ), 'GiST index was not used for spatial predicate; plan: ' || v_plan::text;

    -- Distance predicate works
    SELECT COUNT(*) INTO v_dwithin
    FROM geo._postgis_smoke_test
    WHERE extensions.ST_DWithin(geom, extensions.ST_SetSRID('POINT(20 20)'::extensions.geometry, 3301), 1);
    ASSERT v_dwithin = 1, 'Unexpected dwithin count: ' || v_dwithin;

    RAISE NOTICE 'PostGIS smoke test passed: %', v_version;
END;
$$;

-- KT-011: Enable PostGIS extension and prepare spatial schemas
-- This migration must run against a clean database.
-- Fixes for production issues are forward migrations only.

-- 1. Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

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
-- These wrap PostGIS operations with domain conventions (EPSG:3301 Estonia metric).

CREATE OR REPLACE FUNCTION geo.st_area_m2(p_geom geometry)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT ST_Area(ST_Transform(p_geom, 3301));
$$;

CREATE OR REPLACE FUNCTION geo.st_distance_m(p_a geometry, p_b geometry)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT ST_Distance(
    ST_Transform(p_a, 3301),
    ST_Transform(p_b, 3301)
  );
$$;

CREATE OR REPLACE FUNCTION geo.st_intersects_3301(p_a geometry, p_b geometry)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT ST_Intersects(
    ST_Transform(p_a, 3301),
    ST_Transform(p_b, 3301)
  );
$$;

CREATE OR REPLACE FUNCTION geo.st_is_valid_geom(p_geom geometry, p_srid int DEFAULT 3301)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT ST_IsValid(ST_SetSRID(p_geom, p_srid));
$$;

-- 4. GiST smoke test
-- Create a temporary smoke-test table with a GiST index, insert sample geometries,
-- and verify spatial predicates work. The table is intentionally left in place as a
-- lightweight regression artifact; drop it manually if desired.
CREATE TABLE IF NOT EXISTS geo._postgis_smoke_test (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    geom geometry(Geometry, 3301) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_postgis_smoke_test_geom
    ON geo._postgis_smoke_test USING GIST (geom);

INSERT INTO geo._postgis_smoke_test (name, geom)
VALUES
    ('smoke_polygon_a', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::geometry, 3301)),
    ('smoke_polygon_b', ST_SetSRID('POLYGON((5 5, 15 5, 15 15, 5 15, 5 5))'::geometry, 3301)),
    ('smoke_point_c', ST_SetSRID('POINT(20 20)'::geometry, 3301))
ON CONFLICT DO NOTHING;

-- Verify core PostGIS operations return expected results
DO $$
DECLARE
    v_version text;
    v_valid boolean;
    v_area numeric;
    v_intersects int;
    v_dwithin int;
BEGIN
    -- PostGIS extension is available
    SELECT PostGIS_Full_Version() INTO v_version;
    ASSERT v_version IS NOT NULL AND v_version != '', 'PostGIS extension not available';

    -- Geometry validation works
    SELECT ST_IsValid(ST_SetSRID('POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))'::geometry, 3301)) INTO v_valid;
    ASSERT v_valid = true, 'ST_IsValid returned unexpected result';

    -- Area calculation works for EPSG:3301 geometries
    SELECT geo.st_area_m2(ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::geometry, 3301)) INTO v_area;
    ASSERT v_area = 100, 'Unexpected area: ' || COALESCE(v_area::text, 'null');

    -- Intersection predicate works through GiST index
    SELECT COUNT(*) INTO v_intersects
    FROM geo._postgis_smoke_test
    WHERE ST_Intersects(geom, ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::geometry, 3301));
    ASSERT v_intersects = 1, 'Unexpected intersect count: ' || v_intersects;

    -- Distance predicate works
    SELECT COUNT(*) INTO v_dwithin
    FROM geo._postgis_smoke_test
    WHERE ST_DWithin(geom, ST_SetSRID('POINT(20 20)'::geometry, 3301), 1);
    ASSERT v_dwithin = 1, 'Unexpected dwithin count: ' || v_dwithin;

    RAISE NOTICE 'PostGIS smoke test passed: %', v_version;
END;
$$;

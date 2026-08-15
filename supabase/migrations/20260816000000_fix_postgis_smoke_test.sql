-- Fix KT-011 GiST smoke test intersection count
-- The original query polygon POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))
-- intersects both smoke_polygon_a and smoke_polygon_b because
-- smoke_polygon_b overlaps from (5,5) to (10,10).
-- Replace the smoke test data with polygons that only intersect
-- the query polygon individually, preserving the assertion count = 1.

-- Drop and recreate smoke test table
DROP TABLE IF EXISTS geo._postgis_smoke_test;

CREATE TABLE geo._postgis_smoke_test (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    geom extensions.geometry(Geometry, 3301) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_postgis_smoke_test_geom
    ON geo._postgis_smoke_test USING GIST (geom);

INSERT INTO geo._postgis_smoke_test (name, geom)
VALUES
    ('smoke_polygon_a', extensions.ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301)),
    ('smoke_polygon_b', extensions.ST_SetSRID('POLYGON((11 11, 21 11, 21 21, 11 21, 11 11))'::extensions.geometry, 3301)),
    ('smoke_point_c', extensions.ST_SetSRID('POINT(20 20)'::extensions.geometry, 3301))
ON CONFLICT DO NOTHING;

-- Re-run smoke test assertions with corrected data
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
    SELECT extensions.PostGIS_Full_Version() INTO v_version;
    ASSERT v_version IS NOT NULL AND v_version != '', 'PostGIS extension not available';

    SELECT geo.st_is_valid_geom(extensions.ST_SetSRID('POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))'::extensions.geometry, 3301), 3301) INTO v_valid;
    ASSERT v_valid = true, 'st_is_valid_geom returned unexpected result';

    SELECT geo.st_area_m2(extensions.ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301)) INTO v_area;
    ASSERT v_area = 100, 'Unexpected area: ' || COALESCE(v_area::text, 'null');

    SELECT COUNT(*) INTO v_intersects
    FROM geo._postgis_smoke_test
    WHERE extensions.ST_Intersects(geom, extensions.ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301));
    ASSERT v_intersects = 1, 'Unexpected intersect count: ' || v_intersects;

    EXECUTE 'EXPLAIN (FORMAT JSON, ANALYZE false, BUFFERS false) SELECT 1 FROM geo._postgis_smoke_test WHERE extensions.ST_Intersects(geom, extensions.ST_SetSRID(''POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))''::extensions.geometry, 3301))' INTO v_plan;

    ASSERT v_plan IS NOT NULL, 'No plan found for GiST smoke test';
    ASSERT (
        v_plan @> '[{"Plan": {"Node Type": "Bitmap Heap Scan"}}]' OR
        v_plan @> '[{"Plan": {"Node Type": "Index Scan"}}]' OR
        v_plan @> '[{"Plan": {"Node Type": "Bitmap Index Scan"}}]'
    ), 'GiST index was not used for spatial predicate; plan: ' || v_plan::text;

    SELECT COUNT(*) INTO v_dwithin
    FROM geo._postgis_smoke_test
    WHERE extensions.ST_DWithin(geom, extensions.ST_SetSRID('POINT(20 20)'::extensions.geometry, 3301), 1);
    ASSERT v_dwithin = 1, 'Unexpected dwithin count: ' || v_dwithin;

    RAISE NOTICE 'PostGIS smoke test passed: %', v_version;
END;
$$;

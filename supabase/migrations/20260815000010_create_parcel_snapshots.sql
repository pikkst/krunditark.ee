-- KT-027: Create parcel snapshots persistence model
-- This migration creates the canonical geo.parcel_snapshots table and binds
-- the selected cadastral unit to the exact source dataset/sync provenance
-- used later by analysis.
--
-- Semantic rules:
-- - A parcel snapshot is an immutable record of one cadastral unit bound to
--   an exact source dataset version and sync run.
-- - Geometry is stored in canonical EPSG:3301 and accepts Polygon/MultiPolygon.
-- - area_m2_geometry is server-calculated and cannot be overridden by client input.
-- - Multiple snapshots for the same cadastral ID across different dataset versions
--   are preserved for reproducibility.
-- - Internal geo schema is not exposed through the Data API.
-- - Snapshots are append-only; service_role may INSERT but not UPDATE/DELETE.

-- 1. Create parcel_snapshots table

CREATE TABLE IF NOT EXISTS geo.parcel_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cadastral_id text NOT NULL,
    source_dataset_version_id uuid NOT NULL REFERENCES private.source_dataset_versions(id) ON DELETE RESTRICT,
    source_sync_run_id uuid NOT NULL REFERENCES private.source_sync_runs(id) ON DELETE RESTRICT,
    source_object_id text NULL,
    geometry extensions.geometry NOT NULL,
    area_m2_source numeric NULL,
    area_m2_geometry numeric NOT NULL,
    address_text text NULL,
    land_use_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    source_effective_at timestamptz NULL,
    retrieved_at timestamptz NOT NULL DEFAULT now(),
    normalizer_version text NOT NULL,
    content_hash text NOT NULL,
    CONSTRAINT parcel_snapshots_cadastral_id_length CHECK (char_length(cadastral_id) <= 50),
    CONSTRAINT parcel_snapshots_geometry_srid CHECK (extensions.ST_SRID(geometry) = 3301),
    CONSTRAINT parcel_snapshots_geometry_not_empty CHECK (NOT extensions.ST_IsEmpty(geometry)),
    CONSTRAINT parcel_snapshots_geometry_valid CHECK (extensions.ST_IsValid(geometry)),
    CONSTRAINT parcel_snapshots_geometry_type CHECK (
        extensions.ST_GeometryType(geometry) IN ('ST_Polygon', 'ST_MultiPolygon')
    ),
    CONSTRAINT parcel_snapshots_area_geometry_positive CHECK (area_m2_geometry > 0),
    CONSTRAINT parcel_snapshots_area_geometry_max CHECK (area_m2_geometry <= 1000000000),
    CONSTRAINT parcel_snapshots_source_object_id_length CHECK (source_object_id IS NULL OR char_length(source_object_id) <= 200),
    CONSTRAINT parcel_snapshots_address_text_length CHECK (address_text IS NULL OR char_length(address_text) <= 500),
    CONSTRAINT parcel_snapshots_normalizer_version_length CHECK (char_length(normalizer_version) <= 100),
    CONSTRAINT parcel_snapshots_content_hash_length CHECK (char_length(content_hash) <= 200),
    CONSTRAINT parcel_snapshots_coord_x_range CHECK (
        extensions.ST_XMin(geometry) >= 350000 AND extensions.ST_XMax(geometry) <= 750000
    ),
    CONSTRAINT parcel_snapshots_coord_y_range CHECK (
        extensions.ST_YMin(geometry) >= 5500000 AND extensions.ST_YMax(geometry) <= 7000000
    ),
    CONSTRAINT parcel_snapshots_geometry_complexity CHECK (
        extensions.ST_NPoints(geometry) <= 100000
    ),
    CONSTRAINT parcel_snapshots_land_use_data_size CHECK (
        pg_column_size(land_use_data) <= 65536
    )
);

-- 2. Provenance trigger: sync run must be the exact run that produced the dataset version

CREATE OR REPLACE FUNCTION geo.validate_parcel_sync_run()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = geo, private
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM private.source_dataset_versions dv
        WHERE dv.id = NEW.source_dataset_version_id
        AND dv.sync_run_id = NEW.source_sync_run_id
    ) THEN
        RAISE EXCEPTION 'parcel snapshot sync run % does not match dataset version %', NEW.source_sync_run_id, NEW.source_dataset_version_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_parcel_sync_run ON geo.parcel_snapshots;

CREATE TRIGGER validate_parcel_sync_run
    BEFORE INSERT OR UPDATE ON geo.parcel_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION geo.validate_parcel_sync_run();

-- 3. Server-calculate area_m2_geometry from canonical geometry

CREATE OR REPLACE FUNCTION geo.calculate_parcel_area()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = geo, extensions
AS $$
BEGIN
    IF NEW.geometry IS NOT NULL THEN
        NEW.area_m2_geometry := geo.st_area_m2(NEW.geometry);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calculate_parcel_area ON geo.parcel_snapshots;

CREATE TRIGGER calculate_parcel_area
    BEFORE INSERT OR UPDATE ON geo.parcel_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION geo.calculate_parcel_area();

-- 4. Immutability trigger: prevent UPDATE/DELETE on geo.parcel_snapshots

CREATE OR REPLACE FUNCTION geo.prevent_parcel_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = geo
AS $$
BEGIN
    RAISE EXCEPTION 'parcel snapshot is immutable';
END;
$$;

DROP TRIGGER IF EXISTS prevent_parcel_snapshot_mutation ON geo.parcel_snapshots;

CREATE TRIGGER prevent_parcel_snapshot_mutation
    BEFORE UPDATE OR DELETE ON geo.parcel_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION geo.prevent_parcel_snapshot_mutation();

-- 5. Snapshot identity/dedupe constraints
-- Exact dataset version + source object ID where available.
-- Fallback for sources without object IDs: one canonical row per cadastral ID + dataset version.

CREATE UNIQUE INDEX IF NOT EXISTS idx_parcel_snapshots_unique_object
    ON geo.parcel_snapshots (source_dataset_version_id, source_object_id)
    WHERE source_object_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_parcel_snapshots_unique_content
    ON geo.parcel_snapshots (cadastral_id, source_dataset_version_id)
    WHERE source_object_id IS NULL;

-- 6. Indexes for common query patterns

CREATE INDEX IF NOT EXISTS idx_parcel_snapshots_geometry ON geo.parcel_snapshots USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_parcel_snapshots_cadastral_version ON geo.parcel_snapshots (cadastral_id, source_dataset_version_id);
CREATE INDEX IF NOT EXISTS idx_parcel_snapshots_cadastral_retrieved ON geo.parcel_snapshots (cadastral_id, retrieved_at DESC);

-- 7. Bind public.projects.current_parcel_snapshot_id to geo.parcel_snapshots

ALTER TABLE public.projects
    DROP CONSTRAINT IF EXISTS projects_current_parcel_snapshot_id_fk;

ALTER TABLE public.projects
    ADD CONSTRAINT projects_current_parcel_snapshot_id_fk
        FOREIGN KEY (current_parcel_snapshot_id)
        REFERENCES geo.parcel_snapshots(id)
        ON DELETE SET NULL;

-- 8. Bind analysis.analyses.parcel_snapshot_id to geo.parcel_snapshots
-- ON DELETE RESTRICT preserves historical analyses and reproducibility.

ALTER TABLE analysis.analyses
    DROP CONSTRAINT IF EXISTS analyses_parcel_snapshot_id_fk;

ALTER TABLE analysis.analyses
    ADD CONSTRAINT analyses_parcel_snapshot_id_fk
        FOREIGN KEY (parcel_snapshot_id)
        REFERENCES geo.parcel_snapshots(id)
        ON DELETE RESTRICT;

-- 9. RLS and grants
-- geo is an internal schema; do not expose through Data API.

ALTER TABLE geo.parcel_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parcel_snapshots_no_anon ON geo.parcel_snapshots;
CREATE POLICY parcel_snapshots_no_anon ON geo.parcel_snapshots
    FOR ALL
    TO anon
    USING (false);

DROP POLICY IF EXISTS parcel_snapshots_no_authenticated ON geo.parcel_snapshots;
CREATE POLICY parcel_snapshots_no_authenticated ON geo.parcel_snapshots
    FOR ALL
    TO authenticated
    USING (false);

GRANT SELECT, INSERT ON geo.parcel_snapshots TO service_role;
GRANT USAGE ON SCHEMA geo TO service_role;

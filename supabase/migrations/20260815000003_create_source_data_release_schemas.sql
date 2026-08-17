-- KT-014: Create source/data-release schemas
-- This migration creates the internal source registry, sync runs, dataset
-- versions, composite data releases and release-source membership tables.
--
-- Semantic rules:
-- - source_definitions owns one stable row per approved source/layer contract.
-- - source_sync_runs records one scheduled/manual/retry sync attempt.
-- - source_dataset_versions are immutable candidate/promoted versions.
-- - data_releases are immutable composite source-version compositions.
-- - data_release_sources records exact membership and freshness per source.
-- - The private schema is not directly exposed through the Data API.
-- - Completed analyses reference exact data releases and source versions.

-- 1. Enums for source and sync state

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_type' AND typnamespace = 'private'::regnamespace) THEN
        CREATE TYPE private.source_type AS ENUM (
            'WFS',
            'API',
            'download',
            'manual_law'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refresh_policy' AND typnamespace = 'private'::regnamespace) THEN
        CREATE TYPE private.refresh_policy AS ENUM (
            'monthly_snapshot',
            'weekly_metadata_check',
            'manual_verified',
            'live_lookup',
            'no_replication'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_trigger_type' AND typnamespace = 'private'::regnamespace) THEN
        CREATE TYPE private.sync_trigger_type AS ENUM (
            'scheduled',
            'manual',
            'retry'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_status' AND typnamespace = 'private'::regnamespace) THEN
        CREATE TYPE private.sync_status AS ENUM (
            'queued',
            'fetching',
            'validating',
            'normalizing',
            'candidate',
            'completed',
            'failed',
            'rejected'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dataset_version_status' AND typnamespace = 'private'::regnamespace) THEN
        CREATE TYPE private.dataset_version_status AS ENUM (
            'candidate',
            'verified',
            'rejected',
            'retired'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'release_status' AND typnamespace = 'private'::regnamespace) THEN
        CREATE TYPE private.release_status AS ENUM (
            'candidate',
            'promoted',
            'rejected',
            'retired'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'freshness_state' AND typnamespace = 'private'::regnamespace) THEN
        CREATE TYPE private.freshness_state AS ENUM (
            'fresh',
            'warning',
            'stale',
            'unknown'
        );
    END IF;
END;
$$;

-- 2. Source definitions

CREATE TABLE IF NOT EXISTS private.source_definitions (
    id text PRIMARY KEY,
    name text NOT NULL,
    authority text NOT NULL,
    source_type private.source_type NOT NULL,
    base_url text NOT NULL,
    terms_url text NULL,
    attribution_text text NULL,
    refresh_policy private.refresh_policy NOT NULL,
    refresh_interval interval NULL,
    freshness_warn_after interval NULL,
    freshness_critical_after interval NULL,
    release_blocking boolean NOT NULL DEFAULT true,
    verification_policy text NOT NULL,
    normalizer_version text NOT NULL DEFAULT '1',
    enabled boolean NOT NULL DEFAULT true,
    last_successful_sync_at timestamptz NULL,
    next_sync_due_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT source_definitions_name_length CHECK (char_length(name) <= 200),
    CONSTRAINT source_definitions_authority_length CHECK (char_length(authority) <= 200),
    CONSTRAINT source_definitions_base_url_length CHECK (char_length(base_url) <= 2000),
    CONSTRAINT source_definitions_verification_policy_length CHECK (char_length(verification_policy) <= 100)
);

-- 3. Source sync runs

CREATE TABLE IF NOT EXISTS private.source_sync_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id text NOT NULL REFERENCES private.source_definitions(id) ON DELETE RESTRICT,
    trigger_type private.sync_trigger_type NOT NULL,
    idempotency_key text NOT NULL,
    status private.sync_status NOT NULL DEFAULT 'queued',
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz NULL,
    previous_version_id uuid NULL,
    candidate_version_id uuid NULL,
    http_status integer NULL,
    records_fetched bigint NULL,
    records_added bigint NULL,
    records_changed bigint NULL,
    records_removed bigint NULL,
    payload_sha256 text NULL,
    source_version text NULL,
    source_updated_at timestamptz NULL,
    normalizer_version text NOT NULL DEFAULT '1',
    error_code text NULL,
    safe_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT source_sync_runs_idempotency_key_length CHECK (char_length(idempotency_key) <= 200),
    CONSTRAINT source_sync_runs_unique_source_idempotency UNIQUE (source_id, idempotency_key),
    CONSTRAINT source_sync_runs_unique_id_source UNIQUE (id, source_id),
    CONSTRAINT source_sync_runs_error_code_length CHECK (error_code IS NULL OR char_length(error_code) <= 100),
    CONSTRAINT source_sync_runs_http_status_valid CHECK (http_status IS NULL OR (http_status >= 100 AND http_status <= 599)),
    CONSTRAINT source_sync_runs_records_nonnegative CHECK (
        (records_fetched IS NULL OR records_fetched >= 0)
        AND (records_added IS NULL OR records_added >= 0)
        AND (records_changed IS NULL OR records_changed >= 0)
        AND (records_removed IS NULL OR records_removed >= 0)
    ),
    CONSTRAINT source_sync_runs_finished_after_started CHECK (
        finished_at IS NULL OR finished_at >= started_at
    )
);

-- 4. Source dataset versions

CREATE TABLE IF NOT EXISTS private.source_dataset_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id text NOT NULL REFERENCES private.source_definitions(id) ON DELETE RESTRICT,
    version_key text NOT NULL,
    status private.dataset_version_status NOT NULL DEFAULT 'candidate',
    sync_run_id uuid NOT NULL REFERENCES private.source_sync_runs(id) ON DELETE RESTRICT,
    CONSTRAINT source_dataset_versions_sync_run_source_fk FOREIGN KEY (sync_run_id, source_id) REFERENCES private.source_sync_runs(id, source_id),
    previous_version_id uuid NULL REFERENCES private.source_dataset_versions(id),
    retrieved_at timestamptz NOT NULL DEFAULT now(),
    source_updated_at timestamptz NULL,
    promoted_at timestamptz NULL,
    payload_sha256 text NULL,
    normalizer_version text NOT NULL DEFAULT '1',
    record_count bigint NOT NULL DEFAULT 0,
    validation_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT source_dataset_versions_version_key_length CHECK (char_length(version_key) <= 200),
    CONSTRAINT source_dataset_versions_record_count_nonnegative CHECK (record_count >= 0),
    CONSTRAINT source_dataset_versions_unique_source_version UNIQUE (source_id, version_key),
    CONSTRAINT source_dataset_versions_unique_id_source UNIQUE (id, source_id)
);

-- 5. Composite data releases

CREATE TABLE IF NOT EXISTS private.data_releases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    release_key text NOT NULL UNIQUE,
    status private.release_status NOT NULL DEFAULT 'candidate',
    created_at timestamptz NOT NULL DEFAULT now(),
    promoted_at timestamptz NULL,
    created_by uuid NULL,
    notes text NULL,
    CONSTRAINT data_releases_release_key_length CHECK (char_length(release_key) <= 100)
);

-- 6. Data release source membership

CREATE TABLE IF NOT EXISTS private.data_release_sources (
    data_release_id uuid NOT NULL REFERENCES private.data_releases(id) ON DELETE CASCADE,
    source_id text NOT NULL REFERENCES private.source_definitions(id) ON DELETE RESTRICT,
    source_dataset_version_id uuid NOT NULL REFERENCES private.source_dataset_versions(id) ON DELETE RESTRICT,
    CONSTRAINT data_release_sources_version_source_fk FOREIGN KEY (source_dataset_version_id, source_id) REFERENCES private.source_dataset_versions(id, source_id),
    carried_forward boolean NOT NULL DEFAULT false,
    freshness_state private.freshness_state NOT NULL DEFAULT 'unknown',
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (data_release_id, source_id),
    CONSTRAINT data_release_sources_carried_forward_requires_version CHECK (
        NOT carried_forward OR source_dataset_version_id IS NOT NULL
    )
);

-- 7. Indexes for common query patterns

CREATE INDEX IF NOT EXISTS idx_source_definitions_enabled ON private.source_definitions (enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_source_definitions_next_sync ON private.source_definitions (next_sync_due_at) WHERE enabled = true AND next_sync_due_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_source_sync_runs_source_started ON private.source_sync_runs (source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_source_sync_runs_status_started ON private.source_sync_runs (status, started_at);

CREATE INDEX IF NOT EXISTS idx_source_dataset_versions_source_status ON private.source_dataset_versions (source_id, status);
CREATE INDEX IF NOT EXISTS idx_source_dataset_versions_promoted_at ON private.source_dataset_versions (promoted_at) WHERE status = 'verified';

CREATE INDEX IF NOT EXISTS idx_data_releases_status_created ON private.data_releases (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_release_sources_source_version ON private.data_release_sources (source_id, source_dataset_version_id);

-- 8. Grants
-- Private schema tables are not exposed through the Data API.
-- Only service_role (server-side Edge Functions / admin) should access them.

GRANT SELECT, INSERT, UPDATE, DELETE ON private.source_definitions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON private.source_sync_runs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON private.source_dataset_versions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON private.data_releases TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON private.data_release_sources TO service_role;

GRANT USAGE ON TYPE private.source_type TO service_role;
GRANT USAGE ON TYPE private.refresh_policy TO service_role;
GRANT USAGE ON TYPE private.sync_trigger_type TO service_role;
GRANT USAGE ON TYPE private.sync_status TO service_role;
GRANT USAGE ON TYPE private.dataset_version_status TO service_role;
GRANT USAGE ON TYPE private.release_status TO service_role;
GRANT USAGE ON TYPE private.freshness_state TO service_role;

GRANT USAGE ON SCHEMA private TO service_role;

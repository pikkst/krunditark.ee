-- KT-016: Create analysis snapshot schema
-- This migration creates the analysis schema tables for immutable analysis
-- snapshots, findings, evidence, and provenance tracking.
--
-- Semantic rules:
-- - analyses record the immutable execution context of one deterministic run.
-- - findings are the structured outputs of that run.
-- - evidence preserves exact spatial/data/rule provenance for each finding.
-- - analysis_source_versions and analysis_rule_versions provide fast audit
--   of the exact source/rule compositions.
-- - Completed analyses are frozen by database trigger; rerun creates a new row.
-- - The analysis schema is not directly exposed through the Data API.
--
-- State model:
--   queued -> preparing -> evaluating -> completed
--                                 \-> partial
--            \--------------------> failed
-- Once a row reaches a terminal state (completed/partial/failed) it is immutable.

-- 1. Enums for analysis state

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analysis_status' AND typnamespace = 'analysis'::regnamespace) THEN
        CREATE TYPE analysis.analysis_status AS ENUM (
            'queued',
            'preparing',
            'evaluating',
            'completed',
            'partial',
            'failed'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finding_state' AND typnamespace = 'analysis'::regnamespace) THEN
        CREATE TYPE analysis.finding_state AS ENUM (
            'clear',
            'condition',
            'conflict',
            'unknown'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finding_severity' AND typnamespace = 'analysis'::regnamespace) THEN
        CREATE TYPE analysis.finding_severity AS ENUM (
            'info',
            'warning',
            'critical'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evidence_type' AND typnamespace = 'analysis'::regnamespace) THEN
        CREATE TYPE analysis.evidence_type AS ENUM (
            'parcel',
            'constraint',
            'planning',
            'source',
            'legal',
            'geometry'
        );
    END IF;
END;
$$;

-- 2. Analyses

CREATE TABLE IF NOT EXISTS analysis.analyses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NULL REFERENCES public.projects(id) ON DELETE SET NULL,
    proposal_id uuid NOT NULL REFERENCES public.project_proposals(id) ON DELETE RESTRICT,
    parcel_snapshot_id uuid NOT NULL,
    data_release_id uuid NOT NULL REFERENCES private.data_releases(id) ON DELETE RESTRICT,
    requested_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    status analysis.analysis_status NOT NULL DEFAULT 'queued',
    analysis_profile_version text NOT NULL,
    engine_version text NOT NULL,
    input_hash text NOT NULL,
    source_completeness jsonb NOT NULL DEFAULT '{}'::jsonb,
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT analyses_analysis_profile_version_length CHECK (char_length(analysis_profile_version) <= 100),
    CONSTRAINT analyses_engine_version_length CHECK (char_length(engine_version) <= 100),
    CONSTRAINT analyses_input_hash_length CHECK (char_length(input_hash) <= 200),
    CONSTRAINT analyses_completed_after_started CHECK (
        completed_at IS NULL OR completed_at >= started_at
    )
);

-- 3. Analysis source versions (explicit provenance denormalization)

CREATE TABLE IF NOT EXISTS analysis.analysis_source_versions (
    analysis_id uuid NOT NULL REFERENCES analysis.analyses(id) ON DELETE CASCADE,
    source_id text NOT NULL REFERENCES private.source_definitions(id) ON DELETE RESTRICT,
    source_dataset_version_id uuid NOT NULL REFERENCES private.source_dataset_versions(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (analysis_id, source_id)
);

-- 4. Analysis rule versions

CREATE TABLE IF NOT EXISTS analysis.analysis_rule_versions (
    analysis_id uuid NOT NULL REFERENCES analysis.analyses(id) ON DELETE CASCADE,
    rule_version_id uuid NOT NULL REFERENCES rules.rule_versions(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (analysis_id, rule_version_id)
);

-- 5. Findings

CREATE TABLE IF NOT EXISTS analysis.findings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id uuid NOT NULL REFERENCES analysis.analyses(id) ON DELETE CASCADE,
    rule_version_id uuid NULL REFERENCES rules.rule_versions(id) ON DELETE RESTRICT,
    code text NOT NULL,
    category text NOT NULL,
    state analysis.finding_state NOT NULL,
    severity analysis.finding_severity NOT NULL DEFAULT 'info',
    title_key text NOT NULL,
    structured_details jsonb NOT NULL DEFAULT '{}'::jsonb,
    next_action_code text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT findings_code_length CHECK (char_length(code) <= 100),
    CONSTRAINT findings_category_length CHECK (char_length(category) <= 100),
    CONSTRAINT findings_title_key_length CHECK (char_length(title_key) <= 200),
    CONSTRAINT findings_next_action_code_length CHECK (next_action_code IS NULL OR char_length(next_action_code) <= 100),
    -- Non-null rule_version_id must reference a rule version explicitly selected
    -- for this analysis. Nullable rule_version_id represents explicitly typed
    -- non-rule technical findings.
    CONSTRAINT findings_rule_version_fk FOREIGN KEY (analysis_id, rule_version_id)
        REFERENCES analysis.analysis_rule_versions(analysis_id, rule_version_id)
);

-- 6. Finding evidence

CREATE TABLE IF NOT EXISTS analysis.finding_evidence (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_id uuid NOT NULL REFERENCES analysis.findings(id) ON DELETE CASCADE,
    evidence_type analysis.evidence_type NOT NULL,
    parcel_snapshot_id uuid NULL,
    constraint_snapshot_id uuid NULL,
    planning_snapshot_id uuid NULL,
    legal_source_id uuid NULL REFERENCES rules.legal_sources(id) ON DELETE SET NULL,
    source_sync_run_id uuid NULL REFERENCES private.source_sync_runs(id) ON DELETE SET NULL,
    source_dataset_version_id uuid NULL REFERENCES private.source_dataset_versions(id) ON DELETE SET NULL,
    evidence_geometry extensions.geometry(Geometry, 3301) NULL,
    measurement jsonb NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT finding_evidence_type_check CHECK (
        (evidence_type = 'parcel' AND parcel_snapshot_id IS NOT NULL) OR
        (evidence_type = 'constraint' AND constraint_snapshot_id IS NOT NULL) OR
        (evidence_type = 'planning' AND planning_snapshot_id IS NOT NULL) OR
        (evidence_type = 'source' AND (source_sync_run_id IS NOT NULL OR source_dataset_version_id IS NOT NULL)) OR
        (evidence_type = 'legal' AND legal_source_id IS NOT NULL) OR
        (evidence_type = 'geometry' AND evidence_geometry IS NOT NULL)
    )
);

-- Geo snapshot FK constraints (parcel_snapshots, constraint_snapshots,
-- planning_snapshots) will be added in a later migration once those tables
-- exist. The columns are present for provenance and will be validated by the
-- evidence_type check constraint.

CREATE INDEX IF NOT EXISTS idx_analyses_project_id ON analysis.analyses (project_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status_created ON analysis.analyses (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_data_release_id ON analysis.analyses (data_release_id);
CREATE INDEX IF NOT EXISTS idx_analyses_proposal_id ON analysis.analyses (proposal_id);
CREATE INDEX IF NOT EXISTS idx_analyses_parcel_snapshot_id ON analysis.analyses (parcel_snapshot_id);

CREATE INDEX IF NOT EXISTS idx_analysis_source_versions_source_id ON analysis.analysis_source_versions (source_id);
CREATE INDEX IF NOT EXISTS idx_analysis_source_versions_dataset_version ON analysis.analysis_source_versions (source_dataset_version_id);

CREATE INDEX IF NOT EXISTS idx_analysis_rule_versions_rule_version_id ON analysis.analysis_rule_versions (rule_version_id);

CREATE INDEX IF NOT EXISTS idx_findings_analysis_id ON analysis.findings (analysis_id);
CREATE INDEX IF NOT EXISTS idx_findings_state ON analysis.findings (state);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON analysis.findings (severity);
CREATE INDEX IF NOT EXISTS idx_findings_category ON analysis.findings (category);
CREATE INDEX IF NOT EXISTS idx_findings_code ON analysis.findings (code);

CREATE INDEX IF NOT EXISTS idx_finding_evidence_finding_id ON analysis.finding_evidence (finding_id);
CREATE INDEX IF NOT EXISTS idx_finding_evidence_evidence_type ON analysis.finding_evidence (evidence_type);
CREATE INDEX IF NOT EXISTS idx_finding_evidence_parcel_snapshot_id ON analysis.finding_evidence (parcel_snapshot_id) WHERE parcel_snapshot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finding_evidence_constraint_snapshot_id ON analysis.finding_evidence (constraint_snapshot_id) WHERE constraint_snapshot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finding_evidence_planning_snapshot_id ON analysis.finding_evidence (planning_snapshot_id) WHERE planning_snapshot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finding_evidence_legal_source_id ON analysis.finding_evidence (legal_source_id) WHERE legal_source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finding_evidence_source_dataset_version_id ON analysis.finding_evidence (source_dataset_version_id) WHERE source_dataset_version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finding_evidence_geometry ON analysis.finding_evidence USING GIST (evidence_geometry);

-- 7. Provenance validation triggers
--
-- These triggers enforce that explicit provenance rows belong to the exact
-- data release recorded on the parent analysis, preventing silent provenance
-- drift between claimed release and actual cited sources/rules.

CREATE OR REPLACE FUNCTION analysis.validate_source_version_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analysis, private
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM private.data_release_sources drs
        WHERE drs.data_release_id = (
            SELECT data_release_id FROM analysis.analyses WHERE id = NEW.analysis_id
        )
        AND drs.source_id = NEW.source_id
        AND drs.source_dataset_version_id = NEW.source_dataset_version_id
    ) THEN
        RAISE EXCEPTION 'source version % for source % is not a member of the analysis data release', NEW.source_dataset_version_id, NEW.source_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_source_version_membership ON analysis.analysis_source_versions;

CREATE TRIGGER validate_source_version_membership
    BEFORE INSERT OR UPDATE ON analysis.analysis_source_versions
    FOR EACH ROW
    EXECUTE FUNCTION analysis.validate_source_version_membership();

CREATE OR REPLACE FUNCTION analysis.validate_evidence_source_provenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analysis, private
AS $$
DECLARE
    v_data_release_id uuid;
    v_source_id text;
BEGIN
    SELECT data_release_id INTO v_data_release_id
    FROM analysis.analyses
    WHERE id = (SELECT analysis_id FROM analysis.findings WHERE id = NEW.finding_id);

    -- source_dataset_version_id must belong to the analysis data release
    IF NEW.source_dataset_version_id IS NOT NULL THEN
        SELECT source_id INTO v_source_id
        FROM private.source_dataset_versions
        WHERE id = NEW.source_dataset_version_id;

        IF NOT EXISTS (
            SELECT 1
            FROM private.data_release_sources drs
            WHERE drs.data_release_id = v_data_release_id
            AND drs.source_id = v_source_id
            AND drs.source_dataset_version_id = NEW.source_dataset_version_id
        ) THEN
            RAISE EXCEPTION 'evidence source version % is not a member of the analysis data release', NEW.source_dataset_version_id;
        END IF;
    END IF;

    -- source_sync_run_id must produce a dataset version that belongs to the release
    IF NEW.source_sync_run_id IS NOT NULL THEN
        SELECT source_id INTO v_source_id
        FROM private.source_sync_runs
        WHERE id = NEW.source_sync_run_id;

        IF NOT EXISTS (
            SELECT 1
            FROM private.data_release_sources drs
            JOIN private.source_dataset_versions dv
                ON dv.id = drs.source_dataset_version_id
                AND dv.source_id = drs.source_id
            WHERE drs.data_release_id = v_data_release_id
            AND dv.sync_run_id = NEW.source_sync_run_id
        ) THEN
            RAISE EXCEPTION 'evidence sync run % does not produce a dataset version in the analysis data release', NEW.source_sync_run_id;
        END IF;
    END IF;

    -- If both source_sync_run_id and source_dataset_version_id are supplied,
    -- ensure the dataset version was produced by that exact sync run.
    IF NEW.source_sync_run_id IS NOT NULL AND NEW.source_dataset_version_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM private.source_dataset_versions dv
            WHERE dv.id = NEW.source_dataset_version_id
            AND dv.sync_run_id = NEW.source_sync_run_id
        ) THEN
            RAISE EXCEPTION 'evidence source version % was not produced by sync run %', NEW.source_dataset_version_id, NEW.source_sync_run_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_evidence_source_provenance ON analysis.finding_evidence;

CREATE TRIGGER validate_evidence_source_provenance
    BEFORE INSERT OR UPDATE ON analysis.finding_evidence
    FOR EACH ROW
    EXECUTE FUNCTION analysis.validate_evidence_source_provenance();

-- 8. Terminal-state immutability triggers for snapshot children
--
-- Once an analysis reaches completed/partial/failed, the entire snapshot
-- (source versions, rule versions, findings, evidence) must be frozen.
-- OLD/NEW records are branched by TG_OP to avoid dereferencing undefined
-- trigger records during INSERT/DELETE.

CREATE OR REPLACE FUNCTION analysis.prevent_terminal_child_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analysis
AS $$
DECLARE
    v_old_parent_status text;
    v_new_parent_status text;
    v_old_id uuid;
    v_new_id uuid;
BEGIN
    IF TG_TABLE_NAME = 'analysis_source_versions' OR TG_TABLE_NAME = 'analysis_rule_versions' THEN
        IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
            v_old_id := OLD.analysis_id;
            SELECT status INTO v_old_parent_status
            FROM analysis.analyses
            WHERE id = v_old_id;
        END IF;

        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            v_new_id := NEW.analysis_id;
            SELECT status INTO v_new_parent_status
            FROM analysis.analyses
            WHERE id = v_new_id;
        END IF;

        IF v_old_parent_status IN ('completed', 'partial', 'failed') OR v_new_parent_status IN ('completed', 'partial', 'failed') THEN
            IF TG_OP = 'DELETE' THEN
                RAISE EXCEPTION 'cannot delete child rows of terminal analysis %', v_old_id;
            END IF;
            IF TG_OP = 'UPDATE' THEN
                RAISE EXCEPTION 'cannot modify child rows of terminal analysis %', v_old_id;
            END IF;
            IF TG_OP = 'INSERT' THEN
                RAISE EXCEPTION 'cannot insert child rows for terminal analysis %', v_new_id;
            END IF;
        END IF;

    ELSIF TG_TABLE_NAME = 'findings' THEN
        IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
            v_old_id := OLD.analysis_id;
            SELECT status INTO v_old_parent_status
            FROM analysis.analyses
            WHERE id = v_old_id;
        END IF;

        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            v_new_id := NEW.analysis_id;
            SELECT status INTO v_new_parent_status
            FROM analysis.analyses
            WHERE id = v_new_id;
        END IF;

        IF v_old_parent_status IN ('completed', 'partial', 'failed') OR v_new_parent_status IN ('completed', 'partial', 'failed') THEN
            IF TG_OP = 'DELETE' THEN
                RAISE EXCEPTION 'cannot delete child rows of terminal analysis %', v_old_id;
            END IF;
            IF TG_OP = 'UPDATE' THEN
                RAISE EXCEPTION 'cannot modify child rows of terminal analysis %', v_old_id;
            END IF;
            IF TG_OP = 'INSERT' THEN
                RAISE EXCEPTION 'cannot insert child rows for terminal analysis %', v_new_id;
            END IF;
        END IF;

    ELSIF TG_TABLE_NAME = 'finding_evidence' THEN
        IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
            v_old_id := OLD.finding_id;
            SELECT a.status INTO v_old_parent_status
            FROM analysis.findings f
            JOIN analysis.analyses a ON a.id = f.analysis_id
            WHERE f.id = v_old_id;
        END IF;

        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            v_new_id := NEW.finding_id;
            SELECT a.status INTO v_new_parent_status
            FROM analysis.findings f
            JOIN analysis.analyses a ON a.id = f.analysis_id
            WHERE f.id = v_new_id;
        END IF;

        IF v_old_parent_status IN ('completed', 'partial', 'failed') OR v_new_parent_status IN ('completed', 'partial', 'failed') THEN
            IF TG_OP = 'DELETE' THEN
                RAISE EXCEPTION 'cannot delete child rows of terminal analysis %', v_old_id;
            END IF;
            IF TG_OP = 'UPDATE' THEN
                RAISE EXCEPTION 'cannot modify child rows of terminal analysis %', v_old_id;
            END IF;
            IF TG_OP = 'INSERT' THEN
                RAISE EXCEPTION 'cannot insert child rows for terminal analysis %', v_new_id;
            END IF;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS prevent_terminal_child_mutation_source_versions ON analysis.analysis_source_versions;

CREATE TRIGGER prevent_terminal_child_mutation_source_versions
    BEFORE INSERT OR UPDATE OR DELETE ON analysis.analysis_source_versions
    FOR EACH ROW
    EXECUTE FUNCTION analysis.prevent_terminal_child_mutation();

DROP TRIGGER IF EXISTS prevent_terminal_child_mutation_rule_versions ON analysis.analysis_rule_versions;

CREATE TRIGGER prevent_terminal_child_mutation_rule_versions
    BEFORE INSERT OR UPDATE OR DELETE ON analysis.analysis_rule_versions
    FOR EACH ROW
    EXECUTE FUNCTION analysis.prevent_terminal_child_mutation();

DROP TRIGGER IF EXISTS prevent_terminal_child_mutation_findings ON analysis.findings;

CREATE TRIGGER prevent_terminal_child_mutation_findings
    BEFORE INSERT OR UPDATE OR DELETE ON analysis.findings
    FOR EACH ROW
    EXECUTE FUNCTION analysis.prevent_terminal_child_mutation();

DROP TRIGGER IF EXISTS prevent_terminal_child_mutation_finding_evidence ON analysis.finding_evidence;

CREATE TRIGGER prevent_terminal_child_mutation_finding_evidence
    BEFORE INSERT OR UPDATE OR DELETE ON analysis.finding_evidence
    FOR EACH ROW
    EXECUTE FUNCTION analysis.prevent_terminal_child_mutation();

-- 9. Immutability trigger for completed analyses
--
-- Once an analysis reaches a terminal state (completed, partial, failed),
-- no further updates or deletes are allowed. This preserves the immutable
-- snapshot contract required for reproducible historical reports.

CREATE OR REPLACE FUNCTION analysis.prevent_completed_analysis_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analysis
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    END IF;

    IF OLD.status IN ('completed', 'partial', 'failed') THEN
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'cannot delete completed analysis %', OLD.id;
        END IF;
        IF TG_OP = 'UPDATE' THEN
            RAISE EXCEPTION 'cannot modify completed analysis %', OLD.id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS prevent_completed_analysis_mutation ON analysis.analyses;

CREATE TRIGGER prevent_completed_analysis_mutation
    BEFORE UPDATE OR DELETE ON analysis.analyses
    FOR EACH ROW
    EXECUTE FUNCTION analysis.prevent_completed_analysis_mutation();

-- 10. Enable RLS

ALTER TABLE analysis.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis.analysis_source_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis.analysis_rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis.finding_evidence ENABLE ROW LEVEL SECURITY;

-- Analyses: owner can read/write their own analyses through project ownership
DROP POLICY IF EXISTS analyses_select_own ON analysis.analyses;

CREATE POLICY analyses_select_own ON analysis.analyses
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = analyses.project_id
            AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS analyses_insert_own ON analysis.analyses;

CREATE POLICY analyses_insert_own ON analysis.analyses
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = analyses.project_id
            AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS analyses_update_own ON analysis.analyses;

CREATE POLICY analyses_update_own ON analysis.analyses
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = analyses.project_id
            AND p.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = analyses.project_id
            AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS analyses_delete_own ON analysis.analyses;

CREATE POLICY analyses_delete_own ON analysis.analyses
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = analyses.project_id
            AND p.user_id = auth.uid()
        )
    );

-- Analysis source versions: access through analysis/project ownership
DROP POLICY IF EXISTS analysis_source_versions_select_own ON analysis.analysis_source_versions;

CREATE POLICY analysis_source_versions_select_own ON analysis.analysis_source_versions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM analysis.analyses a
            JOIN public.projects p ON p.id = a.project_id
            WHERE a.id = analysis_source_versions.analysis_id
            AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS analysis_source_versions_insert_own ON analysis.analysis_source_versions;

CREATE POLICY analysis_source_versions_insert_own ON analysis.analysis_source_versions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM analysis.analyses a
            JOIN public.projects p ON p.id = a.project_id
            WHERE a.id = analysis_source_versions.analysis_id
            AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS analysis_source_versions_delete_own ON analysis.analysis_source_versions;

CREATE POLICY analysis_source_versions_delete_own ON analysis.analysis_source_versions
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM analysis.analyses a
            JOIN public.projects p ON p.id = a.project_id
            WHERE a.id = analysis_source_versions.analysis_id
            AND p.user_id = auth.uid()
        )
    );

-- Analysis rule versions: access through analysis/project ownership
DROP POLICY IF EXISTS analysis_rule_versions_select_own ON analysis.analysis_rule_versions;

CREATE POLICY analysis_rule_versions_select_own ON analysis.analysis_rule_versions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM analysis.analyses a
            JOIN public.projects p ON p.id = a.project_id
            WHERE a.id = analysis_rule_versions.analysis_id
            AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS analysis_rule_versions_insert_own ON analysis.analysis_rule_versions;

CREATE POLICY analysis_rule_versions_insert_own ON analysis.analysis_rule_versions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM analysis.analyses a
            JOIN public.projects p ON p.id = a.project_id
            WHERE a.id = analysis_rule_versions.analysis_id
            AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS analysis_rule_versions_delete_own ON analysis.analysis_rule_versions;

CREATE POLICY analysis_rule_versions_delete_own ON analysis.analysis_rule_versions
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM analysis.analyses a
            JOIN public.projects p ON p.id = a.project_id
            WHERE a.id = analysis_rule_versions.analysis_id
            AND p.user_id = auth.uid()
        )
    );

-- Findings: access through analysis/project ownership
DROP POLICY IF EXISTS findings_select_own ON analysis.findings;

CREATE POLICY findings_select_own ON analysis.findings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM analysis.analyses a
            JOIN public.projects p ON p.id = a.project_id
            WHERE a.id = findings.analysis_id
            AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS findings_insert_own ON analysis.findings;

CREATE POLICY findings_insert_own ON analysis.findings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM analysis.analyses a
            JOIN public.projects p ON p.id = a.project_id
            WHERE a.id = findings.analysis_id
            AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS findings_delete_own ON analysis.findings;

CREATE POLICY findings_delete_own ON analysis.findings
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM analysis.analyses a
            JOIN public.projects p ON p.id = a.project_id
            WHERE a.id = findings.analysis_id
            AND p.user_id = auth.uid()
        )
    );

-- Finding evidence: access through finding/analysis/project ownership
DROP POLICY IF EXISTS finding_evidence_select_own ON analysis.finding_evidence;

CREATE POLICY finding_evidence_select_own ON analysis.finding_evidence
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM analysis.findings f
            JOIN analysis.analyses a ON a.id = f.analysis_id
            JOIN public.projects p ON p.id = a.project_id
            WHERE f.id = finding_evidence.finding_id
            AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS finding_evidence_insert_own ON analysis.finding_evidence;

CREATE POLICY finding_evidence_insert_own ON analysis.finding_evidence
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM analysis.findings f
            JOIN analysis.analyses a ON a.id = f.analysis_id
            JOIN public.projects p ON p.id = a.project_id
            WHERE f.id = finding_evidence.finding_id
            AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS finding_evidence_delete_own ON analysis.finding_evidence;

CREATE POLICY finding_evidence_delete_own ON analysis.finding_evidence
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM analysis.findings f
            JOIN analysis.analyses a ON a.id = f.analysis_id
            JOIN public.projects p ON p.id = a.project_id
            WHERE f.id = finding_evidence.finding_id
            AND p.user_id = auth.uid()
        )
    );

-- 11. Grants
-- The analysis schema is not directly exposed through the Data API, but
-- grants are explicit for defense in depth and future configuration changes.
-- service_role is used by server-side Edge Functions.
-- authenticated can access only their own data via RLS.

GRANT SELECT, INSERT, UPDATE, DELETE ON analysis.analyses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON analysis.analysis_source_versions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON analysis.analysis_rule_versions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON analysis.findings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON analysis.finding_evidence TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON analysis.analyses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON analysis.analysis_source_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON analysis.analysis_rule_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON analysis.findings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON analysis.finding_evidence TO authenticated;

GRANT USAGE ON TYPE analysis.analysis_status TO service_role;
GRANT USAGE ON TYPE analysis.finding_state TO service_role;
GRANT USAGE ON TYPE analysis.finding_severity TO service_role;
GRANT USAGE ON TYPE analysis.evidence_type TO service_role;

GRANT USAGE ON TYPE analysis.analysis_status TO authenticated;
GRANT USAGE ON TYPE analysis.finding_state TO authenticated;
GRANT USAGE ON TYPE analysis.finding_severity TO authenticated;
GRANT USAGE ON TYPE analysis.evidence_type TO authenticated;

GRANT USAGE ON SCHEMA analysis TO service_role;
GRANT USAGE ON SCHEMA analysis TO authenticated;

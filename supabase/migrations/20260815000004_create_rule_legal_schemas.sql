-- KT-015: Create rule/legal schemas
-- This migration creates the rules schema tables for legal source metadata,
-- versioned rule definitions, and legal-change candidate tracking.
--
-- Semantic rules:
-- - legal_sources records official legal source metadata (acts, annexes, etc.).
-- - rule_definitions owns stable rule identity; rule_versions are immutable versions.
-- - rule_versions.status enforces draft/verified/retired lifecycle.
-- - Verified/retired rule versions are protected by database triggers:
--   * Draft versions can be freely updated or deleted.
--   * Verified versions can only transition to retired.
--   * Retired versions are fully immutable.
-- - rule_version_sources links are frozen once the parent rule version is verified/retired.
-- - legal_change_candidates tracks detected legal changes pending review.
-- - The rules schema is not exposed through the Data API.

-- 1. Enums for rule and legal-change state

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rule_status' AND typnamespace = 'rules'::regnamespace) THEN
        CREATE TYPE rules.rule_status AS ENUM (
            'draft',
            'verified',
            'retired'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'legal_change_candidate_status' AND typnamespace = 'rules'::regnamespace) THEN
        CREATE TYPE rules.legal_change_candidate_status AS ENUM (
            'pending',
            'reviewed',
            'accepted',
            'no_rule_change'
        );
    END IF;
END;
$$;

-- 2. Legal sources

CREATE TABLE IF NOT EXISTS rules.legal_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    authority text NOT NULL,
    title text NOT NULL,
    official_url text NOT NULL,
    document_identifier text NULL,
    section_reference text NULL,
    effective_from date NULL,
    effective_to date NULL,
    retrieved_at timestamptz NOT NULL DEFAULT now(),
    content_hash text NULL,
    notes text NULL,
    CONSTRAINT legal_sources_authority_length CHECK (char_length(authority) <= 200),
    CONSTRAINT legal_sources_title_length CHECK (char_length(title) <= 500),
    CONSTRAINT legal_sources_official_url_length CHECK (char_length(official_url) <= 2000),
    CONSTRAINT legal_sources_document_identifier_length CHECK (document_identifier IS NULL OR char_length(document_identifier) <= 200),
    CONSTRAINT legal_sources_section_reference_length CHECK (section_reference IS NULL OR char_length(section_reference) <= 200),
    CONSTRAINT legal_sources_content_hash_length CHECK (content_hash IS NULL OR char_length(content_hash) <= 200),
    CONSTRAINT legal_sources_notes_length CHECK (notes IS NULL OR char_length(notes) <= 2000),
    CONSTRAINT legal_sources_effective_dates CHECK (
        effective_from IS NULL OR effective_to IS NULL OR effective_from <= effective_to
    )
);

-- 3. Legal change candidates

CREATE TABLE IF NOT EXISTS rules.legal_change_candidates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_source_id uuid NOT NULL REFERENCES rules.legal_sources(id) ON DELETE RESTRICT,
    previous_legal_source_id uuid NULL REFERENCES rules.legal_sources(id) ON DELETE RESTRICT,
    previous_hash text NULL,
    new_hash text NULL,
    detected_at timestamptz NOT NULL DEFAULT now(),
    effective_at date NULL,
    status rules.legal_change_candidate_status NOT NULL DEFAULT 'pending',
    review_notes text NULL,
    reviewed_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT legal_change_candidates_previous_hash_length CHECK (previous_hash IS NULL OR char_length(previous_hash) <= 200),
    CONSTRAINT legal_change_candidates_new_hash_length CHECK (new_hash IS NULL OR char_length(new_hash) <= 200),
    CONSTRAINT legal_change_candidates_review_notes_length CHECK (review_notes IS NULL OR char_length(review_notes) <= 2000)
);

-- 4. Rule definitions

CREATE TABLE IF NOT EXISTS rules.rule_definitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    title text NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT rule_definitions_code_length CHECK (char_length(code) <= 100),
    CONSTRAINT rule_definitions_title_length CHECK (char_length(title) <= 500),
    CONSTRAINT rule_definitions_category_length CHECK (char_length(category) <= 100),
    CONSTRAINT rule_definitions_description_length CHECK (char_length(description) <= 5000)
);

-- 5. Rule versions

CREATE TABLE IF NOT EXISTS rules.rule_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_definition_id uuid NOT NULL REFERENCES rules.rule_definitions(id) ON DELETE RESTRICT,
    version integer NOT NULL DEFAULT 1,
    implementation_key text NOT NULL,
    status rules.rule_status NOT NULL DEFAULT 'draft',
    effective_from date NULL,
    effective_to date NULL,
    verified_at timestamptz NULL,
    verified_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT rule_versions_version_positive CHECK (version > 0),
    CONSTRAINT rule_versions_implementation_key_length CHECK (char_length(implementation_key) <= 200),
    CONSTRAINT rule_versions_effective_dates CHECK (
        effective_from IS NULL OR effective_to IS NULL OR effective_from <= effective_to
    ),
    CONSTRAINT rule_versions_unique_definition_version UNIQUE (rule_definition_id, version)
);

-- 6. Rule version sources (many-to-many)

CREATE TABLE IF NOT EXISTS rules.rule_version_sources (
    rule_version_id uuid NOT NULL REFERENCES rules.rule_versions(id) ON DELETE CASCADE,
    legal_source_id uuid NOT NULL REFERENCES rules.legal_sources(id) ON DELETE RESTRICT,
    relationship text NOT NULL DEFAULT 'implements',
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT rule_version_sources_relationship_length CHECK (char_length(relationship) <= 100),
    PRIMARY KEY (rule_version_id, legal_source_id)
);

-- 7. Immutability triggers for rule versions and source links
--
-- These triggers enforce the documented rule lifecycle at the database layer,
-- ensuring that verified/retired rule versions and their provenance cannot be
-- silently mutated. Legal changes must create a new rule version instead.

CREATE OR REPLACE FUNCTION rules.prevent_verified_rule_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = rules
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- Draft versions are fully editable
    IF OLD.status = 'draft' THEN
        RETURN NEW;
    END IF;

    -- Verified and retired versions are immutable
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'cannot delete % rule version %', OLD.status, OLD.id;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- Allow verified -> retired transition only if no substantive fields changed
        IF OLD.status = 'verified' AND NEW.status = 'retired' THEN
            IF (NEW.id, NEW.rule_definition_id, NEW.version, NEW.implementation_key, NEW.effective_from, NEW.effective_to, NEW.verified_at, NEW.verified_by, NEW.created_at)
               IS NOT DISTINCT FROM
               (OLD.id, OLD.rule_definition_id, OLD.version, OLD.implementation_key, OLD.effective_from, OLD.effective_to, OLD.verified_at, OLD.verified_by, OLD.created_at) THEN
                RETURN NEW;
            END IF;
            RAISE EXCEPTION 'cannot modify substantive fields of verified rule version %', OLD.id;
        END IF;
        RAISE EXCEPTION 'cannot modify % rule version %', OLD.status, OLD.id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_verified_rule_version_mutation ON rules.rule_versions;

CREATE TRIGGER prevent_verified_rule_version_mutation
    BEFORE UPDATE OR DELETE ON rules.rule_versions
    FOR EACH ROW
    EXECUTE FUNCTION rules.prevent_verified_rule_version_mutation();

CREATE OR REPLACE FUNCTION rules.prevent_verified_source_link_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = rules
AS $$
DECLARE
    v_old_parent_status text;
    v_new_parent_status text;
BEGIN
    -- Check the old parent for DELETE and UPDATE
    IF TG_OP IN ('DELETE', 'UPDATE') THEN
        SELECT status INTO v_old_parent_status FROM rules.rule_versions WHERE id = OLD.rule_version_id;
        IF v_old_parent_status IN ('verified', 'retired') THEN
            RAISE EXCEPTION 'cannot modify source links for % rule version %', v_old_parent_status, OLD.rule_version_id;
        END IF;
    END IF;

    -- Check the new parent for INSERT and UPDATE
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        SELECT status INTO v_new_parent_status FROM rules.rule_versions WHERE id = NEW.rule_version_id;
        IF v_new_parent_status IN ('verified', 'retired') THEN
            RAISE EXCEPTION 'cannot modify source links for % rule version %', v_new_parent_status, NEW.rule_version_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS prevent_verified_source_link_mutation ON rules.rule_version_sources;

CREATE TRIGGER prevent_verified_source_link_mutation
    BEFORE INSERT OR UPDATE OR DELETE ON rules.rule_version_sources
    FOR EACH ROW
    EXECUTE FUNCTION rules.prevent_verified_source_link_mutation();

-- 8. Indexes for common query patterns

CREATE INDEX IF NOT EXISTS idx_legal_sources_authority ON rules.legal_sources (authority);
CREATE INDEX IF NOT EXISTS idx_legal_sources_document_identifier ON rules.legal_sources (document_identifier) WHERE document_identifier IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_legal_sources_effective_from ON rules.legal_sources (effective_from) WHERE effective_from IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legal_change_candidates_legal_source_id ON rules.legal_change_candidates (legal_source_id);
CREATE INDEX IF NOT EXISTS idx_legal_change_candidates_status ON rules.legal_change_candidates (status);
CREATE INDEX IF NOT EXISTS idx_legal_change_candidates_detected_at ON rules.legal_change_candidates (detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_rule_definitions_code ON rules.rule_definitions (code);
CREATE INDEX IF NOT EXISTS idx_rule_definitions_category ON rules.rule_definitions (category);

CREATE INDEX IF NOT EXISTS idx_rule_versions_definition_status ON rules.rule_versions (rule_definition_id, status);
CREATE INDEX IF NOT EXISTS idx_rule_versions_status ON rules.rule_versions (status) WHERE status = 'verified';
CREATE INDEX IF NOT EXISTS idx_rule_versions_effective_period ON rules.rule_versions (effective_from, effective_to) WHERE effective_from IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rule_version_sources_legal_source_id ON rules.rule_version_sources (legal_source_id);

-- 9. Grants
-- Rules schema tables are internal/administrative. Only service_role (server-side
-- Edge Functions / admin) should access them.
--
-- Note: immutability is enforced by triggers, not by revoking DML grants.
-- service_role retains UPDATE/DELETE so that draft versions can be edited,
-- while triggers reject mutations to verified/retired versions.

GRANT SELECT, INSERT, UPDATE, DELETE ON rules.legal_sources TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON rules.legal_change_candidates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON rules.rule_definitions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON rules.rule_versions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON rules.rule_version_sources TO service_role;

GRANT USAGE ON TYPE rules.rule_status TO service_role;
GRANT USAGE ON TYPE rules.legal_change_candidate_status TO service_role;

GRANT USAGE ON SCHEMA rules TO service_role;

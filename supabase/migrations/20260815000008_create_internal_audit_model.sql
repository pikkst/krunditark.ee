-- KT-017: Create internal audit model
-- This migration creates the internal audit log for privileged administrative
-- operations, rule lifecycle changes, source promotions, analysis invalidation,
-- and future commerce/admin actions.
--
-- Semantic rules:
-- - audit_log is append-only; rows are never updated or deleted.
-- - actor_user_id records the admin/system identity when available.
-- - actor_type disambiguates automated vs human actors.
-- - action/target_type use controlled string codes for structured filtering.
-- - safe_metadata carries structured context without credentials or tokens.
-- - The private schema is not exposed through the Data API.
-- - Only server-side code (service_role) should write/read audit entries.

-- 1. Audit log table

CREATE TABLE private.audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_type text NOT NULL,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text NULL,
    safe_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT audit_log_actor_type_length CHECK (char_length(actor_type) <= 100),
    CONSTRAINT audit_log_action_length CHECK (char_length(action) <= 100),
    CONSTRAINT audit_log_target_type_length CHECK (char_length(target_type) <= 100),
    CONSTRAINT audit_log_target_id_length CHECK (target_id IS NULL OR char_length(target_id) <= 200)
);

-- 2. Immutability trigger for audit log
--
-- Audit entries must never be modified or deleted after insertion.
-- This preserves the tamper-evident operational history required for
-- security, compliance, and reproducible debugging.

CREATE OR REPLACE FUNCTION private.prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'audit_log is immutable; cannot %s row %', TG_OP, OLD.id;
END;
$$;

CREATE TRIGGER prevent_audit_log_mutation
    BEFORE UPDATE OR DELETE ON private.audit_log
    FOR EACH ROW
    EXECUTE FUNCTION private.prevent_audit_log_mutation();

-- 3. Indexes for common query patterns

CREATE INDEX idx_audit_log_actor_type ON private.audit_log (actor_type);
CREATE INDEX idx_audit_log_action ON private.audit_log (action);
CREATE INDEX idx_audit_log_target_type ON private.audit_log (target_type);
CREATE INDEX idx_audit_log_target_id ON private.audit_log (target_id) WHERE target_id IS NOT NULL;
CREATE INDEX idx_audit_log_created_at ON private.audit_log (created_at DESC);
CREATE INDEX idx_audit_log_actor_user_id ON private.audit_log (actor_user_id) WHERE actor_user_id IS NOT NULL;

-- 4. Enable RLS
--
-- Audit logs are strictly administrative. No direct client access is permitted.
-- Only server-side service_role (Edge Functions / admin operations) may read.

ALTER TABLE private.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_no_anon ON private.audit_log
    FOR ALL
    TO anon
    USING (false);

CREATE POLICY audit_log_no_authenticated ON private.audit_log
    FOR ALL
    TO authenticated
    USING (false);

-- 5. Grants
-- Only service_role should access audit_log. No direct Data API exposure.

GRANT SELECT, INSERT ON private.audit_log TO service_role;

GRANT USAGE ON SCHEMA private TO service_role;

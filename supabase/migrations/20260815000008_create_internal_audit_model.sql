-- KT-017: Create internal audit model
-- This migration creates the internal audit log for privileged administrative
-- operations, rule lifecycle changes, source promotions, analysis invalidation,
-- and future commerce/admin actions.
--
-- Semantic rules:
-- - audit_log is append-only; rows are never updated or deleted.
-- - actor_user_id is a historical snapshot UUID without a live FK, preserving
--   audit integrity even if the referenced auth user is deleted.
-- - action is controlled by the audit_action_codes lookup table; only known
--   codes may be inserted through the canonical writer function.
-- - safe_metadata is sanitized to strip credentials/tokens and validated per
--   action to ensure required context is captured.
-- - All writes must go through private.log_audit_event(); direct INSERT is
--   revoked from service_role.
-- - The private schema is not exposed through the Data API.

-- 1. Audit action codes lookup

CREATE TABLE private.audit_action_codes (
    code text PRIMARY KEY,
    description text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO private.audit_action_codes (code, description) VALUES
    ('rule.verify', 'Rule version verified'),
    ('rule.retire', 'Rule version retired'),
    ('source.promote', 'Source dataset version promoted'),
    ('source.disable', 'Source disabled'),
    ('source.manual_refresh', 'Manual source refresh triggered'),
    ('admin.role_changed', 'Admin role changed'),
    ('analysis.invalidated', 'Analysis manually invalidated'),
    ('commerce.refund', 'Refund processed'),
    ('commerce.manual_entitlement', 'Manual entitlement granted');

-- 2. Audit log table

CREATE TABLE private.audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id uuid NULL,
    actor_type text NOT NULL,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text NULL,
    safe_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT audit_log_actor_type_length CHECK (char_length(actor_type) <= 100),
    CONSTRAINT audit_log_action_length CHECK (char_length(action) <= 100),
    CONSTRAINT audit_log_target_type_length CHECK (char_length(target_type) <= 100),
    CONSTRAINT audit_log_target_id_length CHECK (target_id IS NULL OR char_length(target_id) <= 200),
    CONSTRAINT audit_log_action_fk FOREIGN KEY (action) REFERENCES private.audit_action_codes(code)
);

-- 3. Metadata sanitization (blocks credentials/tokens)

CREATE OR REPLACE FUNCTION private.sanitize_audit_metadata(p_metadata jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_key text;
    v_value jsonb;
    v_sanitized jsonb;
    v_forbidden_patterns text[] := ARRAY[
        'authorization', 'auth', 'token', 'secret', 'password',
        'api_key', 'apikey', 'access_token', 'refresh_token', 'cookie',
        'credential', 'bearer', 'basic', 'signature', 'private_key',
        'client_secret', 'session', 'jwt'
    ];
    v_rec record;
BEGIN
    IF jsonb_typeof(p_metadata) = 'object' THEN
        v_sanitized := '{}'::jsonb;
        FOR v_rec IN SELECT * FROM jsonb_each(COALESCE(p_metadata, '{}'::jsonb)) LOOP
            IF EXISTS (
                SELECT 1 FROM unnest(v_forbidden_patterns) p
                WHERE lower(v_rec.key) = p OR lower(v_rec.key) LIKE '%' || p || '%'
            ) THEN
                RAISE EXCEPTION 'audit metadata contains forbidden key: %', v_rec.key;
            END IF;
            IF jsonb_typeof(v_rec.value) IN ('object', 'array') THEN
                v_sanitized := jsonb_set(v_sanitized, ARRAY[v_rec.key], private.sanitize_audit_metadata(v_rec.value));
            ELSE
                IF v_rec.value::text ~* '(bearer|token|secret|password|api[_-]?key)\s*[=:]\s*\S+' OR
                   v_rec.value::text ~* '(bearer|token|secret|password|api[_-]?key)(\s*[=:]\s*|\s+)\S+' THEN
                    RAISE EXCEPTION 'audit metadata value at key "%" contains sensitive pattern', v_rec.key;
                END IF;
                v_sanitized := jsonb_set(v_sanitized, ARRAY[v_rec.key], v_rec.value);
            END IF;
        END LOOP;
    ELSIF jsonb_typeof(p_metadata) = 'array' THEN
        v_sanitized := '[]'::jsonb;
        FOR v_rec IN 
            SELECT val, idx FROM jsonb_array_elements(COALESCE(p_metadata, '[]'::jsonb)) WITH ORDINALITY AS t(val, idx)
        LOOP
            IF jsonb_typeof(v_rec.val) IN ('object', 'array') THEN
                v_sanitized := jsonb_set(v_sanitized, ARRAY[CAST((v_rec.idx - 1) AS text)], private.sanitize_audit_metadata(v_rec.val));
            ELSE
                IF v_rec.val::text ~* '(bearer|token|secret|password|api[_-]?key)\s*[=:]\s*\S+' OR
                   v_rec.val::text ~* '(bearer|token|secret|password|api[_-]?key)(\s*[=:]\s*|\s+)\S+' THEN
                    RAISE EXCEPTION 'audit metadata array element contains sensitive pattern';
                END IF;
                v_sanitized := jsonb_set(v_sanitized, ARRAY[CAST((v_rec.idx - 1) AS text)], v_rec.val);
            END IF;
        END LOOP;
    ELSE
        v_sanitized := p_metadata;
    END IF;
    RETURN v_sanitized;
END;
$$;

-- 4. Required metadata validation per action

CREATE OR REPLACE FUNCTION private.audit_metadata_has_value(p_metadata jsonb, p_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_raw jsonb;
    v_text text;
BEGIN
    IF NOT (p_metadata ? p_key) THEN
        RETURN false;
    END IF;
    v_raw := p_metadata -> p_key;
    IF jsonb_typeof(v_raw) = 'null' THEN
        RETURN false;
    END IF;
    IF jsonb_typeof(v_raw) IN ('object', 'array') THEN
        RETURN false;
    END IF;
    v_text := trim(both '"' from v_raw::text);
    RETURN v_text != '';
END;
$$;

CREATE OR REPLACE FUNCTION private.validate_audit_metadata(p_action text, p_metadata jsonb)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    CASE p_action
        WHEN 'rule.verify' THEN
            IF NOT (private.audit_metadata_has_value(p_metadata, 'rule_version_id') AND private.audit_metadata_has_value(p_metadata, 'implementation_key')) THEN
                RAISE EXCEPTION 'rule.verify requires rule_version_id and implementation_key in metadata';
            END IF;
        WHEN 'rule.retire' THEN
            IF NOT (private.audit_metadata_has_value(p_metadata, 'rule_version_id')) THEN
                RAISE EXCEPTION 'rule.retire requires rule_version_id in metadata';
            END IF;
        WHEN 'source.promote' THEN
            IF NOT (private.audit_metadata_has_value(p_metadata, 'source_id') AND private.audit_metadata_has_value(p_metadata, 'dataset_version_id')) THEN
                RAISE EXCEPTION 'source.promote requires source_id and dataset_version_id in metadata';
            END IF;
        WHEN 'source.disable' THEN
            IF NOT (private.audit_metadata_has_value(p_metadata, 'source_id')) THEN
                RAISE EXCEPTION 'source.disable requires source_id in metadata';
            END IF;
        WHEN 'source.manual_refresh' THEN
            IF NOT (private.audit_metadata_has_value(p_metadata, 'source_id')) THEN
                RAISE EXCEPTION 'source.manual_refresh requires source_id in metadata';
            END IF;
        WHEN 'admin.role_changed' THEN
            IF NOT (private.audit_metadata_has_value(p_metadata, 'target_user_id') AND private.audit_metadata_has_value(p_metadata, 'new_role') AND private.audit_metadata_has_value(p_metadata, 'old_role')) THEN
                RAISE EXCEPTION 'admin.role_changed requires target_user_id, new_role, and old_role in metadata';
            END IF;
        WHEN 'analysis.invalidated' THEN
            IF NOT (private.audit_metadata_has_value(p_metadata, 'analysis_id') AND private.audit_metadata_has_value(p_metadata, 'annotation')) THEN
                RAISE EXCEPTION 'analysis.invalidated requires analysis_id and annotation in metadata';
            END IF;
        WHEN 'commerce.refund' THEN
            IF NOT (private.audit_metadata_has_value(p_metadata, 'order_id') AND private.audit_metadata_has_value(p_metadata, 'amount') AND private.audit_metadata_has_value(p_metadata, 'reason')) THEN
                RAISE EXCEPTION 'commerce.refund requires order_id, amount, and reason in metadata';
            END IF;
        WHEN 'commerce.manual_entitlement' THEN
            IF NOT (private.audit_metadata_has_value(p_metadata, 'user_id') AND private.audit_metadata_has_value(p_metadata, 'entitlement_type') AND private.audit_metadata_has_value(p_metadata, 'reason')) THEN
                RAISE EXCEPTION 'commerce.manual_entitlement requires user_id, entitlement_type, and reason in metadata';
            END IF;
    END CASE;
    RETURN true;
END;
$$;

-- 5. Canonical audit writer function
--
-- All audit writes must use this function. It enforces:
-- - action must be a known code
-- - metadata is sanitized for credentials/tokens
-- - metadata satisfies action-specific required fields
-- - actor_user_id is recorded as a bare UUID without live FK

CREATE OR REPLACE FUNCTION private.log_audit_event(
    p_actor_user_id uuid,
    p_actor_type text,
    p_action text,
    p_target_type text,
    p_target_id text DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private
AS $$
DECLARE
    v_sanitized_metadata jsonb;
    v_audit_id uuid;
BEGIN
    IF p_action IS NULL OR NOT EXISTS (
        SELECT 1 FROM private.audit_action_codes WHERE code = p_action
    ) THEN
        RAISE EXCEPTION 'unknown audit action: %', p_action;
    END IF;

    v_sanitized_metadata := private.sanitize_audit_metadata(p_metadata);
    PERFORM private.validate_audit_metadata(p_action, v_sanitized_metadata);

    INSERT INTO private.audit_log (
        actor_user_id,
        actor_type,
        action,
        target_type,
        target_id,
        safe_metadata
    ) VALUES (
        p_actor_user_id,
        p_actor_type,
        p_action,
        p_target_type,
        p_target_id,
        v_sanitized_metadata
    )
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$;

-- 6. Immutability trigger for audit log
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

-- 7. Action code validation trigger (defense in depth)
--
-- Even though direct INSERT is revoked from service_role, this trigger
-- ensures that any direct INSERT attempt with an unknown action code is
-- rejected at the database layer.

CREATE OR REPLACE FUNCTION private.validate_audit_action_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM private.audit_action_codes WHERE code = NEW.action
    ) THEN
        RAISE EXCEPTION 'unknown audit action: %', NEW.action;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER validate_audit_action_code
    BEFORE INSERT ON private.audit_log
    FOR EACH ROW
    EXECUTE FUNCTION private.validate_audit_action_code();

-- 8. Indexes for common query patterns

CREATE INDEX idx_audit_log_actor_type ON private.audit_log (actor_type);
CREATE INDEX idx_audit_log_action ON private.audit_log (action);
CREATE INDEX idx_audit_log_target_type ON private.audit_log (target_type);
CREATE INDEX idx_audit_log_target_id ON private.audit_log (target_id) WHERE target_id IS NOT NULL;
CREATE INDEX idx_audit_log_created_at ON private.audit_log (created_at DESC);
CREATE INDEX idx_audit_log_actor_user_id ON private.audit_log (actor_user_id) WHERE actor_user_id IS NOT NULL;

-- 9. Enable RLS
--
-- Audit logs are strictly administrative. No direct client access is permitted.
-- Only server-side service_role (Edge Functions / admin operations) may read.

ALTER TABLE private.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.audit_action_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_no_anon ON private.audit_log
    FOR ALL
    TO anon
    USING (false);

CREATE POLICY audit_log_no_authenticated ON private.audit_log
    FOR ALL
    TO authenticated
    USING (false);

CREATE POLICY audit_action_codes_no_anon ON private.audit_action_codes
    FOR ALL
    TO anon
    USING (false);

CREATE POLICY audit_action_codes_no_authenticated ON private.audit_action_codes
    FOR ALL
    TO authenticated
    USING (false);

-- 10. Grants
-- Only service_role should access audit tables. No direct Data API exposure.

GRANT SELECT ON private.audit_log TO service_role;
GRANT SELECT ON private.audit_action_codes TO service_role;
GRANT EXECUTE ON FUNCTION private.log_audit_event(uuid, text, text, text, text, jsonb) TO service_role;

GRANT USAGE ON SCHEMA private TO service_role;

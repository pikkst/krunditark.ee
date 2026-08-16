-- KT-016-concurrent: Fix race condition in terminal child immutability
--
-- The previous prevent_terminal_child_mutation trigger read parent analysis
-- status without locking the row. Under concurrent writes, a child mutation
-- could observe a non-terminal status, then another transaction could mark
-- the analysis completed and commit, after which the first transaction could
-- still commit its child mutation.
--
-- This migration adds row-level locking (FOR SHARE) to all parent status
-- checks, serializing child mutations against terminal transitions.

-- Drop existing function and triggers

DROP TRIGGER IF EXISTS prevent_terminal_child_mutation_finding_evidence ON analysis.finding_evidence;
DROP TRIGGER IF EXISTS prevent_terminal_child_mutation_findings ON analysis.findings;
DROP TRIGGER IF EXISTS prevent_terminal_child_mutation_rule_versions ON analysis.analysis_rule_versions;
DROP TRIGGER IF EXISTS prevent_terminal_child_mutation_source_versions ON analysis.analysis_source_versions;
DROP FUNCTION IF EXISTS analysis.prevent_terminal_child_mutation();

-- Recreate with row locking

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
            WHERE id = v_old_id
            FOR SHARE;
        END IF;

        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            v_new_id := NEW.analysis_id;
            SELECT status INTO v_new_parent_status
            FROM analysis.analyses
            WHERE id = v_new_id
            FOR SHARE;
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
            WHERE id = v_old_id
            FOR SHARE;
        END IF;

        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            v_new_id := NEW.analysis_id;
            SELECT status INTO v_new_parent_status
            FROM analysis.analyses
            WHERE id = v_new_id
            FOR SHARE;
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
            WHERE f.id = v_old_id
            FOR SHARE OF a;
        END IF;

        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            v_new_id := NEW.finding_id;
            SELECT a.status INTO v_new_parent_status
            FROM analysis.findings f
            JOIN analysis.analyses a ON a.id = f.analysis_id
            WHERE f.id = v_new_id
            FOR SHARE OF a;
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

CREATE TRIGGER prevent_terminal_child_mutation_source_versions
    BEFORE INSERT OR UPDATE OR DELETE ON analysis.analysis_source_versions
    FOR EACH ROW
    EXECUTE FUNCTION analysis.prevent_terminal_child_mutation();

CREATE TRIGGER prevent_terminal_child_mutation_rule_versions
    BEFORE INSERT OR UPDATE OR DELETE ON analysis.analysis_rule_versions
    FOR EACH ROW
    EXECUTE FUNCTION analysis.prevent_terminal_child_mutation();

CREATE TRIGGER prevent_terminal_child_mutation_findings
    BEFORE INSERT OR UPDATE OR DELETE ON analysis.findings
    FOR EACH ROW
    EXECUTE FUNCTION analysis.prevent_terminal_child_mutation();

CREATE TRIGGER prevent_terminal_child_mutation_finding_evidence
    BEFORE INSERT OR UPDATE OR DELETE ON analysis.finding_evidence
    FOR EACH ROW
    EXECUTE FUNCTION analysis.prevent_terminal_child_mutation();

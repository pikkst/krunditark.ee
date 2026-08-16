-- KT-016-project-binding: Enforce that analysis.project_id matches proposal's project
--
-- analyses.project_id and analyses.proposal_id are independent FKs, so the
-- database can accept an analysis whose proposal belongs to a different project.
-- This breaks ownership-boundary assumptions in RLS and provenance.
--
-- This migration adds bidirectional validation:
-- 1. analysis INSERT/UPDATE validates project_id matches the proposal's project
-- 2. project_proposals UPDATE prevents re-parenting a proposal that is referenced
--    by any analysis, preserving the invariant durably.

CREATE OR REPLACE FUNCTION analysis.validate_analysis_project_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analysis, public
AS $$
BEGIN
    IF NEW.project_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.project_proposals
            WHERE id = NEW.proposal_id
              AND project_id = NEW.project_id
        ) THEN
            RAISE EXCEPTION 'analysis proposal % does not belong to project %', NEW.proposal_id, NEW.project_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER validate_analysis_project_proposal
    BEFORE INSERT OR UPDATE ON analysis.analyses
    FOR EACH ROW
    EXECUTE FUNCTION analysis.validate_analysis_project_proposal();

CREATE OR REPLACE FUNCTION public.prevent_proposal_reparenting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, analysis
AS $$
BEGIN
    IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
        IF EXISTS (
            SELECT 1
            FROM analysis.analyses
            WHERE proposal_id = NEW.id
        ) THEN
            RAISE EXCEPTION 'cannot change project_id for proposal % because it is referenced by an analysis', NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_proposal_reparenting ON public.project_proposals;

CREATE TRIGGER prevent_proposal_reparenting
    BEFORE UPDATE OF project_id ON public.project_proposals
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_proposal_reparenting();

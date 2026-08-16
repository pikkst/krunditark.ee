-- KT-016-project-binding: Enforce that analysis.project_id matches proposal's project
--
-- analyses.project_id and analyses.proposal_id are independent FKs, so the
-- database can accept an analysis whose proposal belongs to a different project.
-- This breaks ownership-boundary assumptions in RLS and provenance.
--
-- This migration adds a trigger that validates project_id matches the
-- proposal's project whenever project_id is provided. The nullable/guest
-- case is preserved: when project_id is NULL, the check is skipped.

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

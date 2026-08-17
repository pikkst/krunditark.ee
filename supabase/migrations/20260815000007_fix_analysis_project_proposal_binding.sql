-- KT-016-project-binding: Make analysis.project_id/proposal_id relationally durable
--
-- The original table uses independent FKs for project_id and proposal_id,
-- so the database can accept an analysis whose proposal belongs to a different
-- project. This breaks ownership-boundary assumptions in RLS and provenance.
--
-- This migration keeps the standalone proposal_id FK for guest/null-project
-- referential integrity, drops only the project_id FK, and adds a composite
-- FK from (proposal_id, project_id) to project_proposals(id, project_id).
--
-- For analyses with project_id NOT NULL:
--   - standalone FK ensures proposal exists
--   - composite FK ensures proposal belongs to the specified project
--
-- For guest analyses with project_id NULL:
--   - composite FK is not checked (MATCH SIMPLE behavior)
--   - standalone FK still ensures proposal exists
--   - referential integrity is preserved for the null-project path
--
-- PostgreSQL's FK enforcement acquires table-level locks that serialize
-- concurrent inserts and re-parents, preventing the READ COMMITTED race
-- where both transactions could pass the FK check before either commits.

-- 1. Unique key on project_proposals(id, project_id) for composite FK target
-- id is already the primary key, so (id, project_id) is functionally unique,
-- but PostgreSQL requires an explicit constraint for FK references.

ALTER TABLE public.project_proposals
    DROP CONSTRAINT IF EXISTS project_proposals_id_project_id_key;

ALTER TABLE public.project_proposals
    ADD CONSTRAINT project_proposals_id_project_id_key UNIQUE (id, project_id);

-- 2. Drop only the project_id FK from analysis.analyses
-- Keep the proposal_id FK to preserve guest/null-project referential integrity

ALTER TABLE analysis.analyses
    DROP CONSTRAINT IF EXISTS analyses_project_id_fkey;

-- 3. Add composite FK: (proposal_id, project_id) -> project_proposals(id, project_id)
-- This ensures:
--   - INSERT/UPDATE on analyses validates that the proposal belongs to the project
--   - UPDATE on project_proposals changing project_id is rejected if any analysis
--     references (proposal_id, old_project_id)
-- The FK is not checked when project_id IS NULL, but the standalone proposal_id
-- FK still enforces that the proposal exists for guest analyses.

ALTER TABLE analysis.analyses
    DROP CONSTRAINT IF EXISTS analyses_proposal_project_fk;

ALTER TABLE analysis.analyses
    ADD CONSTRAINT analyses_proposal_project_fk
        FOREIGN KEY (proposal_id, project_id)
        REFERENCES public.project_proposals(id, project_id);

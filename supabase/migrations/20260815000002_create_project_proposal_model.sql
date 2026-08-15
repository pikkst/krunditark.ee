-- KT-013: Create project/proposal model
-- This migration creates projects and versioned project_proposals tables,
-- with ownership RLS, canonical EPSG:3301 geometry, and abuse-prevention constraints.
--
-- Semantic rule: cadastral_id represents a selected parcel, not ownership proof.

-- 1. Create structure_type enum for supported initial categories
CREATE TYPE public.structure_type AS ENUM (
    'detached_house',
    'sauna',
    'shed',
    'garage',
    'auxiliary_building'
);

-- 2. Create projects table
CREATE TABLE public.projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL DEFAULT 'Uus projekt',
    cadastral_id text NOT NULL,
    current_parcel_snapshot_id uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz NULL,
    CONSTRAINT projects_name_length CHECK (char_length(name) <= 200),
    CONSTRAINT projects_cadastral_id_length CHECK (char_length(cadastral_id) <= 50)
);

-- 3. Create versioned project_proposals table
CREATE TABLE public.project_proposals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    version integer NOT NULL DEFAULT 1,
    structure_type public.structure_type NOT NULL,
    intended_use text NULL,
    footprint extensions.geometry(Polygon, 3301) NOT NULL,
    footprint_area_m2 numeric NOT NULL,
    height_m numeric NULL,
    storeys integer NULL,
    width_m numeric NULL,
    length_m numeric NULL,
    orientation_deg numeric NULL,
    user_notes text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    superseded_at timestamptz NULL,
    CONSTRAINT project_proposals_version_positive CHECK (version > 0),
    CONSTRAINT project_proposals_footprint_valid CHECK (extensions.ST_IsValid(footprint)),
    CONSTRAINT project_proposals_footprint_not_empty CHECK (NOT extensions.ST_IsEmpty(footprint)),
    CONSTRAINT project_proposals_area_positive CHECK (footprint_area_m2 > 0),
    CONSTRAINT project_proposals_area_max CHECK (footprint_area_m2 <= 100000),
    CONSTRAINT project_proposals_height_positive CHECK (height_m IS NULL OR height_m > 0),
    CONSTRAINT project_proposals_height_max CHECK (height_m IS NULL OR height_m <= 200),
    CONSTRAINT project_proposals_storeys_positive CHECK (storeys IS NULL OR storeys > 0),
    CONSTRAINT project_proposals_storeys_max CHECK (storeys IS NULL OR storeys <= 100),
    CONSTRAINT project_proposals_width_positive CHECK (width_m IS NULL OR width_m > 0),
    CONSTRAINT project_proposals_width_max CHECK (width_m IS NULL OR width_m <= 2000),
    CONSTRAINT project_proposals_length_positive CHECK (length_m IS NULL OR length_m > 0),
    CONSTRAINT project_proposals_length_max CHECK (length_m IS NULL OR length_m <= 2000),
    CONSTRAINT project_proposals_orientation_normalized CHECK (orientation_deg IS NULL OR (orientation_deg >= 0 AND orientation_deg < 360)),
    CONSTRAINT project_proposals_intended_use_length CHECK (intended_use IS NULL OR char_length(intended_use) <= 500),
    CONSTRAINT project_proposals_user_notes_length CHECK (user_notes IS NULL OR char_length(user_notes) <= 2000),
    CONSTRAINT project_proposals_unique_version UNIQUE (project_id, version)
);

-- 4. Indexes
CREATE INDEX idx_projects_user_id_updated_at ON public.projects (user_id, updated_at DESC);
CREATE INDEX idx_projects_cadastral_id ON public.projects (cadastral_id);
CREATE INDEX idx_project_proposals_project_id ON public.project_proposals (project_id);
CREATE INDEX idx_project_proposals_footprint ON public.project_proposals USING GIST (footprint);

-- 5. Triggers

-- Prevent client-side user_id changes on projects
CREATE OR REPLACE FUNCTION public.prevent_client_user_id_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id AND auth.uid() IS NOT NULL THEN
        RAISE EXCEPTION 'user_id cannot be changed through client policy';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_client_user_id_change
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_client_user_id_change();

-- Auto-update updated_at on projects
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Server-calculate footprint_area_m2 from footprint geometry
CREATE OR REPLACE FUNCTION public.calculate_proposal_area()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, geo, extensions
AS $$
BEGIN
    IF NEW.footprint IS NOT NULL THEN
        NEW.footprint_area_m2 := geo.st_area_m2(NEW.footprint);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_proposal_area
    BEFORE INSERT OR UPDATE ON public.project_proposals
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_proposal_area();

-- 6. Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_proposals ENABLE ROW LEVEL SECURITY;

-- Projects: owner CRUD only
CREATE POLICY projects_select_own ON public.projects
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY projects_insert_own ON public.projects
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY projects_update_own ON public.projects
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY projects_delete_own ON public.projects
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Project proposals: access through project ownership
CREATE POLICY project_proposals_select_own ON public.project_proposals
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_proposals.project_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY project_proposals_insert_own ON public.project_proposals
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_proposals.project_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY project_proposals_update_own ON public.project_proposals
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_proposals.project_id
            AND p.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_proposals.project_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY project_proposals_delete_own ON public.project_proposals
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_proposals.project_id
            AND p.user_id = auth.uid()
        )
    );

-- 7. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_proposals TO authenticated;
GRANT USAGE ON TYPE public.structure_type TO authenticated;

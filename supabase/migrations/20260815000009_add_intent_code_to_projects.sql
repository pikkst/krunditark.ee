-- KT-024: Add intent_code to projects
-- Adds a stable, locale-independent intent code column to the projects table,
-- enabling intent-based workflows (build, pre-purchase, understand parcel).
-- The intent_code is nullable so existing projects remain valid without an intent.

-- 1. Create intent_code enum (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'intent_code' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE public.intent_code AS ENUM (
            'build',
            'pre_purchase',
            'understand_parcel',
            'existing_building_modification',
            'professional'
        );
    END IF;
END;
$$;

-- 2. Add intent_code column to projects (nullable for existing rows)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS intent_code public.intent_code NULL;

-- 3. Add check constraint for valid intent codes (idempotent)
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_intent_code_valid;

ALTER TABLE public.projects ADD CONSTRAINT projects_intent_code_valid
    CHECK (intent_code IN ('build', 'pre_purchase', 'understand_parcel', 'existing_building_modification', 'professional'));

-- 4. Index for intent-based queries
CREATE INDEX IF NOT EXISTS idx_projects_intent_code ON public.projects (intent_code) WHERE intent_code IS NOT NULL;

-- 5. Grant enum usage
GRANT USAGE ON TYPE public.intent_code TO authenticated;

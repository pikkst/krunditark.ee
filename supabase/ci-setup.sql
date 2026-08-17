-- Minimal auth setup for CI database tests
-- This provides the auth.users table and related objects that our
-- migrations and tests depend on, without requiring the full
-- Supabase Auth service stack.

-- Ensure PostGIS lives in the extensions schema. The postgis/postgis
-- Docker image preinstalls it in public with dependent extensions
-- (postgis_topology, postgis_tiger_geocoder). Drop those first so
-- we can relocate/reinstall PostGIS deterministically.
CREATE SCHEMA IF NOT EXISTS extensions;

DROP EXTENSION IF EXISTS postgis_topology CASCADE;
DROP EXTENSION IF EXISTS postgis_tiger_geocoder CASCADE;
DROP EXTENSION IF EXISTS postgis CASCADE;

CREATE EXTENSION postgis WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE auth.users (
    id uuid PRIMARY KEY,
    email varchar,
    role varchar,
    is_sso_user boolean NOT NULL DEFAULT false,
    is_anonymous boolean NOT NULL DEFAULT false
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
$$;

-- Create roles expected by migration grants
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role;
    END IF;
END;
$$;

ALTER DATABASE krunditark SET search_path = public, geo, rules, analysis, private, extensions;

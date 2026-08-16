-- Minimal auth setup for CI database tests
-- This provides the auth.users table and related objects that our
-- migrations and tests depend on, without requiring the full
-- Supabase Auth service stack.

-- Move PostGIS to extensions schema if present (postgis/postgis image
-- preinstalls it in public). We cannot drop it because dependent
-- extensions (postgis_topology, postgis_tiger_geocoder) exist.
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        ALTER EXTENSION postgis SET SCHEMA extensions;
    END IF;
END;
$$;

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
    SELECT NULL::uuid;
$$;

-- Create roles expected by migration grants
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
END;
$$;

ALTER DATABASE krunditark SET search_path = public, geo, rules, analysis, private, extensions;

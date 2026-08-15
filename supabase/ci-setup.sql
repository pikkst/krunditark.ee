-- Minimal auth setup for CI database tests
-- This provides the auth.users table and related objects that our
-- migrations and tests depend on, without requiring the full
-- Supabase Auth service stack.

-- Drop any pre-existing PostGIS extension so migrations can recreate it
-- in the extensions schema deterministically.
DROP EXTENSION IF EXISTS postgis;

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

ALTER DATABASE krunditark SET search_path = public, geo, rules, analysis, private, extensions;

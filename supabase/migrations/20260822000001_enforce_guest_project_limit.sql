-- KT-039: Enforce guest project limits at database level
-- This trigger caps active (non-archived) projects per anonymous user only.
-- Permanent users are not limited by this policy. Concurrency is handled
-- via a transaction-level advisory lock keyed on the owner user ID.

CREATE OR REPLACE FUNCTION public.enforce_guest_project_limit()
RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
 AS $$
DECLARE
  is_anon boolean;
BEGIN
  IF NEW.archived_at IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text)::bigint);

    SELECT is_anonymous INTO is_anon
    FROM auth.users
    WHERE id = NEW.user_id;

    IF is_anon THEN
      IF (
        SELECT count(*)
        FROM public.projects
        WHERE user_id = NEW.user_id
          AND archived_at IS NULL
          AND id IS DISTINCT FROM COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      ) >= 5 THEN
        RAISE EXCEPTION 'guest project limit exceeded: maximum 5 active projects per anonymous user';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_guest_project_limit ON public.projects;

CREATE TRIGGER enforce_guest_project_limit
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_guest_project_limit();
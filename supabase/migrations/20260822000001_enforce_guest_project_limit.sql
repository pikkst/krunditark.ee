-- KT-039: Enforce guest project limits at database level
-- Guest projects are bounded; this trigger caps active (non-archived) projects
-- per user as a server-side safety net. Client code should also reuse an
-- existing active project when possible.

CREATE OR REPLACE FUNCTION public.enforce_guest_project_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count integer;
BEGIN
  IF NEW.archived_at IS NULL THEN
    SELECT count(*) INTO active_count
    FROM public.projects
    WHERE user_id = NEW.user_id
      AND archived_at IS NULL
      AND id IS DISTINCT FROM COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF active_count >= 5 THEN
      RAISE EXCEPTION 'guest project limit exceeded: maximum 5 active projects per user';
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

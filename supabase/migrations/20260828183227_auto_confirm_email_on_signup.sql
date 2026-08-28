
-- Auto-confirm email on signup so users can log in immediately.
-- In this environment, confirmation emails may not be deliverable, which would
-- leave registered users in an unconfirmed state and cause "Invalid login credentials"
-- on every login attempt. This trigger sets email_confirmed_at before the row is
-- inserted, ensuring the user can sign in right after signing up.

CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop old trigger if it exists, then create fresh
DROP TRIGGER IF EXISTS auto_confirm_email_on_signup ON auth.users;
CREATE TRIGGER auto_confirm_email_on_signup
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_email();

-- Revoke public execute; only the trigger should call this
REVOKE EXECUTE ON FUNCTION public.auto_confirm_email() FROM PUBLIC, anon, authenticated;

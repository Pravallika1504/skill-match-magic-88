
-- Owner-only UPDATE policy on resumes storage bucket
DROP POLICY IF EXISTS "resumes_update_own" ON storage.objects;
CREATE POLICY "resumes_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'resumes' AND owner = auth.uid())
WITH CHECK (bucket_id = 'resumes' AND owner = auth.uid());

-- Admin oversight on user_roles (own row visibility already exists via user_roles_select_own)
DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
CREATE POLICY "user_roles_select_admin"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

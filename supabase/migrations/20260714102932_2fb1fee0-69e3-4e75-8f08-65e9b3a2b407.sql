
ALTER FUNCTION public.set_updated_at() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon;

-- Storage RLS for resumes bucket
CREATE POLICY "resumes_bucket_owner_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND (owner = auth.uid() OR public.has_role(auth.uid(),'recruiter') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "resumes_bucket_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND owner = auth.uid());
CREATE POLICY "resumes_bucket_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resumes' AND owner = auth.uid());

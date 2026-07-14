
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'recruiter', 'student');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  college TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Auto-create profile + default 'student' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chosen_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  chosen_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role','')::public.app_role, 'student');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, chosen_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Jobs
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT,
  location TEXT,
  description TEXT NOT NULL,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  min_experience_years NUMERIC DEFAULT 0,
  shortlist_threshold INT NOT NULL DEFAULT 80,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_select_auth" ON public.jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "jobs_insert_recruiter" ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = recruiter_id AND (public.has_role(auth.uid(),'recruiter') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "jobs_update_own" ON public.jobs FOR UPDATE TO authenticated USING (auth.uid() = recruiter_id);
CREATE POLICY "jobs_delete_own" ON public.jobs FOR DELETE TO authenticated USING (auth.uid() = recruiter_id);
CREATE TRIGGER jobs_updated BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Resumes
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  candidate_name TEXT,
  candidate_email TEXT,
  parsed JSONB,
  raw_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resumes TO authenticated;
GRANT ALL ON public.resumes TO service_role;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resumes_select_own_or_recruiter" ON public.resumes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'recruiter') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "resumes_insert_own" ON public.resumes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "resumes_update_own" ON public.resumes FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "resumes_delete_own" ON public.resumes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Screenings
CREATE TYPE public.screening_status AS ENUM ('pending','reviewed','shortlisted','rejected','interview','selected');
CREATE TABLE public.screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  ats_score INT DEFAULT 0,
  skill_match INT DEFAULT 0,
  experience_match INT DEFAULT 0,
  education_match INT DEFAULT 0,
  matched_skills TEXT[] DEFAULT '{}',
  missing_skills TEXT[] DEFAULT '{}',
  missing_keywords TEXT[] DEFAULT '{}',
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  summary TEXT,
  analysis JSONB,
  status public.screening_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, resume_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screenings TO authenticated;
GRANT ALL ON public.screenings TO service_role;
ALTER TABLE public.screenings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "screenings_select_visible" ON public.screenings FOR SELECT TO authenticated
  USING (
    candidate_id = auth.uid()
    OR EXISTS(SELECT 1 FROM public.jobs j WHERE j.id = screenings.job_id AND j.recruiter_id = auth.uid())
    OR public.has_role(auth.uid(),'admin')
  );
CREATE POLICY "screenings_insert_candidate" ON public.screenings FOR INSERT TO authenticated
  WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "screenings_update_recruiter" ON public.screenings FOR UPDATE TO authenticated
  USING (EXISTS(SELECT 1 FROM public.jobs j WHERE j.id = screenings.job_id AND j.recruiter_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER screenings_updated BEFORE UPDATE ON public.screenings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Interviews
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id UUID NOT NULL REFERENCES public.screenings(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  mode TEXT NOT NULL DEFAULT 'online',
  interviewer TEXT,
  meeting_link TEXT,
  venue TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO authenticated;
GRANT ALL ON public.interviews TO service_role;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interviews_select_visible" ON public.interviews FOR SELECT TO authenticated
  USING (
    EXISTS(
      SELECT 1 FROM public.screenings s
      LEFT JOIN public.jobs j ON j.id = s.job_id
      WHERE s.id = interviews.screening_id
        AND (s.candidate_id = auth.uid() OR j.recruiter_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
    )
  );
CREATE POLICY "interviews_write_recruiter" ON public.interviews FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM public.screenings s JOIN public.jobs j ON j.id = s.job_id WHERE s.id = interviews.screening_id AND j.recruiter_id = auth.uid()));
CREATE POLICY "interviews_update_recruiter" ON public.interviews FOR UPDATE TO authenticated
  USING (EXISTS(SELECT 1 FROM public.screenings s JOIN public.jobs j ON j.id = s.job_id WHERE s.id = interviews.screening_id AND j.recruiter_id = auth.uid()));
CREATE POLICY "interviews_delete_recruiter" ON public.interviews FOR DELETE TO authenticated
  USING (EXISTS(SELECT 1 FROM public.screenings s JOIN public.jobs j ON j.id = s.job_id WHERE s.id = interviews.screening_id AND j.recruiter_id = auth.uid()));

CREATE INDEX ON public.screenings (job_id, score DESC);
CREATE INDEX ON public.screenings (candidate_id);
CREATE INDEX ON public.resumes (user_id);
CREATE INDEX ON public.jobs (recruiter_id);

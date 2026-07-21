
CREATE EXTENSION IF NOT EXISTS vector;

-- Chunks
CREATE TABLE public.resume_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  chunk_index int NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resume_chunks_resume_id_idx ON public.resume_chunks(resume_id);
CREATE INDEX resume_chunks_embedding_idx ON public.resume_chunks USING hnsw (embedding vector_cosine_ops);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resume_chunks TO authenticated;
GRANT ALL ON public.resume_chunks TO service_role;
ALTER TABLE public.resume_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chunks_select_visible" ON public.resume_chunks FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(),'recruiter') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "chunks_insert_own" ON public.resume_chunks FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'recruiter') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "chunks_delete_own" ON public.resume_chunks FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Conversations
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id uuid REFERENCES public.resumes(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'New chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_conversations_user_idx ON public.chat_conversations(user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations TO authenticated;
GRANT ALL ON public.chat_conversations TO service_role;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_own_all" ON public.chat_conversations FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  sources jsonb,
  confidence int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_conv_idx ON public.chat_messages(conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_own_all" ON public.chat_messages FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));

-- Match function (security definer so it can be executed on chunks with access already validated by the caller passing resume_id)
CREATE OR REPLACE FUNCTION public.match_resume_chunks(
  p_resume_id uuid,
  query_embedding vector(1536),
  match_count int DEFAULT 6
)
RETURNS TABLE (id uuid, chunk_index int, content text, similarity float)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT c.id, c.chunk_index, c.content,
         1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.resume_chunks c
  WHERE c.resume_id = p_resume_id AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

REVOKE EXECUTE ON FUNCTION public.match_resume_chunks(uuid, vector, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_resume_chunks(uuid, vector, int) TO authenticated;

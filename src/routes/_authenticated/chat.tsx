import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/current-user";
import { indexResume, chatWithResume } from "@/lib/chat.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare, Upload, Trash2, Search, Sparkles, FileText,
  Send, Loader2, User, Bot, ChevronRight, Plus,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});

type Msg = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  confidence?: number | null;
  sources?: any[] | null;
};

const SUGGESTIONS = [
  "Summarize this resume",
  "List the top technical skills",
  "How many years of experience?",
  "What projects has this candidate built?",
  "What certifications do they hold?",
  "Give strengths and weaknesses",
  "What interview questions should I ask?",
  "Missing skills for a Frontend Developer role",
];

function ChatPage() {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const indexFn = useServerFn(indexResume);
  const chatFn = useServerFn(chatWithResume);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [indexingId, setIndexingId] = useState<string | null>(null);

  // Resumes list
  const { data: resumes } = useQuery({
    queryKey: ["chat-resumes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resumes")
        .select("id, file_name, candidate_name, candidate_email, parsed, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Indexed chunk counts
  const { data: indexed } = useQuery({
    queryKey: ["chunk-counts", resumes?.map((r) => r.id).join(",")],
    enabled: !!resumes?.length,
    queryFn: async () => {
      const map: Record<string, number> = {};
      const ids = (resumes ?? []).map((r) => r.id);
      if (!ids.length) return map;
      const { data } = await supabase
        .from("resume_chunks")
        .select("resume_id")
        .in("resume_id", ids);
      (data ?? []).forEach((row: any) => {
        map[row.resume_id] = (map[row.resume_id] ?? 0) + 1;
      });
      return map;
    },
  });

  // Active resume
  const activeResume = resumes?.find((r) => r.id === activeResumeId) ?? null;
  const parsed: any = activeResume?.parsed ?? {};

  // Auto-select first resume
  useEffect(() => {
    if (!activeResumeId && resumes && resumes.length > 0) {
      setActiveResumeId(resumes[0].id);
    }
  }, [resumes, activeResumeId]);

  // When active resume changes: reset conversation, load latest thread if any
  useEffect(() => {
    if (!activeResumeId || !user) return;
    setConversationId(null);
    setMessages([]);
    (async () => {
      const { data: convs } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("resume_id", activeResumeId)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (convs && convs[0]) {
        setConversationId(convs[0].id);
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("id, role, content, confidence, sources")
          .eq("conversation_id", convs[0].id)
          .order("created_at", { ascending: true });
        setMessages((msgs ?? []) as Msg[]);
      }
    })();
  }, [activeResumeId, user]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const ensureIndexed = async (id: string) => {
    const count = indexed?.[id] ?? 0;
    if (count > 0) return;
    setIndexingId(id);
    try {
      await indexFn({ data: { resumeId: id } });
      qc.invalidateQueries({ queryKey: ["chunk-counts"] });
    } finally {
      setIndexingId(null);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        toast.error(`${file.name} is not a PDF`);
        continue;
      }
      try {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const up = await supabase.storage.from("resumes").upload(path, file, {
          contentType: "application/pdf",
        });
        if (up.error) throw up.error;
        const { data: resume, error } = await supabase
          .from("resumes")
          .insert({ user_id: user.id, file_path: path, file_name: file.name })
          .select()
          .single();
        if (error) throw error;
        toast.info(`Indexing ${file.name}…`);
        await indexFn({ data: { resumeId: resume.id } });
        toast.success(`${file.name} ready`);
        setActiveResumeId(resume.id);
      } catch (e: any) {
        toast.error(e.message || "Upload failed");
      }
    }
    setUploading(false);
    qc.invalidateQueries({ queryKey: ["chat-resumes"] });
    qc.invalidateQueries({ queryKey: ["chunk-counts"] });
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || !activeResumeId || sending) return;
    setInput("");
    setSending(true);
    await ensureIndexed(activeResumeId);
    setMessages((m) => [...m, { role: "user", content: msg }]);
    try {
      const res = await chatFn({
        data: { resumeId: activeResumeId, conversationId: conversationId ?? undefined, message: msg },
      });
      setConversationId(res.conversationId);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: res.answer, confidence: res.confidence, sources: res.sources },
      ]);
    } catch (e: any) {
      toast.error(e.message || "Chat failed");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry — I couldn't answer that. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const deleteResume = async (id: string) => {
    if (!confirm("Delete this resume and all its chat history?")) return;
    await supabase.from("resumes").delete().eq("id", id);
    if (activeResumeId === id) setActiveResumeId(null);
    qc.invalidateQueries({ queryKey: ["chat-resumes"] });
  };

  const newChat = async () => {
    setConversationId(null);
    setMessages([]);
  };

  const filtered = (resumes ?? []).filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.candidate_name ?? "").toLowerCase().includes(q) ||
      (r.file_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto grid h-[calc(100vh-4rem)] max-w-[1600px] grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_1fr_320px]">
      {/* Sidebar */}
      <Card className="shadow-card flex flex-col overflow-hidden p-3">
        <div className="flex items-center justify-between px-1 pb-2">
          <div className="flex items-center gap-2 font-semibold">
            <MessageSquare className="h-4 w-4 text-primary" /> Resumes
          </div>
          <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 text-sm"
          />
        </div>
        <ScrollArea className="flex-1 -mx-1">
          <div className="space-y-1 px-1">
            {filtered.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                No resumes yet. Upload a PDF to start chatting.
              </div>
            )}
            {filtered.map((r) => {
              const active = r.id === activeResumeId;
              const count = indexed?.[r.id] ?? 0;
              const isIndexing = indexingId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setActiveResumeId(r.id)}
                  className={`group flex w-full items-center gap-2 rounded-md border p-2 text-left transition ${
                    active ? "border-primary bg-accent" : "border-transparent hover:bg-muted"
                  }`}
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {r.candidate_name ?? r.file_name}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      {isIndexing ? (
                        <><Loader2 className="h-2.5 w-2.5 animate-spin" /> Indexing…</>
                      ) : count > 0 ? (
                        <><span className="h-1.5 w-1.5 rounded-full bg-success" /> Ready · {count} chunks</>
                      ) : (
                        <><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" /> Not indexed</>
                      )}
                    </div>
                  </div>
                  <Trash2
                    className="hidden h-3.5 w-3.5 text-muted-foreground hover:text-destructive group-hover:block"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteResume(r.id);
                    }}
                  />
                </button>
              );
            })}
          </div>
        </ScrollArea>
        {activeResumeId && (
          <Button variant="outline" size="sm" className="mt-2" onClick={newChat}>
            <Plus className="mr-1 h-3.5 w-3.5" /> New chat
          </Button>
        )}
      </Card>

      {/* Chat panel */}
      <Card className="shadow-card flex min-h-0 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border/60 p-3">
          <div className="bg-gradient-primary flex h-8 w-8 items-center justify-center rounded-lg shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">AI Resume Chat</div>
            <div className="truncate text-xs text-muted-foreground">
              {activeResume ? activeResume.candidate_name ?? activeResume.file_name : "Select a resume to start"}
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {!activeResumeId && (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              <div>
                <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
                Upload or pick a resume from the sidebar to begin.
              </div>
            </div>
          )}
          {activeResumeId && messages.length === 0 && !sending && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                  <Bot className="h-4 w-4 text-primary" /> Hi! Ask anything about this resume.
                </div>
                <p className="text-xs text-muted-foreground">
                  All answers are grounded in the uploaded document using RAG — I won't invent facts.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:border-primary hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <div className="bg-gradient-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-glow">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border/60 bg-muted/40"
              }`}>
                <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                {m.role === "assistant" && (m.confidence != null || (m.sources && m.sources.length > 0)) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
                    {m.confidence != null && (
                      <Badge variant="outline" className="text-[10px]">Confidence {m.confidence}%</Badge>
                    )}
                    {(m.sources ?? []).slice(0, 4).map((s: any, j: number) => (
                      <span key={j} title={s.excerpt} className="rounded bg-background px-1.5 py-0.5">
                        {s.label ?? `S${j + 1}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {m.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex gap-3">
              <div className="bg-gradient-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-glow">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="text-muted-foreground">Thinking…</span>
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex items-center gap-2 border-t border-border/60 p-3"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={activeResumeId ? "Ask anything about this resume…" : "Select a resume first"}
            disabled={!activeResumeId || sending}
            maxLength={2000}
          />
          <Button
            type="submit"
            disabled={!activeResumeId || sending || !input.trim()}
            className="bg-gradient-primary text-primary-foreground"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </Card>

      {/* Right panel */}
      <Card className="shadow-card flex flex-col overflow-hidden">
        <div className="border-b border-border/60 p-3 text-sm font-semibold">Resume details</div>
        <ScrollArea className="flex-1 p-4">
          {!activeResume ? (
            <p className="text-xs text-muted-foreground">Pick a resume to see extracted info.</p>
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-base font-semibold">{activeResume.candidate_name ?? activeResume.file_name}</div>
                {activeResume.candidate_email && (
                  <div className="text-xs text-muted-foreground">{activeResume.candidate_email}</div>
                )}
              </div>

              {parsed.ats_score != null && (
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">ATS Score</span>
                    <span className="font-semibold tabular-nums">{parsed.ats_score}/100</span>
                  </div>
                  <Progress value={parsed.ats_score} />
                </div>
              )}

              {parsed.job_match_score != null && (
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Job Match</span>
                    <span className="font-semibold tabular-nums">{parsed.job_match_score}%</span>
                  </div>
                  <Progress value={parsed.job_match_score} />
                </div>
              )}

              {parsed.summary && (
                <div>
                  <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">Summary</div>
                  <p className="text-xs">{parsed.summary}</p>
                </div>
              )}

              {parsed.matched_skills?.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">Skills</div>
                  <div className="flex flex-wrap gap-1">
                    {parsed.matched_skills.slice(0, 20).map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {parsed.experience?.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">Experience</div>
                  <ul className="space-y-1 text-xs">
                    {parsed.experience.slice(0, 5).map((e: string, i: number) => (
                      <li key={i} className="flex gap-1"><ChevronRight className="mt-0.5 h-3 w-3 shrink-0" />{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {parsed.projects?.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">Projects</div>
                  <ul className="space-y-1 text-xs">
                    {parsed.projects.slice(0, 5).map((e: string, i: number) => (
                      <li key={i} className="flex gap-1"><ChevronRight className="mt-0.5 h-3 w-3 shrink-0" />{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {parsed.education?.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">Education</div>
                  <ul className="space-y-1 text-xs">
                    {parsed.education.map((e: string, i: number) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {parsed.certifications?.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">Certifications</div>
                  <ul className="space-y-1 text-xs">
                    {parsed.certifications.map((e: string, i: number) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
}

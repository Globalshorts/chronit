import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";

const SB_URL = "https://oxygqtbdpnxxcgzwdlzi.supabase.co";
const FN = (name: string) => `${SB_URL}/functions/v1/${name}`;

type Clip = {
  video_id: string;
  title: string;
  author: string;
  thumbnail_url: string;
  page_url: string;
  duration: number;
  source: string;
};

type Job = {
  id: string;
  status: "pending" | "processing" | "done" | "error";
  product_url: string;
  video_url: string;
  error_message: string;
  created_at: string;
  credits_used: number;
};

export default function VideoGenerator() {
  const [session, setSession]         = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sourceUrl, setSourceUrl]     = useState("");
  const [searching, setSearching]     = useState(false);
  const [searchError, setSearchError] = useState("");
  const [clips, setClips]             = useState<Clip[]>([]);
  const [cart, setCart]               = useState<Set<string>>(new Set());
  const [targetSeconds, setTargetSeconds] = useState(15);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [jobs, setJobs]               = useState<Job[]>([]);
  const [balance, setBalance]         = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const loadJobs = useCallback(async () => {
    const { data } = await supabase.from("video_jobs").select("*")
      .order("created_at", { ascending: false }).limit(20);
    if (data) setJobs(data as Job[]);
  }, []);

  const loadBalance = useCallback(async () => {
    const { data } = await supabase.rpc("get_my_balance_rpc").single();
    if (data?.balance !== undefined) setBalance(data.balance);
  }, []);

  useEffect(() => {
    if (!session) return;
    loadJobs(); loadBalance();
    const ch = supabase.channel("vj")
      .on("postgres_changes", { event: "*", schema: "public", table: "video_jobs" }, () => {
        loadJobs(); loadBalance();
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session, loadJobs, loadBalance]);

  const handleSearch = async () => {
    setSearchError("");
    if (!sourceUrl.trim()) { setSearchError("URL을 입력해주세요"); return; }
    const lu = sourceUrl.toLowerCase();
    if (!["instagram.com", "youtube.com", "youtu.be", "tiktok.com"].some(p => lu.includes(p))) {
      setSearchError("Instagram Reels, YouTube Shorts, TikTok URL을 입력해주세요"); return;
    }
    setSearching(true); setClips([]); setCart(new Set());
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { setSearchError("로그인이 필요합니다"); return; }
      const resp = await fetch(FN("search-clips"), {
        method: "POST",
        headers: { "Authorization": `Bearer ${s.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ source_url: sourceUrl.trim(), clip_count: 20 }),
      });
      const data = await resp.json();
      if (!data.ok) { setSearchError(data.error ?? "검색 실패"); return; }
      setClips(data.clips ?? []);
      if (!(data.clips ?? []).length) setSearchError("검색 결과가 없습니다. 다른 URL을 시도해보세요.");
    } catch (e) { setSearchError(String(e)); }
    finally { setSearching(false); }
  };

  const toggleCart = (id: string) => {
    setCart(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleGenerate = async () => {
    setSubmitError("");
    const selected = clips.filter(c => cart.has(c.video_id));
    if (!selected.length) { setSubmitError("클립을 1개 이상 담아주세요"); return; }
    setSubmitting(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { setSubmitError("로그인이 필요합니다"); return; }
      const resp = await fetch(FN("generate-video"), {
        method: "POST",
        headers: { "Authorization": `Bearer ${s.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ source_url: sourceUrl.trim(), selected_clips: selected, target_seconds: targetSeconds }),
      });
      const data = await resp.json();
      if (!data.ok) { setSubmitError(data.error ?? "요청 실패"); return; }
      setBalance(data.balance ?? null);
      await loadJobs();
    } catch (e) { setSubmitError(String(e)); }
    finally { setSubmitting(false); }
  };

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
    </div>
  );

  if (!session) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4 bg-gray-950">
      <h1 className="text-2xl font-black text-white">로그인이 필요합니다</h1>
      <button onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href } })}
        className="rounded-xl bg-cyan-500 px-8 py-3 font-bold text-white hover:bg-cyan-400 transition">
        Google로 로그인
      </button>
    </div>
  );

  const stage = clips.length > 0 ? (cart.size > 0 ? 2 : 2) : 1;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-10">

        {/* 헤더 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">영상 생성</h1>
            <p className="mt-1 text-sm text-gray-400">쇼핑 릴스 URL → TikTok 클립 검색 → 담기 → 숏폼 제작</p>
          </div>
          {balance !== null && (
            <div className="rounded-full bg-gray-800 px-4 py-2 text-sm font-bold text-cyan-400">
              💎 {balance.toLocaleString()} CR
            </div>
          )}
        </div>

        {/* Stage 인디케이터 */}
        <div className="mb-8 flex items-center gap-0">
          {[
            { n: 1, label: "영상 분석", done: clips.length > 0 },
            { n: 2, label: "클립 선택", done: cart.size > 0 },
            { n: 3, label: "영상 생성", done: jobs.length > 0 },
          ].map((s, i, arr) => (
            <div key={s.n} className="flex items-center flex-1 min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  s.done ? "bg-cyan-500 text-white" :
                  (!arr[i-1] || arr[i-1].done) && !s.done ? "bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400" :
                  "bg-gray-800 text-gray-500"
                }`}>{s.done ? "✓" : s.n}</div>
                <span className={`text-xs font-bold hidden sm:block ${s.done ? "text-white" : "text-gray-500"}`}>{s.label}</span>
              </div>
              {i < arr.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${s.done ? "bg-cyan-500" : "bg-gray-800"}`} />}
            </div>
          ))}
        </div>

        {/* URL 입력 */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6 mb-6">
          <label className="mb-2 block text-sm font-bold text-gray-300">쇼핑 릴스 / 쇼츠 URL</label>
          <div className="flex gap-3">
            <input type="url" value={sourceUrl}
              onChange={e => { setSourceUrl(e.target.value); setClips([]); setCart(new Set()); }}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="https://www.tiktok.com/@... 또는 https://www.instagram.com/reel/..."
              disabled={searching}
              className="flex-1 rounded-xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 transition" />
            <button onClick={handleSearch} disabled={searching || !sourceUrl.trim()}
              className="shrink-0 rounded-xl bg-cyan-500 px-6 py-3 text-sm font-bold text-white hover:bg-cyan-400 disabled:opacity-40 transition flex items-center gap-2">
              {searching
                ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />분석 중...</>
                : "🔍 분석 시작"}
            </button>
          </div>
          {searchError && <p className="mt-2 text-sm text-red-400">{searchError}</p>}
          {searching && (
            <div className="mt-4 rounded-xl bg-gray-800 px-4 py-3 text-sm text-gray-300 flex items-center gap-3">
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              영상 분석 후 TikTok에서 관련 클립 검색 중... (30초~2분 소요)
            </div>
          )}
        </div>

        {/* 클립 그리드 */}
        {clips.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">
                클립 선택
                <span className="ml-2 text-sm font-normal text-gray-400">{clips.length}개 발견</span>
              </h2>
              <span className="text-sm font-bold text-cyan-400">{cart.size}개 담음</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {clips.map(clip => (
                <ClipCard key={clip.video_id} clip={clip} selected={cart.has(clip.video_id)} onToggle={() => toggleCart(clip.video_id)} />
              ))}
            </div>
          </div>
        )}

        {/* 영상 길이 + 생성 버튼 */}
        {clips.length > 0 && (
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
            <div className="mb-5">
              <label className="mb-3 block text-sm font-bold text-gray-300">목표 영상 길이</label>
              <div className="flex gap-2">
                {[10, 15, 20, 30].map(s => (
                  <button key={s} onClick={() => setTargetSeconds(s)}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition ${
                      targetSeconds === s
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                        : "border-gray-700 text-gray-400 hover:border-gray-500"
                    }`}>{s}초</button>
                ))}
              </div>
            </div>
            {submitError && <p className="mb-4 text-sm text-red-400">{submitError}</p>}
            <button onClick={handleGenerate} disabled={submitting || cart.size === 0}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-4 text-base font-extrabold text-white shadow-lg hover:opacity-90 disabled:opacity-40 transition flex items-center justify-center gap-2">
              {submitting
                ? <><span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />요청 중...</>
                : <>🎬 {cart.size > 0 ? `${cart.size}개 클립으로 영상 생성 (100 CR)` : "클립을 담아주세요"}</>}
            </button>
          </div>
        )}

        {/* 생성 내역 */}
        {jobs.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-lg font-black text-white">생성 내역</h2>
            <div className="space-y-3">
              {jobs.map(job => <JobCard key={job.id} job={job} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClipCard({ clip, selected, onToggle }: { clip: Clip; selected: boolean; onToggle: () => void }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div onClick={onToggle}
      className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
        selected ? "border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.35)]" : "border-gray-700 hover:border-gray-500"
      }`}>
      <div className="aspect-[9/16] bg-gray-800 relative">
        {!imgError && clip.thumbnail_url
          ? <img src={clip.thumbnail_url} alt={clip.title} onError={() => setImgError(true)} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-gray-600 text-3xl">🎬</div>
        }
        {clip.duration > 0 && (
          <div className="absolute bottom-1.5 right-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-xs text-white font-bold">{clip.duration}s</div>
        )}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
          selected ? "opacity-100 bg-cyan-500/20" : "opacity-0 hover:opacity-100 bg-black/20"
        }`}>
          <span className="text-2xl">{selected ? "✅" : "➕"}</span>
        </div>
      </div>
      <div className="p-2 bg-gray-900">
        <p className="text-xs text-white font-medium line-clamp-1">{clip.title || "(제목 없음)"}</p>
        <p className="text-xs text-gray-500 mt-0.5">@{clip.author || "unknown"}</p>
      </div>
      {selected && (
        <div className="absolute top-2 left-2 h-5 w-5 rounded-full bg-cyan-500 flex items-center justify-center">
          <span className="text-white text-xs font-black">✓</span>
        </div>
      )}
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const S = {
    pending:    { label: "대기 중", cls: "bg-yellow-500/10 text-yellow-400", icon: "⏳" },
    processing: { label: "생성 중", cls: "bg-blue-500/10 text-blue-400",    icon: "🎬" },
    done:       { label: "완료",    cls: "bg-green-500/10 text-green-400",  icon: "✅" },
    error:      { label: "오류",    cls: "bg-red-500/10 text-red-400",      icon: "❌" },
  };
  const s = S[job.status];
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.cls}`}>{s.icon} {s.label}</span>
          <p className="mt-1.5 truncate text-sm text-gray-300">{job.product_url}</p>
          <p className="mt-0.5 text-xs text-gray-500">{new Date(job.created_at).toLocaleString("ko-KR")} · {job.credits_used} CR</p>
          {job.status === "error" && job.error_message && <p className="mt-1 text-xs text-red-400">{job.error_message}</p>}
        </div>
        {job.status === "done" && job.video_url && (
          <a href={job.video_url} download className="shrink-0 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-400 transition">다운로드</a>
        )}
        {(job.status === "pending" || job.status === "processing") && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent shrink-0" />
        )}
      </div>
      {job.status === "done" && job.video_url && (
        <video src={job.video_url} controls className="mt-4 w-full max-w-xs rounded-xl" style={{ aspectRatio: "9/16", maxHeight: "320px" }} />
      )}
    </div>
  );
}

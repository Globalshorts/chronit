import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";

type Job = {
  id: string;
  status: "pending" | "processing" | "done" | "error";
  product_url: string;
  product_name: string;
  video_url: string;
  error_message: string;
  created_at: string;
  credits_used: number;
};

const SUPABASE_FN_URL = "https://oxygqtbdpnxxcgzwdlzi.supabase.co/functions/v1/generate-video";

export default function VideoGenerator() {
  const [session, setSession]           = useState<Session | null>(null);
  const [authLoading, setAuthLoading]   = useState(true);
  const [sourceUrl, setSourceUrl]       = useState("");
  const [targetSeconds, setTargetSeconds] = useState(15);
  const [clipCount, setClipCount]       = useState(5);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [jobs, setJobs]                 = useState<Job[]>([]);
  const [balance, setBalance]           = useState<number | null>(null);

  const loadJobs = useCallback(async () => {
    const { data } = await supabase
      .from("video_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setJobs(data as Job[]);
  }, []);

  const loadBalance = useCallback(async () => {
    const { data } = await supabase.rpc("get_my_balance_rpc").single();
    if (data?.balance !== undefined) setBalance(data.balance);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    loadJobs();
    loadBalance();

    const channel = supabase
      .channel("video_jobs_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "video_jobs" }, () => {
        loadJobs();
        loadBalance();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, loadJobs, loadBalance]);

  const handleSubmit = async () => {
    setError("");
    if (!sourceUrl.trim()) {
      setError("쇼핑 릴스 또는 쇼츠 URL을 입력해주세요");
      return;
    }
    const urlLower = sourceUrl.toLowerCase();
    const valid = ["instagram.com", "youtube.com", "youtu.be", "tiktok.com"];
    if (!valid.some((p) => urlLower.includes(p))) {
      setError("Instagram Reels, YouTube Shorts, TikTok URL을 입력해주세요");
      return;
    }

    setLoading(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { setError("로그인이 필요합니다"); return; }

      const resp = await fetch(SUPABASE_FN_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${s.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_url: sourceUrl.trim(),
          target_seconds: targetSeconds,
          clip_count: clipCount,
        }),
      });

      const result = await resp.json();
      if (!result.ok) {
        setError(result.error ?? "요청 실패");
        return;
      }

      setSourceUrl("");
      setBalance(result.balance ?? null);
      await loadJobs();

    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  // ── 로딩 / 로그인 화면 ───────────────────────────────────────
  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
    </div>
  );

  if (!session) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
      <h1 className="text-2xl font-black text-gray-900">로그인이 필요합니다</h1>
      <p className="text-gray-500 text-center">영상 생성 기능을 사용하려면 로그인해주세요.</p>
      <button
        onClick={() => supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.href },
        })}
        className="rounded-xl bg-blue-600 px-8 py-3 font-bold text-white hover:bg-blue-500 transition"
      >
        Google로 로그인
      </button>
    </div>
  );

  // ── 메인 UI ─────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-black text-gray-900">영상 생성</h1>
      <p className="mb-6 text-sm text-gray-500">
        쇼핑 릴스/쇼츠 URL을 넣으면 AI가 같은 상품의 TikTok 클립으로 새 숏폼을 만들어드립니다.
      </p>

      {balance !== null && (
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
          💎 잔여 크레딧: {balance.toLocaleString()}
          <span className="font-normal text-blue-500">(영상 1개 = 100 크레딧)</span>
        </div>
      )}

      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* URL 입력 */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-bold text-gray-700">
            쇼핑 릴스 / 쇼츠 URL *
          </label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://www.tiktok.com/@... 또는 https://www.instagram.com/reel/..."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <p className="mt-1 text-xs text-gray-400">TikTok · Instagram Reels · YouTube Shorts 지원</p>
        </div>

        {/* 영상 길이 */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-bold text-gray-700">
            목표 길이
          </label>
          <div className="flex gap-2">
            {[10, 15, 20, 30].map((s) => (
              <button
                key={s}
                onClick={() => setTargetSeconds(s)}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition ${
                  targetSeconds === s
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:border-blue-300"
                }`}
              >
                {s}초
              </button>
            ))}
          </div>
        </div>

        {/* 클립 수 */}
        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-bold text-gray-700">
            참고 클립 수 <span className="font-normal text-gray-400">(많을수록 다양하나 느림)</span>
          </label>
          <div className="flex gap-2">
            {[3, 5, 7].map((n) => (
              <button
                key={n}
                onClick={() => setClipCount(n)}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition ${
                  clipCount === n
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:border-blue-300"
                }`}
              >
                {n}개
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 text-base font-extrabold text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "요청 중..." : "🎬 영상 생성하기 (100 크레딧)"}
        </button>
      </div>

      {/* 생성 내역 */}
      <h2 className="mb-4 text-lg font-black text-gray-900">생성 내역</h2>
      {jobs.length === 0 ? (
        <p className="text-sm text-gray-400">아직 생성된 영상이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      )}
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const S = {
    pending:    { label: "대기 중",  color: "bg-yellow-100 text-yellow-700", icon: "⏳" },
    processing: { label: "생성 중",  color: "bg-blue-100 text-blue-700",    icon: "🎬" },
    done:       { label: "완료",     color: "bg-green-100 text-green-700",  icon: "✅" },
    error:      { label: "오류",     color: "bg-red-100 text-red-700",      icon: "❌" },
  };
  const s = S[job.status];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.color}`}>
              {s.icon} {s.label}
            </span>
          </div>
          <p className="truncate text-sm font-medium text-gray-800">
            {job.product_name || job.product_url}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {new Date(job.created_at).toLocaleString("ko-KR")} · {job.credits_used} 크레딧
          </p>
          {job.status === "error" && job.error_message && (
            <p className="mt-1 text-xs text-red-500">{job.error_message}</p>
          )}
        </div>

        {job.status === "done" && job.video_url && (
          <a
            href={job.video_url}
            download
            className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500 transition"
          >
            다운로드
          </a>
        )}

        {(job.status === "pending" || job.status === "processing") && (
          <div className="shrink-0 h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        )}
      </div>

      {job.status === "done" && job.video_url && (
        <div className="mt-4">
          <video
            src={job.video_url}
            controls
            className="w-full max-w-xs rounded-xl"
            style={{ aspectRatio: "9/16", maxHeight: "320px" }}
          />
        </div>
      )}
    </div>
  );
}

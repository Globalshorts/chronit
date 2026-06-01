import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";

const CATEGORIES = ["생활용품", "식품", "전자제품", "패션/의류", "뷰티", "스포츠", "반려동물", "기타"];

type Job = {
  id: string;
  status: "pending" | "processing" | "done" | "error";
  product_url: string;
  product_name: string;
  category: string;
  video_url: string;
  error_message: string;
  created_at: string;
  credits_used: number;
};

export default function VideoGenerator() {
  const [session, setSession]         = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sourceUrl, setSourceUrl]     = useState("");
  const [productName, setProductName] = useState("");
  const [category, setCategory]       = useState("기타");
  const [caseB, setCaseB]             = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [jobs, setJobs]               = useState<Job[]>([]);
  const [balance, setBalance]         = useState<number | null>(null);

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "video_jobs" },
        () => { loadJobs(); loadBalance(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadJobs, loadBalance]);

  const handleSubmit = async () => {
    setError("");
    if (!sourceUrl.trim()) {
      setError("쇼핑 릴스 또는 쇼츠 URL을 입력해주세요");
      return;
    }
    // URL 형식 간단 검증
    const urlLower = sourceUrl.toLowerCase();
    const validPlatforms = ["instagram.com", "youtube.com", "youtu.be", "tiktok.com"];
    if (!validPlatforms.some((p) => urlLower.includes(p))) {
      setError("Instagram, YouTube Shorts, TikTok URL을 입력해주세요");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("로그인이 필요합니다"); return; }

      const resp = await fetch(
        `https://oxygqtbdpnxxcgzwdlzi.supabase.co/functions/v1/generate-video`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_url: sourceUrl.trim(),   // ← 변경: product_url → source_url
            product_name: productName.trim(),
            category,
            case_b: caseB,
          }),
        }
      );

      const result = await resp.json();
      if (!result.ok) {
        setError(result.error ?? "요청 실패");
        return;
      }

      setSourceUrl("");
      setProductName("");
      setBalance(result.balance ?? null);
      await loadJobs();

    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
    </div>
  );

  if (!session) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      <h1 className="text-2xl font-black text-gray-900">로그인이 필요합니다</h1>
      <p className="text-gray-500">영상 생성 기능을 사용하려면 로그인해주세요.</p>
      <button
        onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href } })}
        className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-500"
      >
        Google로 로그인
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-black text-gray-900">영상 생성</h1>
      <p className="mb-8 text-sm text-gray-500">
        쇼핑 릴스나 쇼츠 URL을 넣으면 AI가 같은 상품의 리뷰 숏폼 영상을 만들어드립니다.
      </p>

      {balance !== null && (
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
          💎 잔여 크레딧: {balance.toLocaleString()}
          <span className="font-normal text-blue-500">(영상 1개 = 100 크레딧)</span>
        </div>
      )}

      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-bold text-gray-700">
            쇼핑 릴스 / 쇼츠 URL *
          </label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/... 또는 https://youtube.com/shorts/..."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <p className="mt-1 text-xs text-gray-400">
            Instagram Reels · YouTube Shorts · TikTok 지원
          </p>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-bold text-gray-700">
            상품명 <span className="font-normal text-gray-400">(없으면 자동 추출)</span>
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="예: 무선 청소기, 에어팟, 운동화..."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-gray-700">카테고리</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end pb-0.5">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={caseB}
                onChange={(e) => setCaseB(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm font-medium text-gray-700">짧은 컷 편집 (Case B)</span>
            </label>
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
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 text-base font-extrabold text-white shadow-lg transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60"
        >
          {loading ? "요청 중..." : "🎬 영상 생성하기 (100 크레딧)"}
        </button>
      </div>

      <h2 className="mb-4 text-lg font-black text-gray-900">생성 내역</h2>
      {jobs.length === 0 ? (
        <p className="text-sm text-gray-400">아직 생성된 영상이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const statusConfig = {
    pending:    { label: "대기 중",   color: "bg-yellow-100 text-yellow-700", icon: "⏳" },
    processing: { label: "생성 중",   color: "bg-blue-100 text-blue-700",    icon: "🎬" },
    done:       { label: "완료",      color: "bg-green-100 text-green-700",  icon: "✅" },
    error:      { label: "오류",      color: "bg-red-100 text-red-700",      icon: "❌" },
  };
  const s = statusConfig[job.status];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.color}`}>
              {s.icon} {s.label}
            </span>
            <span className="text-xs text-gray-400">{job.category}</span>
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
            className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-500"
          >
            다운로드
          </a>
        )}

        {(job.status === "pending" || job.status === "processing") && (
          <div className="shrink-0">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
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

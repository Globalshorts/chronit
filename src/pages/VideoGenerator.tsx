/**
 * VideoGenerator.tsx — 6단계 워크플로우
 *
 * Stage 1: URL 분석 + 클립 그리드 + 담기
 * Stage 2: 스타일 선택 + 영상 길이
 * Stage 3: 대본 생성 + 컷편집 (백그라운드)
 * Stage 4: 자막 + 썸네일 스타일
 * Stage 5: 음성 선택 → 렌더링 시작
 * Stage 6: 제목/해시태그 + 내보내기
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";

const SB = "https://oxygqtbdpnxxcgzwdlzi.supabase.co";
const FN = (n: string) => `${SB}/functions/v1/${n}`;

// ── 타입 ──────────────────────────────────────────────────────
type Clip = {
  video_id: string; title: string; author: string;
  thumbnail_url: string; page_url: string; duration: number; source: string;
};
type Job = {
  id: string; status: "pending"|"processing"|"done"|"error";
  product_url: string; video_url: string; error_message: string;
  created_at: string; credits_used: number;
};
type ScriptSegment = { text: string; duration_sec: number };

const VOICES_BASIC = [
  { id: "nova",    label: "여성 1", desc: "밝고 친근함" },
  { id: "shimmer", label: "여성 2", desc: "차분하고 안정" },
  { id: "onyx",    label: "남성 1", desc: "활기차고 자신감" },
  { id: "echo",    label: "남성 2", desc: "깊고 안정적" },
  { id: "fable",   label: "여성 3", desc: "부드럽고 감성적" },
];
const VOICES_PRO = [
  { id: "Ir7oQcBXWiq4oFGROCfj", label: "태민 (남)", desc: "남성, 자연스러운 한국어" },
  { id: "sQ3a15DhENXU8pKTHlcc", label: "Mr. K (남)", desc: "남성, 차분하고 전문적" },
  { id: "m3gJBS8OofDJfycyA2Ip", label: "태형 (남)", desc: "남성, 활기차고 친근함" },
  { id: "zgDzx5jLLCqEp6Fl7Kl7", label: "한나 (여)", desc: "여성, 밝고 자연스러움" },
  { id: "8jHHF8rMqMlg8if2mOUe", label: "한 (여)",   desc: "여성, 차분하고 안정적" },
  { id: "ksaI0TCD9BstzEzlxj4q", label: "슬기 (여)", desc: "여성, 부드럽고 감성적" },
  { id: "5I7B1di44aCL15NkP0jn", label: "칸나 (여)", desc: "여성, 에너지 넘침" },
  { id: "JAglhVijAfMW2NotYUoH", label: "피터 (여)", desc: "여성, 친근하고 명랑" },
  { id: "6Vgh4FaCc0SCcWPwcyXa", label: "혜진 (여)", desc: "여성, 따뜻하고 신뢰감" },
  { id: "uyVNoMrnUku1dZyVEXwD", label: "안나 (여)", desc: "여성, 밝고 활발함" },
];
// 여성 EL 보이스는 볼륨 150% 기본값
const EL_FEMALE_IDS = new Set(["zgDzx5jLLCqEp6Fl7Kl7","8jHHF8rMqMlg8if2mOUe","ksaI0TCD9BstzEzlxj4q","5I7B1di44aCL15NkP0jn","JAglhVijAfMW2NotYUoH","6Vgh4FaCc0SCcWPwcyXa","uyVNoMrnUku1dZyVEXwD"]);

const SUBTITLE_PRESETS = [
  { id: "bold_white",  label: "굵은 흰색",  preview: "bg-white text-black" },
  { id: "yellow",      label: "노란색 강조", preview: "bg-yellow-300 text-black" },
  { id: "outline",     label: "아웃라인",   preview: "bg-transparent text-white border-2 border-white" },
  { id: "dark_bg",     label: "다크 배경",  preview: "bg-black/70 text-white" },
];

// ── 메인 ─────────────────────────────────────────────────────
export default function VideoGenerator() {
  const [session, setSession]       = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [stage, setStage]           = useState(1);

  // Stage 1
  const [sourceUrl, setSourceUrl]   = useState("");
  const [searching, setSearching]   = useState(false);
  const [searchError, setSearchError] = useState("");
  const [clips, setClips]           = useState<Clip[]>([]);
  const [cart, setCart]             = useState<Set<string>>(new Set());

  // Stage 2
  const [targetSeconds, setTargetSeconds] = useState(15);
  const [styleProfileId, setStyleProfileId] = useState("auto");

  // Stage 3
  const [ctaText, setCtaText] = useState("");  // CTA 입력 (비우면 프로필 링크 안내)
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState("");
  const [script, setScript]         = useState<ScriptSegment[] | null>(null);
  const [scriptPredId, setScriptPredId] = useState("");

  // Stage 4
  const DEFAULT_STYLE = {
    fontFamily: "'Noto Sans KR', sans-serif",
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900" as "400"|"700"|"900",
    strokeColor: "#000000",
    strokeWidth: 2,
    strokeOn: true,
    bgOn: false,
    bgColor: "#000000",
    bgOpacity: 60,
    yPos: 75,
    xPos: 50,
  };
  const [subtitleStyle, setSubtitleStyle] = useState(DEFAULT_STYLE);
  const [thumbnailStyle, setThumbnailStyle] = useState({ ...DEFAULT_STYLE, yPos: 50 });
  const [showThumbnail, setShowThumbnail] = useState(true);
  const subtitlePreset = "custom";

  // Stage 5
  const [voiceId, setVoiceId]       = useState(() => localStorage.getItem("chronit_voice_id") || "nova");
  const [voiceSpeed, setVoiceSpeed] = useState(() => Number(localStorage.getItem("chronit_voice_speed")) || 130);
  const [voiceVolume, setVoiceVolume] = useState(() => Number(localStorage.getItem("chronit_voice_volume")) || 100);
  const [rendering, setRendering]   = useState(false);
  const [renderError, setRenderError] = useState("");
  const [voiceGenerated, setVoiceGenerated] = useState(false);  // Stage 5 음성 생성 완료
  const [voiceSegments, setVoiceSegments] = useState<any[]>([]);  // 장면별 편집용
  const [freeRegen, setFreeRegen] = useState(3);  // Stage 3 무료 재생성 횟수
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [seoTags, setSeoTags] = useState("");
  const [seoLoading, setSeoLoading] = useState(false);
  const [currentJobId, setCurrentJobId] = useState("");

  // Stage 6
  const [jobs, setJobs]             = useState<Job[]>([]);
  const [completionAlert, setCompletionAlert] = useState<string|null>(null);
  const [balance, setBalance]       = useState<number | null>(null);
  const [userPlan, setUserPlan]     = useState<string | null>(null);
  const [userRole, setUserRole]     = useState<string>("user");
  const [activeView, setActiveView] = useState("generator");

  // auth
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
    if (data?.plan) setUserPlan(data.plan);
    else {
      // plan 별도 조회
      const { data: sub } = await supabase.from("subscriptions")
        .select("plan, role").eq("user_id", session?.user?.id ?? "").maybeSingle();
      if (sub?.plan) setUserPlan(sub.plan);
      if (sub?.role) setUserRole(sub.role);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    loadJobs(); loadBalance();
    const ch = supabase.channel("vj")
      .on("postgres_changes", { event: "*", schema: "public", table: "video_jobs" }, () => {
        loadJobs(); loadBalance();
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session, loadJobs, loadBalance]);

  // 현재 job 완료 감지 → Stage 6 이동
  useEffect(() => {
    if (!currentJobId) return;
    const job = jobs.find(j => j.id === currentJobId);
    if (job?.status === "done" && stage === 5) {
      setStage(6);
      setCompletionAlert("영상 생성 완료! 아래에서 확인하세요.");
      // 완성음 재생
      try { new Audio("https://www.soundjay.com/buttons/sounds/button-09a.mp3").play(); } catch {}
    }
  }, [jobs, currentJobId, stage]);


  // ── 프로젝트 저장/복원 ────────────────────────────────────────
  const PROJECT_KEY = "chronit_project_v1";

  // 저장
  const saveProject = () => {
    const data = {
      savedAt: Date.now(),
      stage, sourceUrl, clips, cart: [...cart], script, scriptPredId,
      targetSeconds, styleProfileId,
      subtitleStyle, thumbnailStyle, showThumbnail,
      voiceId, voiceSpeed,
    };
    localStorage.setItem(PROJECT_KEY, JSON.stringify(data));
  };

  // 복원
  const loadProject = () => {
    try {
      const raw = localStorage.getItem(PROJECT_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.sourceUrl) setSourceUrl(data.sourceUrl);
      if (data.clips?.length) setClips(data.clips);
      if (data.cart?.length) setCart(new Set(data.cart));
      if (data.script) setScript(data.script);
      if (data.scriptPredId) setScriptPredId(data.scriptPredId);
      if (data.targetSeconds) setTargetSeconds(data.targetSeconds);
      if (data.styleProfileId) setStyleProfileId(data.styleProfileId);
      if (data.subtitleStyle) setSubtitleStyle(data.subtitleStyle);
      if (data.thumbnailStyle) setThumbnailStyle(data.thumbnailStyle);
      if (data.showThumbnail !== undefined) setShowThumbnail(data.showThumbnail);
      if (data.voiceId) setVoiceId(data.voiceId);
      if (data.voiceSpeed) setVoiceSpeed(data.voiceSpeed);
      if (data.stage) setStage(data.stage);
      return true;
    } catch { return false; }
  };

  const clearProject = () => localStorage.removeItem(PROJECT_KEY);

  // 마운트 시 저장된 프로젝트 확인
  const [hasSaved, setHasSaved] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROJECT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.savedAt && Date.now() - d.savedAt < 24 * 60 * 60 * 1000) setHasSaved(true);
      }
    } catch {}
  }, []);

  // ── Stage 1: 검색 ────────────────────────────────────────
  const handleSearch = async () => {
    setSearchError("");
    if (!sourceUrl.trim()) { setSearchError("URL을 입력해주세요"); return; }
    const lu = sourceUrl.toLowerCase();
    if (!["instagram.com","youtube.com","youtu.be","tiktok.com"].some(p => lu.includes(p))) {
      setSearchError("Instagram Reels, YouTube Shorts, TikTok URL을 입력해주세요"); return;
    }
    setSearching(true); setClips([]); setCart(new Set());
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { setSearchError("로그인이 필요합니다"); return; }
      const headers = { "Authorization": `Bearer ${s.access_token}`, "Content-Type": "application/json" };

      // Step 1: 영상 분석 + TikTok 검색 (search-clips, ~60초)
      const resp1 = await fetch(FN("search-clips"), {
        method: "POST", headers,
        body: JSON.stringify({ source_url: sourceUrl.trim(), clip_count: 80 }),
      });
      const data1 = await resp1.json();
      if (!data1.ok) { setSearchError(data1.error ?? "분석 실패"); return; }

      const rawClips: Clip[] = data1.clips ?? [];
      const refFrames: string[] = data1.reference_frames ?? [];
      if (!rawClips.length) { setSearchError("검색 결과가 없습니다. 다른 URL을 시도해보세요."); return; }

      // reference_frames 없으면 CLIP filter 스킵
      if (!refFrames.length) { setClips(rawClips); return; }

      // Step 2: CLIP filter (clip-filter, ~60초)
      const resp2 = await fetch(FN("clip-filter"), {
        method: "POST", headers,
        body: JSON.stringify({ reference_frames: refFrames, candidates: rawClips, clip_count: 80 }),
      });
      const data2 = await resp2.json();
      const finalClips: Clip[] = data2.ok ? (data2.clips ?? rawClips) : rawClips.slice(0, 20);
      setClips(finalClips);
      if (!finalClips.length) setSearchError("검색 결과가 없습니다. 다른 URL을 시도해보세요.");
    } catch (e) { setSearchError(String(e)); }
    finally { setSearching(false); }
  };
  const toggleCart = (id: string) => {
    setCart(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // ── Stage 3: 대본 생성 ───────────────────────────────────
  const handleGenerateScript = async () => {
    setScriptError(""); setScriptLoading(true); setScript(null);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { setScriptError("로그인이 필요합니다"); return; }
      const selected = clips.filter(c => cart.has(c.video_id));

      // 1단계: prediction 생성 (빠르게 반환)
      const resp = await fetch(FN("generate-script"), {
        method: "POST",
        headers: { "Authorization": `Bearer ${s.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          source_url: sourceUrl.trim(),
          selected_clips: selected,
          target_seconds: targetSeconds,
          style_profile_id: styleProfileId,
          cta_text: ctaText.trim(),
        }),
      });
      const data = await resp.json();
      if (!data.ok) { setScriptError(data.error ?? "대본 생성 실패"); return; }

      const predId = data.prediction_id;
      setScriptPredId(predId ?? "");

      // 이미 완료된 경우 (구버전 호환)
      if (data.status === "succeeded" && data.segments) {
        setScript(data.segments); return;
      }

      // 2단계: 프론트에서 폴링 (5분 최대)
      const startTime = Date.now();
      while (Date.now() - startTime < 300_000) {
        await new Promise(r => setTimeout(r, 5000));
        const pollResp = await fetch(FN("generate-script"), {
          method: "POST",
          headers: { "Authorization": `Bearer ${s.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ poll: true, prediction_id: predId }),
        });
        const pollData = await pollResp.json();
        if (pollData.status === "succeeded") {
          setScript(pollData.segments ?? []); return;
        }
        if (pollData.status === "failed" || pollData.status === "canceled") {
          setScriptError(pollData.error ?? "대본 생성 실패"); return;
        }
        // starting/processing → 계속 폴링
      }
      setScriptError("대본 생성 시간 초과 (5분)");
    } catch (e) { setScriptError(String(e)); }
    finally { setScriptLoading(false); }
  };

  // ── Stage 5: 렌더링 ──────────────────────────────────────
  // Stage 5: 음성 세그먼트 자동 배분
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  const handleVoiceGenerate = async () => {
    if (!script || script.length === 0) return;
    setVoiceLoading(true); setVoiceError("");
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { setVoiceError("로그인이 필요합니다"); return; }

      const selected = clips.filter(c => cart.has(c.video_id));
      const clipDuration = targetSeconds / (selected.length || 1);

      const resp = await fetch(FN("generate-voice"), {
        method: "POST",
        headers: { Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          voice_id: voiceId,
          voice_speed: voiceSpeed / 100,
          segments: script.map((s, i) => ({
            idx: i,
            text: s.text || s.sentence || "",
            duration_hint: s.duration_sec || 2,
          })),
          clips: selected.length > 0
            ? selected.map(c => ({
                clip_id: c.video_id,
                clip_title: c.title || "",
                // 클립 사용 시간: 2~5초 규칙 (5초 초과는 5초까지만, 2초 미만은 제외됨)
                clip_duration: Math.min(5, Math.max(2, c.duration_sec || clipDuration)),
              }))
            : [{ clip_id: "dummy", clip_title: "전체 대본", clip_duration: Math.min(5, Math.max(2, clipDuration)) }],
        }),
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error ?? "음성 생성 실패");

      // voice_clips를 voiceSegments 형태로 변환
      const newVoiceSegs = data.voice_clips.map((vc: any) => ({
        clip_id: vc.clip_id,
        clip_title: vc.clip_title || vc.clip_id,
        clip_duration: vc.clip_duration,
        used_duration: vc.used_duration,
        segments: vc.segments.map((seg: any) => ({
          idx: seg.idx,
          text: seg.text,
          duration: seg.duration_sec,
          audio_url: seg.audio_url,
        })),
      }));
      setVoiceSegments(newVoiceSegs);
      setVoiceGenerated(true);
    } catch (e) {
      setVoiceError(String(e));
    } finally {
      setVoiceLoading(false);
    }
  };

  // Stage 3: 재생성 (무료 횟수 차감)
  const handleRegenerateScript = async () => {
    if (freeRegen > 0) {
      setFreeRegen(prev => prev - 1);
    }
    await handleGenerateScript();
  };

  // Stage 6: SEO AI 추천
  const handleSeoGenerate = async () => {
    if (!script || !sourceUrl) return;
    setSeoLoading(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) return;
      const resp = await fetch(FN("generate-seo"), {
        method: "POST",
        headers: { Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ source_url: sourceUrl, script_segments: script }),
      });
      const data = await resp.json();
      if (data.title) setSeoTitle(data.title);
      if (data.description) setSeoDesc(data.description);
      if (data.tags) setSeoTags(data.tags);
    } catch {}
    finally { setSeoLoading(false); }
  };

  const handleRender = async () => {
    setRenderError(""); setRendering(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { setRenderError("로그인이 필요합니다"); return; }
      const selected = clips.filter(c => cart.has(c.video_id));
      const resp = await fetch(FN("generate-video"), {
        method: "POST",
        headers: { "Authorization": `Bearer ${s.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          source_url: sourceUrl.trim(),
          selected_clips: selected,
          target_seconds: targetSeconds,
          voice_id: voiceId,
          voice_speed: voiceSpeed / 100,
          // 여성 EL 보이스는 실제 렌더링 시 1.5배 적용
          voice_volume: (voiceVolume / 100) * (EL_FEMALE_IDS.has(voiceId) ? 1.5 : 1.0),
          subtitle_preset: subtitlePreset,
          subtitle_style: subtitleStyle,
          thumbnail_style: thumbnailStyle,
          show_thumbnail: showThumbnail,
          script_segments: script,
        }),
      });
      const data = await resp.json();
      if (!data.ok) { setRenderError(data.error ?? "렌더링 요청 실패"); return; }
      setCurrentJobId(data.job_id ?? "");
      setBalance(data.balance ?? null);
      await loadJobs();
    } catch (e) { setRenderError(String(e)); }
    finally { setRendering(false); }
  };

  // ── Auth 화면 ────────────────────────────────────────────
  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
    </div>
  );
  if (!session) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-gray-950">
      <h1 className="text-2xl font-black text-white">로그인이 필요합니다</h1>
      <button onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href } })}
        className="rounded-xl bg-cyan-500 px-8 py-3 font-bold text-white hover:bg-cyan-400 transition">
        Google로 로그인
      </button>
    </div>
  );

  const currentJob = jobs.find(j => j.id === currentJobId);

  const currentData = { stage, sourceUrl, clips, cart: [...cart], script, ctaText, targetSeconds, styleProfileId, subtitleStyle, thumbnailStyle, showThumbnail, voiceId, voiceSpeed, voiceVolume };
  const handleLoad = (d: any) => {
    // 모든 필드를 무조건 복원 (조건부 건너뜀 없음)
    setSourceUrl(d.sourceUrl ?? "");
    setClips(d.clips ?? []);
    setCart(new Set(d.cart ?? []));
    setScript(d.script ?? null);
    setTargetSeconds(d.targetSeconds ?? 15);
    setStyleProfileId(d.styleProfileId ?? "auto");
    if (d.subtitleStyle) setSubtitleStyle(d.subtitleStyle);
    if (d.thumbnailStyle) setThumbnailStyle(d.thumbnailStyle);
    setShowThumbnail(d.showThumbnail ?? true);
    setVoiceId(d.voiceId ?? "nova");
    setVoiceSpeed(d.voiceSpeed ?? 130);
    setVoiceVolume(d.voiceVolume ?? 100);
    setCtaText(d.ctaText ?? "");
    setStage(d.stage ?? 1);
  };

  // 새 프로젝트 생성 시 초기화
  // ★ 프로젝트별 데이터만 리셋 — 자막 스타일, 보이스, 영상 길이 등 전역 설정은 유지
  const handleReset = () => {
    setStage(1);
    setSourceUrl("");
    setClips([]);
    setCart(new Set());
    setScript(null);
    setScriptPredId("");
    setSearchError("");
    setCurrentJobId("");
    setCtaText("");
    setVoiceGenerated(false);
    setVoiceSegments([]);
    setSeoTitle("");
    setSeoDesc("");
    setSeoTags("");
    // 유지: subtitleStyle, thumbnailStyle, voiceId, voiceSpeed, voiceVolume,
    //       targetSeconds, styleProfileId, showThumbnail
  };

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      {/* 완성 알림 팝업 */}
      {completionAlert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-green-500 shadow-2xl shadow-green-500/40 px-6 py-4 flex items-center gap-3 text-white">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-black text-sm">{completionAlert}</p>
            <p className="text-xs text-green-100 mt-0.5">6번 탭에서 다운로드하세요</p>
          </div>
          <button onClick={() => setCompletionAlert(null)} className="ml-4 text-green-200 hover:text-white text-lg">✕</button>
        </div>
      )}
      {/* ── 왼쪽 사이드바 ── */}
      {/* ── 좌측 탭 네비 (좁게) ── */}
      <div className="w-52 shrink-0 border-r border-gray-800 flex flex-col">
        <NavSidebar activeView={activeView} onViewChange={setActiveView} userRole={userRole}
          balance={balance} userPlan={userPlan} session={session} />
      </div>

      {/* ── 중간 패널 — 프로젝트 탭일 때만 표시 ── */}
      {activeView === "generator" && (
        <div className="w-60 shrink-0 border-r border-gray-800 flex flex-col overflow-y-auto">
          <ProjectPanel
            activeView={activeView}
            current={currentData} onLoad={handleLoad} onReset={handleReset}
            session={session}
            styleProfileId={styleProfileId} onSelectStyle={setStyleProfileId}
          />
        </div>
      )}

      {/* ── 메인 콘텐츠 ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {activeView !== "generator" && (
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {activeView === "style-finder" && (
              <div className="max-w-2xl mx-auto">
                <h2 className="text-xl font-black text-white mb-2">🔍 스타일 찾기</h2>
                <p className="text-sm text-gray-400 mb-6">숏폼 영상 URL을 분석해서 대본 스타일을 라이브러리에 저장합니다.</p>
                <StyleFinderView session={session} onImport={(id: string) => { setStyleProfileId(id); setActiveView("generator"); }} />
              </div>
            )}
            {activeView === "history" && (
              <>
                <h2 className="text-xl font-black text-white mb-6">📹 생성 내역</h2>
                <HistoryView session={session} />
              </>
            )}
            {activeView === "settings" && (
              <div className="max-w-md space-y-4">
                <h2 className="text-xl font-black text-white mb-6">⚙️ 설정</h2>
                <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-gray-400">이메일</span><span className="text-white">{session?.user?.email}</span></div>
                  {userPlan && <div className="flex justify-between text-sm"><span className="text-gray-400">플랜</span><span className="font-bold text-white capitalize">{userPlan}</span></div>}
                  {balance !== null && <div className="flex justify-between text-sm"><span className="text-gray-400">크레딧</span><span className="font-black text-cyan-400">💎 {balance.toLocaleString()} CR</span></div>}
                </div>
              </div>
            )}
            {activeView === "admin" && (
              <AdminView session={session} supabase={supabase} />
            )}
            {activeView === "partner" && (
              <PartnerView session={session} supabase={supabase} />
            )}
          </div>
        )}
        {/* 영상 생성 뷰 — generator일 때만 표시 */}
        {activeView === "generator" && <>
        <div className="border-b border-gray-800 px-8 py-4 flex items-center justify-between">
          <StageBar current={stage} onSelect={(s) => setStage(s)} />
          {balance !== null && (
            <div className="shrink-0 ml-4 rounded-full bg-gray-800 px-4 py-1.5 text-sm font-bold text-cyan-400">
              💎 {balance.toLocaleString()} CR
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-0">

          {/* ── STAGE 1 ── */}
          <StagePanel n={1} title="영상 분석" subtitle="URL 입력 → 관련 TikTok 클립 검색 → 담기" current={stage}>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-300">쇼핑 릴스 / 쇼츠 URL</label>
                <div className="flex gap-3">
                  <input type="url" value={sourceUrl}
                    onChange={e => { setSourceUrl(e.target.value); setClips([]); setCart(new Set()); }}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="https://www.tiktok.com/@... 또는 https://www.instagram.com/reel/..."
                    disabled={searching}
                    className="flex-1 rounded-xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 transition" />
                  <button onClick={handleSearch} disabled={searching || !sourceUrl.trim()}
                    className="shrink-0 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-white hover:bg-cyan-400 disabled:opacity-40 transition flex items-center gap-2">
                    {searching
                      ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />분석 중...</>
                      : "🔍 분석 시작 (10 CR)"}
                  </button>
                </div>
                {searchError && <p className="mt-2 text-sm text-red-400">{searchError}</p>}
                {searching && (
                  <div className="mt-3 rounded-xl bg-gray-800 px-4 py-3 text-sm text-gray-300 flex items-center gap-3">
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                    영상 분석 후 TikTok 클립 검색 중... (30초~2분 소요)
                  </div>
                )}
              </div>

              {clips.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-white">
                      검색 결과 <span className="text-gray-400 font-normal">{clips.length}개</span>
                    </span>
                    <span className="text-sm font-bold text-cyan-400">{cart.size}개 담음</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                    {clips.map(clip => (
                      <ClipCard key={clip.video_id} clip={clip}
                        selected={cart.has(clip.video_id)} onToggle={() => toggleCart(clip.video_id)} />
                    ))}
                  </div>
                  {cart.size > 0 && (
                    <>
                      <FloatingNext label={`다음 (${cart.size}개)`} onClick={() => setStage(2)} />
                    </>
                  )}
                </div>
              )}
            </div>
          </StagePanel>

          {/* ── STAGE 2 ── */}
          <StagePanel n={2} title="영상 선택" subtitle="대본 스타일과 영상 길이를 설정하세요" current={stage}>
            <div className="space-y-6">
              <StyleSelector selected={styleProfileId} onSelect={setStyleProfileId} session={session} />

              <div>
                <label className="mb-3 block text-sm font-bold text-gray-300">영상 길이</label>
                <div className="flex gap-2">
                  {[
                    { s: 10, desc: "숏 / 2~3 클립" },
                    { s: 15, desc: "기본 / 4~5 클립" },
                    { s: 20, desc: "미들 / 5~6 클립" },
                    { s: 30, desc: "롱 / 6+ 클립" },
                  ].map(({ s, desc }) => (
                    <button key={s} onClick={() => setTargetSeconds(s)}
                      className={`flex-1 rounded-xl border py-3 text-center transition ${
                        targetSeconds === s
                          ? "border-cyan-500 bg-cyan-500/10"
                          : "border-gray-700 hover:border-gray-500"
                      }`}>
                      <p className={`text-sm font-black ${targetSeconds === s ? "text-cyan-400" : "text-white"}`}>{s}초</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {stage === 2 && <FloatingPrev onClick={() => setStage(1)} />}
              {stage === 2 && <FloatingNext label="다음" onClick={() => setStage(3)} />}
            </div>
          </StagePanel>

          {/* ── STAGE 3 ── */}
          <StagePanel n={3} title="컷편집 & 대본 생성" subtitle="AI가 대본을 작성하고 클립을 편집합니다" current={stage}>
            <div className="space-y-5">

              {/* 댓글 유도 단어 (CTA) */}
              <div className="space-y-2">
                <p className="text-sm font-black text-white">댓글 유도 단어 (CTA)</p>
                <p className="text-xs text-gray-400">
                  대본 마지막 자막이 "댓글에 OO 남겨주시면 링크 보내드릴게요" 형태로 자동 생성됩니다.<br/>
                  비워두면 "프로필 링크를 확인하세요" 로 마무리됩니다.
                </p>
                <input value={ctaText} onChange={e => setCtaText(e.target.value)}
                  placeholder="예: 관심, 💚, 알려줘 (선택)"
                  className="w-full rounded-xl bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500 transition" />
                <p className="text-xs text-cyan-500">
                  {ctaText.trim()
                    ? `→ "댓글에 ${ctaText.trim()} 남겨주시면 링크 보내드릴게요"`
                    : `→ "프로필 링크를 확인하세요"`}
                </p>
              </div>

              {/* 대본 생성 결과 */}
              {scriptLoading && (
                <div className="rounded-xl bg-gray-800 p-5 flex items-center gap-4">
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">대본 생성 중...</p>
                    <p className="text-xs text-gray-400 mt-0.5">클립 분석 → 대본 작성 → 컷 분배 (30~60초)</p>
                  </div>
                </div>
              )}

              {script && (
                <div className="rounded-xl bg-gray-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-white">생성된 대본 ({script.length}개 세그먼트)</p>
                    <button onClick={handleRegenerateScript} disabled={scriptLoading}
                      className="text-xs text-gray-400 hover:text-cyan-400 transition flex items-center gap-1">
                      🔄 재생성
                      {freeRegen > 0
                        ? <span className="text-green-400">({freeRegen}회 무료)</span>
                        : <span className="text-gray-500">(20 CR)</span>}
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {script.map((seg, i) => (
                      <div key={i} className="flex gap-2 text-sm items-baseline">
                        <span className="shrink-0 text-cyan-400 font-black text-xs w-5">{i+1}</span>
                        <span className="text-gray-200 flex-1">{seg.text || seg.sentence}</span>
                        <span className="shrink-0 text-gray-500 text-xs">{seg.duration_sec}s</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {scriptError && <p className="text-sm text-red-400">{scriptError}</p>}

              {/* 대본 생성 버튼 */}
              {!script && !scriptLoading && (
                <button onClick={handleGenerateScript} disabled={scriptLoading}
                  className="w-full rounded-xl bg-gray-700 hover:bg-gray-600 border border-gray-600 py-3.5 text-sm font-black text-white disabled:opacity-50 transition flex items-center justify-center gap-2">
                  {scriptLoading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>&nbsp;생성 중...</> : "📄 대본 생성 (20 CR)"}
                </button>
              )}

              {stage === 3 && <FloatingPrev onClick={() => setStage(2)} />}
              {script && stage === 3 && <FloatingNext label="다음" onClick={() => setStage(4)} />}
            </div>
          </StagePanel>

          {/* ── STAGE 4 ── */}
          {stage === 4 && (
            <div className="rounded-2xl border border-cyan-500/50 bg-gray-900 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
              <div className="px-6 py-4 flex items-center gap-3 border-b border-gray-800">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400">4</div>
                <div>
                  <p className="text-sm font-black text-white">스타일</p>
                  <p className="text-xs text-gray-500 mt-0.5">자막과 썸네일 스타일을 설정하세요</p>
                </div>
              </div>
              <div className="p-6">
                <Stage4Panel
                  subtitleStyle={subtitleStyle} setSubtitleStyle={setSubtitleStyle}
                  thumbnailStyle={thumbnailStyle} setThumbnailStyle={setThumbnailStyle}
                  showThumbnail={showThumbnail} setShowThumbnail={setShowThumbnail}
                  previewFrames={clips.filter(c => cart.has(c.video_id)).slice(0,5).map(c => c.thumbnail_url).filter(Boolean) as string[]}
                  previewScript={script ? script.map(s => s.text || s.sentence || "").filter(Boolean) : []}
                  session={session}
                  onNext={() => setStage(5)}
                />
              </div>
            </div>
          )}
          {stage === 4 && <FloatingPrev onClick={() => setStage(3)} />}
          {stage === 4 && <FloatingNext label="다음" onClick={() => setStage(5)} />}

          {/* ── STAGE 5 ── */}
          <StagePanel n={5} title="음성 프리뷰" subtitle="TTS 음성을 생성하고, 영상과 동기 재생하여 자막 타이밍을 확인하세요." current={stage}>
            <div className="flex gap-6">
              {/* 좌측: 음성 옵션 + 장면별 편집 */}
              <div className="flex-1 min-w-0 space-y-5">

                {/* 음성 옵션 */}
                <div className="rounded-xl bg-gray-800 p-4 space-y-4">
                  <p className="text-sm font-bold text-white">음성 옵션</p>
                  <VoicePanel voiceId={voiceId} setVoiceId={setVoiceId}
                    voiceSpeed={voiceSpeed} setVoiceSpeed={setVoiceSpeed}
                    voiceVolume={voiceVolume} setVoiceVolume={setVoiceVolume} />
                </div>

                {/* 음성 생성 버튼 */}
                <button onClick={handleVoiceGenerate} disabled={!script || voiceLoading}
                  className="w-full rounded-xl bg-cyan-500/10 border border-cyan-500/30 py-3 text-sm font-black text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-40 transition flex items-center justify-center gap-2">
                  {voiceLoading
                    ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />생성 중...</>
                    : <>🔊 음성 생성 ({VOICES_PRO.some(v => v.id === voiceId) ? "20 CR" : "무료"})</>}
                </button>
                {voiceError && <p className="text-xs text-red-400">{voiceError}</p>}

                {/* 힌트 */}
                <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 p-3">
                  <p className="text-xs text-yellow-300">
                    💡 마지막 대사가 끝난 뒤에도 영상이 좀 더 이어질 수 있어요.<br/>
                    음성이 끝난 후 무음 부분이 길면, 아래 자막 목록에서 영상 길이를 줄이거나 클립을 짧게 잘라 마무리해주세요.
                  </p>
                </div>

                {/* 사용 안 된 클립 */}
                {voiceGenerated && clips.filter(c => !cart.has(c.video_id)).length > 0 && (
                  <button className="w-full rounded-xl border border-gray-700 py-2.5 text-sm text-gray-400 hover:text-white transition">
                    사용 안 된 클립 {clips.filter(c => !cart.has(c.video_id)).length}개
                  </button>
                )}

                {/* 장면별 편집 */}
                {voiceSegments.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-white">장면별 편집</p>
                      <button onClick={handleVoiceGenerate}
                        className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 transition">
                        🔀 자동 분배
                      </button>
                    </div>
                    {voiceSegments.map((clip, ci) => (
                      <div key={ci} className="rounded-xl bg-gray-800 border border-gray-700 overflow-hidden">
                        <div className="px-4 py-2.5 bg-gray-700/50 flex items-center justify-between">
                          <span className="text-xs font-black text-white">
                            영상 #{ci+1} {clip.clip_title} ({clip.clip_duration?.toFixed(1)}초)
                          </span>
                          <div className="flex gap-1.5">
                            <button className="rounded-lg border border-gray-600 px-2 py-1 text-xs text-gray-400 hover:text-white">영상 변경</button>
                            <button className="rounded-lg border border-gray-600 px-2 py-1 text-xs text-gray-400 hover:text-white">복사</button>
                            <button className="text-gray-600 hover:text-red-400 text-sm">✕</button>
                          </div>
                        </div>
                        {clip.segments.map((seg: any, si: number) => (
                          <div key={si} className="px-4 py-2 border-t border-gray-700/50 flex items-center gap-2 text-xs">
                            <span className="text-cyan-400 font-bold w-6 shrink-0">#{seg.idx+1}</span>
                            <span className="flex-1 text-gray-200 truncate">{seg.text}</span>
                            <span className="text-gray-500 shrink-0">(음성 없음)</span>
                            <div className="flex gap-0.5 shrink-0">
                              <button className="text-gray-600 hover:text-white px-1">▲</button>
                              <button className="text-gray-600 hover:text-white px-1">▼</button>
                              <button className="text-gray-600 hover:text-red-400 px-1">✕</button>
                            </div>
                          </div>
                        ))}
                        <div className="px-4 py-2 border-t border-gray-700/50 text-xs text-gray-500">
                          음성 없음 / 영상 {clip.clip_duration?.toFixed(1)}초
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 우측: 동기 프리뷰 */}
              <div className="w-56 shrink-0">
                <p className="text-xs font-bold text-gray-400 mb-2 text-center">동기 프리뷰</p>
                <SyncPreview voiceSegments={voiceSegments}
                  clips={clips.filter(c => cart.has(c.video_id))} />
              </div>
            </div>

            {stage === 5 && <FloatingPrev onClick={() => setStage(4)} />}
            {stage === 5 && <FloatingNext label="다음" onClick={() => setStage(6)} />}
          </StagePanel>

          {/* ── STAGE 6 ── */}
          <StagePanel n={6} title="SEO + 내보내기" subtitle="AI가 제목·설명·태그를 추천한 뒤 최종 mp4를 저장합니다." current={stage}>
            <div className="space-y-4">

              {/* 상단 버튼 */}
              <div className="flex gap-2 justify-end">
                <button onClick={handleSeoGenerate} disabled={seoLoading}
                  className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-black text-white hover:opacity-90 disabled:opacity-50 transition flex items-center gap-1.5">
                  {seoLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "✨"} AI 추천 생성
                </button>
                <button onClick={() => {
                  const text = `${seoTitle}

${seoDesc}

${seoTags}`;
                  navigator.clipboard.writeText(text);
                }} className="rounded-xl border border-gray-700 px-4 py-2 text-sm font-bold text-gray-300 hover:text-white hover:border-gray-500 transition flex items-center gap-1.5">
                  📋 복사
                </button>
              </div>

              {/* 영상 제목 */}
              <div className="rounded-xl border border-gray-700 overflow-hidden">
                <div className="px-4 pt-3 pb-1 flex justify-between items-center">
                  <p className="text-xs font-bold text-white">영상 제목</p>
                  <p className="text-xs text-gray-500">{seoTitle.length} / 100</p>
                </div>
                <input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} maxLength={100}
                  placeholder="제목을 입력하거나 [AI 추천 생성] 클릭"
                  className="w-full bg-transparent px-4 py-2.5 text-sm text-white outline-none placeholder-gray-600" />
                {seoTitle && <p className="px-4 pb-2 text-xs text-cyan-400 cursor-pointer hover:underline">추천 제목 (클릭으로 적용)</p>}
              </div>

              {/* 영상 설명 */}
              <div className="rounded-xl border border-gray-700 overflow-hidden">
                <div className="px-4 pt-3 pb-1 flex justify-between items-center">
                  <p className="text-xs font-bold text-white">영상 설명</p>
                  <p className="text-xs text-gray-500">{seoDesc.length} / 5000</p>
                </div>
                <textarea value={seoDesc} onChange={e => setSeoDesc(e.target.value)} maxLength={5000} rows={5}
                  placeholder="영상 설명..."
                  className="w-full bg-transparent px-4 py-2.5 text-sm text-white outline-none resize-none placeholder-gray-600" />
              </div>

              {/* 태그 */}
              <div className="rounded-xl border border-gray-700 overflow-hidden">
                <div className="px-4 pt-3 pb-1">
                  <p className="text-xs font-bold text-white">태그 (# 또는 , 구분)</p>
                </div>
                <input value={seoTags} onChange={e => setSeoTags(e.target.value)}
                  placeholder="예: #쇼츠 #꿀팁 #일상"
                  className="w-full bg-transparent px-4 py-2.5 text-sm text-white outline-none placeholder-gray-600" />
              </div>

              {/* 최종 영상 내보내기 */}
              <div className="rounded-xl border-2 border-gray-600 bg-gray-800/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">📥</span>
                  <p className="text-sm font-black text-white">최종 영상 내보내기</p>
                </div>

                {currentJob?.status === "succeeded" && currentJob.output_url ? (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-3 flex items-center gap-2">
                      <span className="text-green-400">✅</span>
                      <p className="text-sm text-green-400 font-bold">영상 생성 완료!</p>
                    </div>
                    <a href={currentJob.output_url} target="_blank" rel="noopener"
                      className="block w-full rounded-xl bg-cyan-500 py-3 text-center text-sm font-extrabold text-white hover:bg-cyan-400 transition">
                      ⬇ 완성본 다운로드
                    </a>
                  </div>
                ) : currentJob?.status === "processing" ? (
                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 flex items-center gap-3">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent shrink-0" />
                    <p className="text-sm text-blue-400 font-bold">🎬 영상 생성 중... (수 분 소요)</p>
                  </div>
                ) : (
                  <button onClick={handleRender} disabled={rendering}
                    className="w-full rounded-xl bg-green-500 py-3.5 text-base font-extrabold text-white hover:bg-green-400 disabled:opacity-40 transition flex items-center justify-center gap-2">
                    {rendering
                      ? <><span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />요청 중...</>
                      : "⬇ 내보내기 시작 (50 CR)"}
                  </button>
                )}

                {renderError && <p className="text-sm text-red-400">{renderError}</p>}
              </div>

              {currentJob?.status === "succeeded" && (
                <button onClick={() => {
                  setStage(1); setClips([]); setCart(new Set()); setScript(null); setCurrentJobId("");
                }} className="text-sm text-gray-400 hover:text-white transition underline underline-offset-2">
                  + 새 영상 만들기
                </button>
              )}
            </div>

            {stage === 6 && <FloatingPrev onClick={() => setStage(5)} />}
          </StagePanel>

          </div>
        </div>
        </> /* generator view end */}
      </div>
    </div>
  );
}

// ── Stage Bar ─────────────────────────────────────────────────
const STAGE_LABELS = ["영상 분석", "영상 선택", "컷편집 & 대본 생성", "스타일", "보이스", "SEO + 내보내기"];
// ── 플로팅 다음 버튼 ──────────────────────────────────────────
// ── VoicePanel ───────────────────────────────────────────────
const VOICE_PREVIEW_URL = "https://oxygqtbdpnxxcgzwdlzi.supabase.co/functions/v1/voice-preview";

function VoicePanel({ voiceId, setVoiceId, voiceSpeed, setVoiceSpeed, voiceVolume, setVoiceVolume }: {
  voiceId: string; setVoiceId: (v: string) => void;
  voiceSpeed: number; setVoiceSpeed: (v: number) => void;
  voiceVolume: number; setVoiceVolume: (v: number) => void;
}) {
  const isProVoice = (id: string) => VOICES_PRO.some(v => v.id === id);
  const [tab, setTab] = useState<"basic"|"pro">(isProVoice(voiceId) ? "pro" : "basic");
  const [previewing, setPreviewing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePreview = async () => {
    if (previewing) { audioRef.current?.pause(); setPreviewing(false); return; }
    try {
      setPreviewing(true);
      const engine = tab === "pro" ? "elevenlabs" : "openai";
      const resp = await fetch(VOICE_PREVIEW_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: voiceId, engine }),
      });
      if (!resp.ok) throw new Error("미리듣기 실패");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPreviewing(false); URL.revokeObjectURL(url); };
      audio.play();
    } catch (e) { console.error(e); setPreviewing(false); }
  };

  const handleSetVoiceId = (id: string) => {
    setVoiceId(id);
    localStorage.setItem("chronit_voice_id", id);
  };
  const handleSetSpeed = (v: number) => { setVoiceSpeed(v); localStorage.setItem("chronit_voice_speed", String(v)); };
  const handleSetVolume = (v: number) => { setVoiceVolume(v); localStorage.setItem("chronit_voice_volume", String(v)); };

  return (
    <div className="space-y-5">
      {/* 탭 + 미리듣기 */}
      <div className="flex gap-2 items-center">
        {([["basic","일반 음성"],["pro","고급 음성"]] as [string,string][]).map(([v,l]) => (
          <button key={v} onClick={() => setTab(v as any)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition border ${tab===v ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
            {v === "pro" ? "✨ " : ""}{l}
          </button>
        ))}
        <button onClick={handlePreview}
          className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition border ${previewing ? "border-cyan-500 bg-cyan-500/10 text-cyan-400 animate-pulse" : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"}`}>
          {previewing ? "⏸" : "▶"} 미리듣기
        </button>
      </div>

      {/* 음성 목록 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {(tab === "basic" ? VOICES_BASIC : VOICES_PRO).map(v => (
          <button key={v.id} onClick={() => {
            handleSetVoiceId(v.id);
          }}
            className={`rounded-xl border px-4 py-3 text-left transition ${voiceId===v.id ? "border-cyan-500 bg-cyan-500/10" : "border-gray-700 hover:border-gray-500"}`}>
            <p className={`text-sm font-bold ${voiceId===v.id ? "text-cyan-400" : "text-white"}`}>{v.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{v.desc}</p>
            {tab === "pro" && EL_FEMALE_IDS.has(v.id) && (
              <p className="text-xs text-cyan-600 mt-0.5">볼륨 ×1.5 자동 적용</p>
            )}
          </button>
        ))}
      </div>

      {/* 속도 + 볼륨 */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-300">
            말하기 속도 <span className="text-cyan-400 font-black">{voiceSpeed}%</span>
          </label>
          <input type="range" min={80} max={160} step={5} value={voiceSpeed}
            onChange={e => handleSetSpeed(Number(e.target.value))} className="w-full accent-cyan-500" />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>느림</span><span>기본</span><span>빠름</span>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-300">
            소리 크기 <span className="text-cyan-400 font-black">{voiceVolume}%</span>
          </label>
          <input type="range" min={50} max={150} step={5} value={voiceVolume}
            onChange={e => setVoiceVolume(Number(e.target.value))} className="w-full accent-cyan-500" />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>작게</span><span>기본</span><span>크게</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingPrev({ onClick }: { onClick: () => void }) {
  return (
    <div className="fixed bottom-24 right-[152px] z-40" style={{ bottom: "96px" }}>
      <button onClick={onClick}
        className="rounded-2xl bg-gray-700 shadow-lg px-5 py-3 text-sm font-black text-white hover:bg-gray-600 transition flex items-center gap-2"
        style={{ height: "46px" }}>
        <span>←</span><span>이전</span>
      </button>
    </div>
  );
}

function FloatingNext({ label, onClick, disabled = false }: {
  label: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <div className="fixed bottom-24 right-4 z-40" style={{ bottom: "96px" }}>
      <button onClick={onClick} disabled={disabled}
        className="rounded-2xl bg-cyan-500 shadow-2xl shadow-cyan-500/40 px-6 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:opacity-40 transition flex items-center gap-2"
        style={{ height: "46px" }}>
        <span>{label}</span><span>→</span>
      </button>
    </div>
  );
}

// ── Stage 4 Panel ────────────────────────────────────────────
const FONTS = [
  { label: "Noto Sans KR",  value: "'Noto Sans KR', sans-serif" },
  { label: "나눔고딕",       value: "'Nanum Gothic', sans-serif" },
  { label: "나눔명조",       value: "'NanumMyeongjo', serif" },
  { label: "Pretendard",    value: "'Pretendard', sans-serif" },
  { label: "블랙한산스",     value: "'Black Han Sans', sans-serif" },
  { label: "주아체",         value: "'Jua', sans-serif" },
  { label: "도현체",         value: "'Do Hyeon', sans-serif" },
];

type SubtitleStyle = {
  fontFamily: string; color: string; fontSize: number;
  fontWeight: "400"|"700"|"900";
  strokeColor: string; strokeWidth: number; strokeOn: boolean;
  bgOn: boolean; bgColor: string; bgOpacity: number;
  yPos: number; xPos: number;
};

function Stage4Panel({ subtitleStyle, setSubtitleStyle, thumbnailStyle, setThumbnailStyle, showThumbnail, setShowThumbnail, previewFrames, previewScript, session, onNext }: {
  subtitleStyle: SubtitleStyle; setSubtitleStyle: (v: SubtitleStyle) => void;
  thumbnailStyle: SubtitleStyle; setThumbnailStyle: (v: SubtitleStyle) => void;
  showThumbnail: boolean; setShowThumbnail: (v: boolean) => void;
  previewFrames: string[]; previewScript: string[]; session: any; onNext: () => void;
}) {
  const [tab, setTab] = useState<"subtitle"|"thumbnail">("subtitle");
  const [frameIdx, setFrameIdx] = useState(0);
  const [scriptIdx, setScriptIdx] = useState(0);
  const [presets, setPresets] = useState<any[]>([]);
  const [presetName, setPresetName] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const SB_URL = "https://oxygqtbdpnxxcgzwdlzi.supabase.co";
  const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWdxdGJkcG54eGNnendkbHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTQ3MTIsImV4cCI6MjA5NTgzMDcxMn0.bHBnYJDRabumBJGtknRjkb63wm2nLI9IHYAaHTw5Qf8";

  const loadPresets = async () => {
    if (!session) return;
    const r = await fetch(`${SB_URL}/rest/v1/subtitle_presets?type=eq.${tab}&select=*&order=created_at.desc`, {
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: SB_ANON }
    });
    const d = await r.json(); setPresets(Array.isArray(d) ? d : []);
  };

  const savePreset = async (currentStyle: any, currentTab: string) => {
    if (!session || !presetName.trim()) return;
    const resp = await fetch(`${SB_URL}/rest/v1/subtitle_presets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: SB_ANON, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ user_id: session.user.id, name: presetName.trim(), type: currentTab, style_json: currentStyle })
    });
    if (resp.ok || resp.status === 201) {
      setPresetName(""); setShowPresets(false); loadPresets();
    } else {
      const err = await resp.text();
      console.error("프리셋 저장 실패:", resp.status, err);
    }
  };

  const deletePreset = async (id: string) => {
    if (!session) return;
    await fetch(`${SB_URL}/rest/v1/subtitle_presets?id=eq.${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: SB_ANON }
    });
    loadPresets();
  };

  React.useEffect(() => { if (showPresets) loadPresets(); }, [showPresets, tab]);

  const s = tab === "subtitle" ? subtitleStyle : thumbnailStyle;
  const setS = tab === "subtitle" ? setSubtitleStyle : setThumbnailStyle;
  const upd = (k: keyof SubtitleStyle, v: any) => setS({ ...s, [k]: v });

  const frame = previewFrames[frameIdx] || "";
  // 대본에서 프리뷰 문구 — 없으면 기본값
  const previewText = (previewScript.length > 0 ? previewScript[scriptIdx % previewScript.length] : null) || "와, 드디어";

  const makeTextShadow = (sw: number, sc: string) => {
    const d = sw;
    return `${-d}px ${-d}px 0 ${sc}, ${d}px ${-d}px 0 ${sc}, ${-d}px ${d}px 0 ${sc}, ${d}px ${d}px 0 ${sc}, 0 ${-d}px 0 ${sc}, 0 ${d}px 0 ${sc}, ${-d}px 0 0 ${sc}, ${d}px 0 0 ${sc}`;
  };
  const toTextStyle = (st: SubtitleStyle): React.CSSProperties => ({
    fontFamily: st.fontFamily,
    color: st.color,
    fontSize: `${st.fontSize}px`,
    fontWeight: st.fontWeight,
    textShadow: st.strokeOn ? makeTextShadow(st.strokeWidth, st.strokeColor) : undefined,
    lineHeight: 1.3,
    whiteSpace: "nowrap",
    display: "inline-block",
  });
  const toBgStyle = (st: SubtitleStyle): React.CSSProperties => st.bgOn ? {
    backgroundColor: `${st.bgColor}${Math.round(st.bgOpacity * 2.55).toString(16).padStart(2, "0")}`,
    padding: "4px 12px", borderRadius: "6px", display: "inline-block",
  } : { display: "inline-block" };

  const stylePanel = (
    <div className="space-y-4">
      {/* 글씨체 */}
      <div>
        <label className="text-xs font-bold text-gray-400 block mb-1.5">글씨체</label>
        <select value={s.fontFamily} onChange={e => upd("fontFamily", e.target.value)}
          className="w-full rounded-xl bg-gray-800 border border-gray-700 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
          style={{ fontFamily: s.fontFamily }}>
          {FONTS.map(f => <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>)}
        </select>
      </div>
      {/* 색상 + 두께 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-400 block mb-1.5">색상</label>
          <div className="flex items-center gap-2">
            <input type="color" value={s.color} onChange={e => upd("color", e.target.value)}
              className="h-9 w-12 rounded-lg cursor-pointer border border-gray-700" />
            <span className="text-xs text-gray-300 font-mono">{s.color.toUpperCase()}</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 block mb-1.5">두께</label>
          <div className="flex gap-1">
            {([["400","보통"],["700","굵게"]] as [string,string][]).map(([w,l]) => (
              <button key={w} onClick={() => upd("fontWeight", w as any)}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition border ${s.fontWeight===w ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" : "border-gray-700 text-gray-400"}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      {/* 크기 */}
      <div>
        <label className="text-xs font-bold text-gray-400 block mb-1.5">
          크기 <span className="text-cyan-400">{s.fontSize}px</span>
        </label>
        <input type="range" min={12} max={48} step={1} value={s.fontSize}
          onChange={e => upd("fontSize", Number(e.target.value))} className="w-full accent-cyan-500" />
      </div>
      {/* 위치 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-400 block mb-1.5">Y <span className="text-cyan-400">{s.yPos}%</span></label>
          <input type="range" min={5} max={95} value={s.yPos}
            onChange={e => upd("yPos", Number(e.target.value))} className="w-full accent-cyan-500" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 block mb-1.5">X <span className="text-cyan-400">{s.xPos}%</span></label>
          <input type="range" min={5} max={95} value={s.xPos}
            onChange={e => upd("xPos", Number(e.target.value))} className="w-full accent-cyan-500" />
        </div>
      </div>
      <button onClick={() => setS({ ...s, yPos: 75, xPos: 50 })}
        className="text-xs text-gray-500 hover:text-cyan-400 transition underline">↺ 위치 초기화</button>
      {/* 외곽선 */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-gray-400">외곽선</label>
          <button onClick={() => upd("strokeOn", !s.strokeOn)}
            className={`rounded-full px-3 py-1 text-xs font-black transition ${s.strokeOn ? "bg-cyan-500 text-white" : "bg-gray-700 text-gray-400"}`}>
            {s.strokeOn ? "ON" : "OFF"}
          </button>
        </div>
        {s.strokeOn && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="flex items-center gap-2">
              <input type="color" value={s.strokeColor} onChange={e => upd("strokeColor", e.target.value)}
                className="h-8 w-10 rounded cursor-pointer border border-gray-700" />
              <span className="text-xs text-gray-400 font-mono">{s.strokeColor.toUpperCase()}</span>
            </div>
            <div>
              <label className="text-xs text-gray-400">두께 {s.strokeWidth}px</label>
              <input type="range" min={1} max={8} step={0.5} value={s.strokeWidth}
                onChange={e => upd("strokeWidth", Number(e.target.value))} className="w-full accent-cyan-500 mt-1" />
            </div>
          </div>
        )}
      </div>
      {/* 배경 */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-gray-400">배경</label>
          <button onClick={() => upd("bgOn", !s.bgOn)}
            className={`rounded-full px-3 py-1 text-xs font-black transition ${s.bgOn ? "bg-cyan-500 text-white" : "bg-gray-700 text-gray-400"}`}>
            {s.bgOn ? "ON" : "OFF"}
          </button>
        </div>
        {s.bgOn && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="flex items-center gap-2">
              <input type="color" value={s.bgColor} onChange={e => upd("bgColor", e.target.value)}
                className="h-8 w-10 rounded cursor-pointer border border-gray-700" />
              <span className="text-xs text-gray-400 font-mono">{s.bgColor.toUpperCase()}</span>
            </div>
            <div>
              <label className="text-xs text-gray-400">불투명도 {s.bgOpacity}%</label>
              <input type="range" min={10} max={100} step={5} value={s.bgOpacity}
                onChange={e => upd("bgOpacity", Number(e.target.value))} className="w-full accent-cyan-500 mt-1" />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex gap-6 flex-col md:flex-row">
      {/* 왼쪽 설정 */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* 탭 */}
        <div className="flex gap-2">
          {(["subtitle","thumbnail"] as const).map(v => (
            <button key={v} onClick={() => setTab(v)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition border ${tab===v ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" : "border-gray-700 text-gray-400"}`}>
              {v === "subtitle" ? "자막 스타일" : "썸네일 스타일"}
            </button>
          ))}
        </div>

        {/* 내 대본 스타일 — 드롭다운 */}
        <div className="rounded-xl bg-gray-900 border border-gray-700 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-white">내 대본 스타일</p>
            <button onClick={() => loadPresets()}
              className="text-xs text-gray-500 hover:text-white transition px-1.5">⟳</button>
          </div>
          <div className="flex gap-2">
            <select
              value={""}
              onChange={e => {
                const p = presets.find(p => p.id === e.target.value);
                if (p) setS(p.style_json);
              }}
              className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
            >
              <option value="">✕  스타일 없음 (기본)</option>
              {presets.map(p => (
                <option key={p.id} value={p.id}>📌  {p.name}</option>
              ))}
            </select>
            <button onClick={() => setShowPresets(v => !v)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-bold transition ${showPresets ? "border-cyan-500 text-cyan-400 bg-cyan-500/10" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
              저장
            </button>
          </div>
          {/* 저장 폼 */}
          {showPresets && (
            <div className="flex gap-2 pt-1">
              <input value={presetName} onChange={e => setPresetName(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter") savePreset(s, tab); if (e.key==="Escape") setShowPresets(false); }}
                placeholder="프리셋 이름 입력"
                autoFocus
                className="flex-1 rounded-lg bg-gray-800 border border-cyan-500 px-3 py-1.5 text-xs text-white outline-none" />
              <button onClick={() => savePreset(s, tab)} disabled={!presetName.trim()}
                className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-400 disabled:opacity-40 transition">
                확인
              </button>
              <button onClick={() => setShowPresets(false)}
                className="rounded-lg border border-gray-700 px-2 py-1.5 text-xs text-gray-400">✕</button>
            </div>
          )}
          {/* 삭제 버튼 — 선택된 프리셋이 있을 때만 */}
          {presets.length > 0 && (
            <p className="text-xs text-gray-600">
              항목 위에서 삭제하려면 드롭다운에서 선택 후{" "}
              <button onClick={() => {
                const sel = (document.querySelector('select[data-preset]') as HTMLSelectElement)?.value;
                if (sel) deletePreset(sel);
              }} className="text-red-400 hover:text-red-300 underline">삭제</button>
            </p>
          )}
        </div>

        {tab === "subtitle" && stylePanel}

        {tab === "thumbnail" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {[true, false].map(v => (
                <button key={String(v)} onClick={() => setShowThumbnail(v)}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition ${showThumbnail===v ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" : "border-gray-700 text-gray-400"}`}>
                  {v ? "✓ 썸네일 추가" : "✗ 없음"}
                </button>
              ))}
            </div>
            {showThumbnail && stylePanel}
          </div>
        )}
      </div>

      {/* 오른쪽 프리뷰 */}
      <div className="flex flex-col items-center gap-3 shrink-0">
        <p className="text-xs font-bold text-gray-400">실시간 프리뷰</p>
        <div className="relative rounded-2xl overflow-hidden bg-gray-800 border border-gray-700"
          style={{ width: 300, height: 533 }}>
          {frame
            ? <img src={frame} className="absolute inset-0 w-full h-full object-cover" alt="" />
            : <div className="absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-900" />
          }
          <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
            <div style={{
              position: "absolute",
              top: `${s.yPos}%`,
              left: `${s.xPos}%`,
              transform: "translate(-50%, -50%)",
              maxWidth: "88%",
              textAlign: "center",
            }}>
              <span style={{ ...toTextStyle(s), ...toBgStyle(s) }}>{previewText}</span>
            </div>
          </div>
        </div>
        {previewFrames.length > 1 && (
          <div className="flex gap-1.5">
            {previewFrames.slice(0,5).map((_, i) => (
              <button key={i} onClick={() => setFrameIdx(i)}
                className={`h-2 w-2 rounded-full transition ${i===frameIdx ? "bg-cyan-400" : "bg-gray-600"}`} />
            ))}
          </div>
        )}
        {previewScript.length > 1 && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <button onClick={() => setScriptIdx(i => Math.max(0, i-1))} className="hover:text-white">‹</button>
            <span>{(scriptIdx % previewScript.length)+1}/{previewScript.length}</span>
            <button onClick={() => setScriptIdx(i => i+1)} className="hover:text-white">›</button>
          </div>
        )}
      </div>
    </div>
  );
}


// ── StyleLibrary ─────────────────────────────────────────────
function StyleLibrary({ onLoad, session }: { onLoad: (s:any)=>void; session: any }) {
  const [styles, setStyles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const resp = await fetch(
          "https://oxygqtbdpnxxcgzwdlzi.supabase.co/rest/v1/style_profiles?select=*&order=updated_at.desc",
          { headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWdxdGJkcG54eGNnendkbHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTQ3MTIsImV4cCI6MjA5NTgzMDcxMn0.bHBnYJDRabumBJGtknRjkb63wm2nLI9IHYAaHTw5Qf8",
          }}
        );
        const data = await resp.json();
        setStyles(Array.isArray(data) ? data : []);
      } catch { setStyles([]); }
      finally { setLoading(false); }
    })();
  }, [session]);

  if (loading) return <div className="text-xs text-gray-500 text-center py-8">불러오는 중...</div>;

  if (!styles.length) return (
    <div className="text-xs text-gray-500 text-center py-8">
      저장된 스타일이 없습니다.<br/>
      <span className="text-gray-600">4단계에서 스타일을 저장해보세요</span>
    </div>
  );

  return (
    <div className="space-y-2">
      {styles.map(s => (
        <div key={s.id} onClick={() => onLoad(s.profile_json ? JSON.parse(s.profile_json) : {})}
          className="rounded-xl border border-gray-700 p-2.5 cursor-pointer hover:border-cyan-500/50 transition">
          <p className="text-xs font-bold text-white truncate">{s.label || "스타일"}</p>
          {s.source_channel && <p className="text-xs text-gray-500">@{s.source_channel}</p>}
          <p className="text-xs text-gray-600">{new Date(s.updated_at).toLocaleDateString("ko")}</p>
        </div>
      ))}
    </div>
  );
}

// ── HistoryPanel ──────────────────────────────────────────────
function HistoryPanel({ session }: { session: any }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const resp = await fetch(
          "https://oxygqtbdpnxxcgzwdlzi.supabase.co/rest/v1/video_jobs?select=*&order=created_at.desc&limit=20",
          { headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWdxdGJkcG54eGNnendkbHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTQ3MTIsImV4cCI6MjA5NTgzMDcxMn0.bHBnYJDRabumBJGtknRjkb63wm2nLI9IHYAaHTw5Qf8",
          }}
        );
        const data = await resp.json();
        setJobs(Array.isArray(data) ? data : []);
      } catch { setJobs([]); }
      finally { setLoading(false); }
    })();
  }, [session]);

  const STATUS: Record<string, string> = { succeeded: "완료", processing: "생성 중", failed: "실패", queued: "대기" };

  if (loading) return <div className="text-xs text-gray-500 text-center py-8">불러오는 중...</div>;
  if (!jobs.length) return <div className="text-xs text-gray-500 text-center py-8">생성 내역이 없습니다</div>;

  return (
    <div className="space-y-2">
      {jobs.map(j => (
        <div key={j.id} className="rounded-xl border border-gray-700 p-2.5 space-y-1">
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs font-bold text-white truncate">{j.product_name || j.id?.slice(0,8)}</p>
            <span className={`text-xs font-bold shrink-0 ${
              j.status==="succeeded" ? "text-green-400" :
              j.status==="processing" ? "text-cyan-400 animate-pulse" : "text-gray-500"}`}>
              {STATUS[j.status] || j.status}
            </span>
          </div>
          {j.output_url && (
            <a href={j.output_url} target="_blank" rel="noopener"
              className="block text-xs text-cyan-500 hover:text-cyan-400 underline truncate">
              다운로드
            </a>
          )}
          <p className="text-xs text-gray-600">{new Date(j.created_at).toLocaleDateString("ko")}</p>
        </div>
      ))}
    </div>
  );
}

// ── NavSidebar — 좌측 좁은 탭 네비 ───────────────────────────
function NavSidebar({ activeView, onViewChange, userRole, balance, userPlan, session }: {
  activeView: string; onViewChange: (v:string)=>void; userRole: string;
  balance: number|null; userPlan: string|null; session: any;
}) {
  const NAV = [
    { v: "generator",    icon: "📁", label: "프로젝트" },
    { v: "style-finder", icon: "🔍", label: "스타일 찾기" },
    { v: "history",      icon: "📹", label: "생성 내역" },
    { v: "settings",     icon: "⚙️", label: "설정" },
    ...(userRole === "partner" || userRole === "super_admin"
      ? [{ v: "partner", icon: "📊", label: "파트너스" }] : []),
    ...(userRole === "super_admin"
      ? [{ v: "admin", icon: "👑", label: "관리자" }] : []),
  ];
  return (
    <div className="flex flex-col h-full">
      {/* 로고 */}
      <div className="px-5 py-5 border-b border-gray-800">
        <p className="text-sm font-black text-white tracking-tight">CHRONIT</p>
        <p className="text-xs text-gray-600 mt-0.5">쇼핑 릴스 자동화</p>
      </div>
      {/* 탭 */}
      <div className="px-2 py-3 space-y-0.5 flex-1">
        {NAV.map(({ v, icon, label }) => (
          <button key={v} onClick={() => onViewChange(v)}
            className={`w-full text-left rounded-xl px-3 py-2.5 text-sm font-bold transition flex items-center gap-2.5 ${activeView === v ? "bg-cyan-500/15 text-cyan-400" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
            <span>{icon}</span><span>{label}</span>
          </button>
        ))}
      </div>
      {/* 하단 계정/플랜/크레딧 */}
      <div className="border-t border-gray-800 px-4 py-3 space-y-1.5">
        <p className="text-xs text-gray-600 truncate">{session?.user?.email}</p>
        {userPlan && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">플랜</span>
            <span className="font-bold text-white capitalize">{userPlan}</span>
          </div>
        )}
        {balance !== null && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">크레딧</span>
            <span className="font-black text-cyan-400">💎 {balance.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ProjectPanel — 중간 패널 (탭별 내용) ─────────────────────
const PROJ_KEY = "chronit_projects_v2";
function getProjs(): any[] { try { return JSON.parse(localStorage.getItem(PROJ_KEY)||"[]"); } catch { return []; } }
function saveProjs(ps: any[]) { localStorage.setItem(PROJ_KEY, JSON.stringify(ps.slice(0,20))); }

function ProjectPanel({ activeView, current, onLoad, onReset, session, styleProfileId, onSelectStyle }: {
  activeView: string; current: any; onLoad: (d:any)=>void; onReset: ()=>void;
  session: any; styleProfileId: string; onSelectStyle: (id:string)=>void;
}) {
  const [projects, setProjects] = useState<any[]>(() => getProjs());
  const [activeId, setActiveId] = useState<string|null>(() => localStorage.getItem("chronit_active_proj") || null);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [newName, setNewName] = useState<string|null>(null);
  const STAGE_LABELS = ["영상 분석","영상 선택","대본 생성","스타일","보이스","완료"];

  const createProject = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (getProjs().some(p => p.name === trimmed)) { alert(`"${trimmed}" 이름이 이미 있습니다.`); return; }

    // 현재 진행 중인 작업이 있으면 자동 저장
    if (activeId && current && (current.stage > 1 || (current.clips && current.clips.length > 0))) {
      const updated = getProjs().map(p => p.id === activeId
        ? { ...p, savedAt: Date.now(), stage: current.stage, data: current } : p);
      saveProjs(updated); setProjects(updated);
    }

    const id = `proj_${Date.now()}`;
    const entry = { id, name: trimmed, savedAt: Date.now(), stage: 1, data: {} };
    const ps = [entry, ...getProjs()];
    saveProjs(ps); setProjects(ps); setActiveId(id);
    localStorage.setItem("chronit_active_proj", id);
    onReset(); // 화면은 초기화하되 이전 프로젝트는 저장됨
    setNewName(null);
  };

  const saveProject = () => {
    if (!activeId) { setNewName(""); return; }
    const ps = getProjs().map(p => p.id === activeId
      ? { ...p, savedAt: Date.now(), stage: current.stage, data: current } : p);
    saveProjs(ps); setProjects(ps);
  };

  const loadProject = (p: any) => {
    onLoad(p.data || {});
    setActiveId(p.id);
    localStorage.setItem("chronit_active_proj", p.id);
  };

  const delProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ps = getProjs().filter(p => p.id !== id);
    saveProjs(ps); setProjects(ps);
    if (activeId === id) { setActiveId(null); localStorage.removeItem("chronit_active_proj"); }
  };

  const renameProject = (id: string, name: string) => {
    const ps = getProjs().map(p => p.id === id ? { ...p, name: name.trim() || p.name } : p);
    saveProjs(ps); setProjects(ps); setEditingId(null);
  };

  if (activeView === "generator") return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-800 flex items-center justify-between">
        <p className="text-xs font-black text-white">프로젝트</p>
        <button onClick={saveProject} className="text-xs text-gray-500 hover:text-cyan-400 transition">💾</button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {/* 새 프로젝트 */}
        {newName === null ? (
          <button onClick={() => setNewName("")}
            className="w-full rounded-xl bg-cyan-500 py-2 text-xs font-black text-white hover:bg-cyan-400 transition">
            + 새 프로젝트
          </button>
        ) : (
          <div className="space-y-1.5">
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key==="Enter") createProject(newName); if (e.key==="Escape") setNewName(null); }}
              placeholder="프로젝트 이름"
              className="w-full rounded-xl bg-gray-800 border border-cyan-500 px-3 py-2 text-xs text-white outline-none" />
            <div className="flex gap-1.5">
              <button onClick={() => createProject(newName)} className="flex-1 rounded-lg bg-cyan-500 py-1.5 text-xs font-black text-white">확인</button>
              <button onClick={() => setNewName(null)} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400">✕</button>
            </div>
          </div>
        )}
        {/* 프로젝트 목록 */}
        {projects.length === 0
          ? <p className="text-xs text-gray-600 text-center py-6">저장된 프로젝트가 없습니다</p>
          : projects.map(p => (
            <div key={p.id} onClick={() => loadProject(p)}
              className={`rounded-xl border p-2.5 cursor-pointer transition group ${activeId===p.id ? "border-cyan-500 bg-cyan-500/10" : "border-gray-700 hover:border-gray-500"}`}>
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0 flex-1">
                  {editingId === p.id ? (
                    <input autoFocus defaultValue={p.name}
                      className="w-full bg-gray-800 text-xs font-bold text-white rounded px-1 py-0.5 outline-none border border-cyan-500"
                      onBlur={e => renameProject(p.id, e.target.value)}
                      onKeyDown={e => { if (e.key==="Enter") renameProject(p.id, (e.target as HTMLInputElement).value); }}
                      onClick={e => e.stopPropagation()} />
                  ) : (
                    <p className="text-xs font-bold text-white truncate">{p.name}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">{STAGE_LABELS[(p.stage||1)-1]} · {new Date(p.savedAt).toLocaleDateString("ko")}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                  <button onClick={e=>{e.stopPropagation();setEditingId(p.id);}} className="text-gray-500 hover:text-cyan-400 text-xs">✎</button>
                  <button onClick={e=>delProject(p.id,e)} className="text-gray-500 hover:text-red-400 text-xs">✕</button>
                </div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );

  if (activeView === "style-finder") return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-800">
        <p className="text-xs font-black text-white">스타일 찾기</p>
        <p className="text-xs text-gray-500 mt-0.5">URL → AI 분석 → 저장</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <StyleLibraryList session={session} onSelect={onSelectStyle} selectedId={styleProfileId} />
      </div>
    </div>
  );

  return (
    <div className="px-4 py-4">
      <p className="text-xs font-black text-white capitalize">{activeView}</p>
    </div>
  );
}

// ── SyncPreview — 클립 영상 + TTS 오디오 동기 재생 ──────────
function SyncPreview({ voiceSegments, clips }: { voiceSegments: any[]; clips: any[] }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRefs = React.useRef<HTMLAudioElement[]>([]);
  const [playing, setPlaying] = React.useState(false);
  const [currentClipIdx, setCurrentClipIdx] = React.useState(0);

  const currentClip = clips[currentClipIdx] || null;
  const currentVoiceClip = voiceSegments[currentClipIdx] || null;
  const firstAudioUrl = currentVoiceClip?.segments?.[0]?.audio_url || null;

  const handlePlay = async () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      audioRefs.current.forEach(a => a.pause());
      setPlaying(false);
      return;
    }
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setPlaying(true);

    // 세그먼트 오디오 순차 재생
    if (currentVoiceClip?.segments) {
      let delay = 0;
      for (const seg of currentVoiceClip.segments) {
        if (!seg.audio_url) { delay += (seg.duration || 2) * 1000; continue; }
        await new Promise(resolve => setTimeout(resolve, delay));
        const audio = new Audio(seg.audio_url);
        audio.play().catch(() => {});
        delay = 0;
        await new Promise(resolve => {
          audio.onended = resolve;
          audio.onerror = resolve;
        });
      }
    }
    setPlaying(false);
  };

  return (
    <div className="space-y-2">
      <div className="rounded-xl bg-gray-800 border border-gray-700 overflow-hidden"
        style={{ aspectRatio: "9/16", position: "relative" }}>
        {currentClip?.thumbnail_url ? (
          <video ref={videoRef} src={currentClip.video_url || ""}
            poster={currentClip.thumbnail_url}
            className="absolute inset-0 w-full h-full object-cover"
            muted playsInline />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <p className="text-xs text-gray-500 text-center px-4">
              {voiceSegments.length > 0 ? "클립 선택 필요" : "음성 생성 후 재생 가능"}
            </p>
          </div>
        )}
      </div>

      {/* 클립 선택 탭 */}
      {voiceSegments.length > 1 && (
        <div className="flex gap-1 overflow-x-auto">
          {voiceSegments.map((_, i) => (
            <button key={i} onClick={() => { setCurrentClipIdx(i); setPlaying(false); }}
              className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold transition ${currentClipIdx===i ? "bg-cyan-500 text-white" : "bg-gray-800 text-gray-400"}`}>
              #{i+1}
            </button>
          ))}
        </div>
      )}

      <button onClick={handlePlay}
        className="w-full rounded-xl border border-gray-700 py-2 text-xs font-bold text-gray-300 hover:text-white hover:border-gray-500 transition flex items-center justify-center gap-1.5">
        {playing ? "⏸ 일시정지" : "▶ 동기 재생"}
      </button>

      {/* 세그먼트 타임라인 */}
      {currentVoiceClip && (
        <div className="space-y-1">
          {currentVoiceClip.segments?.map((seg: any) => (
            <div key={seg.idx} className="flex items-center gap-1.5 text-xs">
              <span className="text-cyan-400 font-bold w-5 shrink-0">#{seg.idx+1}</span>
              <span className="flex-1 text-gray-300 truncate">{seg.text}</span>
              <span className={`shrink-0 ${seg.audio_url ? "text-green-400" : "text-gray-600"}`}>
                {seg.duration?.toFixed(1)}s
              </span>
            </div>
          ))}
          <p className="text-xs text-gray-500 pt-1">
            사용 시간: {currentVoiceClip.used_duration?.toFixed(1)}s / {currentVoiceClip.clip_duration?.toFixed(1)}s
          </p>
        </div>
      )}
    </div>
  );
}

// ── StyleLibraryList — 저장된 스타일 목록 ───────────────────
function StyleLibraryList({ session, onSelect, selectedId }: { session: any; onSelect: (id:string)=>void; selectedId: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    if (!session) return;
    (async () => {
      const r = await fetch("https://oxygqtbdpnxxcgzwdlzi.supabase.co/rest/v1/style_profiles?select=*&order=updated_at.desc",
        { headers: { Authorization: `Bearer ${session.access_token}`, apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWdxdGJkcG54eGNnendkbHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTQ3MTIsImV4cCI6MjA5NTgzMDcxMn0.bHBnYJDRabumBJGtknRjkb63wm2nLI9IHYAaHTw5Qf8" }});
      const d = await r.json(); setItems(Array.isArray(d) ? d : []);
    })();
  }, [session]);
  if (!items.length) return <p className="text-xs text-gray-600 text-center py-6">저장된 스타일이 없습니다</p>;
  return (
    <div className="space-y-1.5">
      {items.map(s => (
        <div key={s.id} onClick={() => onSelect(s.id)}
          className={`rounded-xl border p-2.5 cursor-pointer transition ${selectedId===s.id ? "border-cyan-500 bg-cyan-500/10" : "border-gray-700 hover:border-gray-500"}`}>
          <p className="text-xs font-bold text-white truncate">{s.label}</p>
          {s.source_channel && <p className="text-xs text-gray-500">@{s.source_channel}</p>}
        </div>
      ))}
    </div>
  );
}

// ── AppSidebar ───────────────────────────────────────────────
const PROJECTS_KEY = "chronit_projects_v2";
function getProjects(): any[] { try { return JSON.parse(localStorage.getItem(PROJECTS_KEY)||"[]"); } catch { return []; } }
function saveProjects(ps: any[]) { localStorage.setItem(PROJECTS_KEY, JSON.stringify(ps.slice(0,20))); }

function AppSidebar({ current, onLoad, onReset, balance, userPlan, session, activeView, onViewChange }: { current: any; onLoad: (d:any)=>void; onReset: ()=>void; balance: number|null; userPlan: string|null; session: any; activeView: string; onViewChange: (v:string)=>void }) {
  const [tab, setTab] = useState<"project"|"style"|"settings">("project");
  const [projects, setProjects] = useState<any[]>(()=>getProjects());
  const [activeProjectId, setActiveProjectId] = useState<string|null>(
    () => localStorage.getItem("chronit_active_project") || null
  );
  const [editingId, setEditingId] = useState<string|null>(null);
  const [newProjectName, setNewProjectName] = useState<string|null>(null); // null=비표시, ""=입력중

  const renameProject = (id: string, name: string) => {
    const ps = getProjects().map(p => p.id===id ? { ...p, name: name.trim() || p.name } : p);
    saveProjects(ps); setProjects(ps);
  };

  const saveProject = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = getProjects();
    if (existing.some(p => p.name === trimmed)) {
      alert(`"${trimmed}" 이름의 프로젝트가 이미 있습니다.`);
      return;
    }
    // 현재 진행 중인 작업 자동 저장
    if (activeProjectId && current && (current.stage > 1 || (current.clips && current.clips.length > 0))) {
      const updated = existing.map(p => p.id === activeProjectId
        ? { ...p, savedAt: Date.now(), stage: current.stage, data: current } : p);
      saveProjects(updated); setProjects(updated);
    }
    const id = `proj_${Date.now()}`;
    const entry = { id, name: trimmed, savedAt: Date.now(), stage: 1, data: {} };
    const ps = [entry, ...getProjects()];
    saveProjects(ps); setProjects(ps);
    setActiveProjectId(id);
    localStorage.setItem('chronit_active_project', id);
    setNewProjectName(null);
    onReset();
  };

  const delProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ps = getProjects().filter(p=>p.id!==id);
    saveProjects(ps); setProjects(ps);
    if (activeProjectId === id) { setActiveProjectId(null); localStorage.removeItem('chronit_active_project'); }
  };

  const STAGE_LABELS = ["영상 분석","영상 선택","대본 생성","스타일","보이스","완료"];

  return (
    <div className="flex flex-col h-full">
      {/* 로고 */}
      <div className="px-6 py-5 border-b border-gray-800">
        <h1 className="text-lg font-black text-white tracking-tight">CHRONIT</h1>
        <p className="text-xs text-gray-500 mt-0.5">쇼핑 릴스 자동화</p>
      </div>
      {/* 탭 네비 */}
      <div className="px-3 py-3 space-y-0.5">
        {([
          ["generator","📁  프로젝트"],
          ["style-finder","🔍  스타일 찾기"],
          ["history","📹  생성 내역"],
          ["settings","⚙️  설정"],
        ] as [string,string][]).map(([v,l])=>(
          <button key={v} onClick={()=>onViewChange(v)}
            className={`w-full text-left rounded-xl px-4 py-2.5 text-sm font-bold transition ${activeView===v ? "bg-cyan-500/15 text-cyan-400" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
            {l}
          </button>
        ))}
      </div>
      {/* 콘텐츠 (프로젝트 목록 — 항상 표시) */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {tab === "project" && (
          <div className="space-y-2">
            {/* 새 프로젝트 버튼 + 이름 입력 */}
            {newProjectName === null ? (
              <button onClick={() => setNewProjectName("")}
                className="w-full rounded-xl bg-cyan-500 py-2.5 text-sm font-black text-white hover:bg-cyan-400 transition flex items-center justify-center gap-1.5">
                <span>+</span><span>새 프로젝트</span>
              </button>
            ) : (
              <div className="space-y-2">
                <input autoFocus
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") saveProject(newProjectName);
                    if (e.key === "Escape") setNewProjectName(null);
                  }}
                  placeholder="프로젝트 이름 입력"
                  className="w-full rounded-xl bg-gray-800 border border-cyan-500 px-3 py-2 text-sm text-white outline-none placeholder-gray-500" />
                <div className="flex gap-2">
                  <button onClick={() => saveProject(newProjectName)}
                    className="flex-1 rounded-xl bg-cyan-500 py-2 text-xs font-black text-white hover:bg-cyan-400 transition">
                    확인
                  </button>
                  <button onClick={() => setNewProjectName(null)}
                    className="rounded-xl border border-gray-700 px-3 py-2 text-xs text-gray-400 hover:text-white transition">
                    취소
                  </button>
                </div>
              </div>
            )}

            {projects.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-8">저장된 프로젝트가 없습니다</p>
            ) : (
              <div className="space-y-1">
                {projects.map(p=>(
                  <div key={p.id}
                    className={`rounded-xl border p-2.5 cursor-pointer transition group ${activeProjectId===p.id ? "border-cyan-500 bg-cyan-500/10" : "border-gray-700 hover:border-gray-500"}`}
                    onClick={()=>{ onLoad(p.data); setActiveProjectId(p.id); }}>
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        {editingId === p.id ? (
                          <input autoFocus defaultValue={p.name}
                            className="w-full bg-gray-800 text-xs font-bold text-white rounded px-1 py-0.5 outline-none border border-cyan-500"
                            onBlur={e => { renameProject(p.id, e.target.value); setEditingId(null); }}
                            onKeyDown={e => { if (e.key==="Enter") { renameProject(p.id, (e.target as HTMLInputElement).value); setEditingId(null); } }}
                            onClick={e => e.stopPropagation()} />
                        ) : (
                          <p className="text-xs font-bold text-white truncate">{p.name}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5">{STAGE_LABELS[(p.stage||1)-1]} · {new Date(p.savedAt).toLocaleDateString("ko")}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                        <button onClick={e=>{e.stopPropagation();setEditingId(p.id);}}
                          className="text-gray-500 hover:text-cyan-400 text-xs">✎</button>
                        <button onClick={e=>delProject(p.id,e)}
                          className="text-gray-500 hover:text-red-400 text-xs">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {tab === "style" && (
          <StyleLibrary onLoad={(style: any) => {
            if (style.subtitleStyle) onLoad({ ...current, subtitleStyle: style.subtitleStyle });
          }} session={session} />
        )}
      </div>
      {tab === "history" && (
        <HistoryPanel session={session} />
      )}

      {/* 하단 계정/플랜/크레딧 고정 */}
      <div className="border-t border-gray-800 px-4 py-3 space-y-1.5 shrink-0">
        <p className="text-xs text-gray-600 truncate">{session?.user?.email}</p>
        {userPlan && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">플랜</span>
            <span className="text-xs font-bold text-white capitalize">{userPlan}</span>
          </div>
        )}
        {balance !== null && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">크레딧</span>
            <span className="text-sm font-black text-cyan-400">💎 {balance.toLocaleString()} CR</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StageBar({ current, onSelect }: { current: number; onSelect: (n: number) => void }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {STAGE_LABELS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex items-center shrink-0">
            <button onClick={() => onSelect(n)}
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                done ? "bg-cyan-500 text-white" :
                active ? "bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400" :
                "bg-gray-800 text-gray-500 hover:bg-gray-700"
              }`}>{done ? "✓" : n}</div>
              <span className={`text-xs font-bold hidden md:block whitespace-nowrap ${
                active ? "text-cyan-400" : done ? "text-white" : "text-gray-500"
              }`}>{label}</span>
            </button>
            {i < STAGE_LABELS.length - 1 && (
              <div className={`w-4 h-0.5 mx-1 shrink-0 ${done ? "bg-cyan-500" : "bg-gray-800"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Stage Panel ───────────────────────────────────────────────
function StagePanel({ n, title, subtitle, current, children }: {
  n: number; title: string; subtitle: string; current: number; children: React.ReactNode;
}) {
  if (n !== current) return null; // 현재 단계만 표시
  return (
    <div className="rounded-2xl border border-cyan-500/50 bg-gray-900 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
      <div className="px-6 py-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400">{n}</div>
        <div>
          <p className="text-sm font-black text-white">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="px-6 pb-6 border-t border-gray-800">
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
}

// ── Clip Card ─────────────────────────────────────────────────
const THUMB_PROXY = "https://oxygqtbdpnxxcgzwdlzi.supabase.co/functions/v1/thumbnail-proxy";
function proxyThumb(url: string) {
  if (!url) return "";
  return url;
}

// ── 클립 미리보기 모달 ──────────────────────────────────────


function ClipCard({ clip, selected, onToggle }: { clip: Clip; selected: boolean; onToggle: () => void }) {
  const [imgError, setImgError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const proxyUrl = clip.download_url
    ? `https://oxygqtbdpnxxcgzwdlzi.supabase.co/functions/v1/video-proxy?url=${encodeURIComponent(clip.download_url)}`
    : "";
  const handlePlay = async () => {
    if (!proxyUrl) return;
    try {
      const res = await fetch(proxyUrl, { method: "HEAD" });
      if (res.ok && res.headers.get("content-type")?.includes("video")) {
        setPlaying(true);
      } else {
        if (clip.page_url) window.open(clip.page_url, "_blank");
      }
    } catch {
      if (clip.page_url) window.open(clip.page_url, "_blank");
    }
  };
  const thumbSrc = !imgError && clip.thumbnail_url ? clip.thumbnail_url : "";

  return (
    <div className={`relative rounded-xl overflow-hidden border-2 transition-all ${
      selected ? "border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]" : "border-gray-700 hover:border-gray-500"
    }`}>
      <div className="aspect-[9/16] bg-gray-800 relative cursor-pointer"
        onClick={() => playing ? setPlaying(false) : handlePlay()}>
        {playing && proxyUrl ? (
          <video src={proxyUrl} autoPlay playsInline controls={false}
            className="w-full h-full object-cover"
            onClick={e => { e.stopPropagation(); setPlaying(false); }}
            onError={() => {
              setPlaying(false);
              if (clip.page_url) window.open(clip.page_url, "_blank");
            }} />
        ) : (
          <>
            {thumbSrc ? (
              <img src={thumbSrc} alt={clip.title} onError={() => setImgError(true)} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl text-gray-600">🎬</div>
            )}
            {/* 재생 아이콘 오버레이 */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/40 transition-opacity">
              <div className="rounded-full bg-white/90 h-12 w-12 flex items-center justify-center shadow-lg">
                <span className="text-black text-xl ml-1">▶</span>
              </div>
            </div>
          </>
        )}
        {clip.duration > 0 && !playing && (
          <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-xs text-white font-bold">{clip.duration}s</div>
        )}
        {selected && (
          <div className="absolute top-1.5 left-1.5 h-5 w-5 rounded-full bg-cyan-500 flex items-center justify-center">
            <span className="text-white text-xs font-black">✓</span>
          </div>
        )}
      </div>
      <div className="p-1.5 bg-gray-900 flex items-center justify-between gap-1">
        <div className="min-w-0">
          <p className="text-xs text-white font-medium line-clamp-1">{clip.title || "(제목 없음)"}</p>
          <p className="text-xs text-gray-500">@{clip.author || "?"}</p>
        </div>
        <button onClick={e => { e.stopPropagation(); onToggle(); }}
          className={`shrink-0 rounded-lg px-2 py-1 text-xs font-black transition ${
            selected
              ? "bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30"
              : "bg-cyan-500 text-white hover:bg-cyan-400"
          }`}>
          {selected ? "빼기" : "담기"}
        </button>
      </div>
    </div>
  );
}

// ── Job Card ──────────────────────────────────────────────────
function JobCard({ job }: { job: Job }) {
  const S = {
    pending:    { label: "대기 중", cls: "bg-yellow-500/10 text-yellow-400", icon: "⏳" },
    processing: { label: "생성 중", cls: "bg-blue-500/10 text-blue-400",    icon: "🎬" },
    done:       { label: "완료",    cls: "bg-green-500/10 text-green-400",  icon: "✅" },
    error:      { label: "오류",    cls: "bg-red-500/10 text-red-400",      icon: "❌" },
  };
  const s = S[job.status];
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.cls}`}>{s.icon} {s.label}</span>
          <p className="mt-1.5 truncate text-sm text-gray-300">{job.product_url}</p>
          <p className="mt-0.5 text-xs text-gray-500">{new Date(job.created_at).toLocaleString("ko-KR")} · {job.credits_used} CR</p>
          {job.status === "error" && job.error_message && <p className="mt-1 text-xs text-red-400">{job.error_message}</p>}
        </div>
        {job.status === "done" && job.video_url && (
          <a href={job.video_url} download className="shrink-0 rounded-xl bg-cyan-500 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-400 transition">다운로드</a>
        )}
        {(job.status === "pending" || job.status === "processing") && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent shrink-0" />
        )}
      </div>
    </div>
  );
}

// ── StyleSelector ─────────────────────────────────────────────
type StyleProfile = {
  id: string; label: string;
  source_channel: string; source_title: string;
  tone?: { speaker?: string; signatures?: string[] };
  structure?: { hook?: string };
};

function StyleSelector({ selected, onSelect, session }: {
  selected: string;
  onSelect: (id: string) => void;
  session: Session | null;
}) {
  const [profiles, setProfiles]   = useState<StyleProfile[]>([]);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    fetch(FN("get-style-profiles"), {
      headers: { "Authorization": `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.ok) setProfiles(d.profiles ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const selectedProfile = profiles.find(p => p.id === selected);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-bold text-gray-300">대본 스타일</label>
        {loading && <span className="text-xs text-gray-500">불러오는 중...</span>}
      </div>

      {/* 자동 선택 옵션 */}
      <div className="grid grid-cols-1 gap-2 mb-3">
        <button onClick={() => onSelect("auto")}
          className={`rounded-xl border p-3 text-left transition ${
            selected === "auto" ? "border-cyan-500 bg-cyan-500/10" : "border-gray-700 hover:border-gray-500"
          }`}>
          <p className={`text-sm font-bold ${selected === "auto" ? "text-cyan-400" : "text-white"}`}>
            ✨ 자동 (AI 추천)
          </p>
          <p className="text-xs text-gray-500 mt-0.5">영상 내용에 맞게 자동으로 스타일 결정</p>
        </button>
      </div>

      {/* 내 스타일 라이브러리 */}
      {profiles.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">내 스타일 라이브러리</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-64 overflow-y-auto pr-1">
            {profiles.map(p => (
              <button key={p.id} onClick={() => onSelect(p.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  selected === p.id ? "border-cyan-500 bg-cyan-500/10" : "border-gray-700 hover:border-gray-500"
                }`}>
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-bold truncate ${selected === p.id ? "text-cyan-400" : "text-white"}`}>
                    📌 {p.label || "(이름 없음)"}
                  </p>
                  {selected === p.id && (
                    <span className="shrink-0 text-xs text-cyan-400 font-bold">선택됨</span>
                  )}
                </div>
                {p.source_channel && (
                  <p className="text-xs text-gray-500 mt-0.5">@{p.source_channel}</p>
                )}
                {p.tone?.signatures?.length ? (
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    {p.tone.signatures.slice(0, 3).join(" · ")}
                  </p>
                ) : p.structure?.hook ? (
                  <p className="text-xs text-gray-600 mt-1 truncate">{p.structure.hook}</p>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && profiles.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-700 p-4 text-center">
          <p className="text-sm text-gray-500">저장된 스타일이 없습니다</p>
          <p className="text-xs text-gray-600 mt-1">앱의 <span className="text-gray-400 font-bold">스타일 찾기</span> 탭에서 스타일을 저장하면 여기에 표시됩니다</p>
        </div>
      )}

      {/* 선택된 스타일 미리보기 */}
      {selectedProfile && (
        <div className="mt-3 rounded-xl bg-gray-800 p-3 text-xs text-gray-400 space-y-1">
          {selectedProfile.tone?.speaker && <p>화자: <span className="text-gray-200">{selectedProfile.tone.speaker}</span></p>}
          {selectedProfile.structure?.hook && <p>훅: <span className="text-gray-200">{selectedProfile.structure.hook}</span></p>}
          {selectedProfile.source_title && <p>원본: <span className="text-gray-200">{selectedProfile.source_title}</span></p>}
        </div>
      )}
    </div>
  );
}

// ── StyleFinderView ──────────────────────────────────────────
function StyleFinderView({ session, onImport }: { session: any; onImport: (id:string)=>void }) {
  const [url, setUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<any>(null);
  const run = async () => {
    if (!url.trim() || !session) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const r = await fetch("https://oxygqtbdpnxxcgzwdlzi.supabase.co/functions/v1/analyze-style", {
        method:"POST", headers:{Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"},
        body:JSON.stringify({source_url:url.trim()})});
      const d = await r.json();
      if (!d.ok) throw new Error(d.error ?? "분석 실패");
      setResult(d.profile);
    } catch(e) { setError(String(e)); } finally { setLoading(false); }
  };
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5 space-y-3">
        <p className="text-sm font-bold text-white">숏폼 링크 분석</p>
        <div className="flex gap-3">
          <input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&run()} disabled={loading}
            placeholder="https://www.instagram.com/p/..." className="flex-1 rounded-xl bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500 disabled:opacity-50" />
          <button onClick={run} disabled={loading||!url.trim()} className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-400 disabled:opacity-40 transition">
            {loading ? "분석 중..." : "분석 시작"}
          </button>
        </div>
        {loading && <p className="text-xs text-cyan-400 animate-pulse">AI 분석 중 (1~2분)...</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
      {result && (
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div><p className="font-black text-white">{result.label}</p>{result.source_channel&&<p className="text-xs text-gray-500">@{result.source_channel}</p>}</div>
            <button onClick={()=>onImport(result.id)} className="shrink-0 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-white hover:bg-cyan-400 transition">이 스타일 적용 →</button>
          </div>
          {result.tone?.speaker && <p className="text-sm text-gray-300">{result.tone.speaker}</p>}
          {result.tone?.signatures?.length>0 && <div className="flex flex-wrap gap-1.5">{result.tone.signatures.slice(0,6).map((s:string,i:number)=><span key={i} className="rounded-full bg-gray-700 px-2.5 py-1 text-xs text-gray-200">{s}</span>)}</div>}
          <p className="text-xs text-green-400">✓ 라이브러리 저장 완료</p>
        </div>
      )}
    </div>
  );
}

// ── HistoryView ───────────────────────────────────────────────
function HistoryView({ session }: { session: any }) {
  const [jobs, setJobs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(()=>{
    if(!session) return;
    (async()=>{
      try {
        const r = await fetch("https://oxygqtbdpnxxcgzwdlzi.supabase.co/rest/v1/video_jobs?select=*&order=created_at.desc&limit=50",
          {headers:{Authorization:`Bearer ${session.access_token}`,apikey:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWdxdGJkcG54eGNnendkbHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTQ3MTIsImV4cCI6MjA5NTgzMDcxMn0.bHBnYJDRabumBJGtknRjkb63wm2nLI9IHYAaHTw5Qf8"}});
        const d = await r.json(); setJobs(Array.isArray(d)?d:[]);
      } catch {} finally { setLoading(false); }
    })();
  },[session]);
  if(loading) return <div className="text-gray-500 text-center py-10">불러오는 중...</div>;
  if(!jobs.length) return <div className="text-gray-500 text-center py-10">생성 내역이 없습니다</div>;
  return (
    <div className="space-y-3">
      {jobs.map(j=>(
        <div key={j.id} className="rounded-2xl bg-gray-900 border border-gray-800 p-4 flex items-center justify-between gap-4">
          <div className="min-w-0"><p className="font-bold text-white truncate">{j.product_name||j.id?.slice(0,12)}</p><p className="text-xs text-gray-500">{new Date(j.created_at).toLocaleString("ko")}</p></div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`text-sm font-bold ${j.status==="succeeded"?"text-green-400":j.status==="processing"?"text-cyan-400 animate-pulse":"text-gray-400"}`}>{j.status==="succeeded"?"✅ 완료":j.status==="processing"?"⏳ 생성 중":"❌"}</span>
            {j.output_url&&<a href={j.output_url} target="_blank" rel="noopener" className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-400 transition">다운로드</a>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── AdminView ─────────────────────────────────────────────────
function AdminView({ session, supabase }: { session: any; supabase: any }) {
  const [users, setUsers] = React.useState<any[]>([]);
  React.useEffect(()=>{ if(!session) return; (async()=>{ try{const{data}=await supabase.from("subscriptions").select("user_id,plan,role").order("created_at",{ascending:false}).limit(50);setUsers(data??[]);}catch{}})(); },[session]);
  const setRole=async(uid:string,role:string)=>{await supabase.from("subscriptions").update({role}).eq("user_id",uid);setUsers(u=>u.map(x=>x.user_id===uid?{...x,role}:x));};
  return (
    <div>
      <h2 className="text-xl font-black text-white mb-5">👑 관리자</h2>
      <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden">
        <table className="w-full text-xs"><thead className="border-b border-gray-800"><tr className="text-gray-400"><th className="px-4 py-3 text-left">user_id</th><th className="px-4 py-3 text-left">플랜</th><th className="px-4 py-3 text-left">역할 변경</th></tr></thead>
          <tbody>{users.map(u=>(
            <tr key={u.user_id} className="border-b border-gray-800/50">
              <td className="px-4 py-3 text-gray-400 font-mono truncate max-w-[140px]">{u.user_id?.slice(0,14)}</td>
              <td className="px-4 py-3 text-white capitalize">{u.plan||"-"}</td>
              <td className="px-4 py-3"><select value={u.role||"user"} onChange={e=>setRole(u.user_id,e.target.value)} className="rounded-lg bg-gray-700 border border-gray-600 px-2 py-1 text-xs text-white outline-none"><option value="user">user</option><option value="partner">partner</option><option value="super_admin">super_admin</option></select></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ── PartnerView ───────────────────────────────────────────────
function PartnerView({ session, supabase }: { session: any; supabase: any }) {
  const [code, setCode] = React.useState(""); const [copied, setCopied] = React.useState(false);
  React.useEffect(()=>{ if(!session) return; (async()=>{ try{const r=await supabase.rpc("get_referral_info_rpc",{p_user_id:session.user.id});if(r.data?.referral_code)setCode(r.data.referral_code);}catch{}})(); },[session]);
  const link=`https://chronit.vercel.app?ref=${code}`;
  const copy=()=>{navigator.clipboard.writeText(link);setCopied(true);setTimeout(()=>setCopied(false),1500);};
  return (
    <div>
      <h2 className="text-xl font-black text-white mb-5">📊 파트너스</h2>
      <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5 space-y-3 max-w-lg">
        <p className="text-sm font-bold text-white">추천 링크</p>
        <div className="flex gap-3"><input readOnly value={link} className="flex-1 rounded-xl bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-cyan-400 outline-none" /><button onClick={copy} className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-400 transition">{copied?"✓ 복사됨":"복사"}</button></div>
        <p className="text-xs text-gray-400">지인이 추천 링크로 가입하면 양쪽 모두 500 CR 지급</p>
      </div>
    </div>
  );
}

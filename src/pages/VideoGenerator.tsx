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
import { useState, useEffect, useCallback } from "react";
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

const VOICES = [
  { id: "nova",    label: "한국어 여성 1 (밝음)" },
  { id: "shimmer", label: "한국어 여성 2 (차분)" },
  { id: "onyx",    label: "한국어 남성 1 (활기)" },
  { id: "echo",    label: "한국어 남성 2 (안정)" },
  { id: "fable",   label: "한국어 여아 (귀여움)" },
];

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
  const [voiceId, setVoiceId]       = useState("nova");
  const [voiceSpeed, setVoiceSpeed] = useState(130); // %
  const [rendering, setRendering]   = useState(false);
  const [renderError, setRenderError] = useState("");
  const [currentJobId, setCurrentJobId] = useState("");

  // Stage 6
  const [jobs, setJobs]             = useState<Job[]>([]);
  const [balance, setBalance]       = useState<number | null>(null);

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

  // 현재 job 완료 감지 → Stage 6 이동
  useEffect(() => {
    if (!currentJobId) return;
    const job = jobs.find(j => j.id === currentJobId);
    if (job?.status === "done" && stage === 5) {
      setStage(6);
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
      const resp = await fetch(FN("generate-script"), {
        method: "POST",
        headers: { "Authorization": `Bearer ${s.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          source_url: sourceUrl.trim(),
          selected_clips: selected,
          target_seconds: targetSeconds,
          style_profile_id: styleProfileId,
        }),
      });
      const data = await resp.json();
      if (!data.ok) { setScriptError(data.error ?? "대본 생성 실패"); return; }
      setScript(data.segments ?? []);
      setScriptPredId(data.prediction_id ?? "");
    } catch (e) { setScriptError(String(e)); }
    finally { setScriptLoading(false); }
  };

  // ── Stage 5: 렌더링 ──────────────────────────────────────
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
          subtitle_preset: subtitlePreset,
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

  const currentData = { stage, sourceUrl, clips, cart: [...cart], script, targetSeconds, styleProfileId, subtitleStyle, thumbnailStyle, showThumbnail, voiceId, voiceSpeed };
  const handleLoad = (d: any) => {
    if (d.sourceUrl) setSourceUrl(d.sourceUrl);
    if (d.clips?.length) setClips(d.clips);
    if (d.cart?.length) setCart(new Set(d.cart));
    if (d.script) setScript(d.script);
    if (d.targetSeconds) setTargetSeconds(d.targetSeconds);
    if (d.styleProfileId) setStyleProfileId(d.styleProfileId);
    if (d.subtitleStyle) setSubtitleStyle(d.subtitleStyle);
    if (d.thumbnailStyle) setThumbnailStyle(d.thumbnailStyle);
    if (d.showThumbnail !== undefined) setShowThumbnail(d.showThumbnail);
    if (d.voiceId) setVoiceId(d.voiceId);
    if (d.voiceSpeed) setVoiceSpeed(d.voiceSpeed);
    if (d.stage) setStage(d.stage);
  };

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      {/* ── 왼쪽 사이드바 ── */}
      <div className="w-64 shrink-0 border-r border-gray-800 flex flex-col">
        <AppSidebar current={currentData} onLoad={handleLoad} balance={balance} session={session} />
      </div>

      {/* ── 메인 콘텐츠 ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 상단 바 */}
        <div className="border-b border-gray-800 px-8 py-4 flex items-center justify-between">
          <StageBar current={stage} onSelect={(s) => s < stage && setStage(s)} />
          {balance !== null && (
            <div className="shrink-0 ml-4 rounded-full bg-gray-800 px-4 py-1.5 text-sm font-bold text-cyan-400">
              💎 {balance.toLocaleString()} CR
            </div>
          )}
        </div>

        {/* 스테이지 콘텐츠 */}
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
                      : "🔍 분석 시작"}
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

              <FloatingNext label="다음" onClick={() => setStage(3)} />
            </div>
          </StagePanel>

          {/* ── STAGE 3 ── */}
          <StagePanel n={3} title="컷편집 & 대본 생성" subtitle="AI가 대본을 작성하고 클립을 편집합니다" current={stage}>
            <div className="space-y-4">
              {!script && !scriptLoading && (
                <div className="rounded-xl bg-gray-800 p-4 text-sm text-gray-300">
                  <p className="font-bold text-white mb-1">준비 완료</p>
                  <p>선택된 클립 <span className="text-cyan-400 font-bold">{cart.size}개</span> · {targetSeconds}초 영상</p>
                  <p className="mt-1 text-gray-400 text-xs">대본 생성 + 클립 컷편집을 AI가 자동으로 진행합니다 (약 30~60초)</p>
                </div>
              )}

              {scriptLoading && (
                <div className="rounded-xl bg-gray-800 p-6 flex items-center gap-4">
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">대본 생성 & 컷편집 중...</p>
                    <p className="text-xs text-gray-400 mt-0.5">클립 분석 → 대본 작성 → 컷 분배 (30~60초 소요)</p>
                  </div>
                </div>
              )}

              {script && (
                <div className="rounded-xl bg-gray-800 p-4">
                  <p className="text-sm font-bold text-white mb-3">생성된 대본 ({script.length}개 세그먼트)</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {script.map((seg, i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <span className="shrink-0 text-cyan-400 font-bold w-5">{i+1}</span>
                        <span className="text-gray-200">{seg.text}</span>
                        <span className="shrink-0 text-gray-500 text-xs self-start mt-0.5">{seg.duration_sec}s</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {scriptError && <p className="text-sm text-red-400">{scriptError}</p>}

              <div className="flex justify-between items-center">
                {script && (
                  <button onClick={handleGenerateScript}
                    className="text-sm text-gray-400 hover:text-white transition underline underline-offset-2">
                    🔄 재생성
                  </button>
                )}
                <div className="ml-auto flex gap-2">
                  {!script
                    ? <button onClick={handleGenerateScript} disabled={scriptLoading}
                        className="rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-cyan-400 disabled:opacity-40 transition">
                        {scriptLoading ? "생성 중..." : "✨ 대본 생성하기"}
                      </button>
                    : <>
                        <button onClick={() => setStage(4)}
                          className="rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-cyan-400 transition">
                          다음 단계 →
                        </button>
                        <FloatingNext label="다음" onClick={() => setStage(4)} />
                      </>
                  }
                </div>
              </div>
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
                  onNext={() => setStage(5)}
                />
              </div>
            </div>
          )}
          <FloatingNext label="다음" onClick={() => setStage(5)} />

          {/* ── STAGE 5 ── */}
          <StagePanel n={5} title="보이스" subtitle="음성을 선택하고 영상을 생성합니다" current={stage}>
            <div className="space-y-6">
              <div>
                <label className="mb-3 block text-sm font-bold text-gray-300">음성 선택</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {VOICES.map(v => (
                    <button key={v.id} onClick={() => setVoiceId(v.id)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        voiceId === v.id ? "border-cyan-500 bg-cyan-500/10" : "border-gray-700 hover:border-gray-500"
                      }`}>
                      <span className={`text-sm font-bold ${voiceId === v.id ? "text-cyan-400" : "text-white"}`}>
                        {voiceId === v.id ? "● " : "○ "}{v.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-bold text-gray-300">
                  말하기 속도 <span className="text-cyan-400 font-black">{voiceSpeed}%</span>
                </label>
                <input type="range" min={80} max={160} step={5} value={voiceSpeed}
                  onChange={e => setVoiceSpeed(Number(e.target.value))}
                  className="w-full accent-cyan-500" />
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>느림 (80%)</span><span>기본 (100%)</span><span>빠름 (160%)</span>
                </div>
              </div>

              {renderError && <p className="text-sm text-red-400">{renderError}</p>}

              {currentJob && (
                <div className={`rounded-xl p-4 text-sm flex items-center gap-3 ${
                  currentJob.status === "processing" ? "bg-blue-500/10 text-blue-400" :
                  currentJob.status === "done" ? "bg-green-500/10 text-green-400" :
                  "bg-red-500/10 text-red-400"
                }`}>
                  {currentJob.status === "processing" && (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent shrink-0" />
                  )}
                  <span className="font-bold">
                    {currentJob.status === "processing" ? "🎬 영상 생성 중... (수 분 소요)" :
                     currentJob.status === "done" ? "✅ 영상 생성 완료!" : "❌ " + currentJob.error_message}
                  </span>
                </div>
              )}

              <button onClick={handleRender}
                disabled={rendering || currentJob?.status === "processing"}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-4 text-base font-extrabold text-white shadow-lg hover:opacity-90 disabled:opacity-40 transition flex items-center justify-center gap-2">
                {rendering
                  ? <><span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />요청 중...</>
                  : "🚀 영상 생성 시작 (100 CR)"}
              </button>
            </div>
          </StagePanel>

          {/* ── STAGE 6 ── */}
          <StagePanel n={6} title="SEO + 내보내기" subtitle="제목·해시태그 추천 및 완성본 다운로드" current={stage}>
            <div className="space-y-4">
              {currentJob?.status === "done" && currentJob.video_url ? (
                <>
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <video src={currentJob.video_url} controls
                      className="w-full sm:w-48 rounded-2xl"
                      style={{ aspectRatio: "9/16", maxHeight: "320px" }} />
                    <div className="flex-1 space-y-4">
                      <div className="rounded-xl bg-gray-800 p-4">
                        <p className="text-xs text-gray-400 mb-1 font-bold">추천 제목</p>
                        <p className="text-sm text-white">AI가 생성한 제목이 여기에 표시됩니다</p>
                      </div>
                      <div className="rounded-xl bg-gray-800 p-4">
                        <p className="text-xs text-gray-400 mb-2 font-bold">해시태그</p>
                        <div className="flex flex-wrap gap-1.5">
                          {["#쇼핑", "#추천", "#리뷰", "#숏폼", "#쇼핑릴스"].map(tag => (
                            <span key={tag} className="rounded-full bg-cyan-500/10 text-cyan-400 text-xs px-3 py-1 font-bold">{tag}</span>
                          ))}
                        </div>
                      </div>
                      <a href={currentJob.video_url} download
                        className="block w-full rounded-xl bg-cyan-500 py-3 text-center text-sm font-extrabold text-white hover:bg-cyan-400 transition">
                        ⬇ 완성본 다운로드
                      </a>
                    </div>
                  </div>
                  <button onClick={() => {
                    setStage(1); setClips([]); setCart(new Set()); setScript(null); setCurrentJobId("");
                  }} className="text-sm text-gray-400 hover:text-white transition underline underline-offset-2">
                    + 새 영상 만들기
                  </button>
                </>
              ) : (
                <div className="rounded-xl bg-gray-800 p-6 text-center text-sm text-gray-400">
                  Stage 5에서 영상 생성이 완료되면 여기서 다운로드할 수 있습니다.
                </div>
              )}
            </div>
          </StagePanel>

          </div>
        </div>
        {/* 이전 내역 */}
        {jobs.filter(j => j.id !== currentJobId).length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-lg font-black text-white">이전 생성 내역</h2>
            <div className="space-y-3">
              {jobs.filter(j => j.id !== currentJobId).map(job => <JobCard key={job.id} job={job} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stage Bar ─────────────────────────────────────────────────
const STAGE_LABELS = ["영상 분석", "영상 선택", "컷편집 & 대본 생성", "스타일", "보이스", "SEO + 내보내기"];
// ── 플로팅 다음 버튼 ──────────────────────────────────────────
function FloatingNext({ label, onClick, disabled = false }: {
  label: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <div className="flex justify-end mt-6">
      <button onClick={onClick} disabled={disabled}
        className="rounded-2xl bg-cyan-500 shadow-lg px-8 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:opacity-40 transition flex items-center gap-2">
        <span>{label}</span>
        <span>→</span>
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

function Stage4Panel({ subtitleStyle, setSubtitleStyle, thumbnailStyle, setThumbnailStyle, showThumbnail, setShowThumbnail, previewFrames, previewScript, onNext }: {
  subtitleStyle: SubtitleStyle; setSubtitleStyle: (v: SubtitleStyle) => void;
  thumbnailStyle: SubtitleStyle; setThumbnailStyle: (v: SubtitleStyle) => void;
  showThumbnail: boolean; setShowThumbnail: (v: boolean) => void;
  previewFrames: string[]; previewScript: string[]; onNext: () => void;
}) {
  const [tab, setTab] = useState<"subtitle"|"thumbnail">("subtitle");
  const [frameIdx, setFrameIdx] = useState(0);
  const [scriptIdx, setScriptIdx] = useState(0);

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


// ── AppSidebar ───────────────────────────────────────────────
const PROJECTS_KEY = "chronit_projects_v2";
function getProjects(): any[] { try { return JSON.parse(localStorage.getItem(PROJECTS_KEY)||"[]"); } catch { return []; } }
function saveProjects(ps: any[]) { localStorage.setItem(PROJECTS_KEY, JSON.stringify(ps.slice(0,20))); }

function AppSidebar({ current, onLoad, balance, session }: { current: any; onLoad: (d:any)=>void; balance: number|null; session: any }) {
  const [tab, setTab] = useState<"project"|"style"|"settings">("project");
  const [projects, setProjects] = useState<any[]>(()=>getProjects());
  const [activeProjectId, setActiveProjectId] = useState<string|null>(null);
  const [editingId, setEditingId] = useState<string|null>(null);

  const renameProject = (id: string, name: string) => {
    const ps = getProjects().map(p => p.id===id ? { ...p, name: name.trim() || p.name } : p);
    saveProjects(ps); setProjects(ps);
  };

  const saveProject = () => {
    const id = `proj_${Date.now()}`;
    const url = current.sourceUrl || "";
    const name = url ? url.split("/").filter(Boolean).slice(-1)[0]?.slice(0,18) || "프로젝트" : `프로젝트 ${projects.length+1}`;
    const entry = { id, name, savedAt: Date.now(), stage: current.stage, data: current };
    const ps = [entry, ...getProjects()];
    saveProjects(ps); setProjects(ps);
  };

  const delProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ps = getProjects().filter(p=>p.id!==id);
    saveProjects(ps); setProjects(ps);
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
        {([["project","📁  프로젝트"],["style","🎨  스타일 찾기"],["settings","⚙️  설정"]] as [string,string][]).map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v as any)}
            className={`w-full text-left rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab===v ? "bg-cyan-500/15 text-cyan-400" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
            {l}
          </button>
        ))}
      </div>
      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {tab === "project" && (
          <div className="space-y-2">
            {/* 새 프로젝트 버튼 */}
            <button onClick={saveProject}
              className="w-full rounded-xl bg-cyan-500 py-2.5 text-sm font-black text-white hover:bg-cyan-400 transition flex items-center justify-center gap-1.5">
              <span>+</span><span>새 프로젝트</span>
            </button>

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
          <div className="text-xs text-gray-500 text-center py-8">스타일 라이브러리<br/>준비 중</div>
        )}
        {tab === "settings" && (
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-xs font-bold text-gray-400 mb-1">계정</p>
              <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
            </div>
            {balance !== null && (
              <div className="rounded-xl bg-gray-800 p-3">
                <p className="text-xs text-gray-400">잔여 크레딧</p>
                <p className="text-lg font-black text-cyan-400 mt-0.5">💎 {balance.toLocaleString()} CR</p>
              </div>
            )}
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
            <button onClick={() => done && onSelect(n)}
              className={`flex items-center gap-1.5 ${done ? "cursor-pointer" : "cursor-default"}`}>
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                done ? "bg-cyan-500 text-white" :
                active ? "bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400" :
                "bg-gray-800 text-gray-500"
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

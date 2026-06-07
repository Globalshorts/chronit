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
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import PaymentModal from "../components/PaymentModal";
import ColorPalette from "../components/ColorPalette";
import { LinkPageManager } from "./LinksManager";

const SB = "https://oxygqtbdpnxxcgzwdlzi.supabase.co";
const FN = (n: string) => `${SB}/functions/v1/${n}`;

// ── 상단 바 (홈페이지와 동일 스타일) ───────────────────────────
function AppTopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const ICON = `${SB}/storage/v1/object/public/assets/icon.png`;
  const link = "transition-colors hover:text-[#03C75A]";
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur-xl md:px-6">
      <div className="flex items-center gap-2 md:gap-3">
        <button onClick={onMenuClick} aria-label="메뉴"
          className="md:hidden -ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <a href="/" className="flex items-center gap-2">
          <img src={ICON} alt="Chronit" className="h-8 w-8" />
          <span className="text-xl font-black tracking-tighter text-gray-900">Chronit</span>
        </a>
      </div>
      <nav className="flex items-center gap-3 text-sm font-bold text-gray-600 md:gap-7">
        <a href="/manual" className={`hidden sm:inline ${link}`}>사용 방법</a>
        <a href="/#pricing" className={`hidden sm:inline ${link}`}>요금제</a>
        <a href="/events" className={`hidden sm:inline ${link}`}>이벤트</a>
        <a href="/" className="rounded-full bg-[#03C75A]/10 px-3.5 py-1.5 text-[#03C75A] transition-colors hover:bg-[#03C75A]/20">홈</a>
      </nav>
    </header>
  );
}

// ── 타입 ──────────────────────────────────────────────────────
type Clip = {
  video_id: string; title: string; author: string;
  thumbnail_url: string; page_url: string; duration: number; source: string;
};
type Job = {
  id: string; status: "pending"|"processing"|"done"|"error";
  product_url: string; video_url: string; error_message: string;
  created_at: string; credits_used: number;
  expired?: boolean; product_name?: string;
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
  { id: "outline",     label: "아웃라인",   preview: "bg-transparent text-gray-900 border-2 border-white" },
  { id: "dark_bg",     label: "다크 배경",  preview: "bg-black/70 text-gray-900" },
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
  const analysisMetaRef = React.useRef<{ name: string; keyword: string; poster: string }>({ name: "", keyword: "", poster: "" });
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
    fontSize: 18,
    fontWeight: "900" as "400"|"700"|"900",
    strokeColor: "#000000",
    strokeWidth: 2,
    strokeOn: true,
    bgOn: false,
    bgColor: "#000000",
    bgOpacity: 60,
    bgRadius: 8,
    yPos: 75,
    xPos: 50,
  };
  const [subtitleStyle, setSubtitleStyle] = useState(DEFAULT_STYLE);
  const [thumbnailStyle, setThumbnailStyle] = useState({ ...DEFAULT_STYLE, yPos: 50 });
  const [showThumbnail, setShowThumbnail] = useState(true);
  const subtitlePreset = "custom";

  // Stage 5
  const [voiceId, setVoiceId]       = useState(() => { try { return localStorage.getItem("chronit_voice_id") || "nova"; } catch { return "nova"; } });
  const [voiceSpeed, setVoiceSpeed] = useState(() => { try { return Number(localStorage.getItem("chronit_voice_speed")) || 130; } catch { return 130; } });
  const [voiceVolume, setVoiceVolume] = useState(() => { try { return Number(localStorage.getItem("chronit_voice_volume")) || 100; } catch { return 100; } });
  const [rendering, setRendering]   = useState(false);
  const [renderError, setRenderError] = useState("");
  const [voiceGenerated, setVoiceGenerated] = useState(false);  // Stage 5 음성 생성 완료
  const [autoRunning, setAutoRunning]   = useState(false);
  const [autoRunStep, setAutoRunStep]   = useState("");
  const [autoRunError, setAutoRunError] = useState("");
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);  // 모바일 사이드바 드로어
  const [mobileProjOpen, setMobileProjOpen] = useState(false);  // 모바일 프로젝트 시트
  const [showSourceSurvey, setShowSourceSurvey] = useState(false);  // 가입 경로 설문
  const [sourceSaving, setSourceSaving] = useState(false);
  const [surveyPage, setSurveyPage] = useState(1);                  // 1: 경로, 2: 추천코드
  const [refCode, setRefCode] = useState("");
  const [refMsg, setRefMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [refLoading, setRefLoading] = useState(false);
  const [refAlready, setRefAlready] = useState(false);  // 추천 코드가 이미 적용됨(링크 유입 등)
  const [modalCtaText, setModalCtaText]   = useState("");   // 자동화 진행 단계 메시지
  const [voiceSegments, setVoiceSegments] = useState<any[]>([]);  // 장면별 편집용
  const [freeRegen, setFreeRegen] = useState(3);  // Stage 3 무료 재생성 횟수
  const [seoTitle, setSeoTitle] = useState("");
  const [selectedSubtitlePresetId, setSelectedSubtitlePresetId] = useState("");
  const [selectedThumbnailPresetId, setSelectedThumbnailPresetId] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [seoTags, setSeoTags] = useState("");
  const [seoLoading, setSeoLoading] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(() => {
    try { return localStorage.getItem("chronit_current_job") || ""; } catch { return ""; }
  });

  // Stage 6
  const [jobs, setJobs]             = useState<Job[]>([]);
  const [genTick, setGenTick]       = useState(0); // 생성 중 경과시간 표시용 1초 틱
  useEffect(() => {
    if (!currentJobId) return;
    const t = setInterval(() => setGenTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [currentJobId]);
  const [completionAlert, setCompletionAlert] = useState<string|null>(null);
  const [balance, setBalance]       = useState<number | null>(null);
  const [userPlan, setUserPlan]     = useState<string | null>(null);
  const [userRole, setUserRole]     = useState<string>("user");
  const [activeView, setActiveView] = useState(() => {
    try {
      const v = localStorage.getItem("chronit_active_view") || "generator";
      return (v === "auto-settings" || v === "style-finder") ? "studio" : v; // 옛 탭 → 통합 탭
    }
    catch { return "generator"; }
  });
  const [studioTab, setStudioTab] = useState("style"); // 'style'(스타일 찾기) | 'auto'(자동화 세팅)
  // 현재 탭 저장 → 새로고침해도 그 탭 유지 (프로젝트로 튕기지 않음)
  useEffect(() => {
    try { localStorage.setItem("chronit_active_view", activeView); } catch {}
  }, [activeView]);
  const [showTips, setShowTips] = useState(false);

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
    if (data?.role) setUserRole(data.role);
    if (!data?.plan || !data?.role) {
      // 폴백 — plan/role 누락 시 직접 조회
      const { data: sub } = await supabase.from("subscriptions")
        .select("plan, role").eq("user_id", session?.user?.id ?? "").maybeSingle();
      if (sub?.plan) setUserPlan(sub.plan);
      if (sub?.role) setUserRole(sub.role);
    }
  }, [session]);

  // ── 계정별 설정 동기화 (user_settings) ───────────────────────
  const settingsLoaded = useRef(false);
  const loadUserSettings = useCallback(async () => {
    const uid = session?.user?.id;
    if (!uid) return;
    try {
      const { data } = await supabase.from("user_settings")
        .select("voice_id, voice_speed, voice_volume, subtitle_style, thumbnail_style, target_seconds, style_profile_id, subtitle_preset_id, thumbnail_preset_id")
        .eq("user_id", uid).maybeSingle();
      if (data) {
        if (data.voice_id) setVoiceId(data.voice_id);
        if (data.voice_speed != null) setVoiceSpeed(Number(data.voice_speed));
        if (data.voice_volume != null) setVoiceVolume(Number(data.voice_volume));
        if (data.subtitle_style) setSubtitleStyle((p: any) => ({ ...p, ...data.subtitle_style }));
        if (data.thumbnail_style) setThumbnailStyle((p: any) => ({ ...p, ...data.thumbnail_style }));
        if (data.target_seconds != null) setTargetSeconds(Number(data.target_seconds));
        if (data.style_profile_id) setStyleProfileId(data.style_profile_id);
        if (data.subtitle_preset_id) setSelectedSubtitlePresetId(data.subtitle_preset_id);
        if (data.thumbnail_preset_id) setSelectedThumbnailPresetId(data.thumbnail_preset_id);
      }
    } catch { /* 무시 — localStorage 기본값 유지 */ }
    finally { settingsLoaded.current = true; }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    loadJobs(); loadBalance();
    loadUserSettings();
    const ch = supabase.channel("vj")
      .on("postgres_changes", { event: "*", schema: "public", table: "video_jobs" }, () => {
        loadJobs(); loadBalance();
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session, loadJobs, loadBalance, loadUserSettings]);

  // 변경 시 계정에 디바운스 저장 (+ localStorage 즉시 캐시)
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid || !settingsLoaded.current) return;
    localStorage.setItem("chronit_voice_id", voiceId);
    localStorage.setItem("chronit_voice_speed", String(voiceSpeed));
    localStorage.setItem("chronit_voice_volume", String(voiceVolume));
    const t = setTimeout(() => {
      supabase.from("user_settings").upsert({
        user_id: uid,
        voice_id: voiceId,
        voice_speed: voiceSpeed,
        voice_volume: voiceVolume,
        subtitle_style: subtitleStyle,
        thumbnail_style: thumbnailStyle,
        target_seconds: targetSeconds,
        style_profile_id: styleProfileId,
        subtitle_preset_id: selectedSubtitlePresetId,
        thumbnail_preset_id: selectedThumbnailPresetId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }).then(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [session, voiceId, voiceSpeed, voiceVolume, subtitleStyle, thumbnailStyle, targetSeconds, styleProfileId, selectedSubtitlePresetId, selectedThumbnailPresetId]);

  // ── 웹 기기 등록 + 하트비트 (최대 2기기, 생성은 차단 안 함) ──
  useEffect(() => {
    if (!session) return;
    let did = "";
    try {
      did = localStorage.getItem("chronit_device_id") || "";
      if (!did) {
        did = (crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        localStorage.setItem("chronit_device_id", did);
      }
    } catch { did = `web-${Date.now()}`; }
    const ua = navigator.userAgent;
    const os = /iphone|ipad/i.test(ua) ? "iOS" : /android/i.test(ua) ? "Android"
      : /windows/i.test(ua) ? "Windows" : /mac/i.test(ua) ? "Mac" : "기타";
    const br = /edg/i.test(ua) ? "Edge" : /chrome/i.test(ua) ? "Chrome"
      : /firefox/i.test(ua) ? "Firefox" : /safari/i.test(ua) ? "Safari" : "브라우저";
    supabase.rpc("register_device_rpc", { p_device_id: did, p_device_name: `${br} · ${os} (웹)` }).then(undefined, () => {});
    const hb = setInterval(() => { supabase.rpc("heartbeat_device_rpc", { p_device_id: did }).then(undefined, () => {}); }, 5 * 60 * 1000);
    return () => clearInterval(hb);
  }, [session]);

  // ── 가입 경로 조회 effect (응답 전 1회) ──────────────────────────────
  useEffect(() => {
    if (!session) return;
    try { if (localStorage.getItem("chronit_source_asked")) return; } catch {}
    supabase.rpc("get_signup_source_rpc").then((res: any) => {
      if (!res?.data) {
        setShowSourceSurvey(true);
        // 추천 링크로 들어와 이미 적용됐는지 확인
        supabase.rpc("has_referrer_rpc").then((r: any) => {
          if (r?.data?.referred) setRefAlready(true);
        }, () => {});
        // 링크의 ref 코드를 입력칸 기본값으로 (자동 적용 안 된 경우 대비)
        try {
          const urlRef = new URLSearchParams(window.location.search).get("ref");
          const stored = sessionStorage.getItem("chronit_ref");
          const code = (urlRef || stored || "").toUpperCase();
          if (code) setRefCode(code);
        } catch {}
      }
    }, () => {});
  }, [session]);

  const closeSurvey = () => {
    try { localStorage.setItem("chronit_source_asked", "1"); } catch {}
    setShowSourceSurvey(false);
    setSurveyPage(1);
  };
  // 1페이지: 경로 선택 → 저장하고 2페이지(추천코드)로
  const chooseSource = (src: string) => {
    setSourceSaving(true);
    supabase.rpc("set_signup_source_rpc", { p_source: src }).then(
      () => { setSourceSaving(false); setSurveyPage(2); },
      () => { setSourceSaving(false); setSurveyPage(2); }
    );
  };
  // 2페이지: 추천 코드 적용
  const applyReferral = () => {
    const code = refCode.trim();
    if (!code) { setRefMsg({ ok: false, text: "추천 코드를 입력해주세요" }); return; }
    setRefLoading(true); setRefMsg(null);
    supabase.rpc("redeem_referral_rpc", { p_referral_code: code }).then(
      (res: any) => {
        const d = res?.data;
        if (d?.ok) {
          setRefMsg({ ok: true, text: `🎉 추천 코드 적용 완료! +${d.reward ?? 500} CR을 받았어요` });
          loadBalance();
          setTimeout(() => closeSurvey(), 1600);
        } else {
          setRefMsg({ ok: false, text: d?.error ?? "추천 코드 적용에 실패했어요" });
        }
        setRefLoading(false);
      },
      () => { setRefMsg({ ok: false, text: "추천 코드 적용에 실패했어요" }); setRefLoading(false); }
    );
  };

  // 현재 job 완료/실패 감지 → 알림 (단계와 무관하게)
  useEffect(() => {
    if (!currentJobId) return;
    const job = jobs.find(j => j.id === currentJobId);
    if (!job) return;
    if (job.status === "done") {
      if (stage === 5) setStage(1); // 자동 생성 흐름이면 1단계로 복귀
      setCompletionAlert("✅ 영상 생성 완료! 생성 내역으로 이동합니다.");
      try { new Audio("https://www.soundjay.com/buttons/sounds/button-09a.mp3").play(); } catch {}
      setCurrentJobId("");
      setActiveView("history"); // 완료 시 생성 내역으로 자동 이동
    } else if (job.status === "error") {
      setCompletionAlert("❌ 영상 생성 실패: " + (job.error_message || "다시 시도해주세요."));
      setCurrentJobId("");
    }
  }, [jobs, currentJobId, stage]);

  // currentJobId 영속화 — 모바일 백그라운드/새로고침에도 진행배너·완료알림·자동이동 유지
  useEffect(() => {
    try {
      if (currentJobId) localStorage.setItem("chronit_current_job", currentJobId);
      else localStorage.removeItem("chronit_current_job");
    } catch {}
  }, [currentJobId]);

  // 앱 포그라운드 복귀 시 즉시 새로고침 (모바일에서 백그라운드 갔다 오면 타이머가 멈춰 있음)
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible" && session) { loadJobs(); loadBalance(); } };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [session, loadJobs, loadBalance]);

  // Realtime 보조 폴백: 진행 중 job이 있으면 12초마다 새로고침 (실시간 누락 대비)
  useEffect(() => {
    const inProgress = !!currentJobId || jobs.some(j => j.status === "pending" || j.status === "processing");
    if (!session || !inProgress) return;
    const iv = setInterval(() => { loadJobs(); loadBalance(); }, 12000);
    return () => clearInterval(iv);
  }, [session, jobs, currentJobId, loadJobs, loadBalance]);


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

  // ★ 마운트 시 작업 자동 복원 (재접속/새로고침해도 이어짐) ★
  useEffect(() => {
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ★ 작업 상태 변경 시 자동 저장 (디바운스). 첫 렌더는 건너뛰어 빈 상태로 덮어쓰기 방지 ★
  const _autosaveReady = useRef(false);
  useEffect(() => {
    if (!_autosaveReady.current) { _autosaveReady.current = true; return; }
    const t = setTimeout(saveProject, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, sourceUrl, clips, cart, script, scriptPredId, targetSeconds,
      styleProfileId, subtitleStyle, thumbnailStyle, showThumbnail, voiceId, voiceSpeed]);

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
      loadBalance(); // 분석 차감/환불 즉시 반영
      if (!data1.ok) {
        setSearchError(
          (resp1.status === 402 || data1.code === "INSUFFICIENT_CREDITS")
            ? (data1.error ?? "크레딧이 부족합니다. 충전 후 다시 시도해주세요.")
            : (data1.error ?? "분석 실패")
        );
        return;
      }

      const rawClips: Clip[] = data1.clips ?? [];
      const refFrames: string[] = data1.reference_frames ?? [];
      // 분석이 이미 뽑은 상품명/한국어 키워드 보관 → 생성 시 job에 저장(내 링크 재사용)
      analysisMetaRef.current = { name: data1.product_name || "", keyword: data1.keyword || "", poster: (data1.reference_frames && data1.reference_frames[0]) || "" };
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

  const handleVoiceGenerate = async (overrideVoiceId?: string) => {
    if (!script || script.length === 0) return;
    const _voiceId = overrideVoiceId ?? voiceId;
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
          voice_id: _voiceId,
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

  // ── 자동 생성 (Stage 2~6 순서 실행) ─────────────────────────
  const handleAutoRun = async (ctaOverride?: string) => {
    if (cart.size === 0 || autoRunning) return;
    if (ctaOverride !== undefined) setCtaText(ctaOverride);
    setShowAutoModal(false);
    setAutoRunError("");
    setAutoRunning(true);
    try {
      // Step 1: 대본 생성
      setAutoRunStep("1/3  대본 생성 중...");
      let genSegments: any = null;
      await new Promise<void>(async (resolve, reject) => {
        setScriptError(""); setScriptLoading(true); setScript(null);
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!s) { reject(new Error("로그인 필요")); return; }
        const selected = clips.filter(c => cart.has(c.video_id));
        const resp = await fetch(FN("generate-script"), {
          method: "POST",
          headers: { "Authorization": `Bearer ${s.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ source_url: sourceUrl.trim(), selected_clips: selected,
            target_seconds: targetSeconds, style_profile_id: styleProfileId, cta_text: (ctaOverride ?? ctaText).trim() }),
        });
        const data = await resp.json();
        if (!data.ok) { reject(new Error(data.error ?? "대본 생성 실패")); return; }
        const predId = data.prediction_id;
        setScriptPredId(predId ?? "");
        if (data.status === "succeeded" && data.segments) { genSegments = data.segments; setScript(data.segments); setScriptLoading(false); resolve(); return; }
        // 폴링
        const start = Date.now();
        while (Date.now() - start < 300_000) {
          await new Promise(r => setTimeout(r, 5000));
          const poll = await (await fetch(FN("generate-script"), {
            method: "POST",
            headers: { "Authorization": `Bearer ${s.access_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ poll: true, prediction_id: predId }),
          })).json();
          if (poll.status === "succeeded") { genSegments = poll.segments ?? []; setScript(poll.segments ?? []); setScriptLoading(false); resolve(); return; }
          if (poll.status === "failed") { reject(new Error(poll.error ?? "대본 실패")); return; }
        }
        reject(new Error("대본 생성 시간 초과"));
      });

      // Step 2: 음성 생성 — voiceId 직접 전달 (state 비동기 문제 방지)
      setAutoRunStep("2/3  음성 생성 중...");
      await handleVoiceGenerate(voiceId);

      // Step 3: 영상 합성 — state 비동기 문제 방지: ctaOverride, voiceId 직접 전달
      setAutoRunStep("3/3  영상 합성 중...");
      await handleRender({ voiceId, ctaText: ctaOverride ?? ctaText, script: genSegments });

      setAutoRunStep("✅ 완료!");
    } catch (e) {
      const msg = String(e).replace(/^Error:\s*/, "").slice(0, 120);
      setAutoRunStep(`❌ 오류: ${msg.slice(0,60)}`);
      setAutoRunError(msg);
    } finally {
      setAutoRunning(false);
    }
  };

  const handleRender = async (overrides?: { voiceId?: string; ctaText?: string; script?: any }) => {
    setRenderError(""); setRendering(true);
    const _voiceId = overrides?.voiceId ?? voiceId;
    const _script = overrides?.script ?? script;
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
          voice_id: _voiceId,
          voice_speed: voiceSpeed / 100,
          voice_volume: voiceVolume / 100,
          subtitle_preset: subtitlePreset,
          subtitle_style: subtitleStyle,
          thumbnail_style: thumbnailStyle,
          show_thumbnail: showThumbnail,
          script_segments: _script,
          cta_text: overrides?.ctaText ?? ctaText,
          product_name: analysisMetaRef.current.name,
          search_keyword: analysisMetaRef.current.keyword,
          poster_src: analysisMetaRef.current.poster,
        }),
      });
      const data = await resp.json();
      if (!data.ok) { setRenderError(data.error ?? "렌더링 요청 실패"); return; }
      setCurrentJobId(data.job_id ?? "");
      setBalance(data.balance ?? null);
      // 업로드용 SEO(제목/설명/해시태그)는 generate-video가 서버측에서 자동 생성함 (탭 닫아도 완료됨)
      await loadJobs();
    } catch (e) { setRenderError(String(e)); }
    finally { setRendering(false); }
  };

  // ── Auth 화면 ────────────────────────────────────────────
  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#ECEAE3]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#03C75A] border-t-transparent" />
    </div>
  );
  if (!session) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-[#ECEAE3]">
      <h1 className="text-2xl font-black text-gray-900">로그인이 필요합니다</h1>
      <button onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + window.location.pathname } })}
        className="rounded-xl bg-[#03C75A] px-8 py-3 font-bold text-white hover:bg-[#02b350] transition">
        Google로 로그인
      </button>
    </div>
  );

  const currentJob = jobs.find(j => j.id === currentJobId);

  const currentData = { stage, sourceUrl, clips, cart: [...cart], script, ctaText, targetSeconds, styleProfileId, subtitleStyle, thumbnailStyle, showThumbnail, voiceId, voiceSpeed, voiceVolume };
  const handleLoad = (d: any) => {
    // ★ 프로젝트별 데이터만 복원 — 전역 설정(음성/스타일/길이)은 자동화 세팅 유지
    setSourceUrl(d.sourceUrl ?? "");
    setClips(d.clips ?? []);
    setCart(new Set(d.cart ?? []));
    setScript(d.script ?? null);
    setCtaText(d.ctaText ?? "");
    setStage(1); // 6단계 흐름 제거 후 항상 Stage 1
    // 전역 설정은 복원하지 않음:
    // voiceId, voiceSpeed, voiceVolume, targetSeconds, subtitleStyle, thumbnailStyle, styleProfileId
    // → 자동화 세팅 탭에서 설정한 값을 항상 사용
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
    <div className="flex flex-col min-h-screen bg-[#ECEAE3] text-gray-900">
      {/* ── 영상 선택 팁 모달 ── */}
      {showTips && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setShowTips(false)}>
          <div className="rounded-2xl bg-white border border-amber-400/40 shadow-2xl w-full max-w-md p-6 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">⭐ 좋은 결과를 위한 팁</h2>
              <button onClick={() => setShowTips(false)} className="text-gray-500 hover:text-gray-900 text-xl">✕</button>
            </div>
            <p className="text-xs text-gray-400 -mt-1">관련 클립을 담을 때 참고하세요</p>
            <ul className="space-y-2.5 text-sm text-gray-700">
              {[
                ["💬", "자막이 없거나 적은 영상 사용하기", "기존 자막이 우리 자막과 겹치지 않아요"],
                ["📦", "영상을 최대한 많이 담기", "많을수록 편집·연출 선택지가 늘어나요"],
                ["🎨", "분위기가 비슷한 영상들 담기", "톤이 일관돼 영상이 매끄러워요"],
                ["🛍️", "같은 제품이 선명하게 보이는 영상", "제품이 또렷할수록 설득력이 높아요"],
                ["🚫", "워터마크·로고·계정명이 적은 영상", "화면을 가리는 요소가 적어야 깔끔해요"],
                ["📱", "세로(9:16) 영상 위주로 담기", "쇼츠/릴스 비율에 맞아 잘림이 적어요"],
                ["🙌", "손으로 쓰는 사용 장면이 있는 영상", "실사용 컷이 신뢰감을 줘요"],
                ["✨", "너무 어둡거나 흔들리는 영상은 피하기", "화질이 선명해야 완성도가 높아요"],
              ].map(([emoji, title, desc], i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="shrink-0">{emoji}</span>
                  <div>
                    <p className="font-bold text-gray-900 leading-snug">{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <button onClick={() => setShowTips(false)}
              className="w-full rounded-xl bg-amber-400/90 py-2.5 text-sm font-bold text-gray-900 hover:bg-amber-300 transition">
              알겠어요
            </button>
          </div>
        </div>
      )}
      {/* ── 자동 생성 확인 모달 ── */}
      {showAutoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">자동 진행 시작</h2>
              <button onClick={() => setShowAutoModal(false)} className="text-gray-500 hover:text-gray-900 text-xl">✕</button>
            </div>

            {/* 크레딧 내역 */}
            <div className="rounded-xl bg-gray-100 p-4 space-y-2">
              <p className="text-xs font-bold text-gray-400 mb-3">다음 작업을 자동 진행합니다:</p>
              {(() => {
                const isPro = VOICES_PRO.some(v => v.id === voiceId);
                const scriptCr = 20;
                const voiceCr = isPro ? 20 : 0;
                const renderCr = 50;
                const total = scriptCr + voiceCr + renderCr;
                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">📄 AI 대본 생성</span>
                      <span className="text-gray-900 font-bold">{scriptCr} CR</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">🎙 음성 합성 ({isPro ? "고품질" : "일반"})</span>
                      <span className={voiceCr === 0 ? "text-green-400 font-bold" : "text-gray-900 font-bold"}>{voiceCr === 0 ? "무료" : `${voiceCr} CR`}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">🎬 영상 합성 + 자막</span>
                      <span className="text-gray-900 font-bold">{renderCr} CR</span>
                    </div>
                    <div className="border-t border-gray-200 my-2" />
                    <div className="flex justify-between text-sm font-black">
                      <span className="text-gray-900">합계</span>
                      <span className="text-[#03C75A]">{total} CR</span>
                    </div>
                    {balance !== null && (
                      <p className="text-xs text-gray-400 pt-1">
                        현재 남은 크레딧: <span className={balance >= total ? "text-gray-900" : "text-red-400"}>{balance.toLocaleString()} CR</span>
                        {balance < total && <span className="text-red-400 ml-2">⚠ 크레딧 부족</span>}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>

            {/* CTA 입력 */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                💬 댓글 유도 단어 (CTA)
              </p>
              <p className="text-xs text-gray-500">
                대본 마지막 자막이 "댓글에 OO 남겨주시면 링크 보내드릴게요" 형태로 자동 생성됩니다.<br/>
                비워두면 "프로필 링크를 확인하세요" 로 마무리됩니다.
              </p>
              <input value={modalCtaText} onChange={e => setModalCtaText(e.target.value)}
                placeholder="예: 관심, 💚, 알려줘 (선택)"
                className="w-full rounded-xl bg-gray-100 border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#03C75A] transition" />
              {modalCtaText.trim() && (
                <p className="text-xs text-[#03C75A]">→ "댓글에 {modalCtaText.trim()} 남겨주시면 링크 보내드릴게요"</p>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowAutoModal(false)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700 hover:text-gray-900 hover:border-gray-500 transition">
                취소
              </button>
              <button
                onClick={() => { setCtaText(modalCtaText); handleAutoRun(modalCtaText); }}
                disabled={balance !== null && balance < (VOICES_PRO.some(v => v.id === voiceId) ? 90 : 70)}
                className="flex-1 rounded-xl bg-[#03C75A] py-3 text-sm font-black text-white hover:bg-[#02b350] disabled:opacity-40 transition">
                진행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 완성 알림 팝업 */}
      {completionAlert && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-3 text-white ${completionAlert.startsWith("❌") ? "bg-red-500 shadow-red-500/40" : "bg-green-500 shadow-green-500/40"}`}>
          <span className="text-2xl">{completionAlert.startsWith("❌") ? "⚠️" : "🎉"}</span>
          <div>
            <p className="font-black text-sm">{completionAlert}</p>
            {!completionAlert.startsWith("❌") && <p className="text-xs text-green-100 mt-0.5">생성 내역 탭에서 다운로드하세요</p>}
          </div>
          <button onClick={() => setCompletionAlert(null)} className="ml-4 text-gray-900/70 hover:text-gray-900 text-lg">✕</button>
        </div>
      )}
      {/* ── 자동 생성 중 중앙 오버레이 ── */}
      {autoRunning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-3xl bg-white border border-gray-200 px-10 py-8 text-center shadow-2xl max-w-sm mx-4">
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-gray-200 border-t-[#03C75A] rounded-full animate-spin" />
            <p className="text-lg font-black text-gray-900">자동 생성 중</p>
            <p className="text-sm text-[#03C75A] mt-1">{autoRunStep || "처리 중..."}</p>
            <p className="text-xs text-gray-500 mt-3">보통 1~5분 걸려요.<br/>잠시만 기다려 주세요 — 끝나면 자동으로 알려드려요.</p>
          </div>
        </div>
      )}
      {/* ── 백그라운드 렌더 진행 배너 (제출 후 합성 도는 동안) ── */}
      {!autoRunning && currentJobId && (() => {
        const bg = jobs.find(j => j.id === currentJobId);
        if (bg && (bg.status === "done" || bg.status === "error")) return null;
        return (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-white border border-[#03C75A]/40 shadow-2xl shadow-[#03C75A]/10 px-5 py-3 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-[#03C75A] rounded-full animate-spin shrink-0" />
            <div>
              <p className="text-sm font-bold text-gray-900">영상 생성 중...</p>
              <p className="text-xs text-gray-500">보통 1~5분 걸려요 · 창을 닫거나 다른 작업을 해도 계속 생성돼요.</p>
            </div>
          </div>
        );
      })()}
      {/* ── 가입 경로 + 추천 코드 설문 (2페이지) ── */}
      {showSourceSurvey && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
            {/* 진행 표시 */}
            <div className="mb-4 flex items-center justify-center gap-1.5">
              <span className={`h-1.5 rounded-full transition-all ${surveyPage === 1 ? "w-6 bg-[#03C75A]" : "w-1.5 bg-gray-300"}`} />
              <span className={`h-1.5 rounded-full transition-all ${surveyPage === 2 ? "w-6 bg-[#03C75A]" : "w-1.5 bg-gray-300"}`} />
            </div>

            {surveyPage === 1 ? (
              <>
                <p className="text-center text-lg font-black text-gray-900">크로닛을 어떻게 알게 되셨어요?</p>
                <p className="mt-1 text-center text-sm text-gray-500">더 나은 서비스를 위해 참고할게요 🙏</p>
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  {["유튜브","인스타그램","지인 추천","블로그·카페","검색(구글·네이버)","기타"].map(opt => (
                    <button key={opt} disabled={sourceSaving} onClick={() => chooseSource(opt)}
                      className="rounded-xl border border-gray-200 bg-[#FAFAF8] px-3 py-3 text-sm font-bold text-gray-800 transition hover:border-[#03C75A] hover:text-[#03C75A] active:scale-[0.98] disabled:opacity-50">
                      {opt}
                    </button>
                  ))}
                </div>
                <button disabled={sourceSaving} onClick={() => setSurveyPage(2)}
                  className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600">
                  건너뛰기
                </button>
              </>
            ) : refAlready ? (
              <>
                <div className="mt-2 text-center text-4xl">🎉</div>
                <p className="mt-2 text-center text-lg font-black text-gray-900">추천 코드가 적용됐어요!</p>
                <p className="mt-1 text-center text-sm text-gray-500">추천 보너스 <b className="text-[#03C75A]">+500 CR</b>이 이미 지급됐어요.</p>
                <button onClick={closeSurvey}
                  className="mt-5 w-full rounded-xl bg-[#03C75A] px-4 py-3 text-sm font-black text-white transition hover:bg-[#02b350] active:scale-[0.98]">
                  시작하기
                </button>
              </>
            ) : (
              <>
                <p className="text-center text-lg font-black text-gray-900">추천 코드가 있으신가요?</p>
                <p className="mt-1 text-center text-sm text-gray-500">입력하면 나와 추천인 모두 <b className="text-[#03C75A]">+500 CR</b>!</p>
                <input
                  value={refCode}
                  onChange={(e) => { setRefCode(e.target.value.toUpperCase()); setRefMsg(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") applyReferral(); }}
                  placeholder="추천 코드 입력"
                  maxLength={20}
                  className="mt-5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-lg font-bold tracking-widest text-gray-900 placeholder:text-sm placeholder:font-normal placeholder:tracking-normal focus:border-[#03C75A] focus:outline-none focus:ring-2 focus:ring-[#03C75A]/20"
                />
                {refMsg && (
                  <p className={`mt-2 text-center text-sm font-semibold ${refMsg.ok ? "text-[#03C75A]" : "text-red-500"}`}>{refMsg.text}</p>
                )}
                <button disabled={refLoading || !refCode.trim()} onClick={applyReferral}
                  className="mt-4 w-full rounded-xl bg-[#03C75A] px-4 py-3 text-sm font-black text-white transition hover:bg-[#02b350] active:scale-[0.98] disabled:opacity-40">
                  {refLoading ? "적용 중..." : "추천 코드 적용"}
                </button>
                <button disabled={refLoading} onClick={closeSurvey}
                  className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600">
                  추천 코드 없어요 / 다음에
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 상단 바 ── */}
      <AppTopBar onMenuClick={() => setMobileMenuOpen(true)} />

      {/* ── 모바일 사이드바 드로어 ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[90] md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="absolute left-0 top-0 h-full w-64 max-w-[82%] bg-[#ECEAE3] border-r border-gray-200 flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <NavSidebar activeView={activeView}
              onViewChange={(v:string) => { setActiveView(v); setMobileMenuOpen(false); }}
              userRole={userRole} balance={balance} userPlan={userPlan} session={session} />
          </div>
        </div>
      )}

      {/* ── 본문 행 (사이드바 + 패널 + 메인) ── */}
      <div className="flex flex-1">
      {/* ── 왼쪽 사이드바 (데스크탑) ── */}
      <div className="hidden md:flex w-52 shrink-0 border-r border-gray-200 flex-col sticky top-16 h-[calc(100vh-4rem)] self-start">
        <NavSidebar activeView={activeView} onViewChange={setActiveView} userRole={userRole}
          balance={balance} userPlan={userPlan} session={session} />
      </div>

      {/* ── 중간 패널 — 프로젝트 탭일 때만 표시 (데스크탑) ── */}
      {activeView === "generator" && (
        <div className="hidden md:flex w-60 shrink-0 border-r border-gray-200 flex-col overflow-y-auto">
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
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-5 md:py-6">
            {/* ── 콘셉트/스타일 (스타일 찾기 + 자동화 세팅) ── */}
            {activeView === "studio" && (
              <div>
                <div className="mb-6 flex gap-2">
                  {[
                    { k: "style", label: "🔍 스타일 찾기" },
                    { k: "auto",  label: "⚙️ 자동화 세팅" },
                  ].map((t) => (
                    <button key={t.k} onClick={() => setStudioTab(t.k)}
                      className={`rounded-xl px-4 py-2 text-sm font-bold transition ${studioTab === t.k ? "bg-[#03C75A] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {studioTab === "style" && (
                  <div className="max-w-2xl mx-auto">
                    <h2 className="text-xl font-black text-gray-900 mb-2">🔍 스타일 찾기</h2>
                    <p className="text-sm text-gray-400 mb-6">숏폼 영상 URL을 분석해서 대본 스타일을 라이브러리에 저장해요. 저장한 스타일은 옆 <b>자동화 세팅</b>에서 적용합니다.</p>
                    <StyleFinderView session={session} onImport={(id: string) => { setStyleProfileId(id); setStudioTab("auto"); }} />
                  </div>
                )}

                {studioTab === "auto" && (
                  <AutoSettingsView
                    targetSeconds={targetSeconds} setTargetSeconds={setTargetSeconds}
                    styleProfileId={styleProfileId} setStyleProfileId={setStyleProfileId}
                    ctaText={ctaText} setCtaText={setCtaText}
                    subtitleStyle={subtitleStyle} setSubtitleStyle={setSubtitleStyle}
                    thumbnailStyle={thumbnailStyle} setThumbnailStyle={setThumbnailStyle}
                    showThumbnail={showThumbnail} setShowThumbnail={setShowThumbnail}
                    voiceId={voiceId} setVoiceId={setVoiceId}
                    voiceSpeed={voiceSpeed} setVoiceSpeed={setVoiceSpeed}
                    voiceVolume={voiceVolume} setVoiceVolume={setVoiceVolume}
                    userPlan={userPlan}
                    selectedSubtitlePresetId={selectedSubtitlePresetId} setSelectedSubtitlePresetId={setSelectedSubtitlePresetId}
                    selectedThumbnailPresetId={selectedThumbnailPresetId} setSelectedThumbnailPresetId={setSelectedThumbnailPresetId}
                    session={session}
                  />
                )}
              </div>
            )}
            {activeView === "history" && (
              <>
                <h2 className="text-xl font-black text-gray-900 mb-6">📹 생성 내역</h2>
                <HistoryView session={session} onGoToLinks={()=>setActiveView("product-search")} />
              </>
            )}
            {activeView === "product-search" && (
              <ProductSearchView session={session} />
            )}
            {activeView === "settings" && (
              <SettingsView session={session} supabase={supabase} balance={balance} userPlan={userPlan} />
            )}
            {activeView === "admin" && userRole === "super_admin" && (
              <AdminView session={session} supabase={supabase} />
            )}
            {activeView === "partner" && (userRole === "partner" || userRole === "super_admin") && (
              <PartnerView session={session} supabase={supabase} />
            )}
          </div>
        )}
        {/* 영상 생성 뷰 — generator일 때만 표시 */}
        {activeView === "generator" && <>
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5">
          <div className="space-y-0">

          {/* 모바일: 프로젝트 드롭다운 */}
          <div className="md:hidden mb-4">
            <button onClick={() => setMobileProjOpen(v => !v)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 active:scale-[0.99] transition">
              <span>📁 내 프로젝트 — 생성 · 선택 · 삭제</span>
              <span className="text-xs text-gray-400 transition-transform" style={{ transform: mobileProjOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
            </button>
            {mobileProjOpen && (
              <div className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <ProjectPanel
                  compact
                  activeView="generator"
                  current={currentData}
                  onLoad={(d) => { handleLoad(d); setMobileProjOpen(false); }}
                  onReset={() => { handleReset(); setMobileProjOpen(false); }}
                  session={session}
                  styleProfileId={styleProfileId} onSelectStyle={setStyleProfileId}
                />
              </div>
            )}
          </div>

          <StagePanel n={1} title="영상 분석" subtitle="URL 입력 → 관련 TikTok 클립 검색 → 담기" current={stage}
            headerRight={
              <button onClick={() => setShowTips(true)}
                className="shrink-0 rounded-full border border-amber-400/60 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-400/20 transition flex items-center gap-1">
                팁 ⭐
              </button>
            }>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">쇼핑 릴스 / 쇼츠 URL</label>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <input type="url" value={sourceUrl}
                    onChange={e => { setSourceUrl(e.target.value); setClips([]); setCart(new Set()); }}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="https://www.tiktok.com/@... 또는 https://www.instagram.com/reel/..."
                    disabled={searching}
                    className="flex-1 rounded-xl bg-gray-100 border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-[#03C75A] focus:ring-1 focus:ring-[#03C75A] disabled:opacity-50 transition" />
                  <button onClick={handleSearch} disabled={searching || !sourceUrl.trim()}
                    className="w-full sm:w-auto shrink-0 rounded-xl bg-[#03C75A] px-5 py-3 text-sm font-bold text-white hover:bg-[#02b350] disabled:opacity-40 transition flex items-center justify-center gap-2">
                    {searching
                      ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />분석 중...</>
                      : "🔍 분석 시작 (10 CR)"}
                  </button>
                </div>
                {searchError && <p className="mt-2 text-sm text-red-400">{searchError}</p>}
                {searching && (
                  <div className="mt-3 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-700 flex items-center gap-3">
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#03C75A] border-t-transparent" />
                    영상 분석 후 TikTok 클립 검색 중... (30초~2분 소요)
                  </div>
                )}
              </div>

              {clips.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">
                      검색 결과 <span className="text-gray-400 font-normal">{clips.length}개</span>
                    </span>
                    <span className="text-sm font-bold text-[#03C75A]">{cart.size}개 담음</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {clips.map(clip => (
                      <ClipCard key={clip.video_id} clip={clip}
                        selected={cart.has(clip.video_id)} onToggle={() => toggleCart(clip.video_id)} />
                    ))}
                  </div>
                  {cart.size > 0 && (
                    <FloatingNext label={autoRunning ? (autoRunStep || "처리 중...") : `🚀 자동 생성 (${cart.size}개)`}
                      onClick={() => { if (!autoRunning) { setModalCtaText(ctaText); setShowAutoModal(true); } }}
                      disabled={autoRunning} />
                  )}
                  {!autoRunning && autoRunError && (
                    <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
                      <span>❌</span>
                      <div className="flex-1">
                        <div className="font-semibold">자동 생성 실패</div>
                        <div className="text-red-300/80 mt-0.5">{autoRunError}</div>
                        <div className="text-red-300/60 text-xs mt-1">영상 합성 크레딧은 합성 단계에서 차감되며, 합성 전에 실패한 경우 차감되지 않습니다. 잠시 후 다시 시도해 주세요. (영상 분석 10 CR은 별도로 차감됩니다)</div>
                      </div>
                      <button onClick={() => setAutoRunError("")} className="text-red-300/60 hover:text-red-300">✕</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </StagePanel>


          </div>
        </div>
        </> /* generator view end */}
      </div>
      </div>
    </div>
  );
}

// ── Stage Bar ─────────────────────────────────────────────────
const STAGE_LABELS = ["영상 분석", "영상 선택", "컷편집 & 대본 생성", "스타일", "보이스", "SEO + 내보내기"];
// ── 플로팅 다음 버튼 ──────────────────────────────────────────
// ── VoicePanel ───────────────────────────────────────────────
const VOICE_PREVIEW_URL = "https://oxygqtbdpnxxcgzwdlzi.supabase.co/functions/v1/voice-preview";

function VoicePanel({ voiceId, setVoiceId, voiceSpeed, setVoiceSpeed, voiceVolume, setVoiceVolume, userPlan }: {
  voiceId: string; setVoiceId: (v: string) => void;
  voiceSpeed: number; setVoiceSpeed: (v: number) => void;
  voiceVolume: number; setVoiceVolume: (v: number) => void;
  userPlan?: string | null;
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
        {([["basic","일반 음성"],["pro","고급 음성"]] as [string,string][]).map(([v,l]) => {
          const isProLocked = v === "pro" && userPlan !== "pro" && userPlan !== "master" && userPlan !== "enterprise";
          return (
            <button key={v} onClick={() => !isProLocked && setTab(v as any)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition border relative ${
                tab===v ? "border-[#03C75A] bg-[#03C75A]/10 text-[#03C75A]" :
                isProLocked ? "border-gray-200 text-gray-600 cursor-not-allowed" :
                "border-gray-200 text-gray-400 hover:border-gray-500"
              }`}>
              {v === "pro" ? "✨ " : ""}{l}
              {isProLocked && <span className="ml-1 text-xs text-gray-600">🔒 Pro+</span>}
            </button>
          );
        })}
        <button onClick={handlePreview}
          className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition border ${previewing ? "border-[#03C75A] bg-[#03C75A]/10 text-[#03C75A] animate-pulse" : "border-gray-200 text-gray-400 hover:border-gray-500 hover:text-gray-900"}`}>
          {previewing ? "⏸" : "▶"} 미리듣기
        </button>
      </div>

      {/* 음성 목록 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {(tab === "basic" ? VOICES_BASIC : VOICES_PRO).map(v => (
          <button key={v.id} onClick={() => {
            handleSetVoiceId(v.id);
          }}
            className={`rounded-xl border px-4 py-3 text-left transition ${voiceId===v.id ? "border-[#03C75A] bg-[#03C75A]/10" : "border-gray-200 hover:border-gray-500"}`}>
            <p className={`text-sm font-bold ${voiceId===v.id ? "text-[#03C75A]" : "text-gray-900"}`}>{v.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{v.desc}</p>

          </button>
        ))}
      </div>

      {/* 속도 + 볼륨 — 권장: 120%~150% */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-700">
            말하기 속도 <span className="text-[#03C75A] font-black">{voiceSpeed}%</span>
            <span className="text-xs text-gray-500 ml-1.5">120~150% 권장</span>
          </label>
          <input type="range" min={80} max={160} step={5} value={voiceSpeed}
            onChange={e => handleSetSpeed(Number(e.target.value))} className="w-full accent-[#03C75A]" />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>느림</span><span>기본</span><span>빠름</span>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-700">
            소리 크기 <span className="text-[#03C75A] font-black">{voiceVolume}%</span>
            <span className="text-xs text-gray-500 ml-1.5">120~150% 권장</span>
          </label>
          <input type="range" min={50} max={150} step={5} value={voiceVolume}
            onChange={e => setVoiceVolume(Number(e.target.value))} className="w-full accent-[#03C75A]" />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>작게</span><span>기본</span><span>크게</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingPrev({ onClick }: { onClick: () => void }) {
  return createPortal(
    <div style={{ position:"fixed", bottom:"96px", right:"160px", zIndex:50 }}>
      <button onClick={onClick}
        style={{ height:"46px", display:"inline-flex", alignItems:"center", gap:"8px",
                 background:"#374151", borderRadius:"16px", padding:"0 20px",
                 fontSize:"14px", fontWeight:900, color:"white", border:"none",
                 cursor:"pointer", boxShadow:"0 4px 6px rgba(0,0,0,0.4)" }}>
        <span>←</span><span>이전</span>
      </button>
    </div>,
    document.body
  );
}

function FloatingNext({ label, onClick, disabled = false }: {
  label: string; onClick: () => void; disabled?: boolean;
}) {
  return createPortal(
    <div style={{ position:"fixed", bottom:"96px", right:"16px", zIndex:50 }}>
      <button onClick={onClick} disabled={disabled}
        style={{ height:"46px", display:"inline-flex", alignItems:"center", gap:"8px",
                 background: disabled ? "rgba(3,199,90,0.4)" : "#03C75A",
                 borderRadius:"16px", padding:"0 24px",
                 fontSize:"14px", fontWeight:900, color:"white", border:"none",
                 cursor: disabled ? "not-allowed" : "pointer",
                 boxShadow:"0 18px 40px -12px rgba(3,199,90,0.35)" }}>
        <span>{label}</span><span>→</span>
      </button>
    </div>,
    document.body
  );
}

// ── Stage 4 Panel ────────────────────────────────────────────
const FONTS = [
  // 기본 (Google Fonts / CDN 로딩)
  { label: "노토 산스",            value: "'Noto Sans KR', sans-serif" },
  { label: "프리텐다드",           value: "'Pretendard', sans-serif" },
  { label: "나눔고딕",             value: "'Nanum Gothic', sans-serif" },
  { label: "나눔명조",             value: "'NanumMyeongjo', serif" },
  { label: "검은고딕",             value: "'Black Han Sans', sans-serif" },
  { label: "배달의민족 주아체",     value: "'Jua', sans-serif" },
  { label: "배달의민족 도현체",     value: "'Do Hyeon', sans-serif" },
  // 추가 번들 (self-host woff2)
  { label: "에스코어 드림",        value: "'S-Core Dream', sans-serif" },
  { label: "G마켓 산스",           value: "'Gmarket Sans', sans-serif" },
  { label: "티몬 소리체",          value: "'TmonMonsori', sans-serif" },
  { label: "나눔스퀘어 네오",      value: "'NanumSquare Neo', sans-serif" },
  { label: "리디바탕",             value: "'RIDIBatang', serif" },
  { label: "카페24 동동체",        value: "'Cafe24 Dongdong', sans-serif" },
  { label: "배달의민족 연성체",     value: "'BM YEONSUNG', sans-serif" },
  { label: "레시피코리아체",       value: "'Recipekorea', sans-serif" },
  { label: "티웨이 항공체",        value: "'tway_air', sans-serif" },
  { label: "여기어때 잘난체",      value: "'Jalnan', sans-serif" },
  { label: "넷마블체",             value: "'netmarble', sans-serif" },
  { label: "쿠키런체",             value: "'CookieRun', sans-serif" },
  { label: "서울남산체",           value: "'SeoulNamsan', sans-serif" },
  { label: "라인 Seed",            value: "'LINE Seed Sans KR', sans-serif" },
  { label: "창원단감아삭체",       value: "'ChangwonDangamAsac', sans-serif" },
  { label: "스웨거체",             value: "'Swagger TTF', sans-serif" },
  { label: "원스토어 모바일고딕",   value: "'ONE Mobile', sans-serif" },
  { label: "온글잎 의연체",        value: "'Ownglyph EuiyeonChae', sans-serif" },
  { label: "미리내체",             value: "'Ownglyph mirinaeman', sans-serif" },
  { label: "빙그레 싸만코체",      value: "'Binggrae Samanco', sans-serif" },
  { label: "이순신돋움체",         value: "'YiSunShin Dotum M', sans-serif" },
];

type SubtitleStyle = {
  fontFamily: string; color: string; fontSize: number;
  fontWeight: "400"|"700"|"900";
  strokeColor: string; strokeWidth: number; strokeOn: boolean;
  bgOn: boolean; bgColor: string; bgOpacity: number; bgRadius?: number;
  yPos: number; xPos: number;
};

function Stage4Panel({ subtitleStyle, setSubtitleStyle, thumbnailStyle, setThumbnailStyle, showThumbnail, setShowThumbnail, previewFrames, previewScript, session,
  selectedSubtitlePresetId, setSelectedSubtitlePresetId,
  selectedThumbnailPresetId, setSelectedThumbnailPresetId,
  onNext }: {
  subtitleStyle: SubtitleStyle; setSubtitleStyle: (v: SubtitleStyle) => void;
  thumbnailStyle: SubtitleStyle; setThumbnailStyle: (v: SubtitleStyle) => void;
  showThumbnail: boolean; setShowThumbnail: (v: boolean) => void;
  previewFrames: string[]; previewScript: string[]; session: any;
  selectedSubtitlePresetId: string; setSelectedSubtitlePresetId: (v: string) => void;
  selectedThumbnailPresetId: string; setSelectedThumbnailPresetId: (v: string) => void;
  onNext: () => void;
}) {
  const [tab, setTab] = useState<"subtitle"|"thumbnail">("subtitle");
  const [frameIdx, setFrameIdx] = useState(0);
  const [scriptIdx, setScriptIdx] = useState(0);
  const [subtitlePresets, setSubtitlePresets] = useState<any[]>([]);
  const [thumbnailPresets, setThumbnailPresets] = useState<any[]>([]);
  const [presetName, setPresetName] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const selectedPresetId = tab === "subtitle" ? selectedSubtitlePresetId : selectedThumbnailPresetId;
  const setSelectedPresetId = (id: string) => {
    if (tab === "subtitle") setSelectedSubtitlePresetId(id);
    else setSelectedThumbnailPresetId(id);
  };
  const [presetToast, setPresetToast] = useState("");
  // 프리뷰 문구 — 사용자가 직접 수정, localStorage 저장
  const [previewCaption, setPreviewCaption] = useState<string>(
    () => localStorage.getItem("chronit_preview_caption") || ""
  );
  const updPreviewCaption = (v: string) => {
    setPreviewCaption(v);
    localStorage.setItem("chronit_preview_caption", v);
  };
  // 프리뷰 배경 — 흰/검 선택 (자막 가독성 확인용)
  const [previewBg, setPreviewBg] = useState<"black" | "white">(
    () => (localStorage.getItem("chronit_preview_bg") as "black" | "white") || "black"
  );
  const updPreviewBg = (v: "black" | "white") => {
    setPreviewBg(v);
    localStorage.setItem("chronit_preview_bg", v);
  };

  const showToast = (msg: string) => {
    setPresetToast(msg);
    setTimeout(() => setPresetToast(""), 2500);
  };

  const loadPresets = async (targetTab?: string) => {
    const t = targetTab ?? tab;
    const { data } = await supabase
      .from("subtitle_presets")
      .select("*")
      .eq("type", t)
      .order("created_at", { ascending: false });
    if (t === "subtitle") setSubtitlePresets(data ?? []);
    else setThumbnailPresets(data ?? []);
  };

  const savePreset = async (currentStyle: any, currentTab: string) => {
    if (!presetName.trim() || !session?.user?.id) return;
    // supabase 클라이언트 대신 명시적 token 전달 (RLS auth.uid() 보장)
    const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWdxdGJkcG54eGNnendkbHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTU4NTYsImV4cCI6MjA5MjMzMTg1Nn0.G8ZtLSZf9rWRbKlrEUchEmFUEBdV4J2L1s_5rGEPZjY";
    const resp = await fetch("https://oxygqtbdpnxxcgzwdlzi.supabase.co/rest/v1/subtitle_presets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
        "apikey": SB_ANON,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ user_id: session.user.id, name: presetName.trim(), type: currentTab, style_json: currentStyle }),
    });
    if (resp.ok || resp.status === 201) {
      const kind = currentTab === "subtitle" ? "자막" : "썸네일";
      showToast(`✅ ${kind} "${presetName.trim()}" 프리셋 저장됨`);
      setPresetName(""); setShowPresets(false);
      loadPresets(currentTab);
    } else {
      const err = await resp.text();
      console.error("프리셋 저장 실패:", resp.status, err);
    }
  };

  const deletePreset = async (id: string, name: string, kind: string) => {
    await supabase.from("subtitle_presets").delete().eq("id", id);
    showToast(`🗑 ${kind} "${name}" 프리셋 삭제됨`);
    setSelectedPresetId("");
    loadPresets(kind === "자막" ? "subtitle" : "thumbnail");
  };

  React.useEffect(() => { loadPresets("subtitle"); loadPresets("thumbnail"); }, []);
  // tab 변경 시 selectedPresetId 초기화 제거 — VideoGenerator state에서 관리

  const s = tab === "subtitle" ? subtitleStyle : thumbnailStyle;
  const setS = tab === "subtitle" ? setSubtitleStyle : setThumbnailStyle;
  const upd = (k: keyof SubtitleStyle, v: any) => setS({ ...s, [k]: v });

  const frame = previewFrames[frameIdx] || "";
  // ★ 프리뷰 스케일 — 출력은 1080px 기준 fontSize×6.4, 프리뷰 박스는 300px.
  //   둘을 같은 비율로 보이게: 6.4 × (300/1080) ≈ 1.778 배로 프리뷰에 표시 ★
  const PREVIEW_SCALE = 6.4 * (300 / 1080);
  // 프리뷰는 "한 장면"만 보여줌 — 출력의 KSS 장면별 줄바꿈은 프리뷰에 적용하지 않음.
  //   사용자가 입력한 문구를 그대로 표시 (줄바꿈은 직접 입력한 경우만 반영).
  const previewText =
    previewCaption.trim() ||
    (previewScript.length > 0 ? previewScript[scriptIdx % previewScript.length] : "") ||
    "와, 드디어 샀다";

  const toTextStyle = (st: SubtitleStyle): React.CSSProperties => ({
    fontFamily: st.fontFamily,
    color: st.color,
    fontSize: `${st.fontSize * PREVIEW_SCALE}px`,
    fontWeight: st.fontWeight,
    // WebkitTextStroke + paintOrder:stroke fill → 바깥쪽 절반만 보임.
    //   렌더(ASS Outline은 글자 바깥 전체)와 두께를 맞추려면 ×2 해야 실제와 일치.
    WebkitTextStroke: st.strokeOn ? `${st.strokeWidth * PREVIEW_SCALE * 2}px ${st.strokeColor}` : undefined,
    paintOrder: st.strokeOn ? "stroke fill" : undefined,
    lineHeight: 1.3,
    whiteSpace: "nowrap",
    textAlign: "center",
    display: "inline-block",
  });
  const toBgStyle = (st: SubtitleStyle): React.CSSProperties => st.bgOn ? {
    backgroundColor: `${st.bgColor}${Math.round(st.bgOpacity * 2.55).toString(16).padStart(2, "0")}`,
    padding: `${4 * PREVIEW_SCALE}px ${12 * PREVIEW_SCALE}px`,
    borderRadius: `${st.bgRadius ?? 6}px`,
    // 박스 안에서 글씨를 수직 중앙 정렬 — line-height 여백으로 박스가 처지는 문제 해결
    display: "inline-flex", alignItems: "center", lineHeight: 1,
  } : { display: "inline-block" };

  const stylePanel = (
    <div className="space-y-4">
      {/* 글씨체 */}
      <div>
        <label className="text-xs font-bold text-gray-400 block mb-1.5">글씨체</label>
        <select value={s.fontFamily} onChange={e => upd("fontFamily", e.target.value)}
          className="w-full rounded-xl bg-gray-100 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#03C75A]"
          style={{ fontFamily: s.fontFamily }}>
          {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>
      {/* 색상 + 두께 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-400 block mb-1.5">색상</label>
          <ColorPalette value={s.color} onChange={(c) => upd("color", c)} />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 block mb-1.5">두께</label>
          <div className="flex gap-1">
            {([["400","보통"],["700","굵게"]] as [string,string][]).map(([w,l]) => (
              <button key={w} onClick={() => upd("fontWeight", w as any)}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition border ${s.fontWeight===w ? "border-[#03C75A] bg-[#03C75A]/10 text-[#03C75A]" : "border-gray-200 text-gray-400"}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      {/* 크기 */}
      <div>
        <label className="text-xs font-bold text-gray-400 block mb-1.5">
          크기 <span className="text-[#03C75A]">{s.fontSize}px</span>
        </label>
        <input type="range" min={10} max={20} step={1} value={s.fontSize}
          onChange={e => upd("fontSize", Number(e.target.value))} className="w-full accent-[#03C75A]" />
      </div>
      {/* 위치 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-400 block mb-1.5">Y <span className="text-[#03C75A]">{s.yPos}%</span></label>
          <input type="range" min={5} max={95} value={s.yPos}
            onChange={e => upd("yPos", Number(e.target.value))} className="w-full accent-[#03C75A]" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 block mb-1.5">X <span className="text-[#03C75A]">{s.xPos}%</span></label>
          <input type="range" min={5} max={95} value={s.xPos}
            onChange={e => upd("xPos", Number(e.target.value))} className="w-full accent-[#03C75A]" />
        </div>
      </div>
      <button onClick={() => setS({ ...s, yPos: 75, xPos: 50 })}
        className="text-xs text-gray-500 hover:text-[#03C75A] transition underline">↺ 위치 초기화</button>
      {/* 외곽선 */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-gray-400">외곽선</label>
          <button onClick={() => upd("strokeOn", !s.strokeOn)}
            className={`rounded-full px-3 py-1 text-xs font-black transition ${s.strokeOn ? "bg-[#03C75A] text-white" : "bg-gray-200 text-gray-400"}`}>
            {s.strokeOn ? "ON" : "OFF"}
          </button>
        </div>
        {s.strokeOn && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">색상</label>
              <ColorPalette value={s.strokeColor} onChange={(c) => upd("strokeColor", c)} />
            </div>
            <div>
              <label className="text-xs text-gray-400">두께 {s.strokeWidth}px</label>
              <input type="range" min={1} max={8} step={0.5} value={s.strokeWidth}
                onChange={e => upd("strokeWidth", Number(e.target.value))} className="w-full accent-[#03C75A] mt-1" />
            </div>
          </div>
        )}
      </div>
      {/* 배경 */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-gray-400">배경</label>
          <button onClick={() => upd("bgOn", !s.bgOn)}
            className={`rounded-full px-3 py-1 text-xs font-black transition ${s.bgOn ? "bg-[#03C75A] text-white" : "bg-gray-200 text-gray-400"}`}>
            {s.bgOn ? "ON" : "OFF"}
          </button>
        </div>
        {s.bgOn && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">색상</label>
              <ColorPalette value={s.bgColor} onChange={(c) => upd("bgColor", c)} />
            </div>
            <div>
              <label className="text-xs text-gray-400">불투명도 {s.bgOpacity}%</label>
              <input type="range" min={10} max={100} step={5} value={s.bgOpacity}
                onChange={e => upd("bgOpacity", Number(e.target.value))} className="w-full accent-[#03C75A] mt-1" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400">모서리 곡률 {s.bgRadius ?? 6}px</label>
              <input type="range" min={0} max={16} step={1} value={s.bgRadius ?? 6}
                onChange={e => upd("bgRadius", Number(e.target.value))} className="w-full accent-[#03C75A] mt-1" />
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
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition border ${tab===v ? "border-[#03C75A] bg-[#03C75A]/10 text-[#03C75A]" : "border-gray-200 text-gray-400"}`}>
              {v === "subtitle" ? "자막 스타일" : "썸네일 스타일"}
            </button>
          ))}
        </div>

        {/* 프리셋 패널 */}
        {(() => {
          const presets = tab === "subtitle" ? subtitlePresets : thumbnailPresets;
          const kind = tab === "subtitle" ? "자막" : "썸네일";
          const selectedPreset = presets.find(p => p.id === selectedPresetId);
          return (
            <div className="rounded-xl bg-white border border-gray-200 p-3 space-y-2">
              {/* 토스트 */}
              {presetToast && (
                <div className="rounded-lg bg-gray-100 border border-[#03C75A]/40 px-3 py-2 text-xs text-[#03C75A] font-bold">
                  {presetToast}
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-900">{kind} 프리셋</p>
                <button onClick={() => loadPresets(tab)}
                  className="text-xs text-gray-500 hover:text-gray-900 transition px-1.5">⟳</button>
              </div>
              {/* 드롭다운 + 적용/삭제 */}
              <div className="flex gap-1.5">
                <select
                  value={selectedPresetId}
                  onChange={e => {
                    setSelectedPresetId(e.target.value);
                    const p = presets.find(p => p.id === e.target.value);
                    if (p) setS(p.style_json);
                  }}
                  className="flex-1 rounded-lg bg-gray-100 border border-gray-200 px-2 py-2 text-xs text-gray-900 outline-none focus:border-[#03C75A]"
                >
                  <option value="">✕  없음 (기본)</option>
                  {presets.map(p => (
                    <option key={p.id} value={p.id}>📌  {p.name}</option>
                  ))}
                </select>
                {selectedPresetId && (
                  <button
                    onClick={() => {
                      if (selectedPreset) deletePreset(selectedPreset.id, selectedPreset.name, kind);
                    }}
                    className="shrink-0 rounded-lg border border-red-500/40 px-2.5 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 transition">
                    삭제
                  </button>
                )}
                <button onClick={() => setShowPresets(v => !v)}
                  className={`shrink-0 rounded-lg border px-2.5 py-2 text-xs font-bold transition ${showPresets ? "border-[#03C75A] text-[#03C75A] bg-[#03C75A]/10" : "border-gray-200 text-gray-400 hover:border-gray-500"}`}>
                  저장
                </button>
              </div>
              {/* 저장 폼 */}
              {showPresets && (
                <div className="flex gap-1.5 pt-1">
                  <input value={presetName} onChange={e => setPresetName(e.target.value)}
                    onKeyDown={e => { if (e.key==="Enter") savePreset(s, tab); if (e.key==="Escape") setShowPresets(false); }}
                    placeholder={`${kind} 프리셋 이름`}
                    autoFocus
                    className="flex-1 rounded-lg bg-gray-100 border border-[#03C75A] px-3 py-1.5 text-xs text-gray-900 outline-none" />
                  <button onClick={() => savePreset(s, tab)} disabled={!presetName.trim()}
                    className="rounded-lg bg-[#03C75A] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#02b350] disabled:opacity-40 transition">
                    확인
                  </button>
                  <button onClick={() => setShowPresets(false)}
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-400">✕</button>
                </div>
              )}
            </div>
          );
        })()}

        {tab === "subtitle" && stylePanel}

        {tab === "thumbnail" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {[true, false].map(v => (
                <button key={String(v)} onClick={() => setShowThumbnail(v)}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition ${showThumbnail===v ? "border-[#03C75A] bg-[#03C75A]/10 text-[#03C75A]" : "border-gray-200 text-gray-400"}`}>
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
        <div className="relative rounded-2xl overflow-hidden border border-gray-200"
          style={{ width: 300, height: 533, backgroundColor: previewBg === "white" ? "#FFFFFF" : "#000000" }}>
          <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
            <div style={{
              position: "absolute",
              top: `${s.yPos}%`,
              left: `${s.xPos}%`,
              transform: "translate(-50%, -50%)",
              textAlign: "center",
            }}>
              <span style={{ ...toTextStyle(s), ...toBgStyle(s) }}>{previewText}</span>
            </div>
          </div>
        </div>
        {/* 배경 흰/검 선택 */}
        <div className="flex gap-1.5">
          {([["black","검정"],["white","흰색"]] as ["black"|"white",string][]).map(([v,l]) => (
            <button key={v} onClick={() => updPreviewBg(v)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition border ${previewBg===v ? "border-[#03C75A] bg-[#03C75A]/10 text-[#03C75A]" : "border-gray-200 text-gray-400"}`}>{l} 배경</button>
          ))}
        </div>
        {/* 프리뷰 문구 직접 수정 */}
        <input
          type="text"
          value={previewCaption}
          onChange={e => updPreviewCaption(e.target.value)}
          placeholder="프리뷰 문구 입력 (비우면 기본 문구)"
          className="w-[300px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 placeholder-gray-500 focus:border-[#03C75A] focus:outline-none"
        />
        {previewFrames.length > 1 && (
          <div className="flex gap-1.5">
            {previewFrames.slice(0,5).map((_, i) => (
              <button key={i} onClick={() => setFrameIdx(i)}
                className={`h-2 w-2 rounded-full transition ${i===frameIdx ? "bg-[#03C75A]" : "bg-gray-600"}`} />
            ))}
          </div>
        )}
        {previewScript.length > 1 && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <button onClick={() => setScriptIdx(i => Math.max(0, i-1))} className="hover:text-gray-900">‹</button>
            <span>{(scriptIdx % previewScript.length)+1}/{previewScript.length}</span>
            <button onClick={() => setScriptIdx(i => i+1)} className="hover:text-gray-900">›</button>
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
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWdxdGJkcG54eGNnendkbHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTU4NTYsImV4cCI6MjA5MjMzMTg1Nn0.G8ZtLSZf9rWRbKlrEUchEmFUEBdV4J2L1s_5rGEPZjY",
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
          className="rounded-xl border border-gray-200 p-2.5 cursor-pointer hover:border-[#03C75A]/50 transition">
          <p className="text-xs font-bold text-gray-900 truncate">{s.label || "스타일"}</p>
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
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWdxdGJkcG54eGNnendkbHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTU4NTYsImV4cCI6MjA5MjMzMTg1Nn0.G8ZtLSZf9rWRbKlrEUchEmFUEBdV4J2L1s_5rGEPZjY",
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
        <div key={j.id} className="rounded-xl border border-gray-200 p-2.5 space-y-1">
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs font-bold text-gray-900 truncate">{j.product_name || j.id?.slice(0,8)}</p>
            <span className={`text-xs font-bold shrink-0 ${
              j.status==="succeeded" ? "text-green-400" :
              j.status==="processing" ? "text-[#03C75A] animate-pulse" : "text-gray-500"}`}>
              {STATUS[j.status] || j.status}
            </span>
          </div>
          {j.output_url && (
            <a href={j.output_url} target="_blank" rel="noopener"
              className="block text-xs text-[#03C75A] hover:text-[#03C75A] underline truncate">
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
// 카카오톡 공유 (JS SDK) — 도메인 등록 후 동작, 실패 시 복사 폴백
const KAKAO_JS_KEY = (import.meta as any).env?.VITE_KAKAO_JS_KEY || "353a4888db09fd32ef2f787755cd758a";
const KAKAO_SHARE_IMG = "https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/icon.png";
function ensureKakao(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    const init = () => { try { if (w.Kakao && !w.Kakao.isInitialized()) w.Kakao.init(KAKAO_JS_KEY); resolve(w.Kakao); } catch(e){ reject(e); } };
    if (w.Kakao?.isInitialized?.()) return resolve(w.Kakao);
    if (w.Kakao) return init();
    const existing = document.getElementById("kakao-sdk") as HTMLScriptElement | null;
    if (existing) { existing.addEventListener("load", init); existing.addEventListener("error", ()=>reject(new Error("kakao sdk"))); return; }
    const s = document.createElement("script");
    s.id = "kakao-sdk";
    s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
    s.async = true;
    s.onload = init;
    s.onerror = () => reject(new Error("kakao sdk load fail"));
    document.head.appendChild(s);
  });
}

function CreditHistoryModal({ open, onClose, session }: { open:boolean; onClose:()=>void; session:any }) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(()=>{ if(!open||!session) return; (async()=>{
    setLoading(true);
    try {
      const { data } = await supabase
        .from("credit_transactions")
        .select("id,delta,reason,balance_after,created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setRows(Array.isArray(data) ? data : []);
    } catch { setRows([]); }
    setLoading(false);
  })(); }, [open, session]);

  if (!open) return null;
  const fmt = (d:string)=> d ? new Date(d).toLocaleString("ko-KR",{year:"2-digit",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}) : "-";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white border border-gray-200 p-6 max-h-[85vh] flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-black text-gray-900">📒 크레딧 사용 내역</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-xl">✕</button>
        </div>
        <p className="text-xs text-gray-500 mb-4">최근 100건까지 표시됩니다</p>

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <p className="py-10 text-center text-sm text-gray-500">불러오는 중...</p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">아직 내역이 없어요</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {rows.map(r=>{
                const plus = (r.delta ?? 0) >= 0;
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{r.reason || "변동"}</p>
                      <p className="text-[11px] text-gray-400">{fmt(r.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-black ${plus ? "text-[#03C75A]" : "text-gray-700"}`}>
                        {plus ? "+" : ""}{Number(r.delta ?? 0).toLocaleString()}
                      </p>
                      {r.balance_after !== null && r.balance_after !== undefined && (
                        <p className="text-[11px] text-gray-400">잔액 {Number(r.balance_after).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button onClick={onClose} className="w-full mt-4 rounded-xl bg-gray-100 hover:bg-gray-200 py-3 text-sm font-bold text-gray-700">닫기</button>
      </div>
    </div>,
    document.body
  );
}

function CreditMissionsModal({ open, onClose, session }: { open:boolean; onClose:()=>void; session:any }) {
  const [info, setInfo] = React.useState<any>(null);
  const [reviewUrl, setReviewUrl] = React.useState("");
  const [reviewMsg, setReviewMsg] = React.useState<{ok:boolean;text:string}|null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [copiedCode, setCopiedCode] = React.useState(false);

  React.useEffect(()=>{ if(!open||!session) return; (async()=>{
    try { const { data } = await supabase.rpc("get_referral_info_rpc", { p_user_id: session.user.id }); setInfo(data); } catch {}
  })(); }, [open, session]);

  if (!open) return null;
  const code = info?.referral_code || "";
  const link = code ? `${window.location.origin}/?ref=${code}` : "생성 중...";
  const invites = info?.invite_count ?? 0;
  const reviewStatus = info?.review_status ?? "none";

  const copyLink = async () => { if(!code) return; try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(()=>setCopied(false),1500);} catch {} };
  const copyCode = async () => { if(!code) return; try { await navigator.clipboard.writeText(code); setCopiedCode(true); setTimeout(()=>setCopiedCode(false),1500);} catch {} };
  const shareKakao = async () => {
    if (!code) return;
    try {
      const Kakao = await ensureKakao();
      Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: "엄마도 하는 쇼핑 영상 부수입, 크로닛 🎬",
          description: "추천 링크로 가입하면 둘 다 500 크레딧! 지금 무료로 시작해보세요.",
          imageUrl: KAKAO_SHARE_IMG,
          link: { mobileWebUrl: link, webUrl: link },
        },
        buttons: [{ title: "크로닛 시작하기", link: { mobileWebUrl: link, webUrl: link } }],
      });
    } catch {
      // 카카오 미설정/도메인 미등록 시 복사로 폴백
      copyLink();
    }
  };
  const submitReview = async () => {
    const u = reviewUrl.trim();
    if (!u) return;
    setSubmitting(true); setReviewMsg(null);
    try {
      const { data, error } = await supabase.rpc("submit_review_rpc", { p_url: u });
      if (error) throw error;
      if (data?.ok) { setReviewMsg({ok:true, text:data.message||"제출 완료. 검토 후 지급됩니다."}); setReviewUrl(""); }
      else setReviewMsg({ok:false, text:data?.error||"제출 실패"});
    } catch(e){ setReviewMsg({ok:false, text:String(e)}); }
    setSubmitting(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white border border-gray-200 p-6 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-black text-gray-900">🎁 크레딧 더 받기</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-xl">✕</button>
        </div>
        <p className="text-xs text-gray-500 mb-5">미션을 완료하면 크레딧이 지급됩니다</p>

        {/* 미션 A — 추천 */}
        <div className="rounded-2xl bg-gray-100/60 border border-gray-200 p-4 mb-3">
          <span className="inline-block rounded-lg bg-[#03C75A] text-white text-xs font-bold px-2.5 py-1 mb-2">미션 A · +500 크레딧</span>
          <p className="text-sm text-gray-700 mb-3">지인에게 내 추천 코드/링크를 공유하세요. 지인이 가입하면 <b className="text-gray-900">양쪽 모두 500 크레딧</b>이 즉시 지급됩니다.</p>

          {/* 내 추천 코드 (블로그·카페용) */}
          <div className="flex items-center gap-2 mb-2 rounded-xl bg-white border border-[#03C75A]/40 px-3 py-2">
            <span className="text-xs text-gray-500 shrink-0">내 추천 코드</span>
            <span className="font-mono text-lg font-black tracking-[0.2em] text-[#03C75A]">{code || "생성 중..."}</span>
            <button onClick={copyCode} disabled={!code} className="ml-auto shrink-0 rounded-lg bg-[#03C75A] hover:bg-[#02b350] disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-white">{copiedCode?"✓ 복사됨":"코드 복사"}</button>
          </div>
          <p className="text-[11px] text-gray-500 mb-3">블로그·카페엔 코드만 적어도 돼요 — 예) "제 추천 코드는 <b className="text-gray-700">{code || "OOOO"}</b> 예요"</p>

          <div className="flex gap-2">
            <input readOnly value={link} className="flex-1 rounded-xl bg-white border border-gray-200 px-3 py-2 text-xs text-gray-700 outline-none truncate" />
            <button onClick={copyLink} className="shrink-0 rounded-xl bg-[#03C75A] hover:bg-[#02b350] px-4 py-2 text-sm font-bold text-white">{copied?"✓ 복사됨":"링크 복사"}</button>
            <button onClick={shareKakao} className="shrink-0 rounded-xl bg-[#FEE500] hover:brightness-95 px-3 py-2 text-sm font-bold text-[#3C1E1E]">💬 카톡</button>
          </div>
          <p className="text-xs text-gray-600 mt-2">현재 {invites}명 초대함</p>
        </div>

        {/* 미션 B — 후기 */}
        <div className="rounded-2xl bg-gray-100/60 border border-gray-200 p-4">
          <span className="inline-block rounded-lg bg-purple-600 text-white text-xs font-bold px-2.5 py-1 mb-2">미션 B · +1000 크레딧</span>
          <p className="text-sm text-gray-700 mb-3">네이버 카페, 블로그, 커뮤니티 등에 크로닛 사용 후기를 <b className="text-gray-900">전체 공개</b>로 작성한 뒤 URL을 입력해주세요. 확인 후 <b className="text-gray-900">1000 크레딧</b>이 지급됩니다.</p>
          {reviewStatus==="approved" ? (
            <div className="rounded-xl px-3 py-2.5 text-sm text-center bg-green-500/15 text-green-400">✅ 후기 승인 — 1000 크레딧 지급 완료</div>
          ) : reviewStatus==="pending" ? (
            <div className="rounded-xl px-3 py-2.5 text-sm text-center bg-white text-gray-400">⏳ 검토 중입니다</div>
          ) : (
            <>
              <div className="flex gap-2">
                <input value={reviewUrl} onChange={e=>setReviewUrl(e.target.value)} placeholder="https://cafe.naver.com/..."
                  className="flex-1 rounded-xl bg-white border border-gray-200 px-3 py-2 text-xs text-gray-900 placeholder-gray-600 outline-none focus:border-purple-500" />
                <button onClick={submitReview} disabled={submitting||!reviewUrl.trim()} className="shrink-0 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 px-4 py-2 text-sm font-bold text-white">{submitting?"...":"제출"}</button>
              </div>
              {reviewStatus==="rejected" && !reviewMsg && <p className="text-xs text-red-400 mt-2">이전 제출이 반려되었습니다. 다시 제출할 수 있어요.</p>}
              {reviewMsg && <p className={`text-xs mt-2 ${reviewMsg.ok?"text-green-400":"text-red-400"}`}>{reviewMsg.text}</p>}
            </>
          )}
        </div>

        <button onClick={onClose} className="w-full mt-5 rounded-xl bg-gray-100 hover:bg-gray-200 py-3 text-sm font-bold text-gray-700">닫기</button>
      </div>
    </div>,
    document.body
  );
}

function NavSidebar({ activeView, onViewChange, userRole, balance, userPlan, session }: {
  activeView: string; onViewChange: (v:string)=>void; userRole: string;
  balance: number|null; userPlan: string|null; session: any;
}) {
  const [extractRunning, setExtractRunning] = React.useState(
    _extractMgr.state?.status==="starting" || _extractMgr.state?.status==="processing");
  React.useEffect(()=>{
    const l = (s:any)=>setExtractRunning(s?.status==="starting"||s?.status==="processing");
    _extractMgr.listeners.add(l);
    return ()=>{ _extractMgr.listeners.delete(l); };
  }, []);
  const [showMissions, setShowMissions] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const isPartner = userRole === "partner" || userRole === "super_admin";
  const isAdmin = userRole === "super_admin";
  const GROUPS = [
    { title: "제작", items: [
      { v: "generator",      label: "프로젝트" },
      { v: "product-search", label: "내 링크" },
    ]},
    { title: "기록", items: [
      { v: "history", label: "생성 내역" },
    ]},
    { title: "설정", items: [
      { v: "studio",   label: "콘셉트/스타일" },
      { v: "settings", label: "결제·계정" },
    ]},
    ...(isPartner || isAdmin ? [{ title: "관리", items: [
      ...(isPartner ? [{ v: "partner", label: "파트너스", icon: "📊" }] : []),
      ...(isAdmin ? [{ v: "admin", label: "관리자", icon: "👑" }] : []),
    ]}] : []),
  ];
  return (
    <div className="flex flex-col h-full">
      {/* 로고 */}
      <div className="px-5 py-5 border-b border-gray-200">
        <p className="text-sm font-black text-gray-900 tracking-tight">CHRONIT</p>
        <p className="text-xs text-gray-600 mt-0.5">쇼핑 릴스 자동화</p>
      </div>
      {/* 탭 */}
      <div className="px-2 py-3 flex-1 overflow-y-auto">
        {GROUPS.map((g)=>(
          <div key={g.title} className="space-y-0.5 border-t border-gray-200 pt-4 mt-4 first:border-0 first:pt-0 first:mt-0">
            <p className="px-3 pb-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider">{g.title}</p>
            {g.items.map(({ v, label, icon }:any)=>(
              <button key={v} onClick={()=>onViewChange(v)}
                className={`w-full text-left rounded-xl px-3 py-3 text-base font-bold transition flex items-center gap-2.5 ${activeView===v ? "bg-[#03C75A]/15 text-[#03C75A]" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"}`}>
                {icon && <span className="text-lg">{icon}</span>}
                <span>{label}</span>
                {v==="product-search" && extractRunning && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-[#03C75A] animate-pulse" title="검색어 추출 중" />
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
      {/* 크레딧 받기 CTA */}
      <div className="px-3 pt-2 space-y-2">
        <a href="https://forms.gle/LCDeSEXSM7ALykqv5" target="_blank" rel="noreferrer"
          className="block text-center rounded-xl bg-[#E8F8EE] border border-[#03C75A]/40 px-3 py-2 leading-tight transition hover:bg-[#dcf3e6]"><span className="block text-[11px] font-bold text-[#222222]">📝 피드백 쓰고</span><span className="block font-black text-[#222222]"><span className="text-lg text-[#03C75A]">500 CR</span> 받기</span></a>
        <button onClick={()=>setShowMissions(true)}
          className="w-full text-center rounded-xl bg-[#FEE500] hover:bg-[#f5dd00] px-3 py-2.5 text-sm font-bold text-[#222222] transition">🎁 무료 크레딧 받기</button>
      </div>
      {/* 하단 계정/플랜/크레딧 */}
      <div className="border-t border-gray-200 px-4 py-3 space-y-1.5 mt-2">
        <p className="text-xs text-gray-600 truncate">{session?.user?.email}</p>
        {userPlan && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">플랜</span>
            <span className="font-bold text-gray-900 capitalize">{userPlan}</span>
          </div>
        )}
        {balance !== null && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">크레딧</span>
            <span className="font-black text-[#03C75A]">💎 {balance.toLocaleString()}</span>
          </div>
        )}
        <button onClick={()=>setShowHistory(true)}
          className="w-full mt-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 transition">📒 크레딧 사용 내역</button>
      </div>
      <CreditMissionsModal open={showMissions} onClose={()=>setShowMissions(false)} session={session} />
      <CreditHistoryModal open={showHistory} onClose={()=>setShowHistory(false)} session={session} />
    </div>
  );
}

// ── ProjectPanel — 중간 패널 (탭별 내용) ─────────────────────
const PROJ_KEY = "chronit_projects_v2";
function getProjs(): any[] { try { return JSON.parse(localStorage.getItem(PROJ_KEY)||"[]"); } catch { return []; } }
function saveProjs(ps: any[]) { localStorage.setItem(PROJ_KEY, JSON.stringify(ps.slice(0,20))); }

function ProjectPanel({ activeView, current, onLoad, onReset, session, styleProfileId, onSelectStyle, compact = false }: {
  activeView: string; current: any; onLoad: (d:any)=>void; onReset: ()=>void;
  session: any; styleProfileId: string; onSelectStyle: (id:string)=>void; compact?: boolean;
}) {
  const uid = session?.user?.id;
  const [projects, setProjects] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string|null>(() => { try { return localStorage.getItem("chronit_active_proj") || null; } catch { return null; } });
  const [editingId, setEditingId] = useState<string|null>(null);
  const [newName, setNewName] = useState<string|null>(null);
  const STAGE_LABELS = ["영상 분석","영상 선택","대본 생성","스타일","보이스","완료"];

  const persistActive = (id: string|null) => { try { if (id) localStorage.setItem("chronit_active_proj", id); else localStorage.removeItem("chronit_active_proj"); } catch {} };
  const rowToProj = (r: any) => ({ id: r.id, name: r.name, stage: r.stage, data: r.data, savedAt: new Date(r.saved_at).getTime() });

  // DB에서 프로젝트 로드 (+ 기존 localStorage 1회 마이그레이션)
  useEffect(() => {
    if (!uid) return;
    (async () => {
      const { data } = await supabase.from("projects").select("id,name,stage,data,saved_at").eq("user_id", uid).order("saved_at", { ascending: false });
      let rows = (data || []).map(rowToProj);
      try {
        const local = JSON.parse(localStorage.getItem(PROJ_KEY) || "[]");
        if (rows.length === 0 && local.length > 0) {
          const up = local.map((p: any) => ({ id: p.id, user_id: uid, name: p.name, stage: p.stage || 1, data: p.data || {}, saved_at: new Date(p.savedAt || Date.now()).toISOString() }));
          await supabase.from("projects").upsert(up);
          rows = local.map((p: any) => ({ id: p.id, name: p.name, stage: p.stage || 1, data: p.data || {}, savedAt: p.savedAt || Date.now() }));
        }
      } catch {}
      setProjects(rows);
    })();
  }, [uid]);

  const createProject = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (projects.some(p => p.name === trimmed)) { alert(`"${trimmed}" 이름이 이미 있습니다.`); return; }

    // 현재 진행 중인 작업이 있으면 자동 저장
    if (activeId && current && (current.stage > 1 || (current.clips && current.clips.length > 0))) {
      await supabase.from("projects").update({ stage: current.stage, data: current, saved_at: new Date().toISOString() }).eq("user_id", uid).eq("id", activeId);
      setProjects(ps => ps.map(p => p.id === activeId ? { ...p, savedAt: Date.now(), stage: current.stage, data: current } : p));
    }

    const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    const entry = { id, name: trimmed, savedAt: Date.now(), stage: 1, data: {} };
    await supabase.from("projects").insert({ id, user_id: uid, name: trimmed, stage: 1, data: {}, saved_at: new Date().toISOString() });
    setProjects(ps => [entry, ...ps]); setActiveId(id); persistActive(id);
    onReset(); // 화면은 초기화하되 이전 프로젝트는 저장됨
    setNewName(null);
  };

  const saveProject = async () => {
    if (!activeId) { setNewName(""); return; }
    await supabase.from("projects").update({ stage: current.stage, data: current, saved_at: new Date().toISOString() }).eq("user_id", uid).eq("id", activeId);
    setProjects(ps => ps.map(p => p.id === activeId ? { ...p, savedAt: Date.now(), stage: current.stage, data: current } : p));
  };

  const loadProject = (p: any) => {
    onLoad(p.data || {});
    setActiveId(p.id);
    persistActive(p.id);
  };

  const delProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("projects").delete().eq("user_id", uid).eq("id", id);
    setProjects(ps => ps.filter(p => p.id !== id));
    if (activeId === id) { setActiveId(null); persistActive(null); }
  };

  const renameProject = async (id: string, name: string) => {
    const nm = name.trim();
    if (nm) {
      await supabase.from("projects").update({ name: nm }).eq("user_id", uid).eq("id", id);
      setProjects(ps => ps.map(p => p.id === id ? { ...p, name: nm } : p));
    }
    setEditingId(null);
  };

  if (activeView === "generator") return (
    <div className={compact ? "flex flex-col" : "flex flex-col h-full"}>
      {!compact && (
      <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
        <p className="text-xs font-black text-gray-900">프로젝트</p>
        <button onClick={saveProject} className="text-xs text-gray-500 hover:text-[#03C75A] transition">💾</button>
      </div>
      )}
      <div className={compact ? "px-3 py-3 space-y-2 max-h-[55vh] overflow-y-auto" : "flex-1 overflow-y-auto px-3 py-3 space-y-2"}>
        {/* 새 프로젝트 */}
        {newName === null ? (
          <button onClick={() => setNewName("")}
            className="w-full rounded-xl bg-[#03C75A] py-2 text-xs font-black text-white hover:bg-[#02b350] transition">
            + 새 프로젝트
          </button>
        ) : (
          <div className="space-y-1.5">
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key==="Enter") createProject(newName); if (e.key==="Escape") setNewName(null); }}
              placeholder="프로젝트 이름"
              className="w-full rounded-xl bg-gray-100 border border-[#03C75A] px-3 py-2 text-xs text-gray-900 outline-none" />
            <div className="flex gap-1.5">
              <button onClick={() => createProject(newName)} className="flex-1 rounded-lg bg-[#03C75A] py-1.5 text-xs font-black text-white">확인</button>
              <button onClick={() => setNewName(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-400">✕</button>
            </div>
          </div>
        )}
        {/* 프로젝트 목록 */}
        {projects.length === 0
          ? <p className="text-xs text-gray-600 text-center py-6">저장된 프로젝트가 없습니다</p>
          : projects.map(p => (
            <div key={p.id} onClick={() => loadProject(p)}
              className={`rounded-xl border p-2.5 cursor-pointer transition group ${activeId===p.id ? "border-[#03C75A] bg-[#03C75A]/10" : "border-gray-200 hover:border-gray-500"}`}>
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0 flex-1">
                  {editingId === p.id ? (
                    <input autoFocus defaultValue={p.name}
                      className="w-full bg-gray-100 text-xs font-bold text-gray-900 rounded px-1 py-0.5 outline-none border border-[#03C75A]"
                      onBlur={e => renameProject(p.id, e.target.value)}
                      onKeyDown={e => { if (e.key==="Enter") renameProject(p.id, (e.target as HTMLInputElement).value); }}
                      onClick={e => e.stopPropagation()} />
                  ) : (
                    <p className="text-xs font-bold text-gray-900 truncate">{p.name}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">{STAGE_LABELS[(p.stage||1)-1]} · {new Date(p.savedAt).toLocaleDateString("ko")}</p>
                </div>
                <div className={`flex shrink-0 transition ${compact ? "gap-3" : "gap-1 opacity-0 group-hover:opacity-100"}`}>
                  <button onClick={e=>{e.stopPropagation();setEditingId(p.id);}} className={`text-gray-500 hover:text-[#03C75A] ${compact ? "text-base px-1" : "text-xs"}`}>✎</button>
                  <button onClick={e=>delProject(p.id,e)} className={`text-gray-500 hover:text-red-400 ${compact ? "text-base px-1" : "text-xs"}`}>✕</button>
                </div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );

  if (activeView === "studio") return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-200">
        <p className="text-xs font-black text-gray-900">저장된 스타일</p>
        <p className="text-xs text-gray-500 mt-0.5">클릭해서 자동화에 적용</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <StyleLibraryList session={session} onSelect={onSelectStyle} selectedId={styleProfileId} />
      </div>
    </div>
  );

  return (
    <div className="px-4 py-4">
      <p className="text-xs font-black text-gray-900 capitalize">{activeView}</p>
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
      <div className="rounded-xl bg-gray-100 border border-gray-200 overflow-hidden"
        style={{ aspectRatio: "9/16", position: "relative" }}>
        {currentClip?.thumbnail_url ? (
          <video ref={videoRef} src={currentClip.video_url || ""}
            poster={currentClip.thumbnail_url}
            className="absolute inset-0 w-full h-full object-cover"
            muted playsInline />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
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
              className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold transition ${currentClipIdx===i ? "bg-[#03C75A] text-white" : "bg-gray-100 text-gray-400"}`}>
              #{i+1}
            </button>
          ))}
        </div>
      )}

      <button onClick={handlePlay}
        className="w-full rounded-xl border border-gray-200 py-2 text-xs font-bold text-gray-700 hover:text-gray-900 hover:border-gray-500 transition flex items-center justify-center gap-1.5">
        {playing ? "⏸ 일시정지" : "▶ 동기 재생"}
      </button>

      {/* 세그먼트 타임라인 */}
      {currentVoiceClip && (
        <div className="space-y-1">
          {currentVoiceClip.segments?.map((seg: any) => (
            <div key={seg.idx} className="flex items-center gap-1.5 text-xs">
              <span className="text-[#03C75A] font-bold w-5 shrink-0">#{seg.idx+1}</span>
              <span className="flex-1 text-gray-700 truncate">{seg.text}</span>
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

// ── AutoSettingsView — 자동화 세팅 (Stage 2~5 통합) ────────
function AutoSettingsView({
  targetSeconds, setTargetSeconds,
  styleProfileId, setStyleProfileId,
  ctaText, setCtaText,
  subtitleStyle, setSubtitleStyle,
  thumbnailStyle, setThumbnailStyle,
  showThumbnail, setShowThumbnail,
  voiceId, setVoiceId,
  voiceSpeed, setVoiceSpeed,
  voiceVolume, setVoiceVolume,
  userPlan,
  selectedSubtitlePresetId, setSelectedSubtitlePresetId,
  selectedThumbnailPresetId, setSelectedThumbnailPresetId,
  session,
}: {
  targetSeconds: number; setTargetSeconds: (v:number)=>void;
  styleProfileId: string; setStyleProfileId: (v:string)=>void;
  ctaText: string; setCtaText: (v:string)=>void;
  subtitleStyle: any; setSubtitleStyle: (v:any)=>void;
  thumbnailStyle: any; setThumbnailStyle: (v:any)=>void;
  showThumbnail: boolean; setShowThumbnail: (v:boolean)=>void;
  voiceId: string; setVoiceId: (v:string)=>void;
  voiceSpeed: number; setVoiceSpeed: (v:number)=>void;
  voiceVolume: number; setVoiceVolume: (v:number)=>void;
  userPlan?: string | null;
  selectedSubtitlePresetId: string; setSelectedSubtitlePresetId: (v:string)=>void;
  selectedThumbnailPresetId: string; setSelectedThumbnailPresetId: (v:string)=>void;
  session: any;
}) {
  const DURATIONS = [
    { s: 10, label: "10초", sub: "숏 / 2~3 클립" },
    { s: 15, label: "15초", sub: "기본 / 4~5 클립" },
    { s: 20, label: "20초", sub: "미들 / 5~6 클립" },
    { s: 30, label: "30초", sub: "롱 / 6+ 클립" },
  ];

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-xl font-black text-gray-900 mb-1">⚙️ 자동화 세팅</h2>
        <p className="text-sm text-gray-400">한 번 설정해두면 자동 생성마다 그대로 사용됩니다.</p>
      </div>

      {/* 영상 길이 */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-4">
        <p className="text-sm font-black text-gray-900">📐 영상 길이</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DURATIONS.map(({ s, label, sub }) => (
            <button key={s} onClick={() => setTargetSeconds(s)}
              className={`rounded-xl border p-3 text-center transition ${targetSeconds===s ? "border-[#03C75A] bg-[#03C75A]/10" : "border-gray-200 hover:border-gray-500"}`}>
              <p className={`text-sm font-black ${targetSeconds===s ? "text-[#03C75A]" : "text-gray-900"}`}>{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 대본 스타일 */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-3">
        <p className="text-sm font-black text-gray-900">🎨 대본 스타일</p>
        <StyleSelector selected={styleProfileId} onSelect={setStyleProfileId} session={session} />
      </div>

      {/* 음성 설정 */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-3">
        <p className="text-sm font-black text-gray-900">🔊 음성 설정</p>
        <VoicePanel voiceId={voiceId} setVoiceId={setVoiceId}
          voiceSpeed={voiceSpeed} setVoiceSpeed={setVoiceSpeed}
          voiceVolume={voiceVolume} setVoiceVolume={setVoiceVolume} userPlan={userPlan} />
      </div>

      {/* 자막 스타일 */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-3">
        <p className="text-sm font-black text-gray-900">📝 자막 스타일</p>
        <Stage4Panel
          subtitleStyle={subtitleStyle} setSubtitleStyle={setSubtitleStyle}
          thumbnailStyle={thumbnailStyle} setThumbnailStyle={setThumbnailStyle}
          showThumbnail={showThumbnail} setShowThumbnail={setShowThumbnail}
          previewFrames={[]} previewScript={[]}
          session={session}
          selectedSubtitlePresetId={selectedSubtitlePresetId} setSelectedSubtitlePresetId={setSelectedSubtitlePresetId}
          selectedThumbnailPresetId={selectedThumbnailPresetId} setSelectedThumbnailPresetId={setSelectedThumbnailPresetId}
          onNext={() => {}} />
      </div>
    </div>
  );
}

// ── StyleLibraryList — 저장된 스타일 목록 ───────────────────
function StyleLibraryList({ session, onSelect, selectedId }: { session: any; onSelect: (id:string)=>void; selectedId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWdxdGJkcG54eGNnendkbHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTU4NTYsImV4cCI6MjA5MjMzMTg1Nn0.G8ZtLSZf9rWRbKlrEUchEmFUEBdV4J2L1s_5rGEPZjY";
  useEffect(() => {
    if (!session) return;
    (async () => {
      const r = await fetch("https://oxygqtbdpnxxcgzwdlzi.supabase.co/rest/v1/style_profiles?select=*&status=eq.done&order=updated_at.desc",
        { headers: { Authorization: `Bearer ${session.access_token}`, apikey: ANON }});
      const d = await r.json(); setItems(Array.isArray(d) ? d : []);
    })();
  }, [session]);
  const del = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("이 스타일을 삭제할까요?")) return;
    try {
      await fetch(`https://oxygqtbdpnxxcgzwdlzi.supabase.co/rest/v1/style_profiles?id=eq.${id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}`, apikey: ANON } });
      setItems(prev => prev.filter(s => s.id !== id));
      if (selectedId === id) onSelect("auto");
    } catch {}
  };
  if (!items.length) return <p className="text-xs text-gray-600 text-center py-6">저장된 스타일이 없습니다</p>;
  return (
    <div className="space-y-1.5">
      {items.map(s => (
        <div key={s.id} onClick={() => onSelect(s.id)}
          className={`group rounded-xl border p-2.5 cursor-pointer transition ${selectedId===s.id ? "border-[#03C75A] bg-[#03C75A]/10" : "border-gray-200 hover:border-gray-500"}`}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold text-gray-900 truncate flex-1">{s.label}</p>
            <button onClick={(e)=>del(s.id, e)} title="삭제"
              className="shrink-0 text-gray-600 hover:text-red-400 text-xs leading-none px-1">✕</button>
          </div>
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
      <div className="px-6 py-5 border-b border-gray-200">
        <h1 className="text-lg font-black text-gray-900 tracking-tight">CHRONIT</h1>
        <p className="text-xs text-gray-500 mt-0.5">쇼핑 릴스 자동화</p>
      </div>
      {/* 탭 네비 */}
      <div className="px-3 py-3 space-y-0.5">
        {([
          ["generator","📁  프로젝트"],
          ["product-search","🔗  내 링크"],
          ["studio","🎨  콘셉트/스타일"],
          ["history","📹  생성 내역"],
          ["settings","⚙️  결제·계정"],
        ] as [string,string][]).map(([v,l])=>(
          <button key={v} onClick={()=>onViewChange(v)}
            className={`w-full text-left rounded-xl px-4 py-2.5 text-sm font-bold transition ${activeView===v ? "bg-[#03C75A]/15 text-[#03C75A]" : "text-gray-400 hover:bg-gray-100 hover:text-gray-900"}`}>
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
                className="w-full rounded-xl bg-[#03C75A] py-2.5 text-sm font-black text-white hover:bg-[#02b350] transition flex items-center justify-center gap-1.5">
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
                  className="w-full rounded-xl bg-gray-100 border border-[#03C75A] px-3 py-2 text-sm text-gray-900 outline-none placeholder-gray-500" />
                <div className="flex gap-2">
                  <button onClick={() => saveProject(newProjectName)}
                    className="flex-1 rounded-xl bg-[#03C75A] py-2 text-xs font-black text-white hover:bg-[#02b350] transition">
                    확인
                  </button>
                  <button onClick={() => setNewProjectName(null)}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-400 hover:text-gray-900 transition">
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
                    className={`rounded-xl border p-2.5 cursor-pointer transition group ${activeProjectId===p.id ? "border-[#03C75A] bg-[#03C75A]/10" : "border-gray-200 hover:border-gray-500"}`}
                    onClick={()=>{ onLoad(p.data); setActiveProjectId(p.id); }}>
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        {editingId === p.id ? (
                          <input autoFocus defaultValue={p.name}
                            className="w-full bg-gray-100 text-xs font-bold text-gray-900 rounded px-1 py-0.5 outline-none border border-[#03C75A]"
                            onBlur={e => { renameProject(p.id, e.target.value); setEditingId(null); }}
                            onKeyDown={e => { if (e.key==="Enter") { renameProject(p.id, (e.target as HTMLInputElement).value); setEditingId(null); } }}
                            onClick={e => e.stopPropagation()} />
                        ) : (
                          <p className="text-xs font-bold text-gray-900 truncate">{p.name}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5">{STAGE_LABELS[(p.stage||1)-1]} · {new Date(p.savedAt).toLocaleDateString("ko")}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                        <button onClick={e=>{e.stopPropagation();setEditingId(p.id);}}
                          className="text-gray-500 hover:text-[#03C75A] text-xs">✎</button>
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
      <div className="border-t border-gray-200 px-4 py-3 space-y-1.5 shrink-0">
        <p className="text-xs text-gray-600 truncate">{session?.user?.email}</p>
        {userPlan && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">플랜</span>
            <span className="text-xs font-bold text-gray-900 capitalize">{userPlan}</span>
          </div>
        )}
        {balance !== null && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">크레딧</span>
            <span className="text-sm font-black text-[#03C75A]">💎 {balance.toLocaleString()} CR</span>
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
                done ? "bg-[#03C75A] text-white" :
                active ? "bg-[#03C75A]/20 border-2 border-[#03C75A] text-[#03C75A]" :
                "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}>{done ? "✓" : n}</div>
              <span className={`text-xs font-bold hidden md:block whitespace-nowrap ${
                active ? "text-[#03C75A]" : done ? "text-gray-900" : "text-gray-500"
              }`}>{label}</span>
            </button>
            {i < STAGE_LABELS.length - 1 && (
              <div className={`w-4 h-0.5 mx-1 shrink-0 ${done ? "bg-[#03C75A]" : "bg-gray-100"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Stage Panel ───────────────────────────────────────────────
function StagePanel({ n, title, subtitle, current, children, headerRight }: {
  n: number; title: string; subtitle: string; current: number; children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  if (n !== current) return null; // 현재 단계만 표시
  return (
    <div className="rounded-2xl border border-[#03C75A]/50 bg-white shadow-[0_0_20px_rgba(3,199,90,0.10)]">
      <div className="px-6 py-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-[#03C75A]/20 border-2 border-[#03C75A] text-[#03C75A]">{n}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-gray-900">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        {headerRight}
      </div>
      <div className="px-6 pb-6 border-t border-gray-200">
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
  const rawUrl = clip.download_url || clip.video_url || "";
  const proxyUrl = rawUrl
    ? `https://oxygqtbdpnxxcgzwdlzi.supabase.co/functions/v1/video-proxy?url=${encodeURIComponent(rawUrl)}`
    : "";
  const handlePlay = async () => {
    if (!proxyUrl && !rawUrl) return;
    setPlaying(true);
  };
  const thumbSrc = !imgError && clip.thumbnail_url ? clip.thumbnail_url : "";

  return (
    <div className={`relative rounded-xl overflow-hidden border-2 transition-all ${
      selected ? "border-[#03C75A] shadow-[0_0_10px_rgba(3,199,90,0.25)]" : "border-gray-200 hover:border-gray-500"
    }`}>
      <div className="aspect-[9/16] bg-gray-100 relative cursor-pointer"
        onClick={() => playing ? setPlaying(false) : handlePlay()}>
        {playing && (proxyUrl || rawUrl) ? (
          <video src={proxyUrl || rawUrl} autoPlay playsInline controls={false}
            className="w-full h-full object-cover"
            onClick={e => { e.stopPropagation(); setPlaying(false); }}
            onError={() => { setPlaying(false); }} />
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
          <div className="absolute top-1.5 left-1.5 h-5 w-5 rounded-full bg-[#03C75A] flex items-center justify-center">
            <span className="text-white text-xs font-black">✓</span>
          </div>
        )}
      </div>
      <div className="p-1.5 bg-white flex items-center justify-between gap-1">
        <div className="min-w-0">
          <p className="text-xs text-gray-900 font-medium line-clamp-1">{clip.title || "(제목 없음)"}</p>
          <p className="text-xs text-gray-500">@{clip.author || "?"}</p>
        </div>
        <button onClick={e => { e.stopPropagation(); onToggle(); }}
          className={`shrink-0 rounded-lg px-2 py-1 text-xs font-black transition ${
            selected
              ? "bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30"
              : "bg-[#03C75A] text-white hover:bg-[#02b350]"
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
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.cls}`}>{s.icon} {s.label}</span>
          <p className="mt-1.5 truncate text-sm text-gray-700">{job.product_url}</p>
          <p className="mt-0.5 text-xs text-gray-500">{new Date(job.created_at).toLocaleString("ko-KR")} · {job.credits_used} CR</p>
          {job.status === "error" && job.error_message && <p className="mt-1 text-xs text-red-400">{job.error_message}</p>}
        </div>
        {job.status === "done" && job.video_url && (
          <a href={job.video_url + (job.video_url.includes("?")?"&":"?") + "download=" + encodeURIComponent((job.product_name||"chronit")+".mp4")} className="shrink-0 rounded-xl bg-[#03C75A] px-3 py-2 text-xs font-bold text-white hover:bg-[#02b350] transition">다운로드</a>
        )}
        {job.status === "done" && !job.video_url && job.expired && (
          <span className="shrink-0 text-xs text-gray-500">⌛ 보관 만료(3일)</span>
        )}
        {(job.status === "pending" || job.status === "processing") && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#03C75A] border-t-transparent shrink-0" />
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
      .then(d => { if (d.ok) setProfiles((d.profiles ?? []).filter((p:any)=> p.status ? p.status==='done' : true)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWdxdGJkcG54eGNnendkbHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTU4NTYsImV4cCI6MjA5MjMzMTg1Nn0.G8ZtLSZf9rWRbKlrEUchEmFUEBdV4J2L1s_5rGEPZjY";
  const del = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("이 스타일을 삭제할까요?")) return;
    try {
      await fetch(`https://oxygqtbdpnxxcgzwdlzi.supabase.co/rest/v1/style_profiles?id=eq.${id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${session?.access_token}`, apikey: ANON } });
      setProfiles(prev => prev.filter(p => p.id !== id));
      if (selected === id) onSelect("auto");
    } catch {}
  };

  const selectedProfile = profiles.find(p => p.id === selected);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-bold text-gray-700">대본 스타일 <span className="text-xs font-normal text-[#03C75A]">(직접 추가 권장)</span></label>
        {loading && <span className="text-xs text-gray-500">불러오는 중...</span>}
      </div>

      {/* 자동 선택 옵션 */}
      <div className="grid grid-cols-1 gap-2 mb-3">
        <button onClick={() => onSelect("auto")}
          className={`rounded-xl border p-3 text-left transition ${
            selected === "auto" ? "border-[#03C75A] bg-[#03C75A]/10" : "border-gray-200 hover:border-gray-500"
          }`}>
          <p className={`text-sm font-bold ${selected === "auto" ? "text-[#03C75A]" : "text-gray-900"}`}>
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
              <div key={p.id} onClick={() => onSelect(p.id)}
                className={`relative rounded-xl border p-3 text-left transition cursor-pointer ${
                  selected === p.id ? "border-[#03C75A] bg-[#03C75A]/10" : "border-gray-200 hover:border-gray-500"
                }`}>
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-bold truncate ${selected === p.id ? "text-[#03C75A]" : "text-gray-900"}`}>
                    📌 {p.label || "(이름 없음)"}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {selected === p.id && <span className="text-xs text-[#03C75A] font-bold">선택됨</span>}
                    <button onClick={(e)=>del(p.id, e)} title="삭제"
                      className="text-gray-600 hover:text-red-400 text-sm leading-none px-1">✕</button>
                  </div>
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
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && profiles.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-500">저장된 스타일이 없습니다</p>
          <p className="text-xs text-gray-600 mt-1">앱의 <span className="text-gray-400 font-bold">스타일 찾기</span> 탭에서 스타일을 저장하면 여기에 표시됩니다</p>
        </div>
      )}

      {/* 선택된 스타일 미리보기 */}
      {selectedProfile && (
        <div className="mt-3 rounded-xl bg-gray-100 p-3 text-xs text-gray-400 space-y-1">
          {selectedProfile.tone?.speaker && <p>화자: <span className="text-gray-700">{selectedProfile.tone.speaker}</span></p>}
          {selectedProfile.structure?.hook && <p>훅: <span className="text-gray-700">{selectedProfile.structure.hook}</span></p>}
          {selectedProfile.source_title && <p>원본: <span className="text-gray-700">{selectedProfile.source_title}</span></p>}
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
  const [copied, setCopied] = React.useState(false);
  const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWdxdGJkcG54eGNnendkbHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTU4NTYsImV4cCI6MjA5MjMzMTg1Nn0.G8ZtLSZf9rWRbKlrEUchEmFUEBdV4J2L1s_5rGEPZjY";
  const PENDING_KEY = "chronit_pending_style";
  const pollRef = React.useRef<any>(null);

  const pollStyle = React.useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    const tick = async () => {
      try {
        const r = await fetch(`https://oxygqtbdpnxxcgzwdlzi.supabase.co/rest/v1/style_profiles?id=eq.${id}&select=*`,
          { headers: { Authorization: `Bearer ${session.access_token}`, apikey: ANON } });
        const rows = await r.json();
        const row = Array.isArray(rows) ? rows[0] : null;
        if (!row) return;
        if (row.status === "done") {
          clearInterval(pollRef.current); pollRef.current = null;
          localStorage.removeItem(PENDING_KEY);
          const pj = typeof row.profile_json === "string" ? JSON.parse(row.profile_json || "{}") : (row.profile_json || {});
          setResult({ id: row.id, label: row.label, source_channel: row.source_channel, ...pj });
          setLoading(false);
        } else if (row.status === "error") {
          clearInterval(pollRef.current); pollRef.current = null;
          localStorage.removeItem(PENDING_KEY);
          setError(row.error || "분석 실패"); setLoading(false);
        }
      } catch { /* 네트워크 일시 오류는 다음 tick에서 재시도 */ }
    };
    pollRef.current = setInterval(tick, 3000);
    tick();
  }, [session]);

  // 백그라운드 진행 중이던 작업 복원 (다른 탭 갔다 와도 / 새로고침 / 모바일 복귀)
  React.useEffect(() => {
    const pending = localStorage.getItem(PENDING_KEY);
    if (pending && session) { setLoading(true); pollStyle(pending); }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [session, pollStyle]);

  const run = async () => {
    if (!url.trim() || !session) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const r = await fetch("https://oxygqtbdpnxxcgzwdlzi.supabase.co/functions/v1/analyze-style", {
        method:"POST", headers:{Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"},
        body:JSON.stringify({source_url:url.trim()})});
      const d = await r.json();
      if (!d.ok || !d.profile_id) throw new Error(d.error ?? "분석 시작 실패");
      localStorage.setItem(PENDING_KEY, d.profile_id);  // 백그라운드 안전: 닫아도 webhook이 완료
      pollStyle(d.profile_id);
    } catch(e) { setError(String(e)); setLoading(false); }
  };
  const buildStylePrompt = (r: any): string => {
    const L: string[] = ["아래 쇼핑 숏폼 스타일을 그대로 따라 대본을 작성하세요.", ""];
    if (r.tone) {
      L.push("# 톤·말투");
      if (r.tone.speaker)   L.push(`- 화자: ${r.tone.speaker}`);
      if (r.tone.formality) L.push(`- 말투/격식: ${r.tone.formality}`);
      if (r.tone.energy)    L.push(`- 에너지/템포: ${r.tone.energy}`);
      L.push("");
    }
    if (r.structure) {
      L.push("# 구조");
      if (r.structure.hook) L.push(`- 훅(첫 줄): ${r.structure.hook}`);
      if (r.structure.body) L.push(`- 본론 전개: ${r.structure.body}`);
      if (r.structure.cta)  L.push(`- CTA: ${r.structure.cta}`);
      if (r.structure.beats?.length) {
        L.push("- 비트 흐름:");
        r.structure.beats.forEach((b: any) => L.push(`  · ${b.time}: ${b.desc}`));
      }
      L.push("");
    }
    if (r.subtitle) {
      L.push("# 자막 규칙");
      if (r.subtitle.avg_chars)  L.push(`- 평균 줄 길이: ${r.subtitle.avg_chars}`);
      if (r.subtitle.split_rule) L.push(`- 분할 규칙: ${r.subtitle.split_rule}`);
      if (r.subtitle.rhythm)     L.push(`- 리듬: ${r.subtitle.rhythm}`);
      if (r.subtitle.emphasis)   L.push(`- 강조: ${r.subtitle.emphasis}`);
    }
    return L.join("\n").trim();
  };
  const stylePrompt = result ? buildStylePrompt(result) : "";
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-3">
        <p className="text-sm font-bold text-gray-900">숏폼 링크 분석</p>
        <div className="flex gap-3">
          <input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&run()} disabled={loading}
            placeholder="https://www.instagram.com/p/..." className="flex-1 rounded-xl bg-gray-100 border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#03C75A] disabled:opacity-50" />
          <button onClick={run} disabled={loading||!url.trim()} className="rounded-xl bg-[#03C75A] px-5 py-2.5 text-sm font-black text-white hover:bg-[#02b350] disabled:opacity-40 transition">
            {loading ? "분석 중..." : "분석 시작"}
          </button>
        </div>
        {loading && <p className="text-xs text-[#03C75A] animate-pulse">AI 분석 중 (1~2분)... 다른 탭으로 이동하거나 앱을 닫아도 백그라운드에서 완료됩니다.</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
      {result && (
        <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-5 border-b border-gray-200">
            <div>
              <p className="font-black text-gray-900 text-lg">{result.label}</p>
              {result.source_channel && <p className="text-xs text-gray-500">@{result.source_channel}</p>}
            </div>
            <button onClick={()=>onImport(result.id)} className="shrink-0 rounded-xl bg-[#03C75A] px-4 py-2 text-sm font-black text-white hover:bg-[#02b350] transition">이 스타일 가져오기 →</button>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-[#03C75A] rounded" />
                <p className="font-bold text-gray-900 text-sm">GPT 프롬프트 (이 스타일 그대로 따라하기)</p>
              </div>
              <button
                onClick={async()=>{ try { await navigator.clipboard.writeText(stylePrompt); setCopied(true); setTimeout(()=>setCopied(false),1500);} catch{} }}
                className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-bold text-gray-900 hover:bg-gray-300 transition">
                {copied ? "복사됨 ✓" : "복사"}
              </button>
            </div>
            <pre className="whitespace-pre-wrap break-words rounded-xl bg-black/50 border border-gray-200 p-4 text-sm text-gray-700 leading-relaxed font-sans">{stylePrompt}</pre>
            <p className="text-xs text-green-400">✓ 라이브러리 저장 완료 · "가져오기"를 누르면 대본 생성에 이 스타일이 적용됩니다</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── HistoryView ───────────────────────────────────────────────
function HistoryView({ session, onGoToLinks }: { session: any; onGoToLinks?: ()=>void }) {
  const [jobs, setJobs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState<string|null>(null);
  const [saving, setSaving] = React.useState<string|null>(null);
  const [deleting, setDeleting] = React.useState<string|null>(null);
  React.useEffect(()=>{
    if(!session) return;
    (async()=>{
      try {
        const r = await fetch("https://oxygqtbdpnxxcgzwdlzi.supabase.co/rest/v1/video_jobs?select=*&order=created_at.desc&limit=50",
          {headers:{Authorization:`Bearer ${session.access_token}`,apikey:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWdxdGJkcG54eGNnendkbHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTU4NTYsImV4cCI6MjA5MjMzMTg1Nn0.G8ZtLSZf9rWRbKlrEUchEmFUEBdV4J2L1s_5rGEPZjY"}});
        const d = await r.json(); setJobs(Array.isArray(d)?d:[]);
      } catch {} finally { setLoading(false); }
    })();
  },[session]);
  if(loading) return <div className="text-gray-500 text-center py-10">불러오는 중...</div>;
  if(!jobs.length) return <div className="text-gray-500 text-center py-10">생성 내역이 없습니다</div>;
  const dlUrl = (j:any) => j.video_url
    ? j.video_url + (j.video_url.includes("?")?"&":"?") + "download=" + encodeURIComponent((j.product_name||"chronit")+".mp4")
    : "";

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && typeof document !== "undefined" && "ontouchend" in document);
  const isAndroid = /Android/i.test(ua);

  // 저장: iOS는 공유시트(사진에 저장), 안드로이드·PC는 파일을 직접 다운로드(다운로드 폴더 → 갤러리)
  const saveVideo = async (j:any) => {
    if (!j.video_url) return;
    const fname = (j.product_name||"chronit")+".mp4";
    setSaving(j.id);
    try {
      const resp = await fetch(j.video_url);
      const blob = await resp.blob();
      if (isIOS) {
        const file = new File([blob], fname, { type: "video/mp4" });
        if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
          await (navigator as any).share({ files: [file], title: j.product_name || "크로닛 영상" });
          return;
        }
      }
      // 안드로이드·PC: blob 직접 다운로드
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = fname;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 4000);
    } catch (e:any) {
      if (e?.name === "AbortError") return; // 사용자가 공유 취소
      const a = document.createElement("a"); a.href = dlUrl(j); a.download = fname;
      document.body.appendChild(a); a.click(); a.remove();
    } finally { setSaving(null); }
  };

  const copyText = async (text:string, key:string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(null), 1500); } catch {}
  };
  const seoFull = (j:any) =>
    `[제목]\n${j.seo_title||""}\n\n[설명]\n${j.seo_description||""}\n\n[해시태그]\n${j.seo_tags||""}`;
  // 메모/카톡 등으로 보내기 = 공유시트 / 미지원 시 복사
  const shareSeo = async (j:any) => {
    const text = seoFull(j);
    try {
      if ((navigator as any).share) { await (navigator as any).share({ text }); return; }
    } catch (e:any) { if (e?.name === "AbortError") return; }
    copyText(text, j.id+"-all");
  };

  const deleteJob = async (j:any) => {
    if (deleting) return;
    const ok = typeof window !== "undefined" && window.confirm("이 생성 내역을 삭제할까요?\n저장소에서 원본 영상이 완전히 삭제됩니다.\n(내 링크에 추가한 카드는 그대로 유지돼요.) 되돌릴 수 없어요.");
    if (!ok) return;
    setDeleting(j.id);
    try {
      const r = await fetch(FN("delete-job"), {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: j.id }),
      });
      const d = await r.json();
      if (!d.ok) { alert(d.error || "삭제 실패"); return; }
      setJobs(prev => prev.filter(x => x.id !== j.id));
    } catch (e) { alert("삭제 실패: " + String(e)); }
    finally { setDeleting(null); }
  };

  return (
    <div>
      <p className="text-xs text-gray-500 mb-4">생성된 영상은 생성 후 3일간 보관됩니다. 기간이 지나면 다운로드할 수 없으니 미리 받아두세요.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {jobs.map(j=>{
        const done = j.status==="done" && j.video_url && !j.expired;
        return (
          <div key={j.id} className="rounded-2xl bg-white border border-gray-200 overflow-hidden flex flex-col">
            <div className="relative aspect-[9/16] bg-black">
              {done ? (
                <video src={j.video_url + "#t=0.1"} preload="metadata" playsInline controls
                  className="w-full h-full object-contain bg-black" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-2 text-center">
                  <span className={`text-sm font-bold ${j.status==="processing"?"text-[#03C75A] animate-pulse":j.status==="error"?"text-red-400":"text-gray-500"}`}>
                    {j.status==="processing"?"⏳ 생성 중":j.status==="error"?"❌ 실패":j.expired?"⌛ 보관 만료":"⏳ 대기"}
                  </span>
                </div>
              )}
            </div>
            <div className="p-3 flex flex-col gap-2 flex-1">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate">{j.product_name || "제목 없음"}</p>
                  <p className="text-[11px] text-gray-500">{new Date(j.created_at).toLocaleDateString("ko")}</p>
                </div>
                <button onClick={()=>deleteJob(j)} disabled={deleting===j.id} title="삭제"
                  className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition">
                  {deleting===j.id ? <span className="block h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-transparent" /> : "🗑️"}
                </button>
              </div>
              {done ? (
                <div className="mt-auto flex flex-col gap-1.5">
                  <button onClick={()=>saveVideo(j)} disabled={saving===j.id}
                    className="block text-center rounded-xl bg-[#03C75A] px-3 py-2.5 text-sm font-bold text-white hover:bg-[#02b350] active:bg-[#02b350] disabled:opacity-50 transition">
                    {saving===j.id ? "저장 중…" : (isIOS ? "📱 갤러리에 저장" : "📥 동영상 저장")}
                  </button>
                  <p className="px-1 text-center text-[11px] leading-snug text-gray-400">
                    {isIOS
                      ? "공유 창에서 '동영상 저장'을 누르면 사진앱에 저장돼요"
                      : isAndroid
                      ? "휴대폰에 저장돼요 · 갤러리 › 앨범 › Download 에서 볼 수 있어요"
                      : "내 컴퓨터에 mp4 파일로 저장돼요"}
                  </p>
                  {onGoToLinks && (
                    <button onClick={onGoToLinks}
                      className="block text-center rounded-xl border border-[#03C75A]/40 bg-[#03C75A]/5 px-3 py-2 text-xs font-bold text-[#03C75A] hover:bg-[#03C75A]/10 transition">
                      🔗 내 링크에 추가
                    </button>
                  )}

                  {/* 업로드용 SEO */}
                  {(j.seo_title || j.seo_description || j.seo_tags) ? (
                    <div className="mt-1 rounded-xl bg-gray-100 border border-gray-200 p-2.5 text-left space-y-2">
                      <p className="text-[11px] font-bold text-[#03C75A]">📋 업로드 정보 (AI 추천)</p>
                      {[
                        { label: "제목", value: j.seo_title, key: j.id+"-t" },
                        { label: "설명", value: j.seo_description, key: j.id+"-d" },
                        { label: "해시태그", value: j.seo_tags, key: j.id+"-g" },
                      ].filter(r=>r.value).map(r => (
                        <div key={r.key} className="flex items-start gap-1.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-gray-500">{r.label}</p>
                            <p className="text-[11px] text-gray-700 leading-snug break-words line-clamp-3">{r.value}</p>
                          </div>
                          <button onClick={()=>copyText(r.value, r.key)}
                            className="shrink-0 rounded-md bg-gray-200 px-1.5 py-1 text-[10px] font-bold text-gray-700 hover:bg-gray-300 transition">
                            {copied===r.key ? "✓" : "복사"}
                          </button>
                        </div>
                      ))}
                      <button onClick={()=>shareSeo(j)}
                        className="w-full rounded-lg bg-gray-200 px-2 py-2 text-[11px] font-bold text-gray-900 hover:bg-gray-300 transition">
                        {copied===j.id+"-all" ? "✓ 복사됨 (메모에 붙여넣기)" : "📝 메모·카톡으로 보내기"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-center text-[10px] text-gray-600">업로드 정보 생성 중…</p>
                  )}
                </div>
              ) : (
                <span className="mt-auto block text-center rounded-xl bg-gray-100 px-3 py-2.5 text-xs text-gray-500">
                  {j.status==="error"?"실패":j.expired?"보관 만료(3일)":"생성 중"}
                </span>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

// ── AdminView ─────────────────────────────────────────────────
// ── SettingsView ──────────────────────────────────────────────
function SettingsView({ session, supabase, balance, userPlan }:
  { session: any; supabase: any; balance: number|null; userPlan: string|null }) {
  const [info, setInfo]             = React.useState<any>(null);
  const [code, setCode]             = React.useState("");
  const [codeMsg, setCodeMsg]       = React.useState<{ok:boolean; text:string}|null>(null);
  const [registering, setReg]       = React.useState(false);
  const [showPay, setShowPay]       = React.useState(false);
  const [devices, setDevices]       = React.useState<any[]>([]);

  const loadDevices = React.useCallback(async ()=>{
    try {
      const { data } = await supabase.from("user_devices")
        .select("device_id,device_name,last_seen_at,registered_at")
        .order("last_seen_at",{ascending:false});
      setDevices(data ?? []);
    } catch { setDevices([]); }
  }, [supabase]);

  React.useEffect(()=>{ if(!session) return; (async()=>{
    try { const { data } = await supabase.rpc("get_my_balance_rpc").single(); setInfo(data); } catch {}
    loadDevices();
  })(); }, [session, loadDevices]);

  const removeDevice = async (deviceId:string) => {
    if (!confirm("이 기기 등록을 해제할까요?")) return;
    try { await supabase.rpc("unregister_device_rpc", { p_device_id: deviceId }); } catch {}
    loadDevices();
  };
  const relTime = (d:string) => {
    if (!d) return "";
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff/60000);
    if (m < 1) return "방금 전"; if (m < 60) return `${m}분 전`;
    const h = Math.floor(m/60); if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h/24)}일 전`;
  };

  const email = session?.user?.email ?? "";
  const plan  = info?.plan ?? userPlan ?? "free";
  const maxC  = info?.max_credits ?? 0;
  const bal   = info?.balance ?? balance ?? 0;
  const pct   = maxC > 0 ? Math.max(0, Math.min(100, (bal / maxC) * 100)) : 0;
  const nextBilling = info?.expires_at
    ? new Date(info.expires_at).toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric"})
    : "-";
  const planLabel = (p:string) =>
    (({ starter:"스타터", pro:"프로", master:"마스터", enterprise:"엔터프라이즈", free:"무료" } as any)[p] ?? p);

  const registerCode = async () => {
    const c = code.trim(); if (!c) return;
    setReg(true); setCodeMsg(null);
    try {
      const { data, error } = await supabase.rpc("redeem_teacher_code_rpc", { p_code: c });
      if (error) setCodeMsg({ ok:false, text:"등록 실패: " + error.message });
      else if (data?.ok) {
        setCodeMsg({ ok:true, text: data.action==="already_mapped"
          ? `이미 등록된 파트너입니다 (${data.teacher_email})`
          : `파트너 등록 완료 (${data.teacher_email})` });
        setCode("");
      } else setCodeMsg({ ok:false, text: data?.error ?? "등록 실패" });
    } catch(e){ setCodeMsg({ ok:false, text:String(e) }); }
    finally { setReg(false); }
  };

  const Section = ({ title, children }:{ title:string; children:any }) => (
    <div className="mb-5">
      <p className="text-xs font-bold text-gray-500 mb-2">{title}</p>
      <div className="rounded-2xl bg-white border border-gray-200 p-5">{children}</div>
    </div>
  );

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-black text-gray-900 mb-6">⚙️ 설정</h2>

      <Section title="계정 정보">
        <div className="flex items-center justify-between mb-4">
          <div><p className="text-xs text-gray-500">이메일</p><p className="text-sm text-gray-900 mt-0.5">{email}</p></div>
          <button onClick={()=>supabase.auth.signOut()}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition">로그아웃</button>
        </div>
        <div className="flex items-center justify-between">
          <div><p className="text-xs text-gray-500">현재 요금제</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{planLabel(plan)} 요금제{plan!=="free" && " (구독 중)"}</p></div>
          <button onClick={()=>setShowPay(true)}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition">구독 변경</button>
        </div>
      </Section>

      <Section title="멤버십 크레딧">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs text-gray-500">남은 크레딧</span>
          <span className="text-sm font-black text-[#03C75A]">{bal.toLocaleString()} CR / {maxC.toLocaleString()} CR</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-4">
          <div className="h-full bg-[#03C75A] transition-all" style={{ width:`${pct}%` }} />
        </div>
        <div className="flex justify-between text-sm"><span className="text-gray-500">다음 결제일</span><span className="text-gray-900">{nextBilling}</span></div>
      </Section>

      <Section title="🎟 파트너 코드 등록">
        <p className="text-xs text-gray-400 mb-3">파트너로부터 받은 코드를 입력하면 파트너가 회원님의 사용 현황(이메일·플랜·크레딧)을 조회할 수 있게 됩니다.</p>
        <div className="flex gap-2">
          <input value={code} onChange={e=>setCode(e.target.value)} placeholder="예: TEACHER_KIM"
            onKeyDown={e=>{ if(e.key==="Enter") registerCode(); }}
            className="flex-1 rounded-xl bg-gray-100 border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-[#03C75A]" />
          <button onClick={registerCode} disabled={registering || !code.trim()}
            className="rounded-xl bg-[#03C75A] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#02b350] disabled:opacity-50 transition">{registering?"등록 중":"등록"}</button>
        </div>
        {codeMsg && <p className={`text-xs mt-2 ${codeMsg.ok?"text-green-400":"text-red-400"}`}>{codeMsg.text}</p>}
      </Section>

      <Section title="💻 등록된 디바이스">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">기기 {devices.length}대</span>
          <button onClick={loadDevices} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition">새로고침</button>
        </div>
        {devices.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">등록된 기기가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {devices.map(d=>(
              <div key={d.device_id} className="flex items-center justify-between rounded-xl bg-gray-100 border border-gray-200 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-green-400 font-semibold truncate">✓ {d.device_name || d.device_id}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{relTime(d.last_seen_at)}{d.registered_at && ` · 등록 ${new Date(d.registered_at).toLocaleDateString("ko-KR")}`}</p>
                </div>
                <button onClick={()=>removeDevice(d.device_id)} className="shrink-0 rounded-lg border border-red-500/30 text-red-400 px-3 py-1.5 text-xs hover:bg-red-500/10 transition">해제</button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-3">한 계정당 최대 2개 디바이스 등록 가능. Master 플랜은 동시 사용도 허용됩니다.</p>
      </Section>

      <Section title="고객지원">
        <div className="space-y-2">
          <a href="/manual" className="block rounded-xl bg-gray-100 border border-gray-200 px-4 py-3 text-sm text-gray-900 hover:border-[#03C75A] transition">프로그램 사용 가이드 보기</a>
          <a href="/terms" className="block rounded-xl bg-gray-100 border border-gray-200 px-4 py-3 text-sm text-gray-900 hover:border-[#03C75A] transition">이용약관 및 환불 규정 보기</a>
        </div>
      </Section>

      {showPay && <PaymentModal open={showPay} onClose={()=>setShowPay(false)} defaultPlan={plan==="free"?"pro":plan} />}
    </div>
  );
}

// ── ProductSearchView (쿠팡 파트너스 상품 검색) ───────────────
const COUPANG_RX = /https?:\/\/(?:[\w-]+\.)?coupang\.com\/[^\s'"]+|https?:\/\/link\.coupang\.com\/[^\s'"]+/gi;
const PS_KEY = "chronit_product_urls";

// ── 백그라운드 키워드 추출 매니저 (탭 이동/새로고침에도 유지) ──
const EXTRACT_KEY = "chronit_extract_job";
const _extractMgr: { state:any; listeners:Set<(s:any)=>void>; polling:boolean } = {
  state: (()=>{ try { return JSON.parse(localStorage.getItem(EXTRACT_KEY)||"null"); } catch { return null; } })(),
  listeners: new Set(),
  polling: false,
};
function _extractEmit() {
  try { localStorage.setItem(EXTRACT_KEY, JSON.stringify(_extractMgr.state)); } catch {}
  _extractMgr.listeners.forEach(l=>{ try{ l(_extractMgr.state); }catch{} });
}
async function _extractPoll(supabase:any, pid:string, source_url:string) {
  if (_extractMgr.polling) return;
  _extractMgr.polling = true;
  try {
    const { data:{ session:s } } = await supabase.auth.getSession();
    const post = (b:any)=>fetch(FN("extract-keywords"),{method:"POST",headers:{Authorization:`Bearer ${s?.access_token}`,"Content-Type":"application/json"},body:JSON.stringify(b)}).then((r:any)=>r.json());
    const start = Date.now();
    while (Date.now()-start < 360000) {
      await new Promise(r=>setTimeout(r,2000));
      let p:any; try { p = await post({ poll:true, prediction_id: pid }); } catch { continue; }
      if (p.status==="succeeded") { _extractMgr.state = { source_url, status:"succeeded", result:{ product_name:p.product_name, use_case:p.use_case, queries:p.queries||[], keywords:p.keywords||[] } }; _extractEmit(); return; }
      if (p.status==="failed"||p.status==="canceled") { _extractMgr.state = { source_url, status:"failed", error:p.error||"추출 실패" }; _extractEmit(); return; }
    }
    if (_extractMgr.state?.status==="processing") { _extractMgr.state = { source_url, status:"failed", error:"시간 초과" }; _extractEmit(); }
  } finally { _extractMgr.polling = false; }
}
async function startExtract(supabase:any, source_url:string) {
  if (_extractMgr.state && (_extractMgr.state.status==="starting"||_extractMgr.state.status==="processing")) return;
  _extractMgr.state = { source_url, status:"starting", startedAt:Date.now() }; _extractEmit();
  try {
    const { data:{ session:s } } = await supabase.auth.getSession();
    const post = (b:any)=>fetch(FN("extract-keywords"),{method:"POST",headers:{Authorization:`Bearer ${s?.access_token}`,"Content-Type":"application/json"},body:JSON.stringify(b)}).then((r:any)=>r.json());
    const d = await post({ source_url });
    if (!d.ok || !d.prediction_id) { _extractMgr.state = { source_url, status:"failed", error:d.error||"추출 실패" }; _extractEmit(); return; }
    // Prefer:wait로 이미 완료된 경우 → 폴링 없이 즉시 반영
    if (d.status==="succeeded") {
      _extractMgr.state = { source_url, status:"succeeded", result:{ product_name:d.product_name, use_case:d.use_case, queries:d.queries||[], keywords:d.keywords||[] } };
      _extractEmit(); return;
    }
    _extractMgr.state = { source_url, status:"processing", prediction_id:d.prediction_id, startedAt:Date.now() }; _extractEmit();
    _extractPoll(supabase, d.prediction_id, source_url);
  } catch(e) { _extractMgr.state = { source_url, status:"failed", error:String(e) }; _extractEmit(); }
}
function resumeExtract(supabase:any) {
  const st = _extractMgr.state;
  if (st && st.status==="processing" && st.prediction_id && !_extractMgr.polling) _extractPoll(supabase, st.prediction_id, st.source_url);
}
function clearExtract() { _extractMgr.state = null; _extractEmit(); }

function ProductSearchView({ session }: { session:any }) {
  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-black text-gray-900 mb-2">🔗 내 링크</h2>
      <p className="text-sm text-gray-400 mb-6">완성한 영상에 <b>쿠팡 파트너스 링크</b>를 붙여 카드로 모으고, <b>내 링크 페이지</b> 하나로 공유하세요. 인스타 프로필에 그 주소만 넣으면 끝! 영상마다 <b>🔍 쿠팡에서 찾기</b>로 바로 상품을 검색할 수 있어요.</p>
      <LinkPageManager session={session} />
    </div>
  );
}

function AdminView({ session, supabase }: { session: any; supabase: any }) {
  const [tab, setTab] = React.useState<"subs"|"coupons"|"reviews">("subs");
  const TABS = [
    { v:"subs",    label:"👑 구독 관리" },
    { v:"coupons", label:"🎟 쿠폰 코드" },
    { v:"reviews", label:"📝 후기 승인" },
  ] as const;
  return (
    <div>
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {TABS.map(t=>(
          <button key={t.v} onClick={()=>setTab(t.v as any)}
            className={`px-4 py-2.5 text-sm font-bold transition border-b-2 -mb-px ${tab===t.v?"text-[#03C75A] border-[#03C75A]":"text-gray-400 border-transparent hover:text-gray-900"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab==="subs"    && <AdminSubsTab session={session} supabase={supabase} />}
      {tab==="coupons" && <AdminCouponsTab session={session} supabase={supabase} />}
      {tab==="reviews" && <AdminReviewsTab session={session} supabase={supabase} />}
    </div>
  );
}

// ── 관리자: 구독 관리 ──
function AdminSubsTab({ session, supabase }: { session:any; supabase:any }) {
  const [users, setUsers]   = React.useState<any[]>([]);
  const [planMax, setPlanMax] = React.useState<Record<string,number>>({});
  const [plans, setPlans]   = React.useState<any[]>([]);
  const [q, setQ]           = React.useState("");
  const [stFilter, setStFilter] = React.useState("all");
  const [plFilter, setPlFilter] = React.useState("all");
  const [sel, setSel]       = React.useState<string>("");
  const [planSel, setPlanSel] = React.useState("pro");
  const [days, setDays]     = React.useState("30");
  const [amt, setAmt]       = React.useState("1000");
  const [payAmt, setPayAmt] = React.useState("");   // 결제금액(파트너 정산 적립용)
  const [roleSel, setRoleSel] = React.useState("user");
  const freshPR = () => ({ starter:{type:"none",value:""}, pro:{type:"none",value:""}, master:{type:"none",value:""} });
  const [partnerRates, setPartnerRates] = React.useState<Record<string,{type:string;value:string}>>(freshPR);
  const [prMsg, setPrMsg] = React.useState("");
  const setPR = (k:string, patch:any) => setPartnerRates(p=>({ ...p, [k]:{ ...p[k], ...patch } }));
  // 파트너 쿠폰 발급
  const [pcCode, setPcCode] = React.useState("");
  const [pcDisc, setPcDisc] = React.useState<Record<string,{type:string;value:string}>>(freshPR);
  const setPCD = (k:string, patch:any) => setPcDisc(p=>({ ...p, [k]:{ ...p[k], ...patch } }));
  const [pcMsg, setPcMsg] = React.useState("");
  const [msg, setMsg]       = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [srcStats, setSrcStats] = React.useState<{source:string;count:number}[]>([]);
  const [srcTotal, setSrcTotal] = React.useState(0);

  const load = React.useCallback(async ()=>{
    setLoading(true);
    try {
      const { data } = await supabase.rpc("get_all_users_admin_rpc");
      setUsers(Array.isArray(data) ? data : []);
    } catch { setUsers([]); }
    try {
      const { data: ss } = await supabase.rpc("admin_signup_source_stats_rpc");
      if (ss?.ok) { setSrcStats(Array.isArray(ss.stats)?ss.stats:[]); setSrcTotal(ss.total||0); }
    } catch {}
    try {
      const { data: pl } = await supabase.from("plans").select("id,name,max_credits").order("sort_order");
      setPlans(pl ?? []);
      const m:Record<string,number> = {}; (pl??[]).forEach((p:any)=>m[p.id]=p.max_credits); setPlanMax(m);
    } catch {}
    setLoading(false);
  }, [supabase]);
  React.useEffect(()=>{ if(session) load(); }, [session, load]);

  const now = Date.now();
  const isActive = (u:any) => u.expires_at && new Date(u.expires_at).getTime() > now;
  const filtered = users.filter(u=>{
    if (q.trim() && !(u.email||"").toLowerCase().includes(q.trim().toLowerCase())) return false;
    if (stFilter==="active" && !isActive(u)) return false;
    if (stFilter==="expired" && isActive(u)) return false;
    if (plFilter!=="all" && u.plan!==plFilter) return false;
    return true;
  });
  const activeCnt = users.filter(isActive).length;
  const selUser = users.find(u=>u.user_id===sel);

  const run = async (fn:()=>Promise<any>, okMsg:string) => {
    if (!sel) { setMsg("회원을 먼저 선택하세요"); return; }
    setMsg("처리 중...");
    try { const r = await fn(); if (r?.error && !r?.ok) setMsg("실패: "+(r.error.message||r.error)); else if (r?.data?.ok===false) setMsg("실패: "+r.data.error); else { setMsg(okMsg); await load(); } }
    catch(e){ setMsg("실패: "+String(e)); }
  };
  const grant = async () => {
    if (!sel) { setMsg("회원을 먼저 선택하세요"); return; }
    setMsg("처리 중...");
    try {
      const r = await supabase.rpc("admin_grant_subscription_rpc",{ p_target_user_id:sel, p_plan:planSel, p_days:Number(days)||30, p_amount: payAmt.trim() ? (Number(payAmt)||0) : null });
      if (r?.error) { setMsg("실패: "+r.error.message); return; }
      if (r?.data?.ok === false) { setMsg("실패: "+r.data.error); return; }
      const acc = r?.data?.accrual;
      let m = "구독 부여/연장 완료";
      if (acc?.action === "accrued") m += ` · 파트너 적립 +₩${Number(acc.amount||0).toLocaleString()} (${acc.partner})`;
      else if (payAmt.trim() && acc?.action === "no_partner") m += " · (파트너 매핑 없음 — 적립 안 됨)";
      else if (payAmt.trim() && (acc?.action === "zero_rate" || acc?.action === "zero_fixed")) m += " · (파트너 요율 0 — 적립 안 됨)";
      setMsg(m); await load();
    } catch(e){ setMsg("실패: "+String(e)); }
  };
  const cancel  = () => run(()=>supabase.rpc("admin_cancel_subscription_rpc",{p_target_user_id:sel}), "구독 취소 완료");
  const resetDev= () => run(()=>supabase.rpc("admin_reset_user_devices_rpc",{p_target_user_id:sel}), "디바이스 해제 완료");
  const credit  = (action:string) => {
    if (action !== "reset") {
      const n = Math.floor(Number(amt));
      if (!Number.isFinite(n) || n <= 0) { setMsg("변동량을 올바르게 입력하세요"); return; }
      if (n > 1000000) { setMsg("변동량이 너무 큽니다 (최대 1,000,000)"); return; }
    }
    run(()=>supabase.rpc("admin_adjust_credits_rpc",{p_target_user_id:sel,p_action:action,p_amount:Math.min(Math.max(Math.floor(Number(amt)||0),0),1000000)}), "크레딧 처리 완료");
  };
  const applyRole = () => run(()=>supabase.rpc("set_user_role_rpc",{p_target_user_id:sel,p_new_role:roleSel}), "권한 변경 완료");

  const resetSignupSource = async () => {
    const ans = window.prompt('⚠️ 가입 경로 데이터를 모두 초기화합니다.\n수집된 응답이 전부 삭제되며 되돌릴 수 없습니다.\n\n정말 진행하려면 아래에 "초기화" 라고 입력하세요.');
    if (ans === null) return;            // 취소
    if (ans.trim() !== "초기화") { setMsg("초기화 취소됨 (입력이 일치하지 않음)"); return; }
    setMsg("초기화 중...");
    const { data, error } = await supabase.rpc("admin_reset_signup_source_rpc");
    if (error || !data?.ok) { setMsg("초기화 실패: "+(error?.message || data?.error || "")); return; }
    setMsg(`가입 경로 초기화 완료 (${data.cleared ?? 0}건 삭제)`);
    await load();
  };

  // 선택 회원 변경 시: 역할 동기화 + (파트너면) 플랜별 정산 로드
  React.useEffect(()=>{
    setRoleSel(selUser?.role || "user");
    setPartnerRates(freshPR()); setPrMsg("");
    // 파트너 쿠폰 기본값: 이메일 앞부분 기반 코드 추천
    setPcDisc(freshPR()); setPcMsg("");
    setPcCode(selUser?.email ? String(selUser.email).split("@")[0].replace(/[^a-zA-Z0-9]/g,"").toUpperCase().slice(0,8) : "");
    if (sel && selUser?.role === "partner") {
      supabase.rpc("admin_get_partner_rates_rpc",{ p_partner_id: sel }).then((res:any)=>{
        const r = res?.data?.rates;
        if (r && typeof r === "object") {
          const next:any = freshPR();
          for (const k of ["starter","pro","master"]) {
            const d = r[k];
            if (d) next[k] = { type: d.type, value: d.type==="percent" ? String(Math.round(Number(d.rate)*1000)/10) : String(Number(d.fixed)||0) };
          }
          setPartnerRates(next);
        }
      }, ()=>{});
    }
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const createPartnerCoupon = async () => {
    if (!sel || !selUser?.email) { setPcMsg("회원을 먼저 선택하세요"); return; }
    const c = pcCode.trim().toUpperCase();
    if (!c) { setPcMsg("코드를 입력하세요"); return; }
    const pd:Record<string,any> = {}; const allowed:string[] = [];
    for (const k of ["starter","pro","master"]) {
      const d = pcDisc[k];
      if (d.type === "none") continue;
      pd[k] = d.type === "free" ? { type:"free" } : { type:d.type, value:Number(d.value)||0 };
      allowed.push(k);
    }
    setPcMsg("발급 중...");
    const { error } = await supabase.from("coupon_codes").insert({
      code: c, type:"none", value:0, owner_email: selUser.email, expires_at: null,
      plan_discounts: Object.keys(pd).length ? pd : null,
      allowed_plans: allowed.length ? allowed : null,
    });
    if (error) setPcMsg("발급 실패: "+error.message+(error.code==="23505"?" (이미 있는 코드)":""));
    else setPcMsg(`쿠폰 ${c} 발급 완료 — 파트너 ${selUser.email}에 연결됨`);
  };

  const savePartnerRates = async () => {
    if (!sel) { setPrMsg("회원을 먼저 선택하세요"); return; }
    const payload:Record<string,any> = {};
    for (const k of ["starter","pro","master"]) {
      const d = partnerRates[k];
      if (d.type === "percent") payload[k] = { type:"percent", rate: (Number(d.value)||0)/100 };
      else if (d.type === "fixed") payload[k] = { type:"fixed", fixed: Number(d.value)||0 };
    }
    setPrMsg("저장 중...");
    const { data, error } = await supabase.rpc("admin_set_partner_rates_rpc", { p_partner_id: sel, p_rates: payload });
    if (error || !data?.ok) setPrMsg("저장 실패: "+(error?.message || data?.error || ""));
    else setPrMsg("플랜별 정산 저장 완료 ✓ (파트너스 탭에 반영)");
  };

  const fmt = (d:string)=> d ? new Date(d).toLocaleDateString("ko-KR",{year:"2-digit",month:"2-digit",day:"2-digit"}) : "-";
  const Btn = ({onClick,color,children}:{onClick:()=>void;color:string;children:any}) => (
    <button onClick={onClick} className={`rounded-lg px-3 py-2 text-xs font-bold text-gray-900 transition ${color}`}>{children}</button>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-900">👑 구독 관리</p>
        <div className="text-xs text-gray-500">전체 {users.length} · <span className="text-green-400">구독중 {activeCnt}</span> · 만료 {users.length-activeCnt}
          <button onClick={load} className="ml-3 rounded-lg border border-gray-200 px-2 py-1 hover:bg-gray-100">새로고침</button>
        </div>
      </div>

      {/* 가입 경로 집계 */}
      {srcStats.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-700">📥 가입 경로 (총 {srcTotal}명)</p>
            <button onClick={resetSignupSource} className="rounded-lg border border-red-300 text-red-500 hover:bg-red-50 px-2.5 py-1 text-xs font-bold">초기화</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {srcStats.map(s=>(
              <span key={s.source} className={`rounded-lg px-2.5 py-1 text-xs font-bold ${s.source==="미응답"?"bg-gray-100 text-gray-500":"bg-[#03C75A]/10 text-[#03C75A]"}`}>
                {s.source} <b>{s.count}</b>
                <span className="text-gray-400 font-normal"> ({srcTotal?Math.round(s.count/srcTotal*100):0}%)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="이메일 검색"
          className="flex-1 rounded-xl bg-gray-100 border border-gray-200 px-4 py-2 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-[#03C75A]" />
        <select value={stFilter} onChange={e=>setStFilter(e.target.value)} className="rounded-xl bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
          <option value="all">상태 전체</option><option value="active">유효</option><option value="expired">만료</option></select>
        <select value={plFilter} onChange={e=>setPlFilter(e.target.value)} className="rounded-xl bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
          <option value="all">플랜 전체</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </div>
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden mb-5 max-h-[340px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-gray-200 text-gray-400 sticky top-0 bg-white">
            <tr><th className="px-3 py-2.5 text-left">이메일</th><th className="px-3 py-2.5 text-left">권한</th><th className="px-3 py-2.5 text-left">플랜</th><th className="px-3 py-2.5 text-left">만료일</th><th className="px-3 py-2.5 text-left">상태</th><th className="px-3 py-2.5 text-right">크레딧(잔량/한도)</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="py-8 text-center text-gray-500">불러오는 중...</td></tr>
            : filtered.length===0 ? <tr><td colSpan={6} className="py-8 text-center text-gray-500">결과 없음</td></tr>
            : filtered.map(u=>{
              const max = (planMax[u.plan] ?? 0) + (u.bonus_credits||0); const left = max - (u.credits_used||0); const act = isActive(u);
              return (
                <tr key={u.user_id} onClick={()=>{setSel(u.user_id); setRoleSel(u.role||"user"); if(u.plan)setPlanSel(u.plan);}}
                  className={`border-b border-gray-200/50 cursor-pointer ${sel===u.user_id?"bg-[#03C75A]/10":"hover:bg-gray-100/40"}`}>
                  <td className="px-3 py-2.5 text-gray-700 truncate max-w-[200px]">{u.email}</td>
                  <td className="px-3 py-2.5">{u.role==="super_admin"?<span className="text-yellow-400 font-bold">👑 관리자</span>:u.role==="partner"?<span className="text-[#03C75A]">파트너</span>:<span className="text-gray-400">일반</span>}</td>
                  <td className="px-3 py-2.5 text-gray-700 capitalize">{u.plan||"-"}</td>
                  <td className="px-3 py-2.5 text-gray-400">{fmt(u.expires_at)}</td>
                  <td className="px-3 py-2.5">{act?<span className="text-green-400">유효</span>:<span className="text-red-400">만료</span>}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{left.toLocaleString()} / {max.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 액션 영역 */}
      <div className="space-y-3">
        <div className="rounded-2xl bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">구독 부여 / 수정 {selUser && <span className="text-[#03C75A]">— {selUser.email}</span>}</p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={planSel} onChange={e=>setPlanSel(e.target.value)} className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
              {plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <input value={days} onChange={e=>setDays(e.target.value)} className="w-28 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none" placeholder="기간(일)" />
            <input value={payAmt} onChange={e=>setPayAmt(e.target.value)} className="w-36 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none" placeholder="결제금액(정산용·선택)" />
            <Btn onClick={grant} color="bg-green-600 hover:bg-green-500">✓ 구독 부여/연장</Btn>
            <Btn onClick={cancel} color="bg-red-600 hover:bg-red-500">✕ 구독 취소</Btn>
            <Btn onClick={resetDev} color="bg-gray-200 hover:bg-gray-300">🖥 디바이스 모두 해제</Btn>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">크레딧 관리</p>
          <div className="flex flex-wrap items-center gap-2">
            <input type="number" min={0} max={1000000} value={amt} onChange={e=>setAmt(e.target.value)} className="w-36 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none" placeholder="변동량" />
            <Btn onClick={()=>credit("add")} color="bg-green-600 hover:bg-green-500">＋ 충전 (잔량 증가)</Btn>
            <Btn onClick={()=>credit("sub")} color="bg-orange-600 hover:bg-orange-500">－ 차감 (잔량 감소)</Btn>
            <Btn onClick={()=>credit("reset")} color="bg-gray-200 hover:bg-gray-300">🔄 사용량 0으로 초기화</Btn>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">권한 변경 (파트너/관리자 지정)</p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={roleSel} onChange={e=>setRoleSel(e.target.value)} className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
              <option value="user">일반 (user)</option><option value="partner">파트너 (partner)</option><option value="super_admin">관리자 (super_admin)</option></select>
            <Btn onClick={applyRole} color="bg-[#03C75A] hover:bg-[#02b350]">✓ 권한 적용</Btn>
          </div>
        </div>

        {/* 파트너 플랜별 정산 — 권한이 파트너일 때만 */}
        {(selUser?.role === "partner" || roleSel === "partner") && (
          <div className="rounded-2xl bg-white border border-[#03C75A]/40 p-4">
            <p className="text-xs font-bold text-gray-700 mb-1">📊 파트너 플랜별 정산 수수료</p>
            <p className="text-[11px] text-gray-400 mb-3">설정한 수수료는 파트너스 탭의 "플랜별 수수료"와 결제 적립에 연동됩니다. {selUser?.role !== "partner" && "(먼저 '권한 적용'으로 파트너 지정 후 저장하세요)"}</p>
            <div className="space-y-2">
              {[["starter","스타터"],["pro","프로"],["master","마스터"]].map(([k,label])=>(
                <div key={k} className="flex items-center gap-2">
                  <span className="w-14 text-sm font-bold text-gray-700">{label}</span>
                  <select value={partnerRates[k].type} onChange={e=>setPR(k,{type:e.target.value})}
                    className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
                    <option value="none">미적용</option>
                    <option value="percent">정률 %</option>
                    <option value="fixed">정액(원/건)</option>
                  </select>
                  {(partnerRates[k].type==="percent" || partnerRates[k].type==="fixed") && (
                    <input value={partnerRates[k].value} onChange={e=>setPR(k,{value:e.target.value})}
                      placeholder={partnerRates[k].type==="percent"?"예: 10":"예: 5000"}
                      className="w-28 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#03C75A]" />
                  )}
                  {partnerRates[k].type==="percent" && <span className="text-xs text-gray-400">% (결제액 대비)</span>}
                  {partnerRates[k].type==="fixed" && <span className="text-xs text-gray-400">원 (건당)</span>}
                </div>
              ))}
            </div>
            <button onClick={savePartnerRates} className="mt-3 rounded-lg bg-[#03C75A] hover:bg-[#02b350] px-4 py-2 text-xs font-bold text-white">정산 수수료 저장</button>
            {prMsg && <p className="text-xs text-[#03C75A] mt-2">{prMsg}</p>}

            {/* 파트너 전용 쿠폰 발급 */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs font-bold text-gray-700 mb-1">🎟 이 파트너의 쿠폰 발급</p>
              <p className="text-[11px] text-gray-400 mb-3">발급된 코드는 이 파트너(owner_email)에 연결됩니다. 멤버가 이 코드를 입력 후 결제하면 위 정산 수수료로 자동 적립돼요.</p>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-14 text-xs text-gray-500">코드</span>
                <input value={pcCode} onChange={e=>setPcCode(e.target.value.toUpperCase())} placeholder="예: KIM2024"
                  className="flex-1 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm font-mono font-bold text-gray-900 outline-none focus:border-[#03C75A]" />
              </div>
              <div className="space-y-2">
                {[["starter","스타터"],["pro","프로"],["master","마스터"]].map(([k,label])=>(
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-14 text-sm font-bold text-gray-700">{label}</span>
                    <select value={pcDisc[k].type} onChange={e=>setPCD(k,{type:e.target.value})}
                      className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
                      <option value="none">미적용</option>
                      <option value="percent">할인 %</option>
                      <option value="fixed">정액(원)</option>
                      <option value="free">무료(100%)</option>
                    </select>
                    {(pcDisc[k].type==="percent" || pcDisc[k].type==="fixed") && (
                      <input value={pcDisc[k].value} onChange={e=>setPCD(k,{value:e.target.value})}
                        placeholder={pcDisc[k].type==="percent"?"예: 20":"예: 10000"}
                        className="w-28 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#03C75A]" />
                    )}
                    {pcDisc[k].type==="free" && <span className="text-xs text-[#03C75A] font-bold">결제 0원</span>}
                  </div>
                ))}
              </div>
              <button onClick={createPartnerCoupon} className="mt-3 rounded-lg bg-[#03C75A] hover:bg-[#02b350] px-4 py-2 text-xs font-bold text-white">코드 발급</button>
              {pcMsg && <p className="text-xs text-[#03C75A] mt-2">{pcMsg}</p>}
            </div>
          </div>
        )}
        {msg && <p className="text-xs text-[#03C75A]">{msg}</p>}
      </div>
    </div>
  );
}

// ── 관리자: 쿠폰 코드 ──
function AdminCouponsTab({ session, supabase }: { session:any; supabase:any }) {
  const [codes, setCodes]   = React.useState<any[]>([]);
  const [counts, setCounts] = React.useState<Record<string,number>>({});
  const [code, setCode]     = React.useState("");
  const [owner, setOwner]   = React.useState("");
  const COUPON_PLANS = [["starter","스타터"],["pro","프로"],["master","마스터"]];
  const [planDisc, setPlanDisc] = React.useState<Record<string,{type:string;value:string}>>({
    starter:{type:"none",value:""}, pro:{type:"none",value:""}, master:{type:"none",value:""},
  });
  const setPD = (k:string, patch:any) => setPlanDisc(p=>({ ...p, [k]:{ ...p[k], ...patch } }));
  const [exp, setExp]       = React.useState("");
  const [unlimited, setUnlimited] = React.useState(true);
  const [sel, setSel]       = React.useState<Set<string>>(new Set());
  const [msg, setMsg]       = React.useState("");

  const load = React.useCallback(async ()=>{
    try {
      const { data } = await supabase.from("coupon_codes").select("code,type,value,owner_email,expires_at,created_at,plan_discounts,allowed_plans").order("created_at",{ascending:false});
      setCodes(data ?? []);
    } catch { setCodes([]); }
    try {
      const { data: red } = await supabase.from("code_redemptions").select("code");
      const c:Record<string,number> = {}; (red??[]).forEach((r:any)=>{ if(r.code) c[r.code]=(c[r.code]||0)+1; }); setCounts(c);
    } catch {}
  }, [supabase]);
  React.useEffect(()=>{ if(session) load(); }, [session, load]);

  const create = async () => {
    const c = code.trim().toUpperCase();
    if (!c) { setMsg("코드를 입력하세요"); return; }
    // 플랜별 할인 구성
    const pd:Record<string,any> = {}; const allowed:string[] = [];
    for (const [k] of COUPON_PLANS) {
      const d = planDisc[k];
      if (d.type === "none") continue;
      pd[k] = d.type === "free" ? { type:"free" } : { type:d.type, value:Number(d.value)||0 };
      allowed.push(k);
    }
    setMsg("생성 중...");
    const row:any = {
      code:c, type:"none", value:0,
      owner_email: owner.trim() || null,
      expires_at: unlimited ? null : (exp || null),
      plan_discounts: Object.keys(pd).length ? pd : null,
      allowed_plans: allowed.length ? allowed : null,
    };
    const { error } = await supabase.from("coupon_codes").insert(row);
    if (error) setMsg("생성 실패: "+error.message);
    else {
      setMsg("코드 생성 완료"); setCode(""); setOwner("");
      setPlanDisc({ starter:{type:"none",value:""}, pro:{type:"none",value:""}, master:{type:"none",value:""} });
      await load();
    }
  };
  const toggleSel = (c:string) => setSel(s=>{ const n=new Set(s); n.has(c)?n.delete(c):n.add(c); return n; });
  const delSel = async () => {
    if (sel.size===0) return;
    if (!confirm(`${sel.size}개 코드를 삭제할까요?\n(해당 코드의 사용 기록도 함께 삭제됩니다)`)) return;
    const { data, error } = await supabase.rpc("admin_delete_coupons_rpc", { p_codes: Array.from(sel) });
    if (error || !data?.ok) setMsg("삭제 실패: "+(error?.message || data?.error || "알 수 없는 오류"));
    else { setSel(new Set()); setMsg(`${data.deleted ?? sel.size}개 삭제 완료`); await load(); }
  };
  const summarize = (c:any) => {
    const pd = c.plan_discounts;
    if (pd && typeof pd === "object") {
      const parts = COUPON_PLANS.filter(([k])=>pd[k]).map(([k,label])=>{
        const d = pd[k];
        const v = d.type==="percent" ? `${d.value}%` : d.type==="fixed" ? `${Number(d.value).toLocaleString()}원` : d.type==="free" ? "무료" : "";
        return `${label} ${v}`;
      });
      return parts.length ? parts.join(" · ") : "파트너 전용(할인 없음)";
    }
    if (c.type && c.type!=="none") return c.type==="free_days" ? `${c.value}일 무료체험` : c.type==="percent" ? `${c.value}%` : `${Number(c.value).toLocaleString()}원`;
    return "파트너 전용(할인 없음)";
  };
  const fmt = (d:string)=> d ? new Date(d).toLocaleDateString("ko-KR",{year:"2-digit",month:"2-digit",day:"2-digit"}) : "무기한";

  return (
    <div>
      <div className="rounded-2xl bg-white border border-gray-200 p-5 mb-5">
        <p className="text-sm font-bold text-gray-900 mb-3">새 쿠폰 코드 생성</p>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div><label className="text-xs text-gray-500">코드</label>
            <input value={code} onChange={e=>setCode(e.target.value)} placeholder="예: TEACHER_KIM"
              className="w-full mt-1 rounded-xl bg-gray-100 border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-[#03C75A]" /></div>
          <div><label className="text-xs text-gray-500">파트너 이메일 (선택 — 파트너 매핑)</label>
            <input value={owner} onChange={e=>setOwner(e.target.value)} placeholder="partner@example.com"
              className="w-full mt-1 rounded-xl bg-gray-100 border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-[#03C75A]" /></div>
        </div>
        <div className="mb-4">
          <label className="text-xs text-gray-500">플랜별 할인 설정</label>
          <div className="mt-1.5 space-y-2">
            {COUPON_PLANS.map(([k,label])=>(
              <div key={k} className="flex items-center gap-2">
                <span className="w-14 text-sm font-bold text-gray-700">{label}</span>
                <select value={planDisc[k].type} onChange={e=>setPD(k,{type:e.target.value})}
                  className="rounded-xl bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
                  <option value="none">미적용</option>
                  <option value="percent">할인 %</option>
                  <option value="fixed">정액 할인(원)</option>
                  <option value="free">무료(100%)</option>
                </select>
                {(planDisc[k].type==="percent" || planDisc[k].type==="fixed") && (
                  <input value={planDisc[k].value} onChange={e=>setPD(k,{value:e.target.value})}
                    placeholder={planDisc[k].type==="percent"?"예: 20":"예: 10000"}
                    className="w-28 rounded-xl bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#03C75A]" />
                )}
                {planDisc[k].type==="free" && <span className="text-xs text-[#03C75A] font-bold">결제 0원</span>}
                {planDisc[k].type==="none" && <span className="text-xs text-gray-400">이 플랜엔 할인 없음</span>}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">모두 "미적용"이면 할인 없는 파트너 전용 코드가 됩니다.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div><label className="text-xs text-gray-500">만료일</label>
            <input type="date" value={exp} disabled={unlimited} onChange={e=>setExp(e.target.value)} className="block mt-1 rounded-xl bg-gray-100 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none disabled:opacity-40" /></div>
          <label className="flex items-center gap-2 text-sm text-gray-700 pb-2"><input type="checkbox" checked={unlimited} onChange={e=>setUnlimited(e.target.checked)} className="accent-[#03C75A]" /> 무기한</label>
        </div>
        <button onClick={create} className="w-full rounded-xl bg-green-600 hover:bg-green-500 py-2.5 text-sm font-bold text-white transition">✓ 코드 생성</button>
        {msg && <p className="text-xs text-[#03C75A] mt-2">{msg}</p>}
      </div>

      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-gray-900">발급된 코드 목록</p>
        <div className="flex gap-2">
          <button onClick={delSel} disabled={sel.size===0} className="rounded-lg bg-red-600/80 hover:bg-red-500 disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-white">🗑 선택 삭제</button>
          <button onClick={load} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100">새로고침</button>
        </div>
      </div>
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="border-b border-gray-200 text-gray-400">
            <tr><th className="px-3 py-2.5 w-8"></th><th className="px-3 py-2.5 text-left">코드</th><th className="px-3 py-2.5 text-left">플랜별 할인</th><th className="px-3 py-2.5 text-left">파트너</th><th className="px-3 py-2.5 text-right">사용수</th><th className="px-3 py-2.5 text-left">만료일</th></tr>
          </thead>
          <tbody>
            {codes.length===0 ? <tr><td colSpan={6} className="py-8 text-center text-gray-500">발급된 코드 없음</td></tr>
            : codes.map(c=>(
              <tr key={c.code} className="border-b border-gray-200/50 hover:bg-gray-100/40">
                <td className="px-3 py-2.5"><input type="checkbox" checked={sel.has(c.code)} onChange={()=>toggleSel(c.code)} className="accent-[#03C75A]" /></td>
                <td className="px-3 py-2.5 font-mono font-bold text-[#03C75A]">{c.code}</td>
                <td className="px-3 py-2.5 text-gray-700">{summarize(c)}</td>
                <td className="px-3 py-2.5 text-gray-400 truncate max-w-[200px]">{c.owner_email || "—"}</td>
                <td className="px-3 py-2.5 text-right text-gray-700">{counts[c.code] || 0}</td>
                <td className="px-3 py-2.5 text-gray-400">{fmt(c.expires_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 관리자: 후기 승인 ──
function AdminReviewsTab({ session, supabase }: { session:any; supabase:any }) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [sel, setSel]   = React.useState<string>("");
  const [msg, setMsg]   = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async ()=>{
    setLoading(true);
    try { const { data } = await supabase.rpc("get_review_submissions_rpc"); setRows(Array.isArray(data)?data:[]); }
    catch { setRows([]); }
    setLoading(false);
  }, [supabase]);
  React.useEffect(()=>{ if(session) load(); }, [session, load]);

  const act = async (fn:()=>Promise<any>, okMsg:string) => {
    if (!sel) { setMsg("제출 건을 선택하세요"); return; }
    setMsg("처리 중...");
    try { const r = await fn(); if (r?.data?.ok===false) setMsg("실패: "+r.data.error); else { setMsg(okMsg); setSel(""); await load(); } }
    catch(e){ setMsg("실패: "+String(e)); }
  };
  const approve = () => act(()=>supabase.rpc("approve_review_rpc",{p_submission_id:sel,p_admin_id:session.user.id,p_credits:1000}), "승인 완료 (+1000 CR)");
  const reject  = () => act(()=>supabase.rpc("reject_review_rpc",{p_submission_id:sel,p_admin_id:session.user.id}), "거절 완료");
  const fmt = (d:string)=> d ? new Date(d).toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}) : "-";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-900">📝 후기 승인 관리 <span className="text-xs text-gray-500">(대기 {rows.length}건)</span></p>
        <button onClick={load} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100">새로고침</button>
      </div>
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden mb-4">
        <table className="w-full text-xs">
          <thead className="border-b border-gray-200 text-gray-400">
            <tr><th className="px-3 py-2.5 text-left">이메일</th><th className="px-3 py-2.5 text-left">URL</th><th className="px-3 py-2.5 text-left">상태</th><th className="px-3 py-2.5 text-left">제출일</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={4} className="py-8 text-center text-gray-500">불러오는 중...</td></tr>
            : rows.length===0 ? <tr><td colSpan={4} className="py-8 text-center text-gray-500">대기 중인 후기 없음</td></tr>
            : rows.map(r=>(
              <tr key={r.id} onClick={()=>setSel(r.id)}
                className={`border-b border-gray-200/50 cursor-pointer ${sel===r.id?"bg-[#03C75A]/10":"hover:bg-gray-100/40"}`}>
                <td className="px-3 py-2.5 text-gray-700 truncate max-w-[160px]">{r.email}</td>
                <td className="px-3 py-2.5 text-[#03C75A] truncate max-w-[280px]"><a href={r.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="hover:underline">{r.url}</a></td>
                <td className="px-3 py-2.5 text-yellow-400">{r.status}</td>
                <td className="px-3 py-2.5 text-gray-400">{fmt(r.submitted_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={approve} className="rounded-xl bg-green-600 hover:bg-green-500 px-5 py-2.5 text-sm font-bold text-white transition">✓ 승인 (+1000 크레딧)</button>
        <button onClick={reject} className="rounded-xl bg-red-600 hover:bg-red-500 px-5 py-2.5 text-sm font-bold text-white transition">✕ 거절</button>
        {msg && <span className="text-xs text-[#03C75A] ml-2">{msg}</span>}
      </div>
    </div>
  );
}

// ── PartnerView ───────────────────────────────────────────────
function PartnerView({ session, supabase }: { session: any; supabase: any }) {
  const [members, setMembers] = React.useState<any[]>([]);
  const [stats, setStats]     = React.useState<any>({ pending:0, upcoming:0, paid:0, this_month:0 });
  const [rates, setRates]     = React.useState<Record<string,any>>({});
  const [loading, setLoading] = React.useState(true);
  const [q, setQ]             = React.useState("");
  const [stFilter, setStFilter] = React.useState("all");
  const [plFilter, setPlFilter] = React.useState("all");

  const load = React.useCallback(async () => {
    setLoading(true);
    try { const { data } = await supabase.rpc("list_my_members_rpc"); setMembers(Array.isArray(data)?data:[]); }
    catch { setMembers([]); }
    try { const { data } = await supabase.rpc("get_my_partner_stats_rpc"); if (data) setStats(data); } catch {}
    try {
      const { data: r } = await supabase.from("partner_plan_rates")
        .select("plan,commission_type,rate,fixed_amount").eq("partner_id", session.user.id);
      const m:Record<string,any> = {}; (r??[]).forEach((x:any)=>m[x.plan]=x); setRates(m);
    } catch {}
    setLoading(false);
  }, [supabase, session]);
  React.useEffect(()=>{ if(session) load(); }, [session, load]);

  const now = Date.now();
  const isActive = (m:any) => m.expires_at && new Date(m.expires_at).getTime() > now;
  const filtered = members.filter(m=>{
    if (q.trim() && !(m.email||"").toLowerCase().includes(q.trim().toLowerCase())) return false;
    if (stFilter==="active" && !isActive(m)) return false;
    if (stFilter==="expired" && isActive(m)) return false;
    if (plFilter!=="all" && (m.plan||"free")!==plFilter) return false;
    return true;
  });

  const won = (n:number) => (n && n>0) ? `₩${Math.round(n).toLocaleString()}` : "—";
  const fmtDate = (d:string) => d ? new Date(d).toLocaleDateString("ko-KR",{year:"2-digit",month:"2-digit",day:"2-digit"}) : "-";
  const rateLabel = (plan:string) => {
    const r = rates[plan];
    if (!r) return "미적용";
    if (r.commission_type==="fixed") return `₩${Number(r.fixed_amount||0).toLocaleString()}`;
    const pct = Number(r.rate||0)*100;
    return pct>0 ? `${pct % 1 ? pct.toFixed(1) : pct}%` : "미적용";
  };

  const Stat = ({label, value, accent, bar}:{label:string; value:any; accent?:string; bar?:string}) => (
    <div className="rounded-2xl bg-white border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-black mt-1 ${accent||"text-gray-900"}`}>{value}</p>
      {bar && <div className={`h-1 rounded-full mt-2 ${bar}`} />}
    </div>
  );

  return (
    <div className="max-w-5xl">
      <h2 className="text-xl font-black text-gray-900 mb-1">📊 파트너스 — 내 멤버 관리</h2>
      <p className="text-sm text-gray-400 mb-5">파트너 코드를 입력한 멤버들의 사용 현황을 확인할 수 있습니다. 조회 전용이며 크레딧 수정 권한은 없습니다.</p>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
        <div className="rounded-2xl bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">플랜별 수수료</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-gray-400">스타터</span><span className="text-gray-900 font-semibold">{rateLabel("starter")}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">프로</span><span className="text-gray-900 font-semibold">{rateLabel("pro")}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">마스터</span><span className="text-gray-900 font-semibold">{rateLabel("master")}</span></div>
          </div>
        </div>
        <Stat label="적립 중 (환불기간)" value={won(stats.pending)}    accent="text-orange-400" bar="bg-orange-500/60" />
        <Stat label="정산 예정"         value={won(stats.upcoming)}   accent="text-green-400"  bar="bg-green-500/60" />
        <Stat label="누계 지급"         value={won(stats.paid)}       accent="text-gray-900" />
        <Stat label="이번달 적립"       value={won(stats.this_month)} accent="text-purple-400" bar="bg-purple-500/60" />
      </div>
      <p className="text-xs text-gray-500 mb-5">💡 결제 후 7일간은 환불 기간 — 이후 자동 확정되어 매월 14일에 정산됩니다.</p>

      {/* 검색/필터 */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="멤버 이메일 검색..."
          className="flex-1 min-w-[200px] rounded-xl bg-gray-100 border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-[#03C75A]" />
        <select value={stFilter} onChange={e=>setStFilter(e.target.value)} className="rounded-xl bg-gray-100 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none">
          <option value="all">상태 전체</option><option value="active">유효</option><option value="expired">만료</option></select>
        <select value={plFilter} onChange={e=>setPlFilter(e.target.value)} className="rounded-xl bg-gray-100 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none">
          <option value="all">플랜 전체</option><option value="starter">스타터</option><option value="pro">프로</option><option value="master">마스터</option><option value="free">무료</option></select>
        <button onClick={load} className="rounded-xl bg-[#03C75A] hover:bg-[#02b350] px-4 py-2.5 text-sm font-bold text-white transition">🔄 새로고침</button>
      </div>
      <p className="text-xs text-gray-500 mb-2">멤버 {filtered.length}명</p>

      {/* 멤버 테이블 */}
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-500 text-sm">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">{members.length===0 ? "아직 가입한 멤버가 없습니다." : "검색 결과가 없습니다."}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-gray-200 text-gray-400">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold">멤버 이메일</th>
                  <th className="px-3 py-3 text-left font-semibold">파트너</th>
                  <th className="px-3 py-3 text-left font-semibold">플랜</th>
                  <th className="px-3 py-3 text-right font-semibold">남은 크레딧</th>
                  <th className="px-3 py-3 text-right font-semibold">사용량</th>
                  <th className="px-3 py-3 text-left font-semibold">만료일</th>
                  <th className="px-3 py-3 text-left font-semibold">등록일</th>
                  <th className="px-3 py-3 text-left font-semibold">코드</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m,i)=>(
                  <tr key={i} className="border-b border-gray-200/50 hover:bg-gray-100/30">
                    <td className="px-3 py-3 text-gray-700 truncate max-w-[180px]">{m.email||"-"}</td>
                    <td className="px-3 py-3 text-gray-400 truncate max-w-[140px]">{m.partner_email || "—"}</td>
                    <td className="px-3 py-3"><span className={`capitalize font-semibold ${m.plan&&m.plan!=="free"?"text-[#03C75A]":"text-gray-500"}`}>{m.plan||"free"}</span></td>
                    <td className="px-3 py-3 text-right text-gray-700 font-semibold">{(m.credits_left||0).toLocaleString()}</td>
                    <td className="px-3 py-3 text-right text-gray-400">{(m.credits_used||0).toLocaleString()}</td>
                    <td className="px-3 py-3 text-gray-400">{fmtDate(m.expires_at)}</td>
                    <td className="px-3 py-3 text-gray-400">{fmtDate(m.created_at)}</td>
                    <td className="px-3 py-3"><span className="font-mono text-gray-500">{m.code||"-"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

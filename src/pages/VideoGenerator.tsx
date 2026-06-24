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
import SiteNav from "../components/SiteNav";
import { LinkPageManager, captureVideoFrame } from "./LinksManager";
import { FEATURES } from "../config/features";

const SB = "https://oxygqtbdpnxxcgzwdlzi.supabase.co";
const FN = (n: string) => `${SB}/functions/v1/${n}`;

// ── 상단 바 (홈페이지와 동일 스타일) ───────────────────────────
function AppTopBar({ onMenuClick, onInvite, session, balance, userPlan, onHistory }: { onMenuClick?: () => void; onInvite?: () => void; session?: any; balance?: number|null; userPlan?: string|null; onHistory?: () => void }) {
  const ICON = `${SB}/storage/v1/object/public/assets/icon.png`;
  const [menuOpen, setMenuOpen] = useState(false);
  const [nick, setNick] = useState("");
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    supabase.from("profiles").select("nickname").eq("id", uid).maybeSingle()
      .then(({ data }: any) => { if (data?.nickname) setNick(data.nickname); });
  }, [session?.user?.id]);
  const name = nick || (session?.user?.email ? String(session.user.email).split("@")[0] : "내 계정");
  const logout = async () => { try { await supabase.auth.signOut(); } catch (_) {} window.location.href = "/"; };
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white/90 px-4 backdrop-blur-xl md:px-6">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <button onClick={onMenuClick} aria-label="메뉴"
          className="md:hidden -ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <a href="/" className="flex min-w-0 items-center gap-2 md:gap-3">
          <img src={ICON} alt="Chronit" className="h-9 w-9 shrink-0 md:h-10 md:w-10" />
          <span className="text-2xl font-black tracking-tight text-gray-900 md:text-3xl">Chronit</span>
        </a>
      </div>
      <SiteNav />
      <nav className="flex shrink-0 items-center gap-2 text-sm font-bold text-gray-600 md:gap-3">
        {balance !== null && balance !== undefined && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#03C75A]/10 px-3 py-1.5 text-xs font-black text-[#03C75A]">이용권 {balance.toLocaleString()}개{userPlan ? ` · ${userPlan}` : ""}</span>
        )}
        <div className="relative">
          <button onClick={() => setMenuOpen(o => !o)}
            className="flex items-center gap-1.5 rounded-full bg-gray-900 px-3.5 py-1.5 font-bold text-white transition-colors hover:bg-[#03C75A]">
            <span className="max-w-[110px] truncate">{name}</span>
            <span className="text-[10px] opacity-80">▾</span>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl shadow-black/5">
                <a href="/me" className="block rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#03C75A]">👤 마이페이지</a>
                <button onClick={() => { setMenuOpen(false); onInvite && onInvite(); }} className="block w-full text-left rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#03C75A]">🎁 무료 이용권 받기</button>
                <a href="https://forms.gle/LCDeSEXSM7ALykqv5" target="_blank" rel="noreferrer" className="block rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#03C75A]">📝 피드백 보내고 영상 2개</a>
                <button onClick={() => { setMenuOpen(false); onHistory && onHistory(); }} className="block w-full text-left rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-[#03C75A]">📒 사용 내역</button>
                <button onClick={logout} className="block w-full text-left rounded-xl px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50">↩ 로그아웃</button>
              </div>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

// ── 상단 탭 바 (사이드바를 위로) ───────────────────────────────
function AppTabBar({ activeView, onViewChange, userRole }: { activeView: string; onViewChange: (v:string)=>void; userRole: string }) {
  const [extractRunning, setExtractRunning] = useState(
    _extractMgr.state?.status === "starting" || _extractMgr.state?.status === "processing");
  useEffect(() => {
    const l = (st:any) => setExtractRunning(st?.status === "starting" || st?.status === "processing");
    _extractMgr.listeners.add(l);
    return () => { _extractMgr.listeners.delete(l); };
  }, []);
  const isPartner = userRole === "partner" || userRole === "super_admin";
  const isAdmin = userRole === "super_admin";
  const TABS: any[] = [
    ...(FEATURES.trendFeed ? [{ v: "trends", label: "오늘의 트렌드", icon: "🔥" }] : []),
    { v: "generator", label: "프로젝트" },
    { v: "history", label: "생성 내역" },
    { v: "product-search", label: "내 링크" },
    { v: "studio", label: "콘셉트/스타일" },
    { v: "settings", label: "결제·계정" },
    ...(isPartner ? [{ v: "partner", label: "파트너스", icon: "📊" }] : []),
    ...(isAdmin ? [{ v: "admin", label: "관리자", icon: "👑" }] : []),
  ];
  return (
    <div className="hidden md:block shrink-0 border-b border-gray-200 bg-[#ECEAE3]">
      <div className="flex items-center gap-1 overflow-x-auto px-4 py-2 md:px-6">
        {TABS.map(({ v, label, icon }: any) => (
          <button key={v} onClick={() => onViewChange(v)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition ${activeView === v ? "bg-[#03C75A]/15 text-[#03C75A]" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}>
            {icon && <span>{icon}</span>}
            <span>{label}</span>
            {v === "product-search" && extractRunning && <span className="ml-0.5 h-2 w-2 rounded-full bg-[#03C75A] animate-pulse" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── 타입 ──────────────────────────────────────────────────────
type Clip = {
  video_id: string; title: string; author: string;
  thumbnail_url: string; page_url: string; duration: number; source: string;
  download_url?: string; video_url?: string;
};
type Job = {
  id: string; status: "pending"|"processing"|"done"|"error"|"canceled";
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
  // ── 내 영상 직접 업로드 (FEATURES.directUpload) ──
  const [inputMode, setInputMode]   = useState<"url"|"upload">("url");
  const [uploadFile, setUploadFile] = useState<File|null>(null);
  const [uploadName, setUploadName] = useState("");
  const [nameDetecting, setNameDetecting] = useState(false);
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploading, setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadOpen, setUploadOpen]   = useState(true);
  // ── 트렌드 소스 피드 (FEATURES.trendFeed) ──
  const [trendOpen, setTrendOpen]     = useState(false);
  const [trendItems, setTrendItems]   = useState<any[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendNote, setTrendNote]     = useState("");
  const [trendNeedsSetup, setTrendNeedsSetup] = useState(false);
  const [apifyTok, setApifyTok]       = useState("");
  const [savingTok, setSavingTok]     = useState(false);
  const [trendShowComp, setTrendShowComp] = useState(false);  // TOP·모음 컴필레이션 표시 여부
  const [searching, setSearching]   = useState(false);
  const [showSrc, setShowSrc] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [clips, setClips]           = useState<Clip[]>([]);
  const analysisMetaRef = React.useRef<{ name: string; keyword: string; poster: string }>({ name: "", keyword: "", poster: "" });
  const [cart, setCart]             = useState<Set<string>>(new Set());

  // Stage 2
  const [targetSeconds, setTargetSeconds] = useState(15);
  const [styleProfileId, setStyleProfileId] = useState("auto");
  const [videoOnly, setVideoOnly] = useState<boolean>(() => { try { return localStorage.getItem("chronit_video_only") === "1"; } catch { return false; } });
  const toggleVideoOnly = () => setVideoOnly(v => { const nv = !v; try { localStorage.setItem("chronit_video_only", nv ? "1" : "0"); } catch {} return nv; });
  const [coupangOpen, setCoupangOpen] = useState(false);
  const [coupangQ, setCoupangQ] = useState("");
  const coupangSearch = () => { const q = coupangQ.trim(); if (q) window.open(`https://partners.coupang.com/#affiliate/ws/link/0/${encodeURIComponent(q)}`, "_blank", "noopener"); };

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
    shadowOn: true,
    shadowColor: "#000000",
    shadowOpacity: 55,
    shadowSize: 1,
    blur: 0,
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
  const [autoRunning, setAutoRunning]   = useState(false);
  const [autoRunStep, setAutoRunStep]   = useState("");
  const [autoRunError, setAutoRunError] = useState("");
  const genRetryRef = useRef(0);              // 합성 실패 자동 재시도 횟수
  const lastRenderArgsRef = useRef<any>(null);// 재시도용 렌더 파라미터
  const doRetryRef = useRef<() => void>(() => {});
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);  // 모바일 사이드바 드로어
  const [showSourceSurvey, setShowSourceSurvey] = useState(false);  // 가입 경로 설문
  const [sourceSaving, setSourceSaving] = useState(false);
  const [surveyPage, setSurveyPage] = useState(1);                  // 1: 경로, 2: 추천코드
  const [refCode, setRefCode] = useState("");
  const [refMsg, setRefMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [refLoading, setRefLoading] = useState(false);
  const [refAlready, setRefAlready] = useState(false);  // 추천 코드가 이미 적용됨(링크 유입 등)
  const [modalCtaText, setModalCtaText]   = useState("");   // 자동화 진행 단계 메시지
  const [manualScript, setManualScript] = useState("");   // 대본 직접 입력 (비우면 AI 자동)
  const [selectedSubtitlePresetId, setSelectedSubtitlePresetId] = useState("");
  const [selectedThumbnailPresetId, setSelectedThumbnailPresetId] = useState("");
  const [currentJobId, setCurrentJobId] = useState(() => {
    try { return localStorage.getItem("chronit_current_job") || ""; } catch { return ""; }
  });
  const [renderMini, setRenderMini] = useState(false);
  useEffect(() => { if (currentJobId) setRenderMini(false); }, [currentJobId]);

  // Stage 6
  const [jobs, setJobs]             = useState<Job[]>([]);
  const [genTick, setGenTick]       = useState(0); // 생성 중 경과시간 표시용 1초 틱
  useEffect(() => {
    if (!currentJobId) return;
    const t = setInterval(() => setGenTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [currentJobId]);
  const [completionAlert, setCompletionAlert] = useState<string|null>(null);
  const [gacha, setGacha] = useState<any>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [balance, setBalance]       = useState<number | null>(null);
  const [refInfo, setRefInfo] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [points, setPoints]         = useState<number | null>(null);
  const [streak, setStreak]         = useState<number>(0);
  const [checkedToday, setCheckedToday] = useState<boolean>(false);
  const [checkingIn, setCheckingIn] = useState(false);
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
  const [consentAsk, setConsentAsk] = useState<null | (() => void)>(null);
  const [consentSkip, setConsentSkip] = useState(false); // '다시 보지 않기' 체크 상태
  const askConsent = (onAgree: () => void) => {
    // 이미 '다시 보지 않기'에 동의했으면 모달 생략 (담기 로그는 onAgree 내부에서 그대로 남음)
    try { if (localStorage.getItem(`chronit_consent_skip_${TERMS_VERSION}`) === "1") { onAgree(); return; } } catch {}
    setConsentAsk(() => onAgree);
  };

  // auth
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        // 온보딩 미완료 신규 가입자는 회원가입 페이지로
        const { data: prof } = await supabase.from("profiles").select("onboarded").eq("id", session.user.id).maybeSingle();
        if (prof && prof.onboarded === false) { window.location.href = "/register"; return; }
      }
      setAuthLoading(false);
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
    try { const _u = (await supabase.auth.getUser()).data.user; if (_u) { const { data: _ri } = await supabase.rpc("get_referral_info_rpc", { p_user_id: _u.id }); if (_ri) setRefInfo(_ri); } } catch {}
    if (!data?.plan || !data?.role) {
      // 폴백 — plan/role 누락 시 직접 조회
      const { data: sub } = await supabase.from("subscriptions")
        .select("plan, role").eq("user_id", session?.user?.id ?? "").maybeSingle();
      if (sub?.plan) setUserPlan(sub.plan);
      if (sub?.role) setUserRole(sub.role);
    }
  }, [session]);

  // ── 포인트·연속·출석 ─────────────────────────────────────────
  const loadRewards = useCallback(async () => {
    try {
      const { data: p } = await supabase.rpc("get_my_points_rpc");
      if (typeof p === "number") setPoints(p);
      const { data: st } = await supabase.rpc("get_my_streak_rpc");
      if (st) { setStreak(st.streak ?? 0); setCheckedToday(!!st.checked_today); }
    } catch {}
  }, []);
  const handleCheckIn = async () => {
    if (checkingIn || checkedToday) return;
    setCheckingIn(true);
    try {
      const { data } = await supabase.rpc("attendance_check_rpc");
      if (data?.ok) {
        setCheckedToday(true);
        if (data.streak) setStreak(data.streak);
        setCompletionAlert(data.already
          ? `이미 오늘 출석했어요 (연속 ${data.streak}일)`
          : `🔥 출석 완료! +${data.awarded}P (연속 ${data.streak}일)`);
        loadRewards();
      } else if (data?.paid_only) {
        setCompletionAlert("출석·포인트는 유료 플랜 전용 혜택이에요");
      } else {
        setCompletionAlert(data?.error || "출석에 실패했어요");
      }
    } catch { setCompletionAlert("출석에 실패했어요"); }
    finally {
      setCheckingIn(false);
      setTimeout(() => setCompletionAlert(null), 3500);
    }
  };

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
  }, [session, loadJobs, loadBalance, loadRewards, loadUserSettings]);

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
          setRefMsg({ ok: true, text: `🎉 추천 코드 적용! 프로 7일 무료 체험이 시작됐어요` });
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
      genRetryRef.current = 0;
      if (stage === 5) setStage(1); // 자동 생성 흐름이면 1단계로 복귀
      setCompletionAlert("✅ 영상 생성 완료! 생성 내역으로 이동합니다.");
      try { new Audio("https://www.soundjay.com/buttons/sounds/button-09a.mp3").play(); } catch {}
      setCurrentJobId("");
      setActiveView("history"); // 완료 시 생성 내역으로 자동 이동
    } else if (job.status === "canceled") {
      // 사용자가 강제 종료 — 환불 없음, 조용히 정리
      genRetryRef.current = 0;
      setCurrentJobId("");
      setJobs(prev => prev.filter(j => j.id !== job.id));
    } else if (job.status === "error") {
      // 간헐적 서버 오류는 사용자에게 실패를 노출하지 않고 자동으로 다시 시도
      if (genRetryRef.current < 2 && lastRenderArgsRef.current) {
        genRetryRef.current += 1;
        setCurrentJobId("");
        setCompletionAlert(`일시적 오류가 있어 자동으로 다시 시도하고 있어요… (${genRetryRef.current}/2)`);
        setTimeout(() => { try { doRetryRef.current(); } catch {} }, 1200);
      } else {
        genRetryRef.current = 0;
        setCompletionAlert("❌ " + friendlyError(job.error_message));
        setCurrentJobId("");
        // 실패 잡은 생성내역에 남기지 않고 즉시 삭제 (토스트로만 안내)
        try { supabase.functions.invoke("delete-job", { body: { job_id: job.id } }); } catch {}
        setJobs(prev => prev.filter(j => j.id !== job.id));
      }
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
    // ★ 서버에도 저장 — 기기 간 동기화 (실패 무시) ★
    const _uid = session?.user?.id;
    if (_uid) {
      supabase.from("user_projects").upsert(
        { user_id: _uid, data, saved_at: data.savedAt, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      ).then(undefined, () => {});
    }
  };

  // 프로젝트 데이터 적용(로컬/서버 공용)
  const applyProjectData = (data: any) => {
    if (!data) return;
    if (typeof data.sourceUrl === "string") setSourceUrl(data.sourceUrl);
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
  };

  // 복원
  const loadProject = () => {
    try {
      const raw = localStorage.getItem(PROJECT_KEY);
      if (!raw) return false;
      applyProjectData(JSON.parse(raw));
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

  // ★ 서버 프로젝트가 로컬보다 최신이면 적용 — 기기 간 동기화 ★
  const _serverSynced = useRef(false);
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid || _serverSynced.current) return;
    _serverSynced.current = true;
    (async () => {
      try {
        const { data } = await supabase.from("user_projects").select("data, saved_at").eq("user_id", uid).maybeSingle();
        if (!data?.data) return;
        let localSavedAt = 0;
        try { const raw = localStorage.getItem(PROJECT_KEY); if (raw) localSavedAt = JSON.parse(raw).savedAt || 0; } catch {}
        const serverSavedAt = Number((data as any).saved_at || (data.data as any)?.savedAt || 0);
        if (serverSavedAt > localSavedAt) {
          applyProjectData(data.data);
          try { localStorage.setItem(PROJECT_KEY, JSON.stringify(data.data)); } catch {}
        }
      } catch { /* 무시 */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

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
  const handleSearch = async (overrideUrl?: string, keepClips?: any[]) => {
    setSearchError("");
    const ov = (typeof overrideUrl === "string") ? overrideUrl : undefined; // onClick 이벤트 객체 방어
    const su = (ov ?? sourceUrl);
    const keepUploads: any[] = keepClips ?? (clips as any[]).filter((c: any) => c.source === "upload" || c.source === "trend");
    if (ov !== undefined) setSourceUrl(ov);
    if (!su.trim()) { setSearchError("URL을 입력해주세요"); return; }
    const lu = su.toLowerCase();
    if (!["youtube.com","youtu.be","tiktok.com","instagram.com"].some(p => lu.includes(p))) {
      setSearchError("틱톡·유튜브·인스타 링크를 입력하거나, 영상을 직접 업로드해 주세요."); return;
    }
    setSearching(true); setClips(keepUploads as any); setCart(new Set(keepUploads.map((c: any) => c.video_id)));
    const MAX = 2; // 일시적 분석 실패 시 추가 재시도 횟수 (실패 화면 노출 방지)
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { setSearchError("로그인이 필요합니다"); return; }
      const headers = { "Authorization": `Bearer ${s.access_token}`, "Content-Type": "application/json" };

      for (let attempt = 0; attempt <= MAX; attempt++) {
        // Step 1: 분석 제출(submit) — 예측만 띄움. 콜드부팅(수분)에도 edge 150초 한계에 안 걸리게 비동기.
        let data1: any = null;
        let subResp: Response, sub: any;
        try {
          subResp = await fetch(FN("search-clips"), {
            method: "POST", headers,
            body: JSON.stringify({ action: "submit", source_url: su.trim() }),
          });
          sub = await subResp.json();
        } catch (netErr) {
          if (attempt < MAX) { await new Promise(r => setTimeout(r, 1500)); continue; } // 네트워크 일시 오류 → 자동 재시도
          setSearchError("분석 중 일시적인 오류가 있었어요. 잠시 후 다시 시도해 주세요."); return;
        }
        if (!sub.ok || !sub.prediction_id) {
          const credit = (subResp.status === 402 || sub.code === "INSUFFICIENT_CREDITS");
          if (!credit && attempt < MAX) { await new Promise(r => setTimeout(r, 1500)); continue; } // 서버 일시 오류 → 자동 재시도
          setSearchError(credit ? (sub.error ?? "이용권이 부족해요. 요금제를 확인해 주세요.") : (sub.error ?? "분석에 실패했어요. 잠시 후 다시 시도해 주세요."));
          return;
        }
        // Step 1b: 폴링 — 콜드부팅 포함 최대 수분까지 끊김 없이 완료 대기 (로딩 화면 유지)
        {
          const _pid = sub.prediction_id;
          const _t0 = Date.now();
          while (Date.now() - _t0 < 600_000) {
            await new Promise(r => setTimeout(r, 2500));
            let pr: any;
            try {
              const presp = await fetch(FN("search-clips"), { method: "POST", headers,
                body: JSON.stringify({ action: "poll", prediction_id: _pid }) });
              pr = await presp.json();
            } catch { continue; } // 일시 네트워크 → 다음 폴링
            if (pr?.status === "processing") continue;
            if (pr?.ok && pr?.status === "done") { data1 = pr; break; }
            if (pr && pr.ok === false) { setSearchError(pr.error ?? "분석에 실패했어요. 잠시 후 다시 시도해 주세요."); return; }
          }
        }
        if (!data1) { setSearchError("분석이 지연되고 있어요. 잠시 후 다시 시도해 주세요."); return; }
        loadBalance(); // 잔액 즉시 반영

        // 성공
        const rawClips: Clip[] = data1.clips ?? [];
        const refFrames: string[] = data1.reference_frames ?? [];
        const urlClip: any = (ov === undefined) ? buildUrlSourceClip(su.trim(), data1) : null;
        const _pf = (data1.reference_frames && data1.reference_frames[0]) || "";
        analysisMetaRef.current = { name: data1.product_name || "", keyword: data1.keyword || "", poster: (_pf && !_pf.startsWith("data:") && !_pf.startsWith("http")) ? ("data:image/jpeg;base64," + _pf) : _pf };
        // 샤오홍슈(XHS) 보조 소스 — 격리(실패해도 틱톡 결과 영향 없음)
        let xhsClips: Clip[] = [];
        try {
          const rx = await fetch(FN("search-xhs"), { method: "POST", headers,
            body: JSON.stringify({ product_name: data1.product_name || "", keyword: data1.keyword || "", keywords: data1.keywords || [], tiktok_queries: data1.tiktok_queries || [] }) });
          const dx = await rx.json();
          if (dx?.ok && Array.isArray(dx.clips)) xhsClips = dx.clips;
        } catch { /* XHS 실패 무시 */ }
        // ★ 틱톡+XHS 후보를 합쳐 CLIP 필터에 함께 태움 → 관련성 통합 필터 + 점수순 정렬
        //   (기존: XHS는 필터 없이 상단 prepend → 특징 안 맞는 XHS 다수 + 틱톡 묻힘)
        const allCand: Clip[] = [...rawClips, ...xhsClips];
        if (!allCand.length) { setClips([...(keepUploads as any), ...(urlClip ? [urlClip] : [])]); return; }
        if (!refFrames.length) { setClips([...(keepUploads as any), ...(urlClip ? [urlClip] : []), ...allCand]); return; }

        // Step 2: CLIP filter (틱톡+XHS 통합, 실패해도 폴백 — 재시도 안 함)
        try {
          const resp2 = await fetch(FN("clip-filter"), {
            method: "POST", headers,
            body: JSON.stringify({ reference_frames: refFrames, candidates: allCand, clip_count: 80 }),
          });
          const data2 = await resp2.json();
          let finalClips: Clip[] = data2.ok ? (data2.clips ?? allCand) : allCand.slice(0, 20);
          // clip-filter가 download_url(CDN)을 떨궈도 video_id로 원본에서 다시 붙임 (렌더 다운로드용)
          const _dlMap = new Map(allCand.map((c: any) => [c.video_id, c.download_url]));
          finalClips = finalClips.map((c: any) => ({ ...c, download_url: c.download_url || _dlMap.get(c.video_id) || "" }));
          setClips([...(keepUploads as any), ...(urlClip ? [urlClip] : []), ...finalClips]);
          if (!finalClips.length && !keepUploads.length && !urlClip) setSearchError("검색 결과가 없습니다. 다른 URL을 시도해보세요.");
        } catch { setClips([...(keepUploads as any), ...(urlClip ? [urlClip] : []), ...allCand]); }
        return;
      }
    } catch (e) { setSearchError("분석 중 일시적인 오류가 있었어요. 잠시 후 다시 시도해 주세요."); }
    finally { setSearching(false); }
  };
  const toggleCart = (id: string) => {
    const adding = !cart.has(id);
    const clip = (clips as any[]).find((c: any) => c.video_id === id);
    if (adding && clip && clip.source !== "upload") {
      // 타인 콘텐츠(원본 링크·유사 클립·트렌드) 담기 → 매번 저작권 확인
      askConsent(() => {
        logConsent("add", { url: clip.page_url || clip.download_url, shortcode: clip.video_id });
        setCart(prev => { const n = new Set(prev); n.add(id); return n; });
      });
      return;
    }
    setCart(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // ── Stage 3: 대본 생성 ───────────────────────────────────

  // ── Stage 5: 렌더링 ──────────────────────────────────────
  // Stage 5: 음성 세그먼트 자동 배분




  // ── 자동 생성 (Stage 2~6 순서 실행) ─────────────────────────
  const handleAutoRun = async (ctaOverride?: string) => {
    if (cart.size === 0 || autoRunning) return;
    if (ctaOverride !== undefined) setCtaText(ctaOverride);
    setShowAutoModal(false);
    setAutoRunError("");
    genRetryRef.current = 0;
    setAutoRunning(true);
    try {
      // Step 1: 대본 생성 (영상만 모드면 대본/음성 건너뜀)
      let genSegments: any = null;
      if (!videoOnly) {
      const _manual = manualScript.trim();
      if (_manual) {
        // ── 대본 직접 입력: AI 대본 생성 건너뛰고 그대로 사용 (영상 컷은 음성 길이에 맞춰 잘림) ──
        setAutoRunStep("1/3  대본 적용 중...");
        genSegments = _manual.split(/\n+|(?<=[.!?。])\s+/).map((t: string) => t.trim()).filter(Boolean).map((text: string) => ({ text }));
        if (!genSegments.length) genSegments = [{ text: _manual }];
        setScript(genSegments);
      } else {
      setAutoRunStep("1/3  대본 생성 중...");
      await new Promise<void>(async (resolve, reject) => {
        setScriptError(""); setScriptLoading(true); setScript(null);
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!s) { reject(new Error("로그인 필요")); return; }
        const selected = collectSelected();
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
          await new Promise(r => setTimeout(r, 2000));
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
      }

      }  // end if(!videoOnly)

      // Step 3: 영상 합성 — state 비동기 문제 방지: ctaOverride, voiceId 직접 전달
      setAutoRunStep(videoOnly ? "영상 합성 중... (영상만)" : "2/2  영상 합성 중...");
      await handleRender({ voiceId, ctaText: ctaOverride ?? ctaText, script: genSegments });

      setAutoRunStep("✅ 완료!");
    } catch (e) {
      const msg = String(e).replace(/^Error:\s*/, "").slice(0, 120);
      setAutoRunStep("❌ 생성 실패");
      setAutoRunError(msg);
    } finally {
      setAutoRunning(false);
    }
  };

  // ── 내 영상 추가 → URL 클립과 같은 장바구니에 합성 클립으로 append ──
  const handleAddUploads = async (files: File[]) => {
    if (!files || files.length === 0 || uploading) return;
    setUploadError(""); setUploading(true);
    setUploadOpen(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { setUploadError("로그인이 필요합니다"); return; }
      const uid = s.user.id;
      const added: any[] = [];
      for (const file of files) {
        const ext = ((file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "")) || "mp4";
        const path = `${uid}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("user-uploads")
          .upload(path, file, { contentType: file.type || "video/mp4", upsert: false });
        if (upErr) {
          console.error("[upload]", file.name, upErr);
          const big = (file.size > 500 * 1024 * 1024);
          setUploadError(big
            ? `"${file.name}" 파일이 너무 커요(500MB 초과). 더 짧게 잘라서 올려주세요.`
            : `업로드 실패: ${upErr.message}`);
          continue;
        }
        const { data: pub } = supabase.storage.from("user-uploads").getPublicUrl(path);
        const url = pub.publicUrl;
        added.push({
          video_id: `upload_${Date.now()}_${added.length}`,
          source: "upload",
          page_url: url, download_url: url,
          title: (file.name.replace(/\.[^.]+$/, "").slice(0, 40)) || "내 영상",
          description: "", thumbnail_url: "", duration: 0, author: "내 영상",
        });
      }
      if (added.length) {
        setClips(prev => [...added, ...(prev as any[])] as any);
        setCart(prev => { const n = new Set(prev); added.forEach(c => n.add(c.video_id)); return n; });
        if (!uploadName.trim()) detectProductName(files[0]); // 상품명 자동 제안 (best-effort)
      }
    } catch (e) { setUploadError(String(e)); }
    finally { setUploading(false); }
  };

  // 업로드 영상에서 상품명 자동 인식 (프레임 1장 → OpenAI 비전) — best-effort, 제안값
  const detectProductName = async (file: File) => {
    setNameDetecting(true);
    try {
      const objUrl = URL.createObjectURL(file);
      let blob: any = null;
      try { blob = await captureVideoFrame(objUrl, 0.45); } finally { URL.revokeObjectURL(objUrl); }
      if (!blob) return;
      const dataUrl: string = await new Promise((res, rej) => {
        const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(blob);
      });
      const { data: { session: s2 } } = await supabase.auth.getSession();
      if (!s2) return;
      const r = await fetch(FN("openai_chat"), {
        method: "POST",
        headers: { Authorization: `Bearer ${s2.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini", max_tokens: 30, temperature: 0,
          messages: [{ role: "user", content: [
            { type: "text", text: "이 영상 프레임 속 핵심 상품의 이름을 한국어로 2~6단어 이내로만 답해. 상품이 명확하지 않으면 빈 문자열만. 설명·따옴표 없이 상품명만 출력." },
            { type: "image_url", image_url: { url: dataUrl } },
          ] }],
        }),
      });
      const d = await r.json();
      const name = String(d?.choices?.[0]?.message?.content ?? "").trim().replace(/^["'`]+|["'`]+$/g, "").slice(0, 40);
      if (name) setUploadName(prev => (prev.trim() ? prev : name));
    } catch (_) { /* 무시 */ }
    finally { setNameDetecting(false); }
  };

  // 업로드 클립 제거 (목록·장바구니에서 빼고 스토리지에서도 best-effort 삭제)
  const handleRemoveUpload = async (clip: any) => {
    setClips(prev => (prev as any[]).filter(c => c.video_id !== clip.video_id) as any);
    setCart(prev => { const n = new Set(prev); n.delete(clip.video_id); return n; });
    try {
      const m = String(clip.download_url || "").split("/user-uploads/")[1];
      if (m) await supabase.storage.from("user-uploads").remove([decodeURIComponent(m)]);
    } catch (_) { /* 삭제 실패 무시 */ }
  };

  // 트렌드 피드 로드 (실시간+캐시, 서버가 하루 1회 갱신)
  const fetchTrends = async (force = false) => {
    if (trendLoading) return;
    setTrendLoading(true); setTrendNote("");
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { setTrendNote("로그인이 필요합니다"); return; }
      const r = await fetch(FN("trend-feed"), { method: "POST", headers: { Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ force }) });
      const d = await r.json();
      setTrendItems(d.items || []);
      setTrendNeedsSetup(!!d.needs_setup);
      if (d.needs_setup) setTrendNote("연결 준비 중 — Apify 토큰을 설정하면 표시돼요");
      else if (!(d.items || []).length) setTrendNote("아직 결과가 없어요. 잠시 후 새로고침 해주세요" + (d.status ? ` (${d.status})` : ""));
    } catch (e) { setTrendNote(String(e)); }
    finally { setTrendLoading(false); }
  };
  const openTrend = () => { setTrendOpen(o => { const nv = !o; if (nv && !trendItems.length) fetchTrends(); return nv; }); };
  // 트렌드 영상을 업로드처럼 처리 — 그 릴스를 소스 클립으로 넣어 자막제거+컷편집+합성 (유사클립 검색 X)
  // 트렌드 영상 = 타인 콘텐츠 → 최초 1회 저작권 동의 + 서버 로그(법적 증빙)
  const TERMS_VERSION = "trend-v1";
  const TERMS_TEXT = "이 영상에 사용 권리가 있는지 확인하세요. 타인의 콘텐츠를 무단으로 재가공·업로드할 경우 저작권 등 모든 책임은 이용자 본인에게 있으며, 크로닛은 이에 대해 책임지지 않습니다.";
  // 서버에 동의/사용 기록 (누가·언제·약관버전·어떤 영상) — 변조 불가 증거
  const logConsent = async (action: "agree" | "add" | "analyze", it?: any) => {
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) return;
      fetch(FN("log-consent"), { method: "POST", headers: { Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action, terms_version: TERMS_VERSION, terms_text: action === "agree" ? TERMS_TEXT : undefined, shortcode: it?.shortcode, source_url: it?.url }) });
    } catch (_) {}
  };
  // 링크로 가져온 "원본 영상" 자체를 목록에 넣기 (유사 클립만 뜨지 않도록)
  const buildUrlSourceClip = (url: string, d: any): any => {
    const pf = (d.reference_frames && d.reference_frames[0]) || "";
    const thumb = pf ? ((pf.startsWith("data:") || pf.startsWith("http")) ? pf : "data:image/jpeg;base64," + pf) : "";
    return {
      video_id: "url_" + String(url).replace(/[^a-zA-Z0-9]/g, "").slice(-24),
      source: "url",                 // 직접 링크 원본 — 캡션제거 적용(업로드 아님), page_url로 yt-dlp 다운로드
      page_url: url, download_url: url,
      title: String(d.product_name || "원본 영상").slice(0, 40),
      description: "", thumbnail_url: thumb, duration: 0, author: "원본",
    };
  };
  const buildTrendClip = (it: any): any => ({
    video_id: `trend_${it.shortcode}`,
    source: "trend",                        // 분석/트렌드 — 상품명 필수 아님(분석이 product_name 제공)
    page_url: it.url,                       // CDN 만료 시 yt-dlp 폴백
    download_url: it.video_url || it.url,
    title: String(it.caption || "트렌드 영상").slice(0, 40),
    description: String(it.caption || ""),
    thumbnail_url: it.thumbnail_url || "",
    duration: 0, author: it.owner || "",
  });
  // 담기: 소스 클립으로 추가(업로드처럼, 무료) — 여러 개 누적 가능
  const trendAdd = (it: any) => askConsent(() => {
    logConsent("add", it);
    const clip = buildTrendClip(it);
    setClips(prev => (prev as any[]).some((c: any) => c.video_id === clip.video_id) ? prev : [clip, ...(prev as any[])] as any);
    setCart(prev => { const n = new Set(prev); n.add(clip.video_id); return n; });
    setActiveView("generator"); setUploadOpen(true);
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (_) {}
  });
  // 분석: 담기 + 분석(유사클립·상품명, 10CR) — reel은 유지하고 유사클립을 추가
  const trendAnalyze = (it: any) => askConsent(() => {
    logConsent("analyze", it);
    const clip = buildTrendClip(it);
    setActiveView("generator"); setUploadOpen(true);
    setClips([clip] as any); setCart(new Set([clip.video_id]));
    handleSearch(it.url, [clip]);
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (_) {}
  });
  // 트렌드 탭 진입 시 자동 로드
  useEffect(() => { if (activeView === "trends" && !trendItems.length && !trendLoading) fetchTrends(); /* eslint-disable-next-line */ }, [activeView]);

  // Apify 토큰 저장 (주인 전용) — store-config가 서버에서 이메일 검증
  const saveApifyToken = async () => {
    if (!apifyTok.trim() || savingTok) return;
    setSavingTok(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { setTrendNote("로그인이 필요합니다"); return; }
      const r = await fetch(FN("store-config"), { method: "POST", headers: { Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ key: "APIFY_TOKEN", value: apifyTok.trim() }) });
      const d = await r.json();
      if (d.ok) { setApifyTok(""); setTrendNeedsSetup(false); setTrendNote("✅ 토큰 저장됨 — 트렌드 불러오는 중…"); await fetchTrends(true); }
      else setTrendNote("토큰 저장 실패: " + (d.error || ""));
    } catch (e) { setTrendNote(String(e)); }
    finally { setSavingTok(false); }
  };

  // 선택 클립 수집 + 업로드 클립에 상품정보(대본용) 주입 + analysisMeta 보정
  const collectSelected = () => {
    const sel = clips.filter(c => cart.has(c.video_id));
    const pn = uploadName.trim(), pd = uploadDesc.trim();
    const hasUpload = sel.some((c: any) => c.source === "upload" && !String(c.video_id || "").startsWith("trend_"));
    if (hasUpload) {
      if (!analysisMetaRef.current.name && pn) analysisMetaRef.current = { name: pn, keyword: pn, poster: "" };
      if (pn || pd) return sel.map((c: any) => (c.source === "upload" && !String(c.video_id || "").startsWith("trend_"))
        ? { ...c, description: [pn, pd].filter(Boolean).join("\n") } : c);
    }
    return sel;
  };

  const handleRender = async (overrides?: { voiceId?: string; ctaText?: string; script?: any }) => {
    lastRenderArgsRef.current = overrides ?? {};
    setRenderError(""); setRendering(true);
    const _voiceId = overrides?.voiceId ?? voiceId;
    const _script = overrides?.script ?? script;
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { setRenderError("로그인이 필요합니다"); return; }
      const selected = collectSelected();
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
          script_segments: videoOnly ? null : _script,
          video_only: videoOnly,
          cta_text: overrides?.ctaText ?? ctaText,
          product_name: analysisMetaRef.current.name,
          search_keyword: analysisMetaRef.current.keyword,
          poster_src: analysisMetaRef.current.poster ? ("data:image/jpeg;base64," + analysisMetaRef.current.poster) : "",
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
  // 합성 실패 시 자동 재시도가 호출할 함수 (최신 handleRender 참조)
  doRetryRef.current = () => { handleRender(lastRenderArgsRef.current ?? undefined); };

  // ── 렌더 강제 종료 (이용권 환불 안 함 — 컴퓨팅이 이미 돌아갔으므로) ──
  const handleCancelRender = async (jobId: string) => {
    if (!jobId) return;
    if (!window.confirm("지금 강제 종료하면 영상은 만들어지지 않고, 사용한 이용권은 환불되지 않아요.\n정말 종료할까요?")) return;
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s) {
        await fetch(FN("cancel-render"), {
          method: "POST",
          headers: { Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ job_id: jobId }),
        });
      }
    } catch (e) { /* noop */ }
    setCurrentJobId("");
    setRenderMini(false);
    setCompletionAlert("렌더를 종료했어요. (이용권은 환불되지 않아요)");
    setJobs(prev => prev.filter(j => j.id !== jobId));
    try { loadJobs(); loadBalance(); } catch {}
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
    try { clearProject(); } catch (_) {}
    // 유지: subtitleStyle, thumbnailStyle, voiceId, voiceSpeed, voiceVolume,
    //       targetSeconds, styleProfileId, showThumbnail
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#ECEAE3] text-gray-900">
      {/* ── 저작권 동의 모달 (매번) ── */}
      {consentAsk && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => { setConsentAsk(null); setConsentSkip(false); }}>
          <div className="rounded-2xl bg-white border border-gray-200 shadow-2xl w-full max-w-sm p-5 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <h2 className="text-base font-black text-gray-900">저작권 확인</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600">{TERMS_TEXT}</p>
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
              <input type="checkbox" checked={consentSkip} onChange={e => setConsentSkip(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-[#03C75A]" />
              이 안내 다시 보지 않기
            </label>
            <div className="flex gap-2">
              <button onClick={() => { setConsentAsk(null); setConsentSkip(false); }}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 transition">취소</button>
              <button onClick={() => { if (consentSkip) { try { localStorage.setItem(`chronit_consent_skip_${TERMS_VERSION}`, "1"); } catch {} } logConsent("agree"); const fn = consentAsk; setConsentAsk(null); setConsentSkip(false); if (fn) fn(); }}
                className="flex-1 rounded-xl bg-[#03C75A] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#02b350] transition">동의하고 계속</button>
            </div>
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
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">📄 대본 · 🎙 음성 · 🎬 합성·자막</span>
                <span className="text-green-500 font-bold">분석·대본·음성 무료</span>
              </div>
              <div className="border-t border-gray-200 my-2" />
              <div className="flex justify-between text-sm font-black">
                <span className="text-gray-900">이 작업으로 영상 1개 사용</span>
                {balance !== null && <span className={balance >= 1 ? "text-[#03C75A]" : "text-red-400"}>남은 {balance.toLocaleString()}개</span>}
              </div>
              {balance !== null && balance < 1 && <p className="text-xs text-red-400 pt-1">⚠ 이용권이 부족해요 — 요금제를 확인해 주세요</p>}
            </div>

            {/* ⚠️ 스타일/클립 경고 */}
            <div className="space-y-2">
              {videoOnly ? (
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2">
                  <span className="text-sm">🎬</span>
                  <p className="text-xs font-bold text-gray-600">영상만 모드 — AI 음성·자막 없이 클립 몽타주만 생성돼요.</p>
                </div>
              ) : (!styleProfileId || styleProfileId === "auto") ? (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2">
                  <span className="text-sm">⚠️</span>
                  <p className="text-xs font-bold text-red-600">스타일 미적용 — 영상이 어색할 수 있어요. <span className="font-normal text-red-500">'콘셉트/스타일'에서 설정하면 훨씬 좋아져요.</span></p>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2">
                  <span className="text-sm">🎨</span>
                  <p className="text-xs font-bold text-green-700">스타일 적용됨</p>
                </div>
              )}
              {cart.size < 3 && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                  <span className="text-sm">⚠️</span>
                  <p className="text-xs font-bold text-amber-700">클립 {cart.size}개 — 3개 이상 담아야 영상이 자연스러워요.</p>
                </div>
              )}
            </div>

            {/* 대본 직접 입력 (영상만이면 숨김) */}
            {!videoOnly && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">✍️ 대본 직접 입력 <span className="font-normal text-gray-400">· 선택 (비우면 AI가 자동 생성)</span></p>
              <p className="text-xs text-gray-500">직접 쓰면 그 대본으로 음성·자막이 만들어지고, <b>영상 컷이 대본(문장)에 맞춰</b> 잘려요. 한 줄(또는 한 문장)이 한 컷이에요.</p>
              <textarea value={manualScript} onChange={e => setManualScript(e.target.value)} rows={4}
                placeholder={"예:\n이거 진짜 신세계예요\n버튼 하나로 끝나거든요\n주방 좁아도 걱정 없어요"}
                className="w-full rounded-xl bg-gray-100 border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#03C75A] transition resize-none" />
            </div>
            )}

            {/* CTA 입력 (영상만이면 숨김) */}
            {!videoOnly && (
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
            )}

            {/* 버튼 */}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowAutoModal(false)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700 hover:text-gray-900 hover:border-gray-500 transition">
                취소
              </button>
              <button
                onClick={() => { setCtaText(modalCtaText); handleAutoRun(modalCtaText); }}
                disabled={balance !== null && balance < 1}
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
            {!completionAlert.startsWith("❌") && (completionAlert.includes("완성") || completionAlert.includes("생성 내역")) && <p className="text-xs text-green-100 mt-0.5">생성 내역 탭에서 다운로드하세요</p>}
          </div>
          <button onClick={() => setCompletionAlert(null)} className="ml-4 text-gray-900/70 hover:text-gray-900 text-lg">✕</button>
        </div>
      )}

      {/* ── 자동 생성 중 중앙 오버레이 ── */}
      {autoRunning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-3xl bg-white border border-gray-200 px-10 py-8 text-center shadow-2xl max-w-sm mx-4">
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-gray-200 border-t-[#03C75A] rounded-full animate-spin" />
            <p className="text-lg font-black text-gray-900">잠깐! 아직 닫으면 안 돼요 🙏</p>
            <p className="text-sm text-[#03C75A] mt-1">{autoRunStep || "처리 중..."}</p>
            <p className="text-xs text-gray-500 mt-3">영상 설정을 준비하고 있어요.<br/>거의 다 됐어요 — 이 단계만 지나면 기다리는 동안 다른 걸 하셔도 돼요!</p>
          </div>
        </div>
      )}
      {/* ── 백그라운드 렌더 진행 (제출 후 합성 도는 동안) ── */}
      {!autoRunning && currentJobId && (() => {
        const bg = jobs.find(j => j.id === currentJobId);
        if (bg && (bg.status === "done" || bg.status === "error" || bg.status === "canceled")) return null;
        if (!renderMini) {
          return <RenderProgressCard job={bg} tick={genTick} onMinimize={()=>setRenderMini(true)} onCancel={()=>handleCancelRender(currentJobId)} />;
        }
        return (
          <button onClick={()=>setRenderMini(false)}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-white border border-[#03C75A]/40 shadow-2xl shadow-[#03C75A]/10 px-5 py-3 flex items-center gap-3 hover:bg-[#FAFDFB]">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-[#03C75A] rounded-full animate-spin shrink-0" />
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900">영상 생성 중... <span className="text-[#03C75A]">펼치기</span></p>
              <p className="text-xs text-gray-500">창을 닫거나 다른 작업을 해도 계속 생성돼요.</p>
            </div>
          </button>
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
                <p className="mt-1 text-center text-sm text-gray-500"><b className="text-[#03C75A]">프로 7일 무료 체험</b>이 시작됐어요.</p>
                <button onClick={closeSurvey}
                  className="mt-5 w-full rounded-xl bg-[#03C75A] px-4 py-3 text-sm font-black text-white transition hover:bg-[#02b350] active:scale-[0.98]">
                  시작하기
                </button>
              </>
            ) : (
              <>
                <p className="text-center text-lg font-black text-gray-900">추천 코드가 있으신가요?</p>
                <p className="mt-1 text-center text-sm text-gray-500">입력하면 <b className="text-[#03C75A]">프로 7일 무료 체험</b>! (친구가 결제하면 추천인도 프로 30일)</p>
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
      <AppTopBar onMenuClick={() => setMobileMenuOpen(true)} onInvite={() => setShowInvite(true)} session={session} balance={balance} userPlan={userPlan} onHistory={() => setShowHistory(true)} />
      <CreditMissionsModal open={showInvite} onClose={() => setShowInvite(false)} session={session} onCredited={loadBalance} />
      <CreditHistoryModal open={showHistory} onClose={() => setShowHistory(false)} session={session} />

      {/* ── 모바일 사이드바 드로어 ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[90] md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="absolute left-0 top-0 h-full w-64 max-w-[82%] bg-[#ECEAE3] border-r border-gray-200 flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <NavSidebar activeView={activeView}
              onViewChange={(v:string) => { setActiveView(v); setMobileMenuOpen(false); }}
              userRole={userRole} balance={balance} userPlan={userPlan} session={session} onCredited={loadBalance} />
          </div>
        </div>
      )}

      {/* ── 상단 탭 바 (데스크탑) ── */}
      <AppTabBar activeView={activeView} onViewChange={setActiveView} userRole={userRole} />

      {/* ── 본문 행 ── */}
      <div className="flex flex-1">
      {/* ── 메인 콘텐츠 ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {activeView !== "generator" && (
          <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-4 md:px-8 py-5 md:py-6">
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
            {activeView === "trends" && (
              <div className="max-w-5xl mx-auto">
                <h2 className="mb-1 text-xl font-black text-gray-900">🔥 오늘의 트렌드</h2>
                <p className="mb-4 text-sm text-gray-500">댓글 많은 쇼핑 릴스를 매일 서버에서 자동 수집해 댓글수 순으로 보여줘요. 카드를 누르면 그 영상으로 바로 제작 흐름으로 넘어가요.</p>
                {trendNote && <p className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">{trendNote}</p>}
                {trendNeedsSetup && (session?.user?.email || "").toLowerCase() === "pv2066pv@gmail.com" && (
                  <div className="mb-4 max-w-md space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
                    <p className="text-xs font-bold text-amber-700">🔑 Apify 토큰 연결 <span className="font-normal text-amber-500">· 주인 전용 · 한 번만</span></p>
                    <input type="password" value={apifyTok} onChange={e => setApifyTok(e.target.value)} placeholder="apify_api_..."
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500" />
                    <button onClick={saveApifyToken} disabled={savingTok || !apifyTok.trim()}
                      className="w-full rounded-lg bg-amber-500 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-40 transition">{savingTok ? "저장 중…" : "토큰 저장"}</button>
                  </div>
                )}
                {trendLoading && !trendItems.length && (
                  <div className="flex flex-col items-center gap-2 py-12">
                    <span className="h-7 w-7 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                    <span className="text-xs text-gray-400">처음 불러올 땐 1~2분 걸려요…</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {(() => {
                    const cutoff = Date.now() - 7 * 86400000; // 최근 7일
                    const isComp = (c: string) => /top ?\d|베스트|순위|랭킹|모음|총정리|\d+ ?가지|\d+ ?위/i.test(c || ""); // TOP5·모음 등 컴필레이션
                    const within = trendItems.filter((it: any) => it.taken_at && new Date(it.taken_at).getTime() >= cutoff);
                    const single = within;
                    const base = single.length >= 5 ? single : within; // 단일상품이 너무 적으면 전체(최근)
                    const shown = (base.length ? base : trendItems)
                      .slice()
                      .sort((a: any, b: any) => (b.comment_count || 0) - (a.comment_count || 0)); // 댓글 많은 순
                    return shown.map((it: any) => (<TrendCard key={it.shortcode} item={it} onAdd={() => trendAdd(it)} onAnalyze={() => trendAnalyze(it)} />));
                  })()}
                </div>
              </div>
            )}
            {activeView === "history" && (
              <>
                <h2 className="text-xl font-black text-gray-900 mb-6">📹 생성 내역</h2>
                <HistoryView session={session} onGoToLinks={()=>setActiveView("product-search")} onGacha={(g:any)=>setGacha(g)} />
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
        <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5">
          <div className="space-y-0">


          {/* 새로 시작 (작업 초기화) */}
          <div className="mb-3 flex justify-end">
            <button onClick={() => { if (window.confirm("현재 작업을 비우고 새로 시작할까요?\n(완성된 영상은 생성 내역에 그대로 있어요)")) handleReset(); }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-500 transition hover:border-[#03C75A]/50 hover:text-[#03C75A]">🆕 새로 시작</button>
          </div>

          <StagePanel n={1} title="영상 분석" current={stage} hideNum
            headerRight={
              (refInfo && !refInfo.ref_is_paid && refInfo.ref_cap_days) ? (
              <div className="shrink-0 w-36 sm:w-44">
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#03C75A]">🎁 프로 잔여</span>
                  <span className={refInfo.ref_remaining_days <= 3 ? "font-bold text-red-500" : "text-gray-400"}>{refInfo.ref_remaining_days}일</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div className={`h-full rounded-full transition-all ${refInfo.ref_remaining_days <= 3 ? "bg-red-500" : "bg-[#03C75A]"}`} style={{ width: `${Math.min(100, Math.round((refInfo.ref_remaining_days / Math.max(1, refInfo.ref_cap_days)) * 100))}%` }} />
                </div>
              </div>
              ) : null
            }>
            <div className="space-y-4">
              {/* 영상 준비 — 직접 업로드 메인 + 보조 도구 (최상단) */}
              <div className="flex flex-wrap gap-2">
                {FEATURES.directUpload && (
                  <button type="button" onClick={() => setUploadOpen(o => !o)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-bold transition ${uploadOpen ? "border-[#03C75A] bg-[#03C75A]/10 text-[#03C75A]" : "border-[#03C75A]/40 bg-[#03C75A]/5 text-[#03C75A] hover:border-[#03C75A]"}`}>
                    ⬆️ 직접 업로드
                  </button>
                )}
                <button type="button" onClick={() => setCoupangOpen(o => !o)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition ${coupangOpen ? "border-blue-400 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"}`}>
                  🛒 쿠팡 상품 확인
                </button>
                <button type="button" onClick={toggleVideoOnly}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition ${videoOnly ? "border-[#03C75A] bg-[#03C75A]/10 text-[#03C75A]" : "border-gray-200 bg-white text-gray-600 hover:border-[#03C75A]/50"}`}>
                  🎬 영상만 만들기{videoOnly ? " ✓" : ""}
                </button>
              </div>
              {videoOnly && <p className="-mt-2 text-xs text-gray-400">AI 음성·자막 없이 (직접 더빙용)</p>}

              {FEATURES.directUpload && uploadOpen && (
                <div>
                  <p className="mb-2 text-sm leading-relaxed text-gray-500">직접 촬영했거나 사용 권리가 있는 영상을 올리세요. 업로드 영상도 자막·컷편집·더빙이 똑같이 적용돼요.</p>
                  <div className="relative">
                    <input type="file" accept="video/*" multiple disabled={uploading}
                      onChange={e => { const arr = Array.from(e.target.files || []); (e.currentTarget as HTMLInputElement).value = ""; handleAddUploads(arr); }}
                      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
                    <div className={`pointer-events-none flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition ${uploading ? "border-gray-200 opacity-60" : "border-gray-300"}`}>
                      {uploading
                        ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#03C75A] border-t-transparent" /><span className="text-sm font-bold text-gray-600">업로드 중...</span></>
                        : <><span className="text-xl">⬆️</span><span className="text-sm font-bold text-gray-800">영상 파일 선택 (여러 개 가능)</span></>}
                    </div>
                  </div>
                  {uploadError && <p className="mt-2 text-sm text-red-500">{uploadError}</p>}
                  {clips.some((c: any) => c.source === "upload" && !String(c.video_id || "").startsWith("trend_")) && (
                    <div className="mt-2 space-y-2 rounded-xl border border-[#03C75A]/30 bg-[#03C75A]/5 p-3">
                      <p className="text-xs font-bold text-gray-700">📝 업로드 영상 상품 정보 <span className="font-normal text-red-500">*</span> <span className="font-normal text-gray-400">· 쿠팡 검색어{!videoOnly ? "·대본" : ""}에 사용</span>{nameDetecting && <span className="ml-1 font-normal text-[#03C75A]">· 🔎 AI가 상품명 찾는 중…</span>}</p>
                      <input type="text" value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="상품명 (예: 휴대용 미니 가습기)"
                        className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-[#03C75A] focus:ring-1 focus:ring-[#03C75A] transition" />
                      {!videoOnly && (
                        <textarea value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} rows={2} placeholder="상품 설명 (선택) — 핵심 기능·장점·타깃"
                          className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-[#03C75A] focus:ring-1 focus:ring-[#03C75A] transition resize-none" />
                      )}
                    </div>
                  )}
                </div>
              )}

              {coupangOpen && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                  <p className="mb-2 text-sm text-blue-600">분석·생성 전에 이 상품이 쿠팡 파트너스에 있는지 먼저 검색해 보세요. 없으면 다른 상품으로 바꾸면 이용권을 아껴요.</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                    <input type="text" value={coupangQ}
                      onChange={e => setCoupangQ(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && coupangSearch()}
                      placeholder="상품명 입력 (예: 음식 밀봉기)"
                      className="flex-1 rounded-lg bg-white border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition" />
                    <button type="button" onClick={coupangSearch} disabled={!coupangQ.trim()}
                      className="w-full sm:w-auto shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40 transition">
                      쿠팡 파트너스에서 검색 →
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-base font-bold text-gray-700">또는 링크로 가져오기 <span className="font-normal text-gray-400">· 인스타 · 틱톡 · 유튜브</span></label>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <input type="url" value={sourceUrl}
                    onChange={e => { setSourceUrl(e.target.value); setSearchError(""); setClips([]); setCart(new Set()); }}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="인스타·틱톡·유튜브 영상 링크 붙여넣기"
                    disabled={searching}
                    className="flex-1 rounded-xl bg-gray-100 border border-gray-200 px-4 py-3.5 text-base text-gray-900 placeholder-gray-500 outline-none focus:border-[#03C75A] focus:ring-1 focus:ring-[#03C75A] disabled:opacity-50 transition" />
                  <button onClick={() => handleSearch()} disabled={searching || !sourceUrl.trim()}
                    className="w-full sm:w-auto shrink-0 rounded-xl bg-[#03C75A] px-5 py-3.5 text-base font-bold text-white hover:bg-[#02b350] disabled:opacity-40 transition flex items-center justify-center gap-2">
                    {searching
                      ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />분석 중...</>
                      : "🔍 분석 시작"}
                  </button>
                </div>
                {!searchError && <UrlHint url={sourceUrl} />}
                {searchError && <p className="mt-2 text-sm text-red-400">{searchError}</p>}
                {searching && <AnalyzeProgress />}
              </div>

              {clips.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">
                      클립 <span className="text-gray-400 font-normal">{clips.length}개</span>
                    </span>
                    <span className="text-sm font-bold text-[#03C75A]">{cart.size}개 담음</span>
                  </div>
                  <div className="mb-3 rounded-xl border border-[#03C75A]/30 bg-[#03C75A]/5 px-3 py-2 text-center">
                    <div className="text-sm font-bold text-gray-700">
                      클립 <span className="text-[#03C75A]">3개 이상</span> 담고 <span className="text-[#03C75A]">🚀 자동 생성</span>
                    </div>
                    <div className="mt-0.5 text-xs font-medium text-gray-400">많이 담을수록 영상이 더 좋아져요</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {clips.map(clip => (
                      <ClipCard key={clip.video_id} clip={clip}
                        selected={cart.has(clip.video_id)} onToggle={() => toggleCart(clip.video_id)}
                        onRemove={((clip as any).source === "upload" || (clip as any).source === "trend" || (clip as any).source === "url") ? () => handleRemoveUpload(clip) : undefined} />
                    ))}
                  </div>
                  {(() => {
                    const needUploadName = clips.some((c: any) => c.source === "upload" && !String(c.video_id || "").startsWith("trend_")) && !uploadName.trim();
                    return (
                  <FloatingNext
                    label={autoRunning ? (autoRunStep || "처리 중...") : cart.size === 0 ? "👇 클립을 담아주세요" : needUploadName ? "✏️ 상품명을 입력해주세요" : `🚀 자동 생성 (${cart.size}개)`}
                    onClick={() => { if (!autoRunning && cart.size > 0 && !needUploadName) { setModalCtaText(ctaText); setShowAutoModal(true); } }}
                    disabled={autoRunning || cart.size === 0 || needUploadName} />
                    );
                  })()}
                  {!autoRunning && autoRunError && (
                    <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
                      <span>❌</span>
                      <div className="flex-1">
                        <div className="font-semibold">자동 생성 실패</div>
                        <div className="text-red-300/80 mt-0.5">{friendlyError(autoRunError)}</div>
                        <div className="text-red-300/60 text-xs mt-1">영상은 합성 성공 시 이용권 1개가 차감되고, 실패하면 차감되지 않아요. (분석·대본·음성은 무료예요)</div>
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

  return (
    <div className="space-y-5">
      {/* 탭 + 미리듣기 */}
      <div className="flex gap-2 items-center">
        {([["basic","일반 음성"],["pro","고급 음성"]] as [string,string][]).map(([v,l]) => {
          const isProLocked = v === "pro" && userPlan !== "pro" && userPlan !== "pro_trial" && userPlan !== "master" && userPlan !== "enterprise";
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
    <div style={{ position:"fixed", bottom:"92px", left:"50%", transform:"translateX(-50%)", zIndex:50, width:"max-content", maxWidth:"calc(100vw - 32px)" }}>
      <button onClick={onClick} disabled={disabled}
        className={disabled ? undefined : "cta-glow-pulse"}
        style={{ height:"58px", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:"8px",
                 background: disabled
                   ? "#E5E7EB"
                   : "linear-gradient(135deg, #03C75A 0%, #0AB39C 50%, #1E88FF 100%)",
                 borderRadius:"18px", padding:"0 34px",
                 fontSize:"16px", fontWeight:900,
                 color: disabled ? "#6B7280" : "white",
                 border: disabled ? "3px solid rgba(255,255,255,0.7)" : "3px solid rgba(255,255,255,0.92)",
                 cursor: disabled ? "not-allowed" : "pointer",
                 transition:"background .25s ease, color .25s ease" }}>
        <span>{label}</span>{!disabled && <span>→</span>}
      </button>
    </div>,
    document.body
  );
}

// ── 사용자용 에러 메시지 변환 (내부 기술 에러 → 이해되는 문구) ──────────
function friendlyError(raw?: string): string {
  const e = (raw || "").toLowerCase();
  if (!e) return "영상 생성에 실패했어요. 잠시 후 다시 시도해 주세요.";
  if (e.includes("insufficient") || e.includes("credit") || e.includes("크레딧"))
    return "이용권이 부족해요. 요금제를 확인해 주세요.";
  if (e.includes("다운로드 실패") || e.includes("download fail") || e.includes("not available") || e.includes("yt-dlp") || e.includes("video stream"))
    return "클립 영상을 불러오지 못했어요. 원본 클립이 일시적으로 막혔을 수 있어요 — 잠시 후 다시 시도하거나 다른 클립을 담아 주세요. (이용권은 환불됐어요)";
  if (e.includes("no clip") || e.includes("not found") || e.includes("검색 결과") || e.includes("상품을 찾") || e.includes("clip"))
    return "영상에서 상품·클립을 충분히 찾지 못했어요. 상품이 잘 보이는 다른 쇼핑 숏폼으로 다시 시도해 주세요.";
  if (e.includes("timeout") || e.includes("시간 초과"))
    return "처리 시간이 초과됐어요. 잠시 후 다시 시도해 주세요. (이용권은 자동 환불돼요)";
  return "영상 생성 중 일시적인 오류가 발생했어요. 합성에 쓰인 이용권은 자동 환불됐어요 — 잠시 후 다시 시도하면 대부분 해결돼요.";
}

// ── URL 입력 라이브 힌트 (잘못된 링크 즉시 안내) ──────────────────────────
function UrlHint({ url }: { url: string }) {
  const u = (typeof url === "string" ? url : "").trim().toLowerCase();
  if (!u) return null;
  if (["instagram.com","youtube.com","youtu.be","tiktok.com"].some(p => u.includes(p)))
    return <p className="mt-1.5 text-sm font-bold text-[#03C75A]">✅ 분석할 수 있는 영상 링크예요</p>;
  if (["coupang.","link.coupang","naver.","smartstore","11st.","gmarket.","auction.","aliexpress","amazon.","wconcept","kakao","ohou","oliveyoung","ssg.","lotteon"].some(p => u.includes(p)))
    return <p className="mt-1.5 text-sm font-bold text-orange-500">🛍 상품 <b>페이지</b> 링크 같아요 — 그 상품을 소개하는 <b>영상</b>(인스타·틱톡·유튜브) 링크를 넣어주세요</p>;
  return <p className="mt-1.5 text-sm font-bold text-orange-500">⚠️ 인스타·틱톡·유튜브 <b>영상</b> 링크만 분석할 수 있어요</p>;
}

// ── 분석 진행률 바 (예상 시간 기반 — 백엔드 단일 호출이라 추정치) ──────────
function AnalyzeProgress() {
  const [pct, setPct] = React.useState(6);
  const [label, setLabel] = React.useState("영상 분석 중...");
  React.useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => {
      const e = (Date.now() - t0) / 1000;
      const p = 95 * (1 - Math.exp(-e / 35)); // ~95%로 점근(끝에서 천천히), 완료 시 언마운트
      setPct(Math.max(6, Math.round(p)));
      setLabel(e < 12 ? "영상 분석 중..." : e < 45 ? "관련 클립 검색 중..." : "클립 정리 중... 거의 다 됐어요 ✨");
    }, 200);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <div className="mt-3 rounded-xl bg-gray-100 px-4 py-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">{label}</span>
          <span className="text-sm font-black text-[#03C75A]">{pct}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div className="h-full rounded-full bg-gradient-to-r from-[#03C75A] to-[#1E88FF] transition-all duration-300 ease-out"
            style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-gray-500">보통 30초~2분 정도 걸려요 · 창을 닫지 말고 잠시만 기다려 주세요</p>
      </div>
      <LoadingTips intervalMs={12000} />
    </>
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
  shadowOn?: boolean; shadowColor?: string; shadowOpacity?: number; shadowSize?: number; blur?: number;
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
    textShadow: (() => {
      const sh: string[] = [];
      if (st.shadowOn) { const o = (st.shadowSize ?? 1) * PREVIEW_SCALE; sh.push(`${o}px ${o}px ${o*0.6}px ${(st.shadowColor ?? "#000000")}${Math.round((st.shadowOpacity ?? 55)*2.55).toString(16).padStart(2,"0")}`); }
      if ((st.blur ?? 0) > 0) { const g = (st.blur ?? 0) * PREVIEW_SCALE * 3; sh.push(`0 0 ${g}px ${st.color}`); }
      return sh.length ? sh.join(", ") : undefined;
    })(),
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

      {/* 그림자 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-400">그림자</label>
          <button onClick={() => upd("shadowOn", !s.shadowOn)}
            className={`rounded-full px-3 py-1 text-xs font-black transition ${s.shadowOn ? "bg-[#03C75A] text-white" : "bg-gray-200 text-gray-400"}`}>
            {s.shadowOn ? "ON" : "OFF"}
          </button>
        </div>
        {s.shadowOn && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">색상</label>
              <ColorPalette value={s.shadowColor ?? "#000000"} onChange={(c) => upd("shadowColor", c)} />
            </div>
            <div>
              <label className="text-xs text-gray-400">진하기 {s.shadowOpacity ?? 55}%</label>
              <input type="range" min={10} max={100} step={5} value={s.shadowOpacity ?? 55}
                onChange={e => upd("shadowOpacity", Number(e.target.value))} className="w-full accent-[#03C75A] mt-1" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400">크기 {s.shadowSize ?? 1}</label>
              <input type="range" min={0} max={6} step={0.5} value={s.shadowSize ?? 1}
                onChange={e => upd("shadowSize", Number(e.target.value))} className="w-full accent-[#03C75A] mt-1" />
            </div>
          </div>
        )}
      </div>

      {/* 글로우(번짐) */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-400">글로우(번짐)</label>
          <span className="text-xs text-gray-400">{s.blur ?? 0}</span>
        </div>
        <input type="range" min={0} max={5} step={0.5} value={s.blur ?? 0}
          onChange={e => upd("blur", Number(e.target.value))} className="w-full accent-[#03C75A] mt-1" />
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
const KAKAO_JS_KEY = (import.meta as any).env?.VITE_KAKAO_JS_KEY || "84ee352af8ddaf49632d40de964fa9f4";
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
          <h2 className="text-xl font-black text-gray-900">📒 사용 내역</h2>
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

// 로딩 중 '터지는 숏폼 부업 꿀팁' 카드뉴스 (30초마다 랜덤 회전)
function LoadingTips({ intervalMs = 30000 }: { intervalMs?: number }) {
  const [tips, setTips] = React.useState<any[]>([]);
  const [idx, setIdx] = React.useState(0);
  React.useEffect(()=>{ (async()=>{
    try {
      const { data } = await supabase.from("loading_tips").select("emoji,text").eq("active", true);
      const arr = Array.isArray(data) ? [...data] : [];
      for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
      setTips(arr);
    } catch {}
  })(); }, []);
  React.useEffect(()=>{ if(tips.length<2) return; const t=setInterval(()=>setIdx(i=>(i+1)%tips.length), intervalMs); return ()=>clearInterval(t); }, [tips, intervalMs]);
  if (!tips.length) return null;
  const tip = tips[idx];
  const go = (d:number)=> setIdx(i => (i + d + tips.length) % tips.length);
  return (
    <div className="mt-5 rounded-2xl bg-[#FAFAF8] border border-gray-200 p-4 text-left">
      <p className="text-[11px] font-black text-[#03C75A] mb-2">📚 터지는 숏폼 제작 꿀팁 <span className="text-gray-400 font-bold">· 지식 충전 시간</span></p>
      <div key={idx} className="tip-fade flex items-start gap-3 min-h-[64px]">
        <div className="text-3xl leading-none shrink-0">{tip.emoji || "💡"}</div>
        <p className="text-sm font-bold text-gray-800 leading-relaxed">{tip.text}</p>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button onClick={()=>go(-1)} className="text-gray-400 hover:text-gray-700 text-sm px-2">‹</button>
        <span className="text-[11px] text-gray-400">{Math.round(intervalMs/1000)}초마다 자동으로 넘어가요</span>
        <button onClick={()=>go(1)} className="text-gray-400 hover:text-gray-700 text-sm px-2">›</button>
      </div>
    </div>
  );
}

// 렌더 중 진행 카드 (넷플릭스 봐도 OK + 진행 바 + 꿀팁)
function RenderProgressCard({ job, tick, onMinimize, onCancel }: { job:any; tick:number; onMinimize:()=>void; onCancel?:()=>void }) {
  void tick; // 1초 틱으로 경과시간/진행률 갱신
  const TYPICAL = 240; // 실제 평균(중앙값 ~238초)으로 보정
  const started = job?.created_at ? new Date(job.created_at).getTime() : Date.now();
  const elapsed = Math.max(0, (Date.now() - started) / 1000);
  const pct = Math.min(0.97, 1 - Math.exp(-elapsed / 110)); // 빠르게 차고 끝에서 천천히, 완료 전엔 97% 상한
  const mm = Math.floor(elapsed/60), ss = Math.floor(elapsed%60);
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onMinimize}>
      <div className="w-full max-w-md rounded-3xl bg-white border border-gray-200 p-7 text-center shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="text-5xl mb-3">🍿</div>
        <h2 className="text-xl font-black text-gray-900">이제 넷플릭스 보셔도 괜찮아요</h2>
        <p className="text-sm text-gray-500 mt-1">AI가 열심히 영상을 만들고 있어요.<br/>다 되면 알려드릴게요!</p>
        <div className="mt-5 h-3 w-full rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#03C75A] to-[#02b350] transition-[width] duration-1000 ease-linear" style={{ width: `${Math.round(pct*100)}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-2">{mm}분 {String(ss).padStart(2,"0")}초 경과 · 보통 약 4분 걸려요</p>
        <LoadingTips />
        <button onClick={onMinimize} className="mt-5 w-full rounded-xl bg-gray-100 hover:bg-gray-200 py-3 text-sm font-bold text-gray-700">최소화하고 다른 작업 하기</button>
        {onCancel && (
          <button onClick={onCancel} className="mt-2 w-full rounded-xl border border-red-200 text-red-600 hover:bg-red-50 py-2.5 text-xs font-bold">강제 종료 (이용권 환불 안 됨)</button>
        )}
      </div>
    </div>,
    document.body
  );
}

function CreditMissionsModal({ open, onClose, session, onCredited }: { open:boolean; onClose:()=>void; session:any; onCredited?: ()=>void }) {
  const [info, setInfo] = React.useState<any>(null);
  const [reviewUrl, setReviewUrl] = React.useState("");
  const [reviewMsg, setReviewMsg] = React.useState<{ok:boolean;text:string}|null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [missions, setMissions] = React.useState<any[]>([]);
  const [claiming, setClaiming] = React.useState<string|null>(null);
  const [coupon, setCoupon] = React.useState("");
  const [couponMsg, setCouponMsg] = React.useState<{ok:boolean;text:string}|null>(null);
  const [couponLoading, setCouponLoading] = React.useState(false);

  const redeemCoupon = async () => {
    const c = coupon.trim().toUpperCase();
    if (!c) { setCouponMsg({ok:false, text:"코드를 입력해주세요"}); return; }
    setCouponLoading(true); setCouponMsg(null);
    try {
      // 1) 크레딧 코드 시도
      const { data, error } = await supabase.rpc("redeem_credit_code_rpc", { p_code: c });
      if (error) throw error;
      if (data?.ok) {
        setCouponMsg({ok:true, text:`🎉 영상 ${Number(data.credits).toLocaleString()}개가 지급됐어요!`}); setCoupon(""); onCredited?.();
        setCouponLoading(false); return;
      }
      // 2) 크레딧 코드가 아니면 무료체험(free_days) 코드로 재시도
      const { data: t, error: te } = await supabase.rpc("redeem_free_trial_rpc", { p_code: c });
      if (te) throw te;
      if (t?.ok) {
        setCouponMsg({ok:true, text:`🎉 프로 ${t.days}일 무료 체험이 시작됐어요! 잠시 후 새로고침됩니다.`}); setCoupon("");
        setTimeout(()=>window.location.reload(), 1300);
        setCouponLoading(false); return;
      }
      setCouponMsg({ok:false, text: t?.error || data?.error || "사용할 수 없는 코드예요"});
    } catch(e){ setCouponMsg({ok:false, text:String(e)}); }
    setCouponLoading(false);
  };

  const loadMissions = React.useCallback(async ()=>{
    try { const { data } = await supabase.rpc("get_missions_rpc"); setMissions(Array.isArray(data)?data:[]); } catch { setMissions([]); }
  }, []);

  React.useEffect(()=>{ if(!open||!session) return; (async()=>{
    try { const { data } = await supabase.rpc("get_referral_info_rpc", { p_user_id: session.user.id }); setInfo(data); } catch {}
    try { const { data } = await supabase.rpc("sync_auto_missions_rpc"); if (typeof data === "number" && data > 0) onCredited?.(); } catch {}
    loadMissions();
  })(); }, [open, session, loadMissions, onCredited]);

  const claimMission = async (m:any) => {
    if (m.type === "link") { if (m.action_url) window.open(m.action_url, "_blank", "noopener"); return; }
    if (m.claimed || claiming) return;
    setClaiming(m.id);
    try {
      const { data, error } = await supabase.rpc("claim_mission_rpc", { p_mission_id: m.id });
      if (error) throw error;
      if (data?.ok) { await loadMissions(); onCredited?.(); }
      else alert(data?.error || "받기에 실패했어요");
    } catch(e){ alert(String(e)); }
    setClaiming(null);
  };

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
          description: "추천 링크로 가입하면 프로 7일 무료 체험! 편집 몰라도 링크만 넣으면 5분 완성.",
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
          <h2 className="text-xl font-black text-gray-900">🎁 무료 이용권 더 받기</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-xl">✕</button>
        </div>
        <p className="text-xs text-gray-500 mb-5">미션을 완료하면 이용권이 지급됩니다</p>

        {/* 쿠폰 코드 */}
        <div className="rounded-2xl bg-[#03C75A]/5 border border-[#03C75A]/30 p-4 mb-3">
          <p className="text-sm font-bold text-gray-900 mb-2">🎟 쿠폰 코드</p>
          <div className="flex gap-2">
            <input value={coupon} onChange={e=>setCoupon(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&redeemCoupon()}
              placeholder="코드 입력"
              className="min-w-0 flex-1 rounded-xl bg-white border border-gray-200 px-3 py-2 text-sm font-bold tracking-widest text-gray-900 placeholder-gray-400 outline-none focus:border-[#03C75A]" />
            <button onClick={redeemCoupon} disabled={couponLoading}
              className="shrink-0 rounded-xl bg-[#03C75A] hover:bg-[#02b350] disabled:opacity-50 px-4 py-2 text-sm font-bold text-white">{couponLoading?"...":"사용"}</button>
          </div>
          {couponMsg && <p className={`mt-2 text-xs font-medium ${couponMsg.ok?"text-green-600":"text-red-500"}`}>{couponMsg.text}</p>}
        </div>

        {/* 미션 A — 추천 */}
        <div className="rounded-2xl bg-gray-100/60 border border-gray-200 p-4 mb-3">
          <span className="inline-block rounded-lg bg-[#03C75A] text-white text-xs font-bold px-2.5 py-1 mb-2">미션 A · 프로 체험 선물</span>
          <div className="mb-3 text-sm text-gray-700">
            <p className="mb-1.5 text-gray-500">친구가 내 코드로 가입하면</p>
            <div className="space-y-1">
              <p className="flex items-center gap-1.5">🎁 친구 <b className="text-gray-900">프로 7일 무료</b></p>
              <p className="flex items-center gap-1.5">🎬 친구 첫 영상 → 나도 <b className="text-gray-900">프로 7일</b></p>
              <p className="flex items-center gap-1.5">💳 친구 결제 → 나는 <b className="text-gray-900">프로 30일</b></p>
            </div>
          </div>

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
          <span className="inline-block rounded-lg bg-purple-600 text-white text-xs font-bold px-2.5 py-1 mb-2">미션 B · 영상 5개</span>
          <p className="text-sm text-gray-700 mb-3">네이버 카페, 블로그, 커뮤니티 등에 크로닛 사용 후기를 <b className="text-gray-900">전체 공개</b>로 작성한 뒤 URL을 입력해주세요. 확인 후 <b className="text-gray-900">영상 5개</b>가 지급됩니다.</p>
          {reviewStatus==="approved" ? (
            <div className="rounded-xl px-3 py-2.5 text-sm text-center bg-green-500/15 text-green-400">✅ 후기 승인 — 영상 5개 지급 완료</div>
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

        {/* 추가 이벤트 (DB · /admin에서 관리) */}
        {missions.map(m => (
          <div key={m.id} className="rounded-2xl bg-gray-100/60 border border-gray-200 p-4 mt-3">
            <span className="inline-block rounded-lg text-white text-xs font-bold px-2.5 py-1 mb-2"
              style={{ backgroundColor: m.badge_color || "#03C75A" }}>
              {m.badge_label || "이벤트"}{m.reward ? ` · +${m.reward.toLocaleString()} 영상` : ""}
            </span>
            {m.title && <p className="text-sm font-bold text-gray-900 mb-1">{m.title}</p>}
            {m.description && <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{m.description}</p>}
            {m.type === "link" ? (
              <button onClick={()=>claimMission(m)}
                className="w-full rounded-xl bg-[#03C75A] hover:bg-[#02b350] py-2.5 text-sm font-bold text-white">
                {m.action_label || "참여하기"}
              </button>
            ) : m.claimed ? (
              <div className="rounded-xl px-3 py-2.5 text-sm text-center bg-green-500/15 text-green-600 font-bold">✅ {m.auto ? "달성 · 지급 완료" : "받기 완료"}</div>
            ) : m.auto ? (
              <div className="rounded-xl px-3 py-2.5 text-sm text-center bg-amber-50 border border-amber-200 text-amber-700 font-bold">🎯 {m.reason || "조건 달성 시 자동 지급"}</div>
            ) : m.eligible === false ? (
              <div className="rounded-xl px-3 py-2.5 text-sm text-center bg-gray-200 text-gray-500 font-bold">🔒 {m.reason || "조건 미충족"}</div>
            ) : (
              <button onClick={()=>claimMission(m)} disabled={claiming===m.id}
                className="w-full rounded-xl bg-[#03C75A] hover:bg-[#02b350] disabled:opacity-40 py-2.5 text-sm font-bold text-white">
                {claiming===m.id ? "받는 중..." : (m.action_label || "받기")}
              </button>
            )}
          </div>
        ))}

        <button onClick={onClose} className="w-full mt-5 rounded-xl bg-gray-100 hover:bg-gray-200 py-3 text-sm font-bold text-gray-700">닫기</button>
      </div>
    </div>,
    document.body
  );
}

function NavSidebar({ activeView, onViewChange, userRole, balance, userPlan, session, onCredited }: {
  activeView: string; onViewChange: (v:string)=>void; userRole: string;
  balance: number|null; userPlan: string|null; session: any; onCredited?: ()=>void;
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
    { title: "자주 쓰는 메뉴", items: [
      ...(FEATURES.trendFeed ? [{ v: "trends", label: "오늘의 트렌드", icon: "🔥" }] : []),
      { v: "generator",      label: "프로젝트" },
      { v: "history",        label: "생성 내역" },
      { v: "product-search", label: "내 링크" },
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
        <p className="text-xs text-gray-600 mt-0.5">쇼핑 숏폼 자동화</p>
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
          className="block text-center rounded-xl bg-[#E8F8EE] border border-[#03C75A]/40 px-3 py-2 leading-tight transition hover:bg-[#dcf3e6]"><span className="block text-[11px] font-bold text-[#222222]">📝 피드백 쓰고</span><span className="block font-black text-[#222222]"><span className="text-lg text-[#03C75A]">영상 2개</span> 받기</span></a>
        <button onClick={()=>setShowMissions(true)}
          className="credit-glow w-full text-center rounded-xl bg-[#FEE500] hover:bg-[#f5dd00] px-3 py-2.5 text-sm font-bold text-[#222222] transition">🎁 무료 이용권 받기</button>
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
            <span className="text-gray-500">남은 영상</span>
            <span className="font-black text-[#03C75A]">💎 {balance.toLocaleString()}</span>
          </div>
        )}
        <button onClick={()=>setShowHistory(true)}
          className="w-full mt-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 transition">📒 사용 내역</button>
      </div>
      <CreditMissionsModal open={showMissions} onClose={()=>setShowMissions(false)} session={session} onCredited={onCredited} />
      <CreditHistoryModal open={showHistory} onClose={()=>setShowHistory(false)} session={session} />
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
    { s: 10, label: "10초", sub: "숏 / 2~3 클립", cr: 90 },
    { s: 15, label: "15초", sub: "기본 / 4~5 클립", cr: 110 },
    { s: 20, label: "20초", sub: "미들 / 5~6 클립", cr: 130 },
    { s: 30, label: "30초", sub: "롱 / 6+ 클립", cr: 160 },
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
          {DURATIONS.map(({ s, label, sub, cr }) => (
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

// ── Stage Panel ───────────────────────────────────────────────
function StagePanel({ n, title, subtitle, current, children, headerRight, hideNum }: {
  n: number; title: string; subtitle?: string; current: number; children: React.ReactNode;
  headerRight?: React.ReactNode; hideNum?: boolean;
}) {
  if (n !== current) return null; // 현재 단계만 표시
  return (
    <div className="rounded-2xl border border-[#03C75A]/50 bg-white shadow-[0_0_20px_rgba(3,199,90,0.10)]">
      <div className="px-6 py-4 flex items-center gap-3">
        {!hideNum && <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-[#03C75A]/20 border-2 border-[#03C75A] text-[#03C75A]">{n}</div>}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-gray-900">{title}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
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
  return `${THUMB_PROXY}?url=${encodeURIComponent(url)}`;
}

// ── 클립 미리보기 모달 ──────────────────────────────────────


function TrendCard({ item, onAdd, onAnalyze }: { item: any; onAdd: () => void; onAnalyze: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const f = (n: number) => { n = Math.max(0, Math.trunc(Number(n) || 0)); return n >= 10000 ? (n / 10000).toFixed(1) + "만" : n >= 1000 ? (n / 1000).toFixed(1) + "천" : String(n); };
  const cc = Math.max(0, Math.trunc(Number(item.comment_count) || 0));
  const badge = cc >= 300 ? { bg: "bg-red-500", ic: "🔥" } : cc >= 100 ? { bg: "bg-blue-600", ic: "🔥" } : { bg: "bg-black/70", ic: "💬" };
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      <a href={item.url} target="_blank" rel="noreferrer" className="group relative block aspect-[9/16] bg-gray-100">
        {!imgErr && item.thumbnail_url
          ? <img src={proxyThumb(item.thumbnail_url)} referrerPolicy="no-referrer" onError={() => setImgErr(true)} className="h-full w-full object-cover" />
          : <div className="flex h-full w-full items-center justify-center text-3xl text-gray-300">🎬</div>}
        <div className={`absolute left-1 top-1 rounded ${badge.bg} px-1.5 py-0.5 text-[10px] font-black text-white shadow`}>{badge.ic} {f(cc)}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/35">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-gray-900 opacity-0 shadow transition group-hover:opacity-100">▶ 영상 보기</span>
        </div>
      </a>
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <p className="line-clamp-2 text-[11px] leading-snug text-gray-700">{item.caption || "(설명 없음)"}</p>
        <div className="mt-auto flex items-center gap-2 text-[10px] font-medium text-gray-400">
          <span title="좋아요">❤️ {f(item.like_count)}</span>
          <span title="조회수">▶ {f(item.view_count)}</span>
          {item.taken_at && (() => { const d = Math.floor((Date.now() - new Date(item.taken_at).getTime()) / 86400000); return <span title={new Date(item.taken_at).toLocaleDateString("ko")} className="ml-auto">📅 {d <= 0 ? "오늘" : d + "일 전"}</span>; })()}
        </div>
        <div className="mt-1 flex gap-1.5">
          <button onClick={onAdd} title="이 영상을 소스로 담기 (무료)"
            className="flex-1 rounded-lg border border-[#03C75A] py-2 text-xs font-bold text-[#03C75A] hover:bg-[#03C75A]/10 transition">＋ 담기</button>
          <button onClick={onAnalyze} title="담기 + 상품 분석"
            className="flex-1 rounded-lg bg-[#03C75A] py-2 text-xs font-bold text-white hover:bg-[#02b350] transition">🔍 분석</button>
        </div>
      </div>
    </div>
  );
}

function ClipCard({ clip, selected, onToggle, onRemove }: { clip: Clip; selected: boolean; onToggle: () => void; onRemove?: () => void }) {
  const [imgError, setImgError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const rawUrl = clip.download_url || clip.video_url || "";
  const proxyUrl = rawUrl
    ? `https://oxygqtbdpnxxcgzwdlzi.supabase.co/functions/v1/video-proxy?url=${encodeURIComponent(rawUrl)}`
    : "";
  // 자기 스토리지(업로드) URL은 프록시 없이 직접 재생, 외부 CDN(틱톡·XHS)만 프록시
  const isOwnStorage = rawUrl.includes("supabase.co/storage/v1/object/public/");
  const playUrl = isOwnStorage ? rawUrl : (proxyUrl || rawUrl);
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
        {playing && playUrl ? (
          <video src={playUrl} autoPlay muted playsInline controls={false}
            className="w-full h-full object-cover"
            onClick={e => { e.stopPropagation(); setPlaying(false); }}
            onError={() => { setPlaying(false); }} />
        ) : (
          <>
            {thumbSrc ? (
              <img src={thumbSrc} alt={clip.title} onError={() => setImgError(true)} className="w-full h-full object-cover" />
            ) : playUrl ? (
              <video src={playUrl + "#t=0.1"} muted playsInline preload="metadata" className="w-full h-full object-cover" />
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
        {onRemove && (
          <>
            <span className="absolute bottom-1 left-1 rounded bg-[#03C75A]/90 px-1.5 py-0.5 text-[10px] font-bold text-white">{(clip as any).source === "trend" ? "트렌드" : (clip as any).source === "url" ? "원본" : "내 영상"}</span>
            <button onClick={e => { e.stopPropagation(); onRemove(); }} title="영상 빼기"
              className="absolute top-1.5 right-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs font-black text-white transition hover:bg-red-500">
              ✕
            </button>
          </>
        )}
      </div>
      <div className="p-1.5 bg-white">
        <p className="text-xs text-gray-900 font-medium line-clamp-1">{clip.title || "(제목 없음)"}</p>
        <p className="text-xs text-gray-500 mb-1.5">@{clip.author || "?"}</p>
        <button onClick={e => { e.stopPropagation(); onToggle(); }}
          className={`w-full rounded-lg py-2.5 text-sm font-black transition ${
            selected
              ? "bg-red-500/15 border-2 border-red-500 text-red-500 hover:bg-red-500/25"
              : "bg-[#03C75A] text-white hover:bg-[#02b350] shadow-sm"
          }`}>
          {selected ? "✓ 담음 (빼기)" : "＋ 담기"}
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
          <p className="mt-0.5 text-xs text-gray-500">{new Date(job.created_at).toLocaleString("ko-KR")}</p>
          {job.status === "error" && <p className="mt-1 text-xs text-red-400">{friendlyError(job.error_message)}</p>}
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
function GachaModal({ data, onClose }: { data: any; onClose: ()=>void }) {
  const TIERS = [
    { label: "레어",   color: "#3B82F6" },
    { label: "에픽",   color: "#7C3AED" },
    { label: "유니크", color: "#F0C419" },
    { label: "레전드", color: "#03C75A" },
  ];
  const TARGET: Record<string, number> = { rare:0, epic:1, unique:2, legend:3 };
  const target = TARGET[data?.tier] ?? 0;
  const [step, setStep] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const confRef = React.useRef<HTMLDivElement|null>(null);
  const boxRef = React.useRef<HTMLDivElement|null>(null);
  const cur = TIERS[Math.min(step, 3)];
  const finalT = TIERS[target];
  const isLegend = data?.tier === "legend";

  React.useEffect(() => {
    if (revealed) return;
    const el = boxRef.current; if (!el) return;
    el.animate([{transform:"scale(1) rotate(0)"},{transform:"scale(1.12) rotate(-7deg)"},{transform:"scale(1.12) rotate(7deg)"},{transform:"scale(1) rotate(0)"}], {duration:360});
  }, [step, revealed]);

  const spawnConfetti = (n:number, colors:string[]) => {
    const host = confRef.current; if (!host) return;
    for (let i=0;i<n;i++){
      const sp = document.createElement("span");
      const size = 7 + Math.random()*7;
      sp.style.cssText = `position:absolute;top:42%;left:50%;width:${size}px;height:${size}px;background:${colors[i%colors.length]};border-radius:2px;pointer-events:none;`;
      host.appendChild(sp);
      const ang = Math.random()*Math.PI*2, dist = 80 + Math.random()*70;
      const dx = Math.cos(ang)*dist, dy = Math.sin(ang)*dist - 40;
      sp.animate([{transform:"translate(-50%,-50%) rotate(0)",opacity:1},{transform:`translate(${dx}px,${dy+150}px) rotate(540deg)`,opacity:0}], {duration:1100+Math.random()*600, easing:"cubic-bezier(.2,.7,.3,1)"});
      setTimeout(()=>sp.remove(), 1900);
    }
  };

  const tap = () => {
    if (revealed) { onClose(); return; }
    if (step < target) { setStep(step + 1); return; }
    setRevealed(true);
    const cols = isLegend ? ["#03C75A","#34E08C","#F0C419","#9FE1CB"] : [finalT.color, "#FFE08A", "#34E08C"];
    setTimeout(()=>spawnConfetti(isLegend?48:24, cols), 40);
    try { new Audio("https://www.soundjay.com/buttons/sounds/button-09a.mp3").play(); } catch {}
  };

  const hint = revealed ? "탭해서 닫기"
    : step < target ? (step===0 ? "선물상자를 탭하세요" : "오~ 등급 상승! 계속 탭 🔥")
    : "탭해서 열기!";

  return (
    <div onClick={tap} style={{ position:"fixed", inset:0, zIndex:80, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <div onClick={(e)=>{ e.stopPropagation(); tap(); }} className="relative w-full rounded-3xl bg-white px-6 py-8 text-center" style={{ maxWidth: 320 }}>
        <div ref={confRef} className="pointer-events-none absolute inset-0" style={{ overflow:"visible" }} />
        {!revealed ? (
          <>
            <p className="mb-1 text-sm font-black" style={{ color: step>0 ? cur.color : "#6b7280" }}>{step>0 ? `${cur.label} 등급!` : "보상 선물 도착"}</p>
            <div ref={boxRef} className="mx-auto my-4 flex items-center justify-center rounded-3xl"
              style={{ width:128, height:128, background:cur.color, boxShadow: step>=3 ? `0 0 30px ${cur.color}` : "none", transition:"background .2s" }}>
              <span style={{ fontSize:64 }}>🎁</span>
            </div>
            <p className="text-sm font-bold text-gray-400">{hint}</p>
          </>
        ) : (
          <>
            <p className="mb-1 text-sm font-black" style={{ color: finalT.color }}>{isLegend ? "✨ 레전드 ✨" : `${finalT.label} 등급`}</p>
            <div className="mx-auto my-3 flex items-center justify-center rounded-3xl"
              style={{ width:128, height:128, background:finalT.color, boxShadow: isLegend ? `0 0 38px ${finalT.color}` : "none" }}>
              <span style={{ fontSize:60 }}>🎉</span>
            </div>
            <p className="text-4xl font-black" style={{ color: finalT.color }}>+{data.points}P</p>
            <button onClick={(e)=>{ e.stopPropagation(); onClose(); }} className="mt-5 w-full rounded-xl bg-[#03C75A] py-3 text-sm font-bold text-white hover:bg-[#02b350] transition">받기</button>
          </>
        )}
      </div>
    </div>
  );
}

function HistoryView({ session, onGoToLinks, onGacha }: { session: any; onGoToLinks?: ()=>void; onGacha?: (g:any)=>void }) {
  const [jobs, setJobs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState<string|null>(null);
  const [saving, setSaving] = React.useState<string|null>(null);
  const [deleting, setDeleting] = React.useState<string|null>(null);
  const [sharing, setSharing] = React.useState<string|null>(null);
  const [shareToast, setShareToast] = React.useState<{text:string; link?:string}|null>(null);
  React.useEffect(()=>{
    if(!session) return;
    (async()=>{
      try {
        const r = await fetch("https://oxygqtbdpnxxcgzwdlzi.supabase.co/rest/v1/video_jobs?select=*&order=created_at.desc&limit=50",
          {headers:{Authorization:`Bearer ${session.access_token}`,apikey:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWdxdGJkcG54eGNnendkbHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTU4NTYsImV4cCI6MjA5MjMzMTg1Nn0.G8ZtLSZf9rWRbKlrEUchEmFUEBdV4J2L1s_5rGEPZjY"}});
        const d = await r.json(); setJobs(Array.isArray(d)?d.filter((x:any)=>x.status!=="error"):[]);
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
  const shareToBoard = async (j:any) => {
    if (sharing) return;
    if (!window.confirm("이 영상을 '자랑' 게시판에 올릴까요? 🎁\n보너스 보상도 받아요.")) return;
    setSharing(j.id);
    try {
      const uid = session.user.id;
      const { data: prof } = await supabase.from("profiles").select("nickname").eq("id", uid).maybeSingle();
      const nick = prof?.nickname;
      if (!nick) { setShareToast({ text:"먼저 닉네임을 설정해 주세요", link:"/board" }); return; }
      // 내가 만든 영상 수 (N번째)
      const { count } = await supabase.from("video_jobs").select("id", { count:"exact", head:true }).eq("user_id", uid).eq("status","done");
      const n = count || 1;
      // 썸네일: poster_url 없으면 영상에서 프레임 캡처
      let img = j.poster_url || "";
      if (!img && j.video_url) {
        try {
          const blob = await captureVideoFrame(j.video_url, 0.45);
          const path = `${uid}/board_${j.id}.jpg`;
          const up = await supabase.storage.from("card-images").upload(path, blob, { upsert:true, contentType:"image/jpeg", cacheControl:"3600" });
          if (!up.error) img = supabase.storage.from("card-images").getPublicUrl(path).data.publicUrl + "?v=" + Date.now();
        } catch {}
      }
      const title = `🎉 ${n}번째 숏폼 완성!`;
      const body = [
        `${nick}님이 크로닛으로 ${n}번째 숏폼을 만들었어요! 🎬`,
        j.product_name ? `이번 작품 — ${j.product_name}` : "",
        cap5Tags(j.seo_tags),
      ].filter(Boolean).join("\n\n");
      const { data, error } = await supabase.functions.invoke("board-submit", { body: { kind:"post", category:"show", title, body } });
      if (error || !data?.ok) {
        setShareToast({ text: data?.need_nickname ? "먼저 닉네임을 설정해 주세요" : (data?.error || "발행에 실패했어요"), link: data?.need_nickname ? "/board" : undefined });
        return;
      }
      const postId = data.id;
      if (postId && img) { try { await supabase.from("board_posts").update({ image_url: img }).eq("id", postId); } catch {} }
      setShareToast({ text: "자랑 게시판에 올렸어요!", link: postId ? `/board/${postId}` : "/board" });
    } catch { setShareToast({ text:"발행에 실패했어요" }); }
    finally { setSharing(null); setTimeout(()=>setShareToast(null), 6000); }
  };
  const cap5Tags = (tags?:string) => {
    if (!tags) return "";
    return tags.split(/\s+/).map(t=>t.trim()).filter(Boolean)
      .map(t => t.startsWith("#") ? t : "#"+t.replace(/^#+/,""))
      .filter(t => t.length>1).slice(0,5).join(" ");
  };
  const seoFull = (j:any) =>
    `[제목]\n${j.seo_title||""}\n\n[설명]\n${j.seo_description||""}\n\n[해시태그]\n${cap5Tags(j.seo_tags)}`;
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
      {shareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full bg-gray-900 px-5 py-3 text-sm font-bold text-white shadow-xl">
          <span>{shareToast.text}</span>
          {shareToast.link && <a href={shareToast.link} className="text-amber-300 underline">보기</a>}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {jobs.map(j=>{
        const done = j.status==="done" && j.video_url && !j.expired;
        return (
          <div key={j.id} className="rounded-2xl bg-white border border-gray-200 overflow-hidden flex flex-col">
            <div className="relative aspect-[9/16] bg-black">
              {done ? (
                <video src={j.video_url + "#t=0.0"} preload="metadata" playsInline controls
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
                  {(j.seo_description || j.seo_tags) ? (
                    <button onClick={()=>copyText([j.seo_description, cap5Tags(j.seo_tags)].filter(Boolean).join("\n\n"), j.id+"-all")}
                      className="block text-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:border-[#03C75A]/50 hover:text-[#03C75A] transition">
                      {copied===j.id+"-all" ? "✓ 복사됨" : "📋 캡션 복사"}
                      <span className="block text-[10px] font-normal text-gray-400">설명·해시태그 바로 붙여넣기</span>
                    </button>
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-center text-[11px] text-gray-400">업로드 정보 생성 중…</div>
                  )}
                  <p className="px-1 text-center text-[10px] leading-snug text-gray-400">
                    {isIOS ? "공유 창에서 '동영상 저장' → 사진앱" : isAndroid ? "갤러리 › 앨범 › Download 에서 확인" : "내 컴퓨터에 mp4로 저장돼요"}
                  </p>
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
  const [withdrawText, setWithdrawText] = React.useState("");
  const [withdrawing, setWithdrawing]   = React.useState(false);

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

      <Section title="멤버십 이용권">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs text-gray-500">남은 영상</span>
          <span className="text-sm font-black text-[#03C75A]">{bal.toLocaleString()}개 / {maxC.toLocaleString()}개</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-4">
          <div className="h-full bg-[#03C75A] transition-all" style={{ width:`${pct}%` }} />
        </div>
        <div className="flex justify-between text-sm"><span className="text-gray-500">다음 결제일</span><span className="text-gray-900">{nextBilling}</span></div>
      </Section>

      <Section title="🎟 파트너 코드 등록">
        <p className="text-xs text-gray-400 mb-3">파트너로부터 받은 코드를 입력하면 파트너가 회원님의 사용 현황(이메일·플랜·이용권)을 조회할 수 있게 됩니다.</p>
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

      <Section title="회원 탈퇴">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="mb-1 text-sm font-bold text-red-600">계정을 영구 삭제합니다</p>
          <p className="mb-3 text-xs leading-relaxed text-gray-600">
            탈퇴하면 <b>남은 이용권·구독·생성한 영상·내 링크가 즉시 삭제</b>되고 되돌릴 수 없어요.
            유료 기간이 남아 있어도 환불되지 않습니다. (법령상 보존 의무가 있는 결제 기록은 일정 기간 보관돼요.)
          </p>
          <p className="mb-1.5 text-xs text-gray-700">계속하려면 아래에 <b className="text-red-600">탈퇴한다</b> 를 입력하세요.</p>
          <input value={withdrawText} onChange={e=>setWithdrawText(e.target.value)} placeholder="탈퇴한다"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-400" />
          <button
            disabled={withdrawText.trim() !== "탈퇴한다" || withdrawing}
            onClick={async () => {
              if (withdrawText.trim() !== "탈퇴한다") return;
              if (!window.confirm("정말 탈퇴하시겠어요? 모든 데이터가 영구 삭제되며 되돌릴 수 없습니다.")) return;
              setWithdrawing(true);
              try {
                const { data, error } = await supabase.rpc("delete_my_account_rpc");
                if (error || !data?.ok) { alert("탈퇴 처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요."); setWithdrawing(false); return; }
                await supabase.auth.signOut();
                alert("회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.");
                window.location.href = "/";
              } catch { alert("탈퇴 처리 중 오류가 발생했어요."); setWithdrawing(false); }
            }}
            className="mt-3 w-full rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400">
            {withdrawing ? "탈퇴 처리 중…" : "회원 탈퇴"}
          </button>
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
  const [tab, setTab] = React.useState<"subs"|"coupons"|"reviews"|"payouts">("subs");
  const TABS = [
    { v:"subs",    label:"👑 구독 관리" },
    { v:"coupons", label:"🎟 쿠폰 코드" },
    { v:"payouts", label:"📊 파트너 정산" },
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
      {tab==="payouts" && <AdminPayoutsTab session={session} supabase={supabase} />}
      {tab==="reviews" && <AdminReviewsTab session={session} supabase={supabase} />}
    </div>
  );
}

// ── 관리자: 파트너 정산 ──
function AdminPayoutsTab({ session, supabase }: { session:any; supabase:any }) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [msg, setMsg] = React.useState("");
  const won = (n:number)=>`₩${Number(n||0).toLocaleString("ko-KR")}`;

  const load = React.useCallback(async ()=>{
    setLoading(true);
    try {
      const { data } = await supabase.rpc("admin_partner_stats_rpc");
      setRows(data?.ok && Array.isArray(data.partners) ? data.partners : []);
    } catch { setRows([]); }
    setLoading(false);
  }, [supabase]);
  React.useEffect(()=>{ if(session) load(); }, [session, load]);

  const payAll = async () => {
    if (!window.confirm("확정된(7일 지난) 모든 수수료를 '지급완료'로 처리할까요?")) return;
    setMsg("지급 처리 중...");
    const { data, error } = await supabase.rpc("payout_partner_commissions_rpc", {});
    if (error || data?.ok===false) { setMsg("실패: "+(error?.message||data?.error||"")); return; }
    setMsg(`지급 처리 완료 — ${data.paid_count}건 / ${won(data.paid_total)}`); await load();
  };
  const payOne = async (pid:string, email:string) => {
    if (!window.confirm(`${email} 의 확정 수수료를 지급완료 처리할까요?`)) return;
    setMsg("지급 처리 중...");
    const { data, error } = await supabase.rpc("payout_partner_commissions_rpc", { p_target_partner: pid });
    if (error || data?.ok===false) { setMsg("실패: "+(error?.message||data?.error||"")); return; }
    setMsg(`${email} 지급 완료 — ${data.paid_count}건 / ${won(data.paid_total)}`); await load();
  };

  const tot = rows.reduce((a:any,r:any)=>({
    pending:a.pending+(Number(r.pending)||0), confirmed:a.confirmed+(Number(r.confirmed)||0), paid:a.paid+(Number(r.paid)||0),
  }), {pending:0,confirmed:0,paid:0});

  if (loading) return <p className="text-sm text-gray-400">불러오는 중...</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2">
          <p className="text-[11px] text-amber-700 font-bold">적립예정(7일 대기)</p>
          <p className="text-lg font-black text-amber-700">{won(tot.pending)}</p>
        </div>
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-2">
          <p className="text-[11px] text-green-700 font-bold">확정(지급 대상)</p>
          <p className="text-lg font-black text-green-700">{won(tot.confirmed)}</p>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-2">
          <p className="text-[11px] text-gray-500 font-bold">누적 지급완료</p>
          <p className="text-lg font-black text-gray-700">{won(tot.paid)}</p>
        </div>
        <button onClick={payAll} className="ml-auto rounded-lg bg-[#03C75A] hover:bg-[#02b350] px-4 py-2.5 text-sm font-bold text-white">확정분 전체 지급 처리</button>
        <button onClick={load} className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900">새로고침</button>
      </div>
      {msg && <p className="text-xs text-[#03C75A] mb-3">{msg}</p>}
      <p className="text-[11px] text-gray-400 mb-2">※ 확정 = 결제 7일 경과(환불기간 종료)로 자동 확정된 금액(매일 새벽 자동). "오버라이드" 배지 = 이 사람이 상위 파트너(친구)로서 받은 금액.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-200">
              <th className="px-3 py-2 font-semibold">파트너</th>
              <th className="px-3 py-2 font-semibold">닉네임</th>
              <th className="px-3 py-2 font-semibold">이름</th>
              <th className="px-3 py-2 font-semibold text-right">멤버</th>
              <th className="px-3 py-2 font-semibold text-right">결제액</th>
              <th className="px-3 py-2 font-semibold text-right">적립예정</th>
              <th className="px-3 py-2 font-semibold text-right">확정</th>
              <th className="px-3 py-2 font-semibold text-right">지급완료</th>
              <th className="px-3 py-2 font-semibold">상위 친구</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length===0 && <tr><td colSpan={10} className="px-3 py-6 text-center text-gray-400">파트너가 없어요.</td></tr>}
            {rows.map((r:any)=>(
              <tr key={r.pid} className="border-b border-gray-100">
                <td className="px-3 py-2.5 font-medium text-gray-900">{r.email}
                  {Number(r.override_earned)>0 && <span className="ml-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">오버라이드 {won(r.override_earned)}</span>}
                </td>
                <td className="px-3 py-2.5 text-gray-700">{r.nickname||"-"}</td>
                <td className="px-3 py-2.5 text-gray-700">{r.name||"-"}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{r.members}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{won(r.gross)}</td>
                <td className="px-3 py-2.5 text-right text-amber-600 font-semibold">{won(r.pending)}</td>
                <td className="px-3 py-2.5 text-right text-green-600 font-bold">{won(r.confirmed)}</td>
                <td className="px-3 py-2.5 text-right text-gray-400">{won(r.paid)}</td>
                <td className="px-3 py-2.5 text-gray-500 text-xs">{r.upline_email||"-"}</td>
                <td className="px-3 py-2.5 text-right">
                  {Number(r.confirmed)>0 && <button onClick={()=>payOne(r.pid, r.email)} className="rounded-lg bg-[#03C75A] hover:bg-[#02b350] px-3 py-1.5 text-xs font-bold text-white">지급</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 관리자: 구독 관리 ──
function ProvBadge({ p }: { p?: string }) {
  const v = (p || "").toLowerCase();
  if (v === "kakao")  return <span title="카카오" className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-[4px] bg-[#FEE500] align-middle text-[9px] font-black text-[#3C1E1E]">K</span>;
  if (v === "google") return <span title="구글" className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-[4px] bg-white ring-1 ring-gray-300 align-middle text-[9px] font-black text-[#4285F4]">G</span>;
  return null;
}
function AdminSubsTab({ session, supabase }: { session:any; supabase:any }) {
  const [users, setUsers]   = React.useState<any[]>([]);
  const [planMax, setPlanMax] = React.useState<Record<string,number>>({});
  const [plans, setPlans]   = React.useState<any[]>([]);
  const [q, setQ]           = React.useState("");
  const [stFilter, setStFilter] = React.useState("all");
  const [plFilter, setPlFilter] = React.useState("all");
  const [mkFilter, setMkFilter] = React.useState("all");
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
  const [pcTrialPlan, setPcTrialPlan] = React.useState("pro");
  const [pcTrialDays, setPcTrialDays] = React.useState("7");
  const [pcUpEmail, setPcUpEmail] = React.useState("");
  const [pcUpOv, setPcUpOv] = React.useState<Record<string,string>>({starter:"15",pro:"30",master:"50"});
  const [upMsg, setUpMsg] = React.useState("");
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
    if (q.trim()) { const _q = q.trim().toLowerCase(); const _hay = [(u.email||""),(u.nickname||""),(u.name||"")].join(" ").toLowerCase(); if (!_hay.includes(_q)) return false; }
    if (stFilter==="active" && !isActive(u)) return false;
    if (stFilter==="expired" && isActive(u)) return false;
    if (plFilter!=="all" && u.plan!==plFilter) return false;
    if (mkFilter==="yes" && !u.marketing_consent) return false;
    if (mkFilter==="no" && u.marketing_consent) return false;
    return true;
  });
  const activeCnt = users.filter(isActive).length;
  const provStats = users.reduce((a: any, u: any) => { const v = (u.provider || "").toLowerCase(); const k = v === "google" ? "google" : v === "kakao" ? "kakao" : "etc"; a[k] = (a[k] || 0) + 1; return a; }, { google: 0, kakao: 0, etc: 0 });
  const mkCnt = users.filter((u:any)=>u.marketing_consent).length;
  const copyMktEmails = async () => {
    const list = filtered.filter((u:any)=>u.marketing_consent).map((u:any)=>u.email).filter(Boolean);
    if (list.length===0) { setMsg("마케팅 동의자가 없습니다 (현재 필터 기준)"); return; }
    try { await navigator.clipboard.writeText(list.join("\n")); setMsg(`마케팅 동의 이메일 ${list.length}건 복사됨`); }
    catch { setMsg(list.join(", ")); }
  };
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
    run(()=>supabase.rpc("admin_adjust_credits_rpc",{p_target_user_id:sel,p_action:action,p_amount:Math.min(Math.max(Math.floor(Number(amt)||0),0),1000000)}), "이용권 처리 완료");
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
    setPcUpEmail(""); setPcUpOv({starter:"15",pro:"30",master:"50"}); setUpMsg("");
    setPcCode(selUser?.email ? String(selUser.email).split("@")[0].replace(/[^a-zA-Z0-9]/g,"").toUpperCase().slice(0,8) : "");
    if (sel && selUser?.role === "partner") {
      supabase.rpc("admin_get_partner_upline_rpc",{ p_teacher_id: sel }).then((res:any)=>{
        const d = res?.data;
        if (d?.ok && d.upline_email) {
          setPcUpEmail(d.upline_email);
          const o = d.override||{};
          setPcUpOv({ starter:String(o.starter??15), pro:String(o.pro??30), master:String(o.master??50) });
        }
      }, ()=>{});
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

  const createTrialCoupon = async () => {
    if (!sel || !selUser?.email) { setPcMsg("회원을 먼저 선택하세요"); return; }
    const c = pcCode.trim().toUpperCase();
    if (!c) { setPcMsg("코드를 입력하세요"); return; }
    const days = Math.floor(Number(pcTrialDays)||0);
    if (days <= 0) { setPcMsg("체험 일수를 입력하세요"); return; }
    setPcMsg("발급 중...");
    const { error } = await supabase.from("coupon_codes").insert({
      code: c, type:"free_days", value: days, owner_email: selUser.email, expires_at: null,
      plan_discounts: null, allowed_plans: [pcTrialPlan],
    });
    if (error) setPcMsg("발급 실패: "+error.message+(error.code==="23505"?" (이미 있는 코드 — 체험은 다른 코드로)":""));
    else setPcMsg(`체험 쿠폰 ${c} 발급 완료 — ${pcTrialPlan.toUpperCase()} ${days}일 무료체험 (파트너 ${selUser.email})`);
  };

  const savePartnerUpline = async () => {
    if (!sel) { setUpMsg("회원을 먼저 선택하세요"); return; }
    setUpMsg("저장 중...");
    const override = { starter: Number(pcUpOv.starter)||0, pro: Number(pcUpOv.pro)||0, master: Number(pcUpOv.master)||0 };
    const { data, error } = await supabase.rpc("admin_set_partner_upline_rpc", { p_teacher_id: sel, p_upline_email: pcUpEmail.trim(), p_override: override });
    if (error || data?.ok===false) { setUpMsg("저장 실패: "+(error?.message||data?.error||"")); return; }
    setUpMsg(data.action==="unset" ? "상위 파트너 해제됨" : `상위 파트너 연결됨: ${data.upline_email}`);
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
        <select value={mkFilter} onChange={e=>setMkFilter(e.target.value)} className="rounded-xl bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
          <option value="all">마케팅 전체</option><option value="yes">동의함</option><option value="no">미동의</option></select>
      </div>
      <div className="mb-2 flex items-center gap-3 text-xs text-gray-500">
        <span><ProvBadge p="google" /><b className="text-gray-700">구글 {provStats.google}</b></span>
        <span><ProvBadge p="kakao" /><b className="text-gray-700">카카오 {provStats.kakao}</b></span>
        {provStats.etc > 0 && <span>기타 {provStats.etc}</span>}
        <span className="text-gray-300">·</span>
        <span>📣 <b className="text-gray-700">마케팅동의 {mkCnt}</b></span>
        <button onClick={copyMktEmails} className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100">동의 이메일 복사</button>
      </div>
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden mb-5 max-h-[340px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-gray-200 text-gray-400 sticky top-0 bg-white">
            <tr><th className="px-3 py-2.5 text-left">이메일</th><th className="px-3 py-2.5 text-left">닉네임</th><th className="px-3 py-2.5 text-left">이름</th><th className="px-3 py-2.5 text-left">권한</th><th className="px-3 py-2.5 text-left">플랜</th><th className="px-3 py-2.5 text-left">만료일</th><th className="px-3 py-2.5 text-left">📣마케팅</th><th className="px-3 py-2.5 text-center">상태</th><th className="px-3 py-2.5 text-right">포인트</th><th className="px-3 py-2.5 text-right">이용권(잔량/한도)</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={10} className="py-8 text-center text-gray-500">불러오는 중...</td></tr>
            : filtered.length===0 ? <tr><td colSpan={10} className="py-8 text-center text-gray-500">결과 없음</td></tr>
            : filtered.map(u=>{
              const max = (planMax[u.plan] ?? 0) + (u.bonus_credits||0); const left = max - (u.credits_used||0); const act = isActive(u);
              return (
                <tr key={u.user_id} onClick={()=>{setSel(u.user_id); setRoleSel(u.role||"user"); if(u.plan)setPlanSel(u.plan);}}
                  className={`border-b border-gray-200/50 cursor-pointer ${sel===u.user_id?"bg-[#03C75A]/10":"hover:bg-gray-100/40"}`}>
                  <td className="px-3 py-2.5 text-gray-700 truncate max-w-[200px]"><ProvBadge p={u.provider} />{u.email}</td><td className="px-3 py-2.5 text-gray-700 truncate max-w-[120px]">{u.nickname||"-"}</td><td className="px-3 py-2.5 text-gray-700 truncate max-w-[100px]">{u.name||"-"}</td>
                  <td className="px-3 py-2.5">{u.role==="super_admin"?<span className="text-yellow-400 font-bold">👑 관리자</span>:u.role==="partner"?<span className="text-[#03C75A]">파트너</span>:<span className="text-gray-400">일반</span>}</td>
                  <td className="px-3 py-2.5 text-gray-700 capitalize">{u.plan||"-"}</td>
                  <td className="px-3 py-2.5 text-gray-400">{fmt(u.expires_at)}</td>
                  <td className="px-3 py-2.5">{u.marketing_consent?<span className="text-[#03C75A] font-bold">동의</span>:<span className="text-gray-300">-</span>}</td>
                  <td className="px-3 py-2.5 text-center"><span title={act?"유효":"만료"} className={`inline-block h-2.5 w-2.5 rounded-full ${act?"bg-green-500":"bg-red-500"}`} /></td>
                  <td className="px-3 py-2.5 text-right font-bold text-amber-600">{Number(u.points||0).toLocaleString()}P</td>
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
          <p className="text-xs text-gray-500 mb-2">이용권 관리</p>
          <div className="flex flex-wrap items-center gap-2">
            <input type="number" min={0} max={1000000} value={amt} onChange={e=>setAmt(e.target.value)} className="w-36 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none" placeholder="변동량" />
            <Btn onClick={()=>credit("add")} color="bg-green-600 hover:bg-green-500">＋ 지급 (잔량 증가)</Btn>
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

            {/* 상위 파트너(친구) 오버라이드 */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs font-bold text-gray-700 mb-1">👥 상위 파트너(친구) 오버라이드</p>
              <p className="text-[11px] text-gray-400 mb-2">이 파트너(강사)가 데려온 결제마다, 지정한 <b>상위 파트너(친구)</b>에게도 아래 금액이 추가 적립돼요. 비우고 저장하면 해제. (친구는 자기 계정 파트너스 탭에서 확인)</p>
              <input value={pcUpEmail} onChange={e=>setPcUpEmail(e.target.value)} placeholder="상위 파트너 이메일 (예: friend@gmail.com)"
                className="w-full mb-2 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500" />
              <div className="flex flex-wrap items-center gap-2">
                {[["starter","스타터"],["pro","프로"],["master","마스터"]].map(([k,label])=>(
                  <div key={k} className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">{label}</span>
                    <input value={pcUpOv[k]} onChange={e=>setPcUpOv(p=>({...p,[k]:e.target.value.replace(/[^0-9]/g,'')}))}
                      className="w-20 rounded-lg bg-gray-100 border border-gray-200 px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-indigo-500" />
                    <span className="text-xs text-gray-400">원</span>
                  </div>
                ))}
              </div>
              <button onClick={savePartnerUpline} className="mt-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white">상위 파트너 저장</button>
              {upMsg && <p className="text-xs text-indigo-500 mt-2">{upMsg}</p>}
            </div>

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

              <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                <p className="text-xs font-bold text-gray-700 mb-2">🎁 무료 체험 쿠폰 (기간 한정)</p>
                <p className="text-[11px] text-gray-400 mb-2">할인 대신 선택 플랜을 N일간 무료로 부여해요. 멤버가 코드 입력 즉시 체험 시작 → N일 후 자동 만료. (체험은 위 할인 코드와 <b>다른 코드</b>를 쓰세요)</p>
                <div className="flex items-center gap-2">
                  <select value={pcTrialPlan} onChange={e=>setPcTrialPlan(e.target.value)}
                    className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
                    <option value="starter">스타터</option><option value="pro">프로</option><option value="master">마스터</option>
                  </select>
                  <input value={pcTrialDays} onChange={e=>setPcTrialDays(e.target.value.replace(/[^0-9]/g,''))}
                    className="w-16 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#03C75A]" />
                  <span className="text-sm text-gray-500">일</span>
                  <button onClick={createTrialCoupon} className="ml-auto rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-white">체험 쿠폰 발급</button>
                </div>
              </div>

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
  const COUPON_PLANS = [["starter","스타터"],["pro","프로"],["master","마스터"],["pro_trial","프로 체험"]];
  const [planDisc, setPlanDisc] = React.useState<Record<string,{type:string;value:string}>>({
    starter:{type:"none",value:""}, pro:{type:"none",value:""}, master:{type:"none",value:""}, pro_trial:{type:"none",value:""},
  });
  const setPD = (k:string, patch:any) => setPlanDisc(p=>({ ...p, [k]:{ ...p[k], ...patch } }));
  const [exp, setExp]       = React.useState("");
  const [unlimited, setUnlimited] = React.useState(true);
  const [sel, setSel]       = React.useState<Set<string>>(new Set());
  const [msg, setMsg]       = React.useState("");
  const [mode, setMode]     = React.useState<"discount"|"credits"|"free_days">("discount");
  const [trialDays, setTrialDays] = React.useState("7");
  const [trialPlan, setTrialPlan] = React.useState("pro");
  const [credits, setCredits] = React.useState("");
  const [maxUses, setMaxUses] = React.useState("");

  const load = React.useCallback(async ()=>{
    try {
      const { data } = await supabase.from("coupon_codes").select("code,type,value,owner_email,expires_at,created_at,plan_discounts,allowed_plans,max_uses").order("created_at",{ascending:false});
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
    let row:any;
    if (mode === "credits") {
      const cr = Number(credits) || 0;
      if (cr <= 0) { setMsg("지급할 영상 수를 입력하세요"); return; }
      const mu = maxUses.trim() === "" ? null : (Number(maxUses) || 0);
      if (mu !== null && mu <= 0) { setMsg("선착순 인원은 1 이상이거나 비워두세요(무제한)"); return; }
      row = {
        code:c, type:"credits", value:cr,
        owner_email: owner.trim() || null,
        expires_at: unlimited ? null : (exp || null),
        max_uses: mu,
        plan_discounts: null, allowed_plans: null,
      };
    } else if (mode === "free_days") {
      const days = Number(trialDays) || 0;
      if (days <= 0) { setMsg("체험 일수를 입력하세요 (1 이상)"); return; }
      const mu = maxUses.trim() === "" ? null : (Number(maxUses) || 0);
      if (mu !== null && mu <= 0) { setMsg("선착순 인원은 1 이상이거나 비워두세요(무제한)"); return; }
      row = {
        code:c, type:"free_days", value:days,
        owner_email: owner.trim() || null,
        expires_at: unlimited ? null : (exp || null),
        max_uses: mu,
        plan_discounts: null, allowed_plans: [trialPlan],
      };
    } else {
      // 플랜별 할인 구성
      const pd:Record<string,any> = {}; const allowed:string[] = [];
      for (const [k] of COUPON_PLANS) {
        const d = planDisc[k];
        if (d.type === "none") continue;
        pd[k] = d.type === "free" ? { type:"free" } : { type:d.type, value:Number(d.value)||0 };
        allowed.push(k);
      }
      row = {
        code:c, type:"none", value:0,
        owner_email: owner.trim() || null,
        expires_at: unlimited ? null : (exp || null),
        plan_discounts: Object.keys(pd).length ? pd : null,
        allowed_plans: allowed.length ? allowed : null,
      };
    }
    setMsg("생성 중...");
    const { error } = await supabase.from("coupon_codes").insert(row);
    if (error) setMsg("생성 실패: "+error.message);
    else {
      setMsg("코드 생성 완료"); setCode(""); setOwner(""); setCredits(""); setMaxUses("");
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
    if (c.type === "credits") {
      return `💎 영상 ${Number(c.value).toLocaleString()}개` + (c.max_uses ? ` · 선착순 ${c.max_uses}명` : " · 인원무제한");
    }
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
          <label className="text-xs text-gray-500">코드 종류</label>
          <div className="mt-1.5 flex gap-2">
            <button type="button" onClick={()=>setMode("discount")}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${mode==="discount"?"bg-[#03C75A] text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>💳 플랜 할인</button>
            <button type="button" onClick={()=>setMode("credits")}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${mode==="credits"?"bg-[#03C75A] text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>💎 이용권 지급</button>
            <button type="button" onClick={()=>setMode("free_days")}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${mode==="free_days"?"bg-[#03C75A] text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>🎁 무료체험</button>
          </div>
        </div>

        {mode === "credits" && (
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div><label className="text-xs text-gray-500">지급 영상 수</label>
              <input type="number" value={credits} onChange={e=>setCredits(e.target.value)} placeholder="예: 500"
                className="block w-32 mt-1 rounded-xl bg-gray-100 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#03C75A]" /></div>
            <div><label className="text-xs text-gray-500">선착순 인원 (비우면 무제한)</label>
              <input type="number" value={maxUses} onChange={e=>setMaxUses(e.target.value)} placeholder="예: 10"
                className="block w-40 mt-1 rounded-xl bg-gray-100 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#03C75A]" /></div>
          </div>
        )}

        {mode === "free_days" && (
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div><label className="text-xs text-gray-500">체험 일수</label>
              <input type="number" value={trialDays} onChange={e=>setTrialDays(e.target.value)} placeholder="예: 7"
                className="block w-28 mt-1 rounded-xl bg-gray-100 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#03C75A]" /></div>
            <div><label className="text-xs text-gray-500">대상 플랜</label>
              <select value={trialPlan} onChange={e=>setTrialPlan(e.target.value)}
                className="block mt-1 rounded-xl bg-gray-100 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#03C75A]">
                <option value="starter">스타터</option>
                <option value="pro">프로</option>
                <option value="master">마스터</option>
                <option value="pro_trial">프로 체험(캡 700)</option>
              </select></div>
            <div><label className="text-xs text-gray-500">선착순 인원 (비우면 무제한)</label>
              <input type="number" value={maxUses} onChange={e=>setMaxUses(e.target.value)} placeholder="예: 100"
                className="block w-40 mt-1 rounded-xl bg-gray-100 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#03C75A]" /></div>
            <p className="w-full text-xs text-gray-400">가입한 회원이 쿠폰칸에 이 코드를 넣으면 해당 플랜을 N일간 무료로 이용해요. 파트너 이메일을 넣으면 그 회원이 파트너에 자동 연결됩니다(수익셰어). 1인 1회.</p>
          </div>
        )}

        {mode === "discount" && (<div className="mb-4">
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
        </div>)}
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
  const approve = () => act(()=>supabase.rpc("approve_review_rpc",{p_submission_id:sel,p_admin_id:session.user.id,p_credits:5}), "승인 완료 (+영상 5개)");
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
        <button onClick={approve} className="rounded-xl bg-green-600 hover:bg-green-500 px-5 py-2.5 text-sm font-bold text-white transition">✓ 승인 (+영상 5개)</button>
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
      <p className="text-sm text-gray-400 mb-5">파트너 코드를 입력한 멤버들의 사용 현황을 확인할 수 있습니다. 조회 전용이며 이용권 수정 권한은 없습니다.</p>

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
                  <th className="px-3 py-3 text-right font-semibold">남은 영상</th>
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

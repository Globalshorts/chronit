import React, { useState, useEffect, useRef } from 'react'
import {
  Zap,
  Clock,
  TrendingUp,
  CheckCircle2,
  MessageCircle,
  ArrowRight,
  Users,
  Cpu,
  ShieldCheck,
  Flame,
  Monitor,
  Film,
  TrendingDown,
  LogOut,
  Gift,
  Menu,
  X,
  Megaphone,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import AnimatedCounter from '../components/AnimatedCounter'
import PaymentModal from '../components/PaymentModal'
import AuthModal from '../components/AuthModal'

// 가격표 위 쿠폰 입력 바
const CouponBar = ({ codeFromUrl, onApply }) => {
  const [input, setInput] = React.useState('')
  const [status, setStatus] = React.useState(null) // null | 'ok' | 'fail'

  const handleApply = async () => {
    const trimmed = input.trim().toUpperCase()
    if (!trimmed) return
    // 간단히 형식만 체크 (실제 검증은 PaymentModal에서)
    if (trimmed.length >= 3) {
      onApply(trimmed)
      setStatus('ok')
    } else {
      setStatus('fail')
    }
  }

  if (codeFromUrl) {
    return (
      <div className="mx-auto mb-10 flex max-w-sm items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-3">
        <Zap size={15} className="shrink-0 text-blue-400" fill="currentColor" />
        <span className="text-sm font-bold text-blue-300">할인 코드 <strong className="text-white">{codeFromUrl}</strong> 적용됨</span>
        <button onClick={() => { onApply(null); sessionStorage.removeItem('chronit_code') }} className="ml-auto text-slate-500 hover:text-white">✕</button>
      </div>
    )
  }

  return (
    <div className="mx-auto mb-10 flex max-w-sm flex-col items-center gap-2">
      <div className="flex w-full gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value.toUpperCase()); setStatus(null) }}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          placeholder="쿠폰 / 할인 코드 입력"
          className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white placeholder-slate-600 outline-none transition-all focus:border-blue-500/50 focus:bg-white/[0.07]"
        />
        <button
          onClick={handleApply}
          className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-95"
        >
          적용
        </button>
      </div>
      {status === 'ok' && <p className="text-xs font-bold text-green-400">✓ 코드 적용됨 — 결제 시 할인이 반영됩니다</p>}
      {status === 'fail' && <p className="text-xs font-bold text-red-400">유효하지 않은 코드입니다</p>}
    </div>
  )
}
import TermsModal from '../components/TermsModal'
import { supabase } from '../lib/supabase'

/**
 * Spline Viewer를 이용한 배경 파티클
 * opacity를 0.9로 높여 더 선명하게 보이도록 수정했습니다.
 */
const SplineScene = ({ scene }) => {
  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://unpkg.com/@splinetool/viewer@1.0.93/build/spline-viewer.js'
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  return (
    <div className="h-full w-full origin-center scale-125 transform opacity-90 transition-opacity duration-1000 md:scale-[1.6]">
      <spline-viewer url={scene} events-target="global"></spline-viewer>
    </div>
  )
}

const DOWNLOAD_URL =
  'https://github.com/Globalshorts/chronit/releases/latest/download/Chronit_Setup.exe'

const statusCfg = {
  active:  { label: '진행중',      cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30', dot: true },
  ended:   { label: '종료됨',      cls: 'bg-slate-600/30 text-slate-400 border-slate-500/20', dot: false },
  winner:  { label: '당첨자 발표', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30', dot: false },
}
const EventBadge = ({ status, label }) => {
  const cfg = statusCfg[status] || statusCfg.active
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.cls}`}>
      {cfg.dot && <span className="badge-pulse h-1.5 w-1.5 rounded-full bg-blue-400" />}
      {label || cfg.label}
    </span>
  )
}

const Home = () => {
  const [scrolled, setScrolled] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('pro')
  const [user, setUser] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [codeFromUrl, setCodeFromUrl] = useState(null)
  const [refFromUrl, setRefFromUrl] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [events, setEvents] = useState([])
  const [eventTab, setEventTab] = useState('active')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const pendingPlanRef = useRef(null)
  const pendingSessionRef = useRef(null)

  // 로그인 완료 후 공통 처리
  const handleAfterLogin = (session) => {
    // GA4 회원가입/로그인 전환 이벤트
    window.gtag?.('event', 'sign_up', { event_category: 'conversion', event_label: 'google_oauth' })
    // 앱이 실행 중이면 토큰 전달
    fetch('http://localhost:17389/ping')
      .then((res) => {
        if (res.ok) {
          fetch('http://localhost:17389/sso', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            }),
          }).catch(() => {})
        }
      })
      .catch(() => {})

    // 대기 중인 결제 플랜 오픈
    if (pendingPlanRef.current) {
      setSelectedPlan(pendingPlanRef.current)
      setPaymentOpen(true)
      pendingPlanRef.current = null
    }
  }

  // 약관 동의 완료
  const handleTermsAgree = () => {
    setShowTermsModal(false)
    const session = pendingSessionRef.current
    pendingSessionRef.current = null
    if (session) handleAfterLogin(session)
  }

  // 로그인 필요 시 AuthModal → 로그인 후 결제 모달 자동 오픈
  const openPayment = (plan) => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (!user) {
      pendingPlanRef.current = plan
      setTimeout(() => setShowAuthModal(true), 400)
      return
    }
    setSelectedPlan(plan)
    setTimeout(() => setPaymentOpen(true), 400)
  }

  // Auth 상태 관리
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'SIGNED_IN' && session) {
        const createdAt = new Date(session.user.created_at).getTime()
        const signedInAt = new Date(session.user.last_sign_in_at).getTime()
        const isNewUser = Math.abs(signedInAt - createdAt) < 5000

        if (isNewUser) {
          // 신규 가입자 → 추천인 코드 적용 후 약관 동의
          const storedRef = sessionStorage.getItem('chronit_ref')
          if (storedRef) {
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/apply_referral_code_rpc`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                p_new_user_id: session.user.id,
                p_referral_code: storedRef,
              }),
            }).catch(() => {})
            sessionStorage.removeItem('chronit_ref')
          }
          pendingSessionRef.current = session
          setShowTermsModal(true)
          setShowAuthModal(false)
        } else {
          // 기존 유저 → 바로 처리
          handleAfterLogin(session)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // URL 파라미터 처리 (코드 & Python 앱 세션 공유)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // 할인 코드: sessionStorage에 저장 (OAuth 리디렉트 후에도 유지)
    const code = params.get('code')
    if (code) {
      setCodeFromUrl(code)
      sessionStorage.setItem('chronit_code', code)
    } else {
      const stored = sessionStorage.getItem('chronit_code')
      if (stored) setCodeFromUrl(stored)
    }

    // 추천인 코드: ?ref=CHRONIT-XXXX
    const ref = params.get('ref')
    if (ref) {
      setRefFromUrl(ref.toUpperCase())
      sessionStorage.setItem('chronit_ref', ref.toUpperCase())
    } else {
      const storedRef = sessionStorage.getItem('chronit_ref')
      if (storedRef) setRefFromUrl(storedRef)
    }

    // Python 앱에서 세션 토큰 전달 시 자동 로그인
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token })
    }

    // OAuth 콜백: URL 해시에서 토큰 파싱 후 세션 설정 + URL 정리
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      // 첫 번째 #access_token 블록만 파싱
      const hashStr = hash.startsWith('#') ? hash.slice(1) : hash
      const firstBlock = hashStr.split('#')[0]
      const hashParams = new URLSearchParams(firstBlock)
      const hashAccessToken = hashParams.get('access_token')
      const hashRefreshToken = hashParams.get('refresh_token')
      if (hashAccessToken && hashRefreshToken) {
        supabase.auth.setSession({ access_token: hashAccessToken, refresh_token: hashRefreshToken })
          .then(() => {
            // URL에서 토큰 제거
            window.history.replaceState(null, '', window.location.pathname)
          })
      }
    }
  }, [])


  // 이벤트 게시판 fetch
  useEffect(() => {
    supabase.from('events').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setEvents(data) })
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
      if (menuOpen) setMenuOpen(false)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [menuOpen])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0B0D17] font-sans break-keep text-slate-100 selection:bg-blue-500/30">
      {/* 추천인 코드 배너 */}
      {refFromUrl && (
        <div className="fixed top-0 right-0 left-0 z-[61] flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg">
          <Gift size={13} />
          <span>추천 코드 <strong>{refFromUrl}</strong> 적용됨 — 가입 시 <strong>500 크레딧</strong> 지급!</span>
          <button onClick={() => { setRefFromUrl(null); sessionStorage.removeItem('chronit_ref') }} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* 할인 코드 배너 */}
      {codeFromUrl && (
        <div className={`fixed right-0 left-0 z-[60] flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg ${refFromUrl ? 'top-10' : 'top-0'}`}>
          <Zap size={13} fill="currentColor" />
          <span>할인 코드 <strong>{codeFromUrl}</strong> 감지됨 — 결제 시 자동 적용됩니다</span>
          <button onClick={() => { setCodeFromUrl(null); sessionStorage.removeItem('chronit_code') }} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* 진행중인 이벤트 배너 */}
      {events.filter(e => e.status === 'active').length > 0 && !sessionStorage.getItem('chronit_event_banner_closed') && (
        <div
          className="fixed right-0 left-0 z-[59] flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg cursor-pointer"
          style={{ top: `${((refFromUrl ? 1 : 0) + (codeFromUrl ? 1 : 0)) * 40}px` }}
          onClick={() => { window.location.href = '/events' }}
        >
          <span>🎉</span>
          <span>진행중인 이벤트가 <strong>{events.filter(e => e.status === 'active').length}건</strong> 있어요 — 지금 확인하기 →</span>
          <button onClick={e => { e.stopPropagation(); sessionStorage.setItem('chronit_event_banner_closed', '1'); window.location.reload() }} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Header */}
      <header
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${scrolled ? 'border-b border-white/8 bg-[#0B0D17]/70 py-3 backdrop-blur-md md:py-4' : 'bg-transparent py-5 md:py-8'}`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <a href="/" className="flex min-w-0 items-center gap-2 md:gap-3">
            <img
              src="https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/icon.png"
              alt="Chronit"
              className="h-8 w-8 shrink-0 md:h-10 md:w-10"
            />
            <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-2xl font-black tracking-tighter text-transparent md:text-3xl">
              Chronit
            </h1>
          </a>
          <nav className="hidden gap-12 text-base font-bold tracking-wide text-slate-400 md:flex">
            <a href="#features" className="uppercase transition-colors hover:text-blue-400">
              기능
            </a>
            <Link to="/manual" className="uppercase transition-colors hover:text-blue-400">
              사용 방법
            </Link>
            <a href="#pricing" className="uppercase transition-colors hover:text-blue-400">
              요금제
            </a>
            <Link to="/events" className="uppercase transition-colors hover:text-blue-400">
              이벤트
            </Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {/* 데스크톱 전용 */}
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <>
                  <span className="text-sm font-medium text-slate-400">
                    {user.email?.split('@')[0]}
                  </span>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-400 transition-all hover:border-white/30 hover:text-white"
                    title="로그아웃"
                  >
                    <LogOut size={15} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="rounded-full border border-white/15 px-5 py-2 text-sm font-bold text-slate-300 transition-all hover:border-white/30 hover:text-white"
                >
                  로그인
                </button>
              )}
              <button
                onClick={() => openPayment('pro')}
                className="rounded-full bg-blue-600 px-7 py-2.5 text-base font-bold whitespace-nowrap text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 active:scale-95"
              >
                시작하기
              </button>
            </div>
            {/* 햄버거 버튼 — 모바일 전용, 오른쪽 끝 */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-slate-300 transition-all hover:border-white/30 hover:text-white md:hidden"
              aria-label="메뉴"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 햄버거 메뉴 드롭다운 */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 transform transition-all duration-300 ease-in-out md:hidden ${
          menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
        style={{ paddingTop: '80px' }}
      >
        <div className="border-b border-white/10 bg-[#0B0D17]/95 px-6 py-6 backdrop-blur-xl">
          <nav className="flex flex-col gap-1">
            <a href="#features" onClick={() => setMenuOpen(false)}
              className="rounded-xl px-4 py-3.5 text-base font-bold uppercase tracking-wide text-slate-300 transition-colors hover:bg-white/5 hover:text-blue-400">
              기능
            </a>
            <Link to="/manual" onClick={() => setMenuOpen(false)}
              className="rounded-xl px-4 py-3.5 text-base font-bold uppercase tracking-wide text-slate-300 transition-colors hover:bg-white/5 hover:text-blue-400">
              사용 방법
            </Link>
            <a href="#pricing" onClick={() => setMenuOpen(false)}
              className="rounded-xl px-4 py-3.5 text-base font-bold uppercase tracking-wide text-slate-300 transition-colors hover:bg-white/5 hover:text-blue-400">
              요금제
            </a>
            <Link to="/events" onClick={() => setMenuOpen(false)}
              className="rounded-xl px-4 py-3.5 text-base font-bold uppercase tracking-wide text-slate-300 transition-colors hover:bg-white/5 hover:text-blue-400">
              이벤트
            </Link>
          </nav>
          <div className="mt-4 border-t border-white/10 pt-4 flex flex-col gap-2">
            {user ? (
              <>
                <p className="px-4 pb-1 text-sm text-slate-500">{user.email}</p>
                <button
                  onClick={() => { supabase.auth.signOut(); setMenuOpen(false) }}
                  className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-base font-bold text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <LogOut size={16} /> 로그아웃
                </button>
              </>
            ) : (
              <button
                onClick={() => { setShowAuthModal(true); setMenuOpen(false) }}
                className="w-full rounded-xl border border-white/15 px-4 py-3 text-base font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                로그인
              </button>
            )}
            <button
              onClick={() => { openPayment('pro'); setMenuOpen(false) }}
              className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-base font-extrabold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 active:scale-95"
            >
              시작하기
            </button>
          </div>
        </div>
      </div>


      {/* 이벤트 모달 */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
          <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1526] shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0d1526]/95 px-6 py-4 backdrop-blur-xl">
              <div className="flex items-center gap-2 min-w-0">
                <EventBadge status={selectedEvent.status} label={selectedEvent.label} />
                <h3 className="truncate text-base font-bold text-slate-100">{selectedEvent.title}</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors">✕</button>
            </div>
            <div className="event-content px-6 py-6 text-slate-200" dangerouslySetInnerHTML={{ __html: selectedEvent.content }} />
            {selectedEvent.cta_text && selectedEvent.cta_url && (
              <div className="border-t border-white/10 px-6 py-4">
                <a href={selectedEvent.cta_url} target="_blank" rel="noopener noreferrer"
                  onClick={() => setSelectedEvent(null)}
                  className="block w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-center text-base font-extrabold text-white shadow-lg hover:opacity-90 active:scale-95 transition-all">
                  {selectedEvent.cta_text}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .event-content img { max-width:100%; border-radius:8px; margin:0.5em 0; }
        .event-content p { margin:0.6em 0; line-height:1.8; }
        .event-content h1 { font-size:1.6em; font-weight:800; margin:0.8em 0 0.4em; color:#f1f5f9; }
        .event-content h2 { font-size:1.3em; font-weight:700; margin:0.8em 0 0.4em; color:#f1f5f9; }
        .event-content h3 { font-size:1.1em; font-weight:700; margin:0.6em 0 0.3em; color:#f1f5f9; }
        .event-content ul, .event-content ol { padding-left:1.5em; margin:0.5em 0; }
        .event-content li { margin:0.3em 0; }
        .event-content blockquote { border-left:3px solid #7c3aed; padding-left:1em; color:#94a3b8; margin:0.6em 0; }
        .event-content a { color:#a78bfa; text-decoration:underline; }
        .event-content strong { color:#f1f5f9; font-weight:700; }
        .event-content code { background:rgba(255,255,255,0.08); padding:0.1em 0.4em; border-radius:4px; font-family:monospace; font-size:0.9em; }
        @keyframes badge-pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .badge-pulse { animation: badge-pulse 2s ease-in-out infinite; }
      `}</style>


      {/* Hero Section — 노트북 오버레이 구조 */}
      <section className="relative text-white" style={{background: '#1e2235', paddingBottom: '160px', overflow: 'visible'}}>

        {/* 배경 글로우 */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{background: 'rgba(59,130,246,0.07)', filter: 'blur(130px)'}} />
        <div className="absolute bottom-[10%] right-[-5%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{background: 'rgba(99,102,241,0.07)', filter: 'blur(120px)'}} />

        {/* 사선 배경 — z-0, 노트북 뒤 */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%', height: '200px',
          background: '#F5F4F0', zIndex: 0,
          clipPath: 'polygon(0 30%, 100% 0%, 100% 100%, 0% 100%)',
        }} />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-5 pt-32 md:grid-cols-2 md:gap-8 md:px-16" style={{paddingBottom: '0'}}>

          {/* 좌측: 카피 + 버튼 */}
          <div className="flex flex-col items-start pb-20 md:pb-32">
            <div className="animate-fade-in mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1.5 text-sm font-bold text-blue-400 md:px-4 md:text-base">
              <Zap size={14} fill="currentColor" /> <span>쇼핑 릴스 자동화 v1.0.1</span>
            </div>

            <h1 className="mb-4 text-4xl font-black leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
              클릭에 <span style={{color: '#ff6b00'}}>수익</span>을 입히다, 크로닛
            </h1>
            <span className="sr-only">크로닛(Chronit) — 쇼핑 릴스 영상 편집 자동화 솔루션.</span>

            <p className="mb-8 text-lg leading-[1.9] text-slate-300 md:text-xl">
              링크만 넣고 영상은 AI에게 맡기세요.<br />
              2분이면 충분합니다.
            </p>

            <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
              <button
                onClick={() => setShowAuthModal(true)}
                className="group flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 text-lg font-extrabold text-white shadow-[0_20px_50px_-15px_rgba(37,99,235,0.5)] transition-all hover:bg-blue-500 active:scale-95"
              >
                무료로 시작하기{' '}
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </button>
              <a
                href={DOWNLOAD_URL}
                onClick={() => window.gtag?.('event', 'download', { event_category: 'conversion', event_label: 'windows_download' })}
                className="group flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-4 text-lg font-extrabold text-white transition-all hover:bg-white/10 active:scale-95"
              >
                <Monitor size={20} /> Windows 다운로드
              </a>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-500">
              Windows 10/11 · 약 1.9GB · 첫 실행 시 "PC 보호" 경고 →{' '}
              <span className="text-slate-400">추가 정보 → 실행</span>
            </p>
          </div>

          {/* 우측: 노트북 — 마이너스 마진으로 아래 삐져나옴 */}
          <div className="hidden md:flex justify-center items-end relative z-10" style={{marginBottom: '-180px'}}>
            <div style={{position: 'relative'}}>
              <img
                src="https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/macbook_mockup.png"
                alt="Chronit 노트북"
                style={{width: '560px', height: 'auto', objectFit: 'contain', background: 'transparent', display: 'block', filter: 'drop-shadow(0 40px 60px rgba(0,0,0,0.5))'}}
              />

              {/* 팝업 1 — 우측 상단 */}
              <div style={{
                position: 'absolute', top: '18%', right: '-16%', zIndex: 50,
                background: 'rgba(15,17,32,0.97)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(34,197,94,0.35)', borderRadius: '14px',
                padding: '10px 14px', width: '148px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                transform: 'rotate(3deg)',
                willChange: 'transform', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased',
              }}>
                <div style={{fontSize: '9px', color: '#22c55e', marginBottom: '3px', fontWeight: 600}}>✅ 생성 완료</div>
                <div style={{fontSize: '12px', fontWeight: 700, color: '#fff', lineHeight: 1.4}}>수익형 영상<br/>생성 완료!</div>
                <div style={{fontSize: '9px', color: '#94a3b8', marginTop: '3px'}}>방금 전 · 2분 소요</div>
              </div>

              {/* 팝업 2 — 좌측 하단 */}
              <div style={{
                position: 'absolute', bottom: '28%', left: '-16%', zIndex: 50,
                background: 'rgba(15,17,32,0.97)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(39,207,254,0.3)', borderRadius: '14px',
                padding: '10px 14px', width: '142px',
                boxShadow: '0 12px 40px rgba(39,207,254,0.1)',
              }}>
                <div style={{fontSize: '9px', color: '#27CFFE', marginBottom: '3px', fontWeight: 600}}>🔄 발행 중</div>
                <div style={{fontSize: '12px', fontWeight: 700, color: '#fff', lineHeight: 1.4}}>AI 릴스<br/>자동 발행 중</div>
                <div style={{fontSize: '9px', color: '#27CFFE', marginTop: '3px'}}>인스타그램 업로드...</div>
              </div>
            </div>
          </div>

          {/* 모바일 */}
          <div className="flex md:hidden flex-col items-center gap-4" style={{zIndex: 30}}>
            <div style={{width: '220px', background: 'linear-gradient(160deg, #2a2a2a, #111)', borderRadius: '2.6rem', padding: '8px', boxShadow: '0 40px 80px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.12)'}}>
              <div style={{background: '#0a0a0a', borderRadius: '2.2rem 2.2rem 0 0', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <div style={{width: '55px', height: '18px', background: '#000', borderRadius: '10px'}} />
              </div>
              <div style={{background: '#000', overflow: 'hidden'}}><HeroPhoneVideo /></div>
              <div style={{background: '#0a0a0a', borderRadius: '0 0 2.2rem 2.2rem', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <div style={{width: '70px', height: '3px', background: 'rgba(255,255,255,0.25)', borderRadius: '2px'}} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 데모 영상 캐러셀 ── */}
      <div id="demo">
        <DemoCarousel />
      </div>

      {/* Stats Section */}
      {/* ── 구분선: 흰→네이비 ── */}
      <div style={{position:'relative',height:'80px',background:'#1e2235',marginTop:'-1px'}}>
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{position:'absolute',top:0,left:0,width:'100%',height:'100%'}}>
          <polygon points="0,80 1440,0 1440,80" fill="white"/>
        </svg>
      </div>
      <section className="relative bg-[#1e2235] px-5 pt-28 pb-20 md:px-8 md:pt-36 md:pb-32" style={{marginTop:"-80px"}}>
        <div style={{position:"absolute",top:0,left:0,width:"100%",height:"80px",zIndex:1,pointerEvents:"none"}}>
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{width:"100%",height:"100%"}}>
            <polygon points="0,0 1440,80 1440,0" fill="white"/>
          </svg>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_60%,transparent_100%)]"></div>

        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="mb-12 text-center md:mb-16">
            <h3 className="mb-4 text-xs font-black tracking-[0.3em] text-blue-500 uppercase md:text-sm">
              By The Numbers
            </h3>
            <h2 className="text-2xl leading-[1.4] font-bold text-white md:text-4xl">
              실무진들이 직접 검증한 결과
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6 md:gap-8">
            <div className="group relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-6 text-center shadow-2xl transition-all duration-500 hover:border-blue-500/40 md:rounded-[2rem] md:p-10">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 transition-transform group-hover:scale-110 md:mb-6 md:h-14 md:w-14">
                <Film size={24} />
              </div>
              <div className="bg-gradient-to-br from-slate-900 via-slate-700 to-blue-500 bg-clip-text text-4xl font-black tracking-tight text-transparent md:text-6xl">
                <AnimatedCounter to={1500} suffix="+" />
              </div>
              <div className="mt-3 text-base font-bold text-slate-400 md:mt-4 md:text-lg">
                제작된 릴스
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-6 text-center shadow-2xl transition-all duration-500 hover:border-blue-400 md:rounded-[2rem] md:p-10">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 transition-transform group-hover:scale-110 md:mb-6 md:h-14 md:w-14">
                <TrendingDown size={24} />
              </div>
              <div className="bg-gradient-to-br from-slate-900 via-slate-700 to-blue-500 bg-clip-text text-4xl font-black tracking-tight text-transparent md:text-6xl">
                <AnimatedCounter to={97} suffix="%" />
              </div>
              <div className="mt-3 text-base font-bold text-slate-400 md:mt-4 md:text-lg">
                시간 절감률
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-6 text-center shadow-2xl transition-all duration-500 hover:border-blue-500/40 md:rounded-[2rem] md:p-10">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 transition-transform group-hover:scale-110 md:mb-6 md:h-14 md:w-14">
                <Clock size={24} />
              </div>
              <div className="bg-gradient-to-br from-slate-900 via-slate-700 to-blue-500 bg-clip-text text-4xl font-black tracking-tight text-transparent md:text-6xl">
                <AnimatedCounter to={320} suffix="시간" />
              </div>
              <div className="mt-3 text-base font-bold text-slate-400 md:mt-4 md:text-lg">
                총 절약 시간
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      {/* ── 구분선: 네이비→흰 ── */}
      <div style={{position:'relative',height:'80px',background:'white',marginTop:'-1px'}}>
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{position:'absolute',top:0,left:0,width:'100%',height:'100%'}}>
          <polygon points="0,80 1440,0 1440,80" fill="#1e2235"/>
        </svg>
      </div>
      <section className="relative bg-white px-5 pt-28 pb-24 md:px-8 md:pt-36 md:pb-48" style={{marginTop:"-80px"}}>
        <div style={{position:"absolute",top:0,left:0,width:"100%",height:"80px",zIndex:1,pointerEvents:"none"}}>
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{width:"100%",height:"100%"}}>
            <polygon points="0,0 0,80 1440,0" fill="#1e2235"/>
          </svg>
        </div>
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center md:mb-28">
            <h3 className="mb-6 text-xs font-black tracking-[0.3em] text-blue-500 uppercase md:mb-8 md:text-sm">
              The Real Problem
            </h3>
            <h2 className="text-3xl leading-[1.4] font-bold text-slate-900 md:text-5xl md:leading-[1.5]">
              노력의 부족이 아니라,
              <br />
              도구의 선택이 잘못된 것입니다.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 md:gap-12">
            <div className="group rounded-[1.5rem] border-2 border-slate-200 bg-transparent p-6 transition-all duration-500 hover:border-blue-400 sm:rounded-[2rem] sm:p-8 md:rounded-[3rem] md:p-14">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 transition-transform group-hover:scale-110 md:mb-10 md:h-16 md:w-16">
                <Clock size={28} />
              </div>
              <h4 className="mb-4 text-xl leading-[1.4] font-bold text-slate-900 md:mb-6 md:text-2xl">
                매일 반복되는 1시간의 노가다
              </h4>
              <p className="text-lg leading-[1.8] text-slate-600 md:text-xl">
                영상 소스 찾기, 대본 짜기, 자막 복붙... 조회수는 제자리인데 당신의 시간만 의미 없이
                소모되고 있지는 않나요?
              </p>
            </div>
            <div className="group rounded-[1.5rem] border-2 border-slate-200 bg-transparent p-6 transition-all duration-500 hover:border-blue-400 sm:rounded-[2rem] sm:p-8 md:rounded-[3rem] md:p-14">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-500 transition-transform group-hover:scale-110 md:mb-10 md:h-16 md:w-16">
                <TrendingUp size={28} />
              </div>
              <h4 className="mb-4 text-xl leading-[1.4] font-bold text-slate-900 md:mb-6 md:text-2xl">
                어설픈 AI의 '광고 필터'
              </h4>
              <p className="text-lg leading-[1.8] text-slate-600 md:text-xl">
                시청자는 0.1초 만에 가짜를 알아봅니다. 자연스럽지 못한 AI 영상은 오히려 브랜드
                신뢰도를 깎아먹습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      {/* ── 구분선: 흰→네이비 ── */}
      <div style={{position:'relative',height:'80px',background:'#1e2235',marginTop:'-1px'}}>
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{position:'absolute',top:0,left:0,width:'100%',height:'100%'}}>
          <polygon points="0,80 1440,0 1440,80" fill="white"/>
        </svg>
      </div>
      <section
        id="features"
        className="relative bg-[#1e2235] px-5 pt-28 pb-24 md:px-8 md:pt-36 md:pb-48" style={{marginTop:"-80px"}}
      >
        <div style={{position:"absolute",top:0,left:0,width:"100%",height:"80px",zIndex:1,pointerEvents:"none"}}>
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{width:"100%",height:"100%"}}>
            <polygon points="0,0 1440,80 1440,0" fill="white"/>
          </svg>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] bg-[size:40px_40px]"></div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mb-16 flex flex-col items-center justify-between gap-8 text-center md:mb-32 md:flex-row md:items-end md:gap-12 md:text-left">
            <div className="mx-auto max-w-2xl md:mx-0">
              <h3 className="mb-4 text-xs font-black tracking-[0.2em] text-blue-500 uppercase md:mb-6 md:text-base">
                Core Strength
              </h3>
              <h2 className="text-3xl leading-[1.4] font-bold text-white md:text-5xl">
                진짜를 아는 실무진은
                <br />
                수익화에만 에너지를 씁니다.
              </h2>
            </div>
            <div className="border-l-4 border-blue-500 bg-blue-500/5 p-6 text-left md:max-w-sm md:p-8">
              <p className="text-lg leading-[1.8] text-slate-300 md:text-xl">
                수만 개의 영상을 직접 제작하며 증명된 로직을 시스템에 그대로 옮겼습니다.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:gap-10 lg:grid-cols-3">
            <FeatureCard
              icon={<ShieldCheck className="text-blue-500" />}
              title="실제 리뷰 데이터 기반"
              description="AI 가상 이미지가 아닌 실제 상품의 사용감과 디테일이 담긴 소스로 시청자의 의심을 확신으로 바꿉니다."
            />
            <FeatureCard
              icon={<Cpu className="text-cyan-500" />}
              title="실전 자막 리듬 로직"
              description="단순 자막이 아닙니다. 이탈률을 최소화하는 자막 절단 알고리즘과 스토리텔링 체인 기술이 탑재되었습니다."
            />
            <FeatureCard
              icon={<Zap className="text-indigo-500" />}
              title="GPT-4o 후킹 엔진"
              description="0.5초 만에 시선을 고정시키는 썸네일 카피와 대본을 생성하여 조회수 파이프라인을 구축합니다."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {/* ── 구분선: 네이비→흰 ── */}
      <div style={{position:'relative',height:'80px',background:'white',marginTop:'-1px'}}>
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{position:'absolute',top:0,left:0,width:'100%',height:'100%'}}>
          <polygon points="0,80 1440,0 1440,80" fill="#1e2235"/>
        </svg>
      </div>
      <section id="pricing" className="relative bg-white px-5 pt-28 pb-24 md:px-8 md:pt-36 md:pb-48" style={{marginTop:"-80px"}}>
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl md:rounded-[4rem]">
          <div className="relative z-10 p-5 text-center sm:p-8 md:p-32">
            <h2 className="mb-8 text-3xl leading-[1.3] font-black tracking-tight text-slate-900 md:mb-12 md:text-[56px]">
              당신의 1시간은
              <br className="hidden md:block" /> 1600원보다 훨씬 고귀합니다.
            </h2>
            <p className="mx-auto mb-12 max-w-3xl text-lg leading-[1.8] font-medium text-slate-600 md:mb-20 md:text-xl">
              하루 커피 한 잔 값으로,
              <br />
              당신의 성장을 가로막던 제작 노가다에서 해방되세요.
            </p>

            {/* 쿠폰 코드 입력 */}
            <CouponBar codeFromUrl={codeFromUrl} onApply={(code) => { setCodeFromUrl(code); sessionStorage.setItem('chronit_code', code) }} />

            <div
              className="mx-auto mb-16 grid max-w-6xl gap-6 text-left md:mb-24 md:grid-cols-3 md:gap-8"
            >
              {/* 스타터 */}
              <div onClick={() => openPayment('starter')} className="flex cursor-pointer flex-col rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6 transition-all hover:border-blue-400 sm:rounded-[2rem] md:rounded-[2.5rem] md:p-10">
                <p className="mb-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase md:text-sm">
                  Starter
                </p>
                <h4 className="mb-3 text-xl font-black text-white md:text-2xl">스타터</h4>
                <p className="mb-6 text-base leading-relaxed text-slate-600 md:text-lg">
                  나만의 숏폼 자동화 공장 맛보기
                </p>
                <div className="mb-8 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white md:text-5xl">49,000</span>
                  <span className="text-lg font-bold text-slate-500 md:text-xl">원 / 월</span>
                </div>
                <ul className="space-y-3 text-base leading-relaxed font-medium text-slate-700 md:space-y-4 md:text-lg">
                  <li className="flex items-start gap-2 md:gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-blue-400" />
                    <span><strong className="text-white">월 15개</strong> 영상 완성본 제작</span>
                  </li>
                  <li className="flex items-start gap-2 md:gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-blue-400" />
                    모든 핵심 자동화 기능 무제한 접근
                  </li>
                  <li className="flex items-start gap-2 md:gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-blue-400" />
                    수익화 링크 다이렉트 연동 (쿠파스 상품 검색 및 인포크링크 즉시 연결)
                  </li>
                  <li className="flex items-start gap-2 md:gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-blue-400" />
                    크로닛 AI 스크립트 엔진 (조회수 터지는 한국어 후킹 리라이팅)
                  </li>
                  <li className="flex items-start gap-2 md:gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-blue-400" />
                    스마트 자막 싱크 시스템 (오타 및 단위 발음 완벽 대응 정렬)
                  </li>
                  <li className="flex items-start gap-2 md:gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-blue-400" />
                    글로벌 커머스 숏폼 소스 매칭 (저작권 걱정 없는 소스 연결)
                  </li>
                </ul>
              </div>

              {/* 프로 (추천) */}
              <div onClick={() => openPayment('pro')} className="group relative flex transform cursor-pointer flex-col rounded-[1.5rem] border border-blue-400 bg-blue-600 p-6 shadow-[0_0_60px_-12px_rgba(37,99,235,0.6)] transition-all duration-500 hover:-translate-y-3 sm:rounded-[2rem] md:rounded-[2.5rem] md:p-10">
                <div className="absolute -top-3 right-4 flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[10px] font-black whitespace-nowrap text-blue-600 shadow-2xl sm:-top-4 sm:right-6 sm:px-4 sm:py-1.5 sm:text-sm md:-top-5 md:right-8 md:text-base">
                  <Flame size={14} className="text-orange-500" fill="currentColor" /> BEST
                </div>
                <p className="mb-2 text-[10px] font-bold tracking-widest text-blue-100 uppercase md:text-sm">
                  Pro
                </p>
                <h4 className="mb-3 text-xl font-black text-white md:text-2xl">프로</h4>
                <p className="mb-6 text-base leading-relaxed text-blue-100 md:text-lg">
                  다중 채널 폭발 및 대량 수익화를 위한 핵심 패키지
                </p>
                <div className="mb-8 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white md:text-6xl">99,000</span>
                  <span className="text-lg font-bold text-blue-100 md:text-xl">원 / 월</span>
                </div>
                <ul className="space-y-3 text-base leading-relaxed font-medium text-white md:space-y-4 md:text-lg">
                  <li className="flex items-start gap-2 md:gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-blue-200" />
                    <span><strong>월 100개</strong> 영상 완성본 제작 (하루 3~4개, 본격 양산용)</span>
                  </li>
                  <li className="flex items-start gap-2 md:gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-blue-200" />
                    스타터 요금제의 모든 강력한 기능 포함
                  </li>
                  <li className="flex items-start gap-2 md:gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-blue-200" />
                    고급 AI 음성 사용 가능 (자연스러운 한국어 TTS 보이스 활성화)
                  </li>
                  <li className="flex items-start gap-2 md:gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-blue-200" />
                    <span><strong>워터마크 제거</strong> — 완성본에 브랜드 로고 없이 깔끔하게 출력</span>
                  </li>
                </ul>
              </div>

              {/* 마스터 */}
              <div onClick={() => openPayment('master')} className="flex cursor-pointer flex-col rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6 transition-all hover:border-blue-400 sm:rounded-[2rem] md:rounded-[2.5rem] md:p-10">
                <p className="mb-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase md:text-sm">
                  Master
                </p>
                <h4 className="mb-3 text-xl font-black text-white md:text-2xl">마스터</h4>
                <p className="mb-6 text-base leading-relaxed text-slate-600 md:text-lg">
                  전문 크리에이터 및 대형 대행사를 위한 마스터 패키지
                </p>
                <div className="mb-8 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white md:text-5xl">199,000</span>
                  <span className="text-lg font-bold text-slate-500 md:text-xl">원 / 월</span>
                </div>
                <ul className="space-y-3 text-base leading-relaxed font-medium text-slate-700 md:space-y-4 md:text-lg">
                  <li className="flex items-start gap-2 md:gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-indigo-400" />
                    <span><strong className="text-white">월 300개</strong> 영상 완성본 제작 (채널 수십 개 동시 운영, 대량 생산)</span>
                  </li>
                  <li className="flex items-start gap-2 md:gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-indigo-400" />
                    프로 요금제의 모든 강력한 기능 포함
                  </li>
                  <li className="flex items-start gap-2 md:gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-indigo-400" />
                    향후 신규 업데이트 기능 우선 얼리버드 테스트 권한
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => openPayment(selectedPlan)}
              className="shadow-3xl w-full rounded-[2rem] bg-white px-8 py-5 text-lg font-black text-blue-950 transition-all hover:bg-slate-100 active:scale-95 sm:w-auto md:rounded-[2.5rem] md:px-20 md:py-7 md:text-xl"
            >
              무료로 시작하기
            </button>
          </div>
        </div>
      </section>

      {/* 이벤트 게시판 */}
      {events.length > 0 && (
        <section id="events" className="bg-[#0B0D17] px-5 py-20 md:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-2xl font-black tracking-tight text-white">이벤트</h2>

            {/* 탭 */}
            <div className="mb-1 flex border-b border-white/10">
              {[
                { key: 'active', label: '진행중인 이벤트' },
                { key: 'ended',  label: '종료된 이벤트' },
                { key: 'winner', label: '당첨자 발표' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setEventTab(tab.key)}
                  className={`px-5 py-3 text-sm font-bold transition-colors border-b-2 -mb-px ${
                    eventTab === tab.key
                      ? 'border-blue-500 text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 rounded-full bg-white/8 px-1.5 py-0.5 text-xs text-slate-400">
                    {events.filter(e => e.status === tab.key).length}
                  </span>
                </button>
              ))}
            </div>

            {/* 목록 */}
            <div className="divide-y divide-white/6">
              {events.filter(e => e.status === eventTab).length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-600">해당 이벤트가 없습니다</p>
              ) : (
                events.filter(e => e.status === eventTab).map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="flex w-full items-center gap-4 px-2 py-4 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <EventBadge status={ev.status} label={ev.label} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">{ev.title}</span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {new Date(ev.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#01030a] px-5 py-16 md:px-8 md:py-32">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-12 md:flex-row md:gap-16">
          <div className="max-w-md">
            <div className="mb-6 flex items-center gap-3 md:mb-10">
              <img src="https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/icon.png" alt="Chronit" className="h-8 w-8" />
              <h1 className="text-2xl font-black tracking-tighter">Chronit</h1>
            </div>
            <p className="text-lg leading-[1.8] font-medium text-slate-500 md:text-xl">
              우리는 당신의 '시간'이 가장 가치 있는 자산이라 믿습니다.
              <br />
              실무진의 고뇌가 담긴 도구로 숏폼 비즈니스의 격을 높이세요.
            </p>
          </div>
          <div className="grid w-full grid-cols-3 gap-6 sm:gap-12 md:w-auto md:gap-20">
            <div className="flex flex-col gap-4 md:gap-6">
              <span className="text-sm font-bold tracking-widest text-white uppercase md:text-base">
                서비스
              </span>
              <a
                href="#features"
                className="text-base font-medium text-slate-500 transition-colors hover:text-blue-400 md:text-lg"
              >
                기능
              </a>
              <a
                href="#pricing"
                className="text-base font-medium text-slate-500 transition-colors hover:text-blue-400 md:text-lg"
              >
                요금제
              </a>
              <a
                href="/events"
                className="text-base font-medium text-slate-500 transition-colors hover:text-blue-400 md:text-lg"
              >
                이벤트
              </a>
            </div>
            <div className="flex flex-col gap-4 md:gap-6">
              <span className="text-sm font-bold tracking-widest text-white uppercase md:text-base">
                회사
              </span>
              <a
                href="#"
                className="text-base font-medium text-slate-500 transition-colors hover:text-blue-400 md:text-lg"
              >
                회사 소개
              </a>
              <a
                href="mailto:support@chronit.kr"
                className="text-base font-medium text-slate-500 transition-colors hover:text-blue-400 md:text-lg"
              >
                문의하기
              </a>
            </div>
            <div className="flex flex-col gap-4 md:gap-6">
              <span className="text-sm font-bold tracking-widest text-white uppercase md:text-base">
                법적고지
              </span>
              <Link
                to="/privacy"
                className="text-base font-medium text-slate-500 transition-colors hover:text-blue-400 md:text-lg"
              >
                개인정보처리방침
              </Link>
              <Link
                to="/terms"
                className="text-base font-medium text-slate-500 transition-colors hover:text-blue-400 md:text-lg"
              >
                이용약관
              </Link>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-16 flex max-w-7xl flex-col items-center justify-between gap-6 border-t border-white/5 pt-8 md:mt-32 md:flex-row md:gap-8 md:pt-10">
          <p className="text-center text-[10px] font-bold tracking-[0.3em] text-slate-600 uppercase md:text-sm md:tracking-[0.4em]">
            &copy; 2026 Chronit Labs. Crafting Future Efficiency.
          </p>
          <div className="flex gap-6 md:gap-8">
            <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-white/5 transition-all hover:bg-blue-600">
              <Users size={20} />
            </div>
            <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-white/5 transition-all hover:bg-blue-600">
              <MessageCircle size={20} />
            </div>
          </div>
        </div>
      </footer>

      {/* Global CSS for Animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes burn {
          0% {
            color: #ffffff;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
          }
          50% {
            color: #ef4444;
            text-shadow:
              0 0 20px rgba(239, 68, 68, 0.8),
              0 0 40px rgba(239, 68, 68, 0.4);
            transform: scale(1.05);
          }
          100% {
            color: #ffffff;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
          }
        }
        .animate-fade-in {
          animation: fade-in 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-burn {
          animation: burn 3s ease-in-out infinite;
          display: inline-block;
        }
        html {
          scroll-behavior: smooth;
        }
        body {
          -webkit-font-smoothing: antialiased;
        }
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #020617;
        }
        ::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} referralCode={refFromUrl} />
      <TermsModal open={showTermsModal} onAgree={handleTermsAgree} onClose={() => setShowTermsModal(false)} />
      <PaymentModal
        key={selectedPlan + (paymentOpen ? '-open' : '-closed')}
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        defaultPlan={selectedPlan}
        initialCode={codeFromUrl}
      />
    </div>
  )
}

const FeatureCard = ({ icon, title, description }) => (
  <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm transition-all duration-300 hover:border-blue-400 hover:bg-white/10 sm:rounded-3xl sm:p-8">
    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-50">
      {React.cloneElement(icon, { size: 28 })}
    </div>
    <h4 className="mb-3 text-xl font-bold text-white md:text-2xl">
      {title}
    </h4>
    <p className="text-base leading-[1.8] text-slate-300 md:text-lg">
      {description}
    </p>
  </div>
)

/* ──────────────────────────────────────────────────────
   히어로 폰 목업 영상 — demo_videos 첫 번째 영상 자동재생
────────────────────────────────────────────────────── */
const HeroPhoneVideo = () => {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    supabase.from('demo_videos').select('url').order('sort_order').limit(1)
      .then(({ data }) => { if (data?.[0]) setUrl(data[0].url) })
  }, [])
  return (
    <div style={{ background: '#0f1120', aspectRatio: '9/16', overflow: 'hidden' }}>
      {url
        ? <video src={url} muted loop playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #3b82f6', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
          </div>
      }
    </div>
  )
}

/* ──────────────────────────────────────────────────────
   데모 영상 캐러셀
   - 중앙 영상만 활성(autoplay/unmuted), 나머지는 흐리게
   - 좌우 클릭 or 드래그로 이동, 무한 루프
────────────────────────────────────────────────────── */

const DemoCarousel = () => {
  const [videos, setVideos] = useState([])
  const [active, setActive] = useState(0)
  const dragStartX = useRef(0)
  const videoRefs = useRef([])

  useEffect(() => {
    supabase.from('demo_videos').select('*').order('sort_order').then(({ data }) => {
      if (data && data.length) setVideos(data.map(v => v.url))
    })
  }, [])

  const n = videos.length
  const prev = () => setActive(i => (i - 1 + n) % n)
  const next = () => setActive(i => (i + 1) % n)

  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i === active) {
        v.muted = true
        v.currentTime = 0
        const p = v.play()
        if (p && typeof p.catch === 'function') p.catch(() => {})
      } else {
        v.pause()
        v.currentTime = 0
      }
    })
  }, [active, videos])

  const onMouseDown = (e) => { dragStartX.current = e.clientX }
  const onMouseUp = (e) => {
    const dx = e.clientX - dragStartX.current
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev()
  }
  const onTouchStart = (e) => { dragStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - dragStartX.current
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev()
  }

  if (!n) return null

  return (
    <section className="relative bg-white pt-56 pb-16 md:pt-64 md:pb-24">
      <div className="mb-10 text-center md:mb-14">
        <p className="mb-2 text-xs font-bold tracking-[0.3em] text-blue-400 uppercase md:text-sm">DEMO</p>
        <h2 className="text-2xl font-black tracking-tight text-gray-900 md:text-4xl">
          {"실제 제작된 영상을 확인하세요"}
        </h2>
      </div>
      <div
        className="relative flex items-center justify-center select-none"
        style={{ height: 'min(72vw, 560px)' }}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {videos.map((src, vidIdx) => {
          let offset = (vidIdx - active + n) % n
          if (offset > n / 2) offset -= n
          const isCenter = offset === 0
          const absOff = Math.abs(offset)
          const visible = absOff <= 2
          const translateX = offset * 220
          const scale = isCenter ? 1 : absOff === 1 ? 0.78 : 0.6
          const opacity = isCenter ? 1 : absOff === 1 ? 0.55 : 0.2
          const zIndex = isCenter ? 20 : absOff === 1 ? 10 : 5
          return (
            <div
              key={vidIdx}
              onClick={() => { if (!isCenter) setActive(vidIdx) }}
              style={{
                position: 'absolute',
                transform: `translateX(${translateX}px) scale(${scale})`,
                opacity: visible ? opacity : 0,
                zIndex,
                transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease',
                willChange: 'transform, opacity',
                cursor: isCenter ? 'default' : 'pointer',
                pointerEvents: visible ? 'auto' : 'none',
              }}
            >
              <div style={{
                width: 'min(52vw, 280px)',
                aspectRatio: '9/16',
                borderRadius: '1.25rem',
                overflow: 'hidden',
                boxShadow: isCenter
                  ? '0 30px 80px -10px rgba(59,130,246,0.35), 0 0 0 1px rgba(255,255,255,0.08)'
                  : '0 10px 30px -10px rgba(0,0,0,0.5)',
                boxShadow: isCenter ? '0 30px 60px -10px rgba(0,0,0,0.35), 0 4px 6px rgba(0,0,0,0.1)' : '0 10px 30px -5px rgba(0,0,0,0.2)',
                transition: 'box-shadow 0.5s ease',
              }}>
                <video
                  ref={el => { videoRefs.current[vidIdx] = el }}
                  src={src}
                  muted
                  loop
                  playsInline
                  autoPlay={isCenter}
                  preload="auto"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#0f172a' }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-8 flex items-center justify-center gap-6">
        <button onClick={prev} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-700 shadow transition-all hover:border-blue-500 hover:text-blue-500 active:scale-95 md:h-12 md:w-12">{"<"}</button>
        <div className="flex gap-2">
          {videos.map((_, i) => (
            <button key={i} onClick={() => setActive(i)}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === active ? '24px' : '6px', background: i === active ? '#3b82f6' : 'rgba(255,255,255,0.2)' }}
            />
          ))}
        </div>
        <button onClick={next} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-700 shadow transition-all hover:border-blue-500 hover:text-blue-500 active:scale-95 md:h-12 md:w-12">{">"}</button>
      </div>
    </section>
  )
}

export default Home

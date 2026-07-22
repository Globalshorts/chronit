import React, { useState, useEffect, useRef } from 'react'
import {
  Clock, CheckCircle2, MessageCircle, ArrowRight, Users,
  Film, TrendingDown, LogOut, Gift, Menu, X, Play, User,
  Search, Captions, Mic, Scissors, Palette, Zap, Sparkles, Check,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import AnimatedCounter from '../components/AnimatedCounter'
import PaymentModal from '../components/PaymentModal'
import AuthModal from '../components/AuthModal'
import TermsModal from '../components/TermsModal'
import Footer from '../components/Footer'
import SiteNav from '../components/SiteNav'
import Reveal from '../components/Reveal'
import NicknameModal from '../components/NicknameModal'
import SignupSurveyModal from '../components/SignupSurveyModal'
import { supabase } from '../lib/supabase'

const GREEN = '#0064FF'

/* 가격표 위 쿠폰 입력 바 */
const CouponBar = ({ codeFromUrl, onApply }) => {
  const [input, setInput] = useState('')
  const [status, setStatus] = useState(null)

  const handleApply = async () => {
    const trimmed = input.trim().toUpperCase()
    if (!trimmed) return
    if (trimmed.length >= 3) { onApply(trimmed); setStatus('ok') } else { setStatus('fail') }
  }

  if (codeFromUrl) {
    return (
      <div className="mx-auto mb-10 flex max-w-sm items-center gap-3 rounded-2xl border-2 border-[#0064FF]/30 bg-[#0064FF]/10 px-5 py-3">
        <Gift size={16} className="shrink-0 text-[#0064FF]" />
        <span className="text-base font-bold text-gray-700">코드 <strong className="text-gray-900">{codeFromUrl}</strong> 적용됨</span>
        <button onClick={() => { onApply(null); sessionStorage.removeItem('chronit_code') }} className="ml-auto text-gray-400 hover:text-gray-700">✕</button>
      </div>
    )
  }

  return (
    <div className="mx-auto mb-10 flex max-w-md flex-col items-center gap-2">
      <div className="flex w-full gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value.toUpperCase()); setStatus(null) }}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          placeholder="쿠폰 / 할인 코드 (있으면 입력)"
          className="flex-1 rounded-2xl border-2 border-gray-300 bg-white px-5 py-4 text-base font-bold text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/15"
        />
        <button onClick={handleApply}
          className="rounded-2xl bg-[#0064FF] px-6 py-4 text-base font-bold text-white transition-all hover:bg-[#0052D6] active:scale-95">
          적용
        </button>
      </div>
      {status === 'ok' && <p className="text-sm font-bold text-[#0064FF]">✓ 코드가 적용됐어요 — 결제할 때 할인이 반영됩니다</p>}
      {status === 'fail' && <p className="text-sm font-bold text-red-500">코드를 다시 확인해 주세요</p>}
    </div>
  )
}

const statusCfg = {
  active:  { label: '진행중',      cls: 'bg-[#0064FF]/12 text-[#0064FF] border-[#0064FF]/30', dot: true },
  ended:   { label: '종료됨',      cls: 'bg-gray-100 text-gray-500 border-gray-200', dot: false },
  winner:  { label: '당첨자 발표', cls: 'bg-[#FFB800]/15 text-[#b07d00] border-[#FFB800]/40', dot: false },
}
const EventBadge = ({ status, label }) => {
  const cfg = statusCfg[status] || statusCfg.active
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.cls}`}>
      {cfg.dot && <span className="badge-pulse h-1.5 w-1.5 rounded-full bg-[#0064FF]" />}
      {cfg.label}
    </span>
  )
}

const PLAN_FALLBACK = { starter: { list: 49000, sale: 29000 }, pro: { list: 99000, sale: 49000 }, master: { list: 199000, sale: 79000 }, pkg6: { list: 594000, sale: 249000 } }

const HOME_CAP = 100
function HomeScarcity({ spots }) {
  if (spots == null) return null
  const pct = Math.min(100, Math.round((spots / HOME_CAP) * 100))
  return (
    <div className="mx-auto mb-6 max-w-md rounded-2xl border-2 border-[#FF5A5F]/30 bg-[#FFF5F5] px-5 py-4">
      <div className="mb-2 flex items-center justify-between text-sm font-black">
        <span className="text-[#FF5A5F]">🔥 선착순 100명 무료</span>
        <span className="text-gray-500">현재 {spots}명 신청</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full transition-all" style={{ width: pct + '%', background: '#FF5A5F' }} />
      </div>
    </div>
  )
}
const wonFmt = (n) => Number(n || 0).toLocaleString('ko-KR')
const pctOff = (list, sale) => (list > 0 ? Math.round((list - sale) / list * 100) : 0)

const Home = () => {
  const [scrolled, setScrolled] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('pro')
  const [heroTab, setHeroTab] = useState('link')  // 히어로 입력 탭: link | upload
  const [user, setUser] = useState(null)
  const [nickname, setNickname] = useState(null)
  const [nickOpen, setNickOpen] = useState(false)
  const [nickRequired, setNickRequired] = useState(false)
  const [sourceOpen, setSourceOpen] = useState(false)
  const pendingAfterLoginRef = useRef(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [codeFromUrl, setCodeFromUrl] = useState(null)
  const [refFromUrl, setRefFromUrl] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [events, setEvents] = useState([])
  const [eventTab, setEventTab] = useState('active')
  const [planPrices, setPlanPrices] = useState(PLAN_FALLBACK)
  const [spots, setSpots] = useState(null)
  useEffect(() => {
    supabase.rpc('public_signup_count').then(({ data }) => { if (typeof data === 'number') setSpots(data) })
    supabase.from('plans').select('id, list_price, monthly_price').in('id', ['starter', 'pro', 'master'])
      .then(({ data }) => {
        if (!data || !data.length) return
        setPlanPrices(prev => { const m = { ...prev }; data.forEach(r => { if (r.list_price > 0 && r.monthly_price > 0) m[r.id] = { list: r.list_price, sale: r.monthly_price } }); return m })
      })
    supabase.from('site_settings').select('key, value').in('key', ['pkg6_list_price', 'pkg6_sale_price'])
      .then(({ data }) => {
        if (!data || !data.length) return
        const o = {}; data.forEach(r => { o[r.key] = Number(r.value) || 0 })
        setPlanPrices(prev => ({ ...prev, pkg6: { list: o.pkg6_list_price || prev.pkg6.list, sale: o.pkg6_sale_price || prev.pkg6.sale } }))
      })
  }, [])
  const pendingPlanRef = useRef(null)
  const pendingSessionRef = useRef(null)
  const pendingStartRef = useRef(false)

  useEffect(() => {
    if (!user) { setNickname(null); return }
    supabase.from('profiles').select('nickname').eq('id', user.id).maybeSingle()
      .then(({ data }) => setNickname(data?.nickname ?? null))
  }, [user])

  const handleAfterLogin = (session) => {
    window.gtag?.('event', 'sign_up', { event_category: 'conversion', event_label: 'google_oauth' })
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

    if (pendingPlanRef.current) {
      setSelectedPlan(pendingPlanRef.current)
      setPaymentOpen(true)
      pendingPlanRef.current = null
    } else if (pendingStartRef.current) {
      pendingStartRef.current = false
      window.location.href = '/generate'
    }
  }

  // 시작하기/무료로 시작하기 — 로그인 시 영상 만들기로, 아니면 로그인
  const handleStart = () => {
    if (user) { window.location.href = '/generate'; return }
    pendingStartRef.current = true
    setShowAuthModal(true)
  }

  const handleTermsAgree = async (marketing = false) => {
    setShowTermsModal(false)
    const session = pendingSessionRef.current
    pendingSessionRef.current = null
    // 신규 가입 시 닉네임 입력 받기 (없으면 모달, 완료/생략 후 진행)
    if (session) {
      // 약관 동의 + 마케팅 수신 동의(선택) 기록 저장
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/set_terms_consent_rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ p_marketing: !!marketing }),
      }).catch(() => {})

      proceedOnboarding(session)
    }
  }

  // 가입 온보딩: 닉네임(필수) → 유입경로(필수) → 후처리
  const proceedOnboarding = async (session) => {
    const { data: prof } = await supabase
      .from('profiles').select('nickname, signup_source').eq('id', session.user.id).maybeSingle()
    if (!prof?.nickname) {
      pendingAfterLoginRef.current = session
      setNickRequired(true)
      setNickOpen(true)
      return
    }
    if (!prof?.signup_source) {
      pendingAfterLoginRef.current = session
      setSourceOpen(true)
      return
    }
    pendingAfterLoginRef.current = null
    handleAfterLogin(session)
  }

  // 닉네임 완료 — 가입 흐름이면 유입경로로 이어가고, 헤더에서 연 경우면 갱신만
  const handleNicknameDone = (n) => {
    setNickname(n)
    setNickOpen(false)
    setNickRequired(false)
    const session = pendingAfterLoginRef.current
    if (session) proceedOnboarding(session)
  }

  // 닉네임 닫기 — required=false(헤더에서 연 경우)일 때만 호출됨
  const handleNicknameClose = () => {
    setNickOpen(false)
    setNickRequired(false)
  }

  // 유입경로 설문 완료 → 후처리 진행
  const handleSourceDone = () => {
    setSourceOpen(false)
    const session = pendingAfterLoginRef.current
    pendingAfterLoginRef.current = null
    if (session) handleAfterLogin(session)
  }

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      // (제거) 로그인 시 /generate 강제 이동 — 결제/광고 랜딩 접근을 막아 비활성화함.
      //  로그인 상태여도 홈에 머무를 수 있게 함. 앱 진입은 상단 CTA/네비로.
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'SIGNED_IN' && session) {
        // 온보딩 미완료(신규)면 회원가입 페이지로, 완료면 정상 진행
        // (시간 휴리스틱 대신 onboarded 기준 — 방금 가입한 계정이 계속 /register로 튕기던 버그 수정)
        supabase.from('profiles').select('onboarded').eq('id', session.user.id).maybeSingle()
          .then(({ data: prof }) => {
            if (prof && prof.onboarded === false) {
              // 추천 코드(chronit_ref)는 /register에서 적용/정리함
              window.location.href = '/register'
            } else {
              handleAfterLogin(session)
            }
          })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const location = useLocation()
  // 해시(#features/#pricing/#faq) 스크롤 — 상단탭(<a>=hashchange) + 푸터(<Link>=React Router location 변화) + 마운트 모두 대응.
  // scrollIntoView가 이 페이지선 안 먹혀 window.scrollTo로 처리, 각 섹션 scroll-margin-top 값을 오프셋으로 반영
  useEffect(() => {
    const scrollToHash = () => {
      const id = (window.location.hash || '').replace('#', '')
      if (!id || id.includes('access_token')) return
      setTimeout(() => {
        const el = document.getElementById(id)
        if (!el) return
        const smt = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
        const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - smt)
        window.scrollTo({ top: y, behavior: 'smooth' })
      }, 60)
    }
    scrollToHash()                                            // 마운트 + Link(location) 변화 시
    window.addEventListener('hashchange', scrollToHash)       // 상단탭 <a> 해시 클릭 시
    return () => window.removeEventListener('hashchange', scrollToHash)
  }, [location.key, location.hash])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    const code = params.get('code')
    if (code) {
      setCodeFromUrl(code)
      sessionStorage.setItem('chronit_code', code)
    } else {
      const stored = sessionStorage.getItem('chronit_code')
      if (stored) setCodeFromUrl(stored)
    }

    const ref = params.get('ref')
    if (ref) {
      setRefFromUrl(ref.toUpperCase())
      sessionStorage.setItem('chronit_ref', ref.toUpperCase())
    } else {
      const storedRef = sessionStorage.getItem('chronit_ref')
      if (storedRef) setRefFromUrl(storedRef)
    }

    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token })
    }

    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      const hashStr = hash.startsWith('#') ? hash.slice(1) : hash
      const firstBlock = hashStr.split('#')[0]
      const hashParams = new URLSearchParams(firstBlock)
      const hashAccessToken = hashParams.get('access_token')
      const hashRefreshToken = hashParams.get('refresh_token')
      if (hashAccessToken && hashRefreshToken) {
        supabase.auth.setSession({ access_token: hashAccessToken, refresh_token: hashRefreshToken })
          .then(() => {
            window.history.replaceState(null, '', window.location.pathname)
          })
      }
    }
  }, [])

  useEffect(() => {
    supabase.from('events').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setEvents(data) })
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = null

  const eventBannerOn = events.filter(e => e.status === 'active').length > 0 && !(typeof sessionStorage !== 'undefined' && sessionStorage.getItem('chronit_event_banner_closed'))
  const bannerCount = (refFromUrl ? 1 : 0) + (codeFromUrl ? 1 : 0) + (eventBannerOn ? 1 : 0)
  const bannerH = bannerCount * 44

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAF8] font-sans break-keep text-gray-900 selection:bg-[#0064FF]/20" style={{ paddingTop: bannerH ? `${bannerH}px` : undefined }}>
      {/* 추천인 코드 배너 */}
      {refFromUrl && (
        <div className="fixed top-0 right-0 left-0 z-[61] flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap bg-[#0064FF] px-4 py-3 text-sm font-bold text-white shadow-md">
          <Gift size={15} />
          <span>추천 코드 <strong>{refFromUrl}</strong> 적용됨!</span>
          <button onClick={() => { setRefFromUrl(null); sessionStorage.removeItem('chronit_ref') }} className="ml-2 opacity-80 hover:opacity-100">✕</button>
        </div>
      )}

      {/* 할인 코드 배너 */}
      {codeFromUrl && (
        <div className={`fixed right-0 left-0 z-[60] flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap bg-[#FFB800] px-4 py-3 text-sm font-bold text-[#5b4200] shadow-md ${refFromUrl ? 'top-11' : 'top-0'}`}>
          <span>🎟️ 코드 <strong>{codeFromUrl}</strong> 감지됨 — 가입하면 자동으로 적용됩니다</span>
          <button onClick={() => { setCodeFromUrl(null); sessionStorage.removeItem('chronit_code') }} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* 진행중인 이벤트 배너 */}
      {eventBannerOn && (
        <div
          className="fixed right-0 left-0 z-[59] flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap bg-[#0052D6] px-4 py-3 text-sm font-bold text-white shadow-md cursor-pointer"
          style={{ top: `${((refFromUrl ? 1 : 0) + (codeFromUrl ? 1 : 0)) * 44}px` }}
          onClick={() => { window.location.href = '/events' }}
        >
          <span>🎉</span>
          <span>진행 중인 이벤트 <strong>{events.filter(e => e.status === 'active').length}건</strong> — 확인하기 →</span>
          <button onClick={e => { e.stopPropagation(); sessionStorage.setItem('chronit_event_banner_closed', '1'); window.location.reload() }} className="ml-2 opacity-80 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Header */}
      <header style={{ top: `${bannerH}px` }} className={`fixed right-0 left-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-gray-200 bg-[#FAFAF8]/90 py-3 backdrop-blur-md' : 'bg-transparent py-4 md:py-5'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <a href="/" className="flex min-w-0 items-center gap-2 md:gap-3">
            <img src="https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/icon.png" alt="Chronit" className="h-9 w-9 shrink-0 md:h-10 md:w-10" />
            <h1 className="hidden md:block text-2xl font-black tracking-tight text-gray-900 md:text-3xl">Chronit</h1>
          </a>
          <SiteNav />
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <>
                  {nickname ? (
                    <Link to="/me" className="flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-[#0064FF] active:scale-95">
                      <User size={16} /> <span className="max-w-[110px] truncate">{nickname}</span>
                    </Link>
                  ) : (
                    <button onClick={() => setNickOpen(true)} className="flex items-center gap-1.5 rounded-full border-2 border-[#0064FF] px-4 py-1.5 text-sm font-bold text-[#0064FF] transition-all hover:bg-[#0064FF]/10 active:scale-95">
                      <User size={16} /> 닉네임 설정
                    </button>
                  )}
                  <button onClick={() => supabase.auth.signOut()} title="로그아웃"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-all hover:border-gray-400 hover:text-gray-800">
                    <LogOut size={15} />
                  </button>
                </>
              ) : (
                <button onClick={() => setShowAuthModal(true)}
                  className="rounded-full border-2 border-gray-300 px-5 py-2 text-base font-bold text-gray-700 transition-all hover:border-gray-400">
                  로그인
                </button>
              )}
              <button onClick={handleStart}
                className="rounded-full bg-[#0064FF] px-7 py-2.5 text-base font-bold whitespace-nowrap text-white shadow-md shadow-[#0064FF]/25 transition-all hover:bg-[#0052D6] active:scale-95">
                시작하기
              </button>
            </div>
            {/* 모바일 상단 시작하기 CTA (햄버거에 가려지지 않게 상시 노출) */}
            <button onClick={handleStart}
              className="rounded-full bg-[#0064FF] px-4 py-2 text-sm font-bold whitespace-nowrap text-white shadow-md shadow-[#0064FF]/25 transition-all active:scale-95 md:hidden">
              시작하기
            </button>
            <button onClick={() => setMenuOpen((v) => !v)} aria-label="메뉴"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition-all hover:border-gray-400 md:hidden">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 메뉴 */}
      <div className={`fixed top-0 left-0 right-0 z-40 transform transition-all duration-300 ease-in-out md:hidden ${menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`} style={{ paddingTop: `${bannerH + 76}px` }}>
        <div className="border-b border-gray-200 bg-white px-6 py-6 shadow-lg overflow-y-auto overscroll-contain" style={{ maxHeight: `calc(100dvh - ${bannerH + 76}px)` }}>
          <nav className="flex flex-col gap-1 text-lg font-bold text-gray-700">
            <a href="#features" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-4 transition-colors hover:bg-gray-50 hover:text-[#0064FF]">기능</a>
            <a href="#faq" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-4 transition-colors hover:bg-gray-50 hover:text-[#0064FF]">자주 묻는 질문</a>
            <Link to="/manual" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-4 transition-colors hover:bg-gray-50 hover:text-[#0064FF]">사용 방법</Link>
            <Link to="/board" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-4 transition-colors hover:bg-gray-50 hover:text-[#0064FF]">공지·이벤트</Link>
            <a href="https://cafe.naver.com/chronit" target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-4 transition-colors hover:bg-gray-50 hover:text-[#0064FF]">공식 카페</a>
            <Link to="/me" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-4 transition-colors hover:bg-gray-50 hover:text-[#0064FF]">마이페이지</Link>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-4 transition-colors hover:bg-gray-50 hover:text-[#0064FF]">가격 안내</a>
          </nav>
          <div className="mt-4 border-t border-gray-200 pt-4 flex flex-col gap-2">
            {user ? (
              <>
                {nickname ? (
                  <Link to="/me" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3.5 text-lg font-bold text-white transition-colors hover:bg-[#0064FF]">
                    <User size={18} /> {nickname} <span className="ml-auto text-sm font-medium text-white/70">마이페이지 →</span>
                  </Link>
                ) : (
                  <button onClick={() => { setNickOpen(true); setMenuOpen(false) }} className="flex items-center gap-2 rounded-xl border-2 border-[#0064FF] px-4 py-3.5 text-lg font-bold text-[#0064FF] transition-colors hover:bg-[#0064FF]/10">
                    <User size={18} /> 닉네임 설정하기
                  </button>
                )}
                <p className="px-4 pb-1 text-xs text-gray-400">{user.email}</p>
                <button onClick={() => { supabase.auth.signOut(); setMenuOpen(false) }}
                  className="flex w-full items-center gap-2 rounded-xl px-4 py-3.5 text-lg font-bold text-gray-600 transition-colors hover:bg-gray-50">
                  <LogOut size={18} /> 로그아웃
                </button>
              </>
            ) : (
              <button onClick={() => { setShowAuthModal(true); setMenuOpen(false) }}
                className="w-full rounded-xl border-2 border-gray-300 px-4 py-3.5 text-lg font-bold text-gray-700 transition-colors hover:bg-gray-50">
                로그인
              </button>
            )}
            <button onClick={() => { setMenuOpen(false); handleStart() }}
              className="w-full rounded-xl bg-[#0064FF] px-4 py-4 text-lg font-extrabold text-white shadow-md transition-all hover:bg-[#0052D6] active:scale-95">
              시작하기
            </button>
          </div>
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-b from-[#E4EFE7] via-[#EDF3EE] to-[#FAFAF8] px-5 pt-32 pb-16 md:px-8 md:pt-40 md:pb-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="flex w-full flex-col items-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0064FF]/30 bg-[#0064FF]/10 px-4 py-2 text-sm font-bold text-[#0064FF] md:text-base">
              <Sparkles size={14} fill="currentColor" /> 쇼핑 숏폼 특화 AI
            </div>
            <h1 className="mb-5 text-4xl font-black leading-[1.15] tracking-tight text-gray-900 break-keep md:text-6xl">
              편집도 외주도 없이<br /><span className="bg-gradient-to-r from-[#10b981] to-[#0064FF] bg-clip-text text-transparent">매일 올리는 쇼핑 숏폼</span>
            </h1>
            <p className="mb-9 text-xl font-bold text-gray-500 break-keep md:text-2xl">
              영상만 넣으면 상품 분석·자막·AI 음성·컷 편집까지<br />완성된 쇼핑 숏폼으로 돌려드려요.
            </p>

            <div className="flex w-full max-w-2xl flex-col gap-3">
              {/* 입력 방식 탭 */}
              <div className="flex gap-1.5 rounded-2xl border-2 border-gray-200 bg-white p-1.5">
                <button onClick={() => setHeroTab('link')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${heroTab === 'link' ? 'bg-[#0064FF] text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>
                  🔗 영상 링크
                </button>
                <button onClick={() => setHeroTab('upload')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${heroTab === 'upload' ? 'bg-[#0064FF] text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>
                  ⬆️ 직접 업로드
                </button>
              </div>

              {heroTab === 'link' ? (
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch">
                  <input
                    type="text"
                    placeholder="상품 영상 링크를 입력하세요"
                    onKeyDown={e => { if (e.key === 'Enter') handleStart() }}
                    className="flex-1 rounded-2xl border-2 border-gray-300 bg-white px-5 py-4 text-base font-bold text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/15"
                  />
                  <button onClick={handleStart}
                    className="group flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#0064FF] px-8 py-4 text-lg font-extrabold text-white shadow-lg shadow-[#0064FF]/30 transition-all hover:bg-[#0052D6] active:scale-95">
                    쇼핑 숏폼 만들기 <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={handleStart}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleStart() }}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-white px-5 py-10 text-center transition-all hover:border-[#0064FF]/60 hover:bg-[#0064FF]/5"
                >
                  <span className="text-3xl">📁</span>
                  <p className="text-base font-bold text-gray-800">동영상 파일을 드래그하거나 클릭하여 선택하세요</p>
                  <p className="text-xs text-gray-400">지원 형식: MP4, MOV, WEBM, MKV · 최대 5GB</p>
                </div>
              )}

              <Link to="/manual"
                className="text-base font-bold text-gray-500 transition-colors hover:text-[#0064FF]">
                1분 사용법 보기 →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 실제 앱 데모 GIF (파일 업로드되면 자동 노출, 없으면 숨김) */}
      <div className="px-5 pt-12 md:px-8 md:pt-16">
        <img
          src="/app-demo.gif"
          alt="크로닛 사용 화면 — 링크 넣으면 숏폼 완성"
          loading="lazy"
          onError={e => { e.currentTarget.style.display = 'none' }}
          className="mx-auto w-full max-w-2xl rounded-2xl border border-gray-200 shadow-lg"
        />
      </div>

      {/* ── 데모 캐러셀 ── */}
      <DemoCarousel />

      {/* ── 기능 소개 (서비스 구성) ── */}
      <section id="features" style={{ scrollMarginTop: '200px' }} className="px-5 py-16 md:px-8 md:py-24">
        <Reveal className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-black text-gray-900 md:text-4xl">영상 한 번 넣으면, 이걸 다 해드려요</h2>
            <p className="mt-3 text-lg text-gray-500 md:text-xl">제작에 필요한 과정을 크로닛이 자동으로 처리해요</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { Icon: Search, title: '상품 자동 분석', desc: '영상 속 상품을 인식해 관련 클립을 찾아줘요.' },
              { Icon: Captions, title: 'AI 자동 자막', desc: '음성을 인식해 자막을 자동으로 만들어 넣어드려요.' },
              { Icon: Mic, title: 'AI 음성', desc: '자연스러운 한국어 나레이션을 자동으로 생성해요.' },
              { Icon: Scissors, title: '자동 컷편집', desc: '숏폼 길이에 맞춰 영상을 자동으로 잘라 구성해요.' },
              { Icon: Palette, title: '스타일·썸네일 프리셋', desc: '자막·썸네일 스타일을 골라 일관된 톤으로 완성해요.' },
              { Icon: Zap, title: '편집 없이 빠르게', desc: '영상만 넣으면 몇 분 뒤 완성 — 매일 여러 개도 거뜬해요.' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#0064FF]/40 hover:shadow-[0_12px_32px_rgba(0,100,255,0.10)]">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0064FF]/10 text-[#0064FF]"><Icon size={22} strokeWidth={2.2} /></div>
                <h3 className="mb-1.5 text-lg font-black text-gray-900">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="faq" className="px-5 py-16 md:px-8 md:py-20">
        <Reveal className="mx-auto max-w-2xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-black text-gray-900 md:text-4xl">많이 물어보시는 것들</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: '만든 영상은 어디에 올리나요?', a: '완성본은 파일로 저장돼요. 인스타그램 릴스·틱톡·유튜브 쇼츠 등 원하는 채널에 자유롭게 업로드하시면 됩니다.' },
              { q: '영상 스타일이나 음성을 고를 수 있나요?', a: '네. 감성 리뷰·다이나믹 언박싱 같은 스타일과 여러 AI 음성 중에서 골라, 채널 톤에 맞게 만들 수 있어요.' },
              { q: '영상은 얼마나 빨리 만들어지나요?', a: '보통 영상 하나에 3~5분. 만드는 동안 창을 닫거나 다른 일을 하셔도 계속 생성되고, 완성되면 생성 내역에서 받을 수 있어요.' },
              { q: '환불 규정은 어떻게 되나요?', a: '디지털 콘텐츠 특성상 영상을 1회라도 생성하면 환불이 어렵습니다. 이용 이력이 전혀 없는 경우 결제일로부터 7일 이내 전액 환불이 가능합니다.' },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] md:p-7">
                <div className="mb-3 flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0064FF] text-sm font-black text-white">Q</span>
                  <p className="pt-0.5 text-lg font-black text-gray-900">{q}</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-black text-gray-500">A</span>
                  <p className="pt-0.5 text-base leading-relaxed text-gray-600">{a}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── 요금제 ── */}
      <section id="pricing" style={{ scrollMarginTop: '-220px' }} className="px-5 py-16 md:px-8 md:py-24">
        <Reveal className="mx-auto max-w-6xl">
          <div className="mb-4 text-center">
            <h2 className="text-3xl font-black text-gray-900 md:text-5xl">필요한 만큼만 고르세요</h2>
            <p className="mt-3 text-lg text-gray-500 md:text-xl">부담 없이 시작하고, 언제든 바꿀 수 있어요</p>
          </div>


          <CouponBar codeFromUrl={codeFromUrl} onApply={(code) => { setCodeFromUrl(code); sessionStorage.setItem('chronit_code', code) }} />

          {/* 6개월 안심 패키지 */}
          <div onClick={() => openPayment('pkg6')}
            className="mb-6 flex cursor-pointer flex-col items-start justify-between gap-5 rounded-2xl border border-[#FFB800]/50 bg-gradient-to-br from-[#FFFBEB] to-white p-7 transition-all hover:border-[#FFB800] hover:shadow-[0_14px_40px_-16px_rgba(255,184,0,0.45)] sm:flex-row sm:items-center md:p-8">
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="rounded-full bg-[#FFB800] px-2.5 py-0.5 text-[11px] font-bold text-white">안심 패키지</span>
                <h4 className="text-xl font-black text-gray-900">프로 6개월</h4>
              </div>
              <p className="text-sm text-gray-600 md:text-base">프로 요금제를 <strong className="text-gray-900">6개월 동안</strong> · 매월 영상 30개 · 가장 알뜰한 장기 플랜</p>
              <p className="mt-2 flex items-center gap-1 text-xs text-[#9a6b00]"><Gift size={12} /> 첫 구매 시 1개월 추가</p>
            </div>
            <div className="flex w-full shrink-0 flex-col items-start gap-3 sm:w-auto sm:items-end">
              <div className="text-left sm:text-right">
                <span className="text-sm font-bold text-gray-400 line-through">{wonFmt(planPrices.pkg6.list)}원</span>
                <div className="flex items-baseline gap-1 sm:justify-end">
                  <span className="text-4xl font-black text-[#b07d00]">₩{wonFmt(planPrices.pkg6.sale)}</span>
                </div>
                <div className="mt-0.5 text-sm font-bold text-[#b07d00]/80">월 {wonFmt(Math.round(planPrices.pkg6.sale / 6))}원 수준</div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); openPayment('pkg6') }}
                className="w-full rounded-xl bg-[#FFB800] px-6 py-3 text-sm font-bold text-white transition-all hover:brightness-95 active:scale-[0.98] sm:w-auto">
                6개월 패키지 시작
              </button>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {/* Free */}
            <div onClick={handleStart}
              className="group flex cursor-pointer flex-col rounded-2xl border border-gray-200 bg-white p-7 transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.14)]">
              <h4 className="text-xl font-black text-gray-900">Free</h4>
              <p className="mt-1 text-sm text-gray-500">부담 없이 시작</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-[2.6rem] font-black leading-none text-gray-900">₩0</span>
                <span className="text-base font-bold text-gray-400">/ 월</span>
              </div>
              <p className="mt-2 text-sm text-gray-400">지금 바로 무료로</p>
              <button onClick={(e) => { e.stopPropagation(); handleStart() }}
                className="mt-6 w-full rounded-xl border border-gray-200 bg-white py-3.5 text-base font-bold text-gray-900 transition-all hover:border-[#0064FF] hover:text-[#0064FF] active:scale-[0.98]">
                무료로 시작
              </button>
              <ul className="mt-6 space-y-3 border-t border-gray-100 pt-6 text-sm text-gray-700">
                <li className="flex items-start gap-2.5"><Check size={18} strokeWidth={2.5} className="mt-0.5 shrink-0 text-gray-400" /><span>월 <strong>2개</strong> 영상 제작</span></li>
                <li className="flex items-start gap-2.5"><Check size={18} strokeWidth={2.5} className="mt-0.5 shrink-0 text-gray-400" /><span><strong>고급 AI 음성</strong> 사용</span></li>
                <li className="flex items-start gap-2.5"><Check size={18} strokeWidth={2.5} className="mt-0.5 shrink-0 text-gray-400" /><span>모든 기본 기능</span></li>
              </ul>
            </div>

            {/* 스타터 · 프로 · 마스터 */}
            {[
              { key: 'starter', name: '스타터', sub: '처음 시작하는 분께', popular: false,
                feats: [<span key="0">월 <strong>15개</strong> 영상 제작</span>, <span key="1">모든 자동화 기능 사용</span>, <span key="2">자동 자막·제목 추천</span>] },
              { key: 'pro', name: '프로', sub: '매일 꾸준히 올리는 분께', popular: true,
                feats: [<span key="0">월 <strong>30개</strong> 영상 제작</span>, <span key="1">스타터의 모든 기능 포함</span>, <span key="2">스타터보다 2배 많은 분량</span>] },
              { key: 'master', name: '마스터', sub: '여러 채널을 운영하는 분께', popular: false,
                feats: [<span key="0">월 <strong>50개</strong> 영상 제작</span>, <span key="1">프로의 모든 기능 포함</span>, <span key="2">새 기능 우선 체험</span>] },
            ].map((p) => {
              const price = planPrices[p.key].sale
              return (
                <div key={p.key} onClick={() => openPayment(p.key)}
                  className={`group relative flex cursor-pointer flex-col rounded-2xl border bg-white p-7 transition-all hover:-translate-y-0.5 ${p.popular ? 'border-[#0064FF] shadow-[0_16px_44px_-18px_rgba(0,100,255,0.32)]' : 'border-gray-200 hover:border-[#0064FF]/40 hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.14)]'}`}>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xl font-black text-gray-900">{p.name}</h4>
                    {p.popular && <span className="rounded-full bg-[#0064FF] px-2 py-0.5 text-[11px] font-bold text-white">인기 있는</span>}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{p.sub}</p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-[2.6rem] font-black leading-none text-gray-900">₩{wonFmt(price)}</span>
                    <span className="text-base font-bold text-gray-400">/ 월</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">하루 약 {wonFmt(Math.round(price / 30 / 10) * 10)}원</p>
                  <button onClick={(e) => { e.stopPropagation(); openPayment(p.key) }}
                    className={`mt-6 w-full rounded-xl py-3.5 text-base font-bold transition-all active:scale-[0.98] ${p.popular ? 'bg-[#0064FF] text-white hover:bg-[#0052D6]' : 'border border-gray-200 bg-white text-gray-900 hover:border-[#0064FF] hover:text-[#0064FF]'}`}>
                    {p.name} 시작하기
                  </button>
                  <p className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-400"><Gift size={12} /> 첫 구매 시 1개월 추가</p>
                  <ul className="mt-6 space-y-3 border-t border-gray-100 pt-6 text-sm text-gray-700">
                    {p.feats.map((ft, i) => (
                      <li key={i} className="flex items-start gap-2.5"><Check size={18} strokeWidth={2.5} className="mt-0.5 shrink-0 text-[#0064FF]" />{ft}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>


          <div className="mt-12 text-center">
            <button onClick={handleStart}
              className="w-full rounded-2xl bg-[#0064FF] px-8 py-5 text-xl font-black text-white shadow-lg shadow-[#0064FF]/25 transition-all hover:bg-[#0052D6] active:scale-95 sm:w-auto md:px-20 md:py-6">
              무료로 영상 만들기
            </button>
          </div>
        </Reveal>
      </section>

      {/* 이벤트 게시판 */}
      {events.length > 0 && (
        <section id="events" className="px-5 py-12 md:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-2xl font-black tracking-tight text-gray-900">이벤트</h2>
            <div className="mb-1 flex border-b border-gray-200">
              {[
                { key: 'active', label: '진행중인 이벤트' },
                { key: 'ended',  label: '종료된 이벤트' },
                { key: 'winner', label: '당첨자 발표' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setEventTab(tab.key)}
                  className={`px-5 py-3 text-sm font-bold transition-colors border-b-2 -mb-px ${eventTab === tab.key ? 'border-[#0064FF] text-[#0064FF]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                  {tab.label}
                  <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{events.filter(e => e.status === tab.key).length}</span>
                </button>
              ))}
            </div>
            <div className="divide-y divide-gray-100">
              {events.filter(e => e.status === eventTab).length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-400">해당 이벤트가 없습니다</p>
              ) : (
                events.filter(e => e.status === eventTab).map(ev => (
                  <Link key={ev.id} to={`/events/${ev.id}`}
                    className="flex w-full items-center gap-4 px-2 py-4 text-left transition-colors hover:bg-gray-50">
                    <EventBadge status={ev.status} label={ev.label} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">{ev.title}</span>
                    <span className="shrink-0 text-xs text-gray-400">
                      {new Date(ev.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <Footer user={user} />

      <style>{`
        .event-content img { max-width:100%; border-radius:8px; margin:0.5em 0; }
        .event-content p { margin:0.6em 0; line-height:1.8; }
        .event-content h1 { font-size:1.6em; font-weight:800; margin:0.8em 0 0.4em; color:#111827; }
        .event-content h2 { font-size:1.3em; font-weight:700; margin:0.8em 0 0.4em; color:#111827; }
        .event-content h3 { font-size:1.1em; font-weight:700; margin:0.6em 0 0.3em; color:#111827; }
        .event-content ul, .event-content ol { padding-left:1.5em; margin:0.5em 0; }
        .event-content li { margin:0.3em 0; }
        .event-content blockquote { border-left:3px solid #0064FF; padding-left:1em; color:#6b7280; margin:0.6em 0; }
        .event-content a { color:#0064FF; text-decoration:underline; }
        .event-content strong { color:#111827; font-weight:700; }
        @keyframes badge-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .badge-pulse { animation: badge-pulse 2s ease-in-out infinite; }
        html { scroll-behavior: smooth; }
        body { -webkit-font-smoothing: antialiased; }
      `}</style>

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} referralCode={refFromUrl} />
      <TermsModal open={showTermsModal} onAgree={handleTermsAgree} onClose={() => setShowTermsModal(false)} />
      <NicknameModal open={nickOpen} required={nickRequired} onClose={handleNicknameClose} onDone={handleNicknameDone} />
      <SignupSurveyModal open={sourceOpen} onDone={handleSourceDone} />
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

/* ── 데모 영상 캐러셀 ── */
// 정적 호스팅(Vercel public/)에서 서빙 — Supabase egress 안 씀
const DEMO_VIDEOS = ['/demo1.mp4', '/demo2.mp4', '/demo3.mp4', '/demo4.mp4', '/demo5.mp4']
const DemoCarousel = () => {
  const videos = DEMO_VIDEOS
  const [active, setActive] = useState(0)
  const dragStartX = useRef(0)
  const videoRefs = useRef([])
  const sectionRef = useRef(null)
  const [inView, setInView] = useState(false)

  // 캐러셀이 화면 근처에 올 때만 영상 로드 (전송량 절감, 시각 변화 없음)
  useEffect(() => {
    const el = sectionRef.current
    if (!el || inView) return
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) { setInView(true); io.disconnect() }
    }, { rootMargin: '600px' })
    io.observe(el)
    return () => io.disconnect()
  }, [inView, videos])

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
  const onMouseUp = (e) => { const dx = e.clientX - dragStartX.current; if (Math.abs(dx) > 40) dx < 0 ? next() : prev() }
  const onTouchStart = (e) => { dragStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => { const dx = e.changedTouches[0].clientX - dragStartX.current; if (Math.abs(dx) > 40) dx < 0 ? next() : prev() }

  if (!n) return null

  return (
    <section ref={sectionRef} className="px-5 pt-16 pb-10 md:pt-20 md:pb-16">
      <div className="mb-10 text-center md:mb-14">
        <h2 className="text-2xl font-black tracking-tight text-gray-900 md:text-4xl">이렇게 만들어져요</h2>
        <p className="mt-3 text-lg text-gray-500">실제로 크로닛이 만든 영상이에요</p>
      </div>
      <div className="relative flex items-center justify-center select-none" style={{ height: 'min(72vw, 560px)' }}
        onMouseDown={onMouseDown} onMouseUp={onMouseUp} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
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
            <div key={vidIdx} onClick={() => { if (!isCenter) setActive(vidIdx) }}
              style={{ position: 'absolute', transform: `translateX(${translateX}px) scale(${scale})`, opacity: visible ? opacity : 0, zIndex,
                transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease', willChange: 'transform, opacity',
                cursor: isCenter ? 'default' : 'pointer', pointerEvents: visible ? 'auto' : 'none' }}>
              <div style={{ width: 'min(52vw, 280px)', aspectRatio: '9/16', borderRadius: '1.5rem', overflow: 'hidden',
                boxShadow: isCenter ? '0 30px 60px -10px rgba(0,0,0,0.25), 0 4px 6px rgba(0,0,0,0.08)' : '0 10px 30px -5px rgba(0,0,0,0.15)',
                transition: 'box-shadow 0.5s ease', border: '1px solid rgba(0,0,0,0.06)' }}>
                <video ref={el => { videoRefs.current[vidIdx] = el }} src={inView ? src : undefined} muted loop playsInline autoPlay={isCenter} preload="metadata"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#f3f4f6' }} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-8 flex items-center justify-center gap-6">
        <button onClick={prev} className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-300 bg-white text-gray-700 shadow transition-all hover:border-[#0064FF] hover:text-[#0064FF] active:scale-95">{"<"}</button>
        <div className="flex gap-2">
          {videos.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === active ? '24px' : '6px', background: i === active ? '#0064FF' : '#d1d5db' }} />
          ))}
        </div>
        <button onClick={next} className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-300 bg-white text-gray-700 shadow transition-all hover:border-[#0064FF] hover:text-[#0064FF] active:scale-95">{">"}</button>
      </div>
    </section>
  )
}

export default Home

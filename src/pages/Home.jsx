import React, { useState, useEffect, useRef } from 'react'
import {
  Clock, CheckCircle2, MessageCircle, ArrowRight, Users,
  Film, TrendingDown, LogOut, Gift, Menu, X, Play, User,
  Search, Captions, Mic, Scissors, Palette, Zap, Sparkles, Check, Flame, Filter,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import AnimatedCounter from '../components/AnimatedCounter'
import PaymentModal from '../components/PaymentModal'
import FindsPricing from '../components/FindsPricing'
import AuthModal from '../components/AuthModal'
import TermsModal from '../components/TermsModal'
import Footer from '../components/Footer'
import SiteNav from '../components/SiteNav'
import SourcingBeforeAfter from '../components/SourcingBeforeAfter'
import Reveal from '../components/Reveal'
import RevealStagger from '../components/RevealStagger'
import NicknameModal from '../components/NicknameModal'
import TimeLossCalculator from '../components/TimeLossCalculator'
import { supabase } from '../lib/supabase'
import ProblemSolution from '../components/ProblemSolution'
import HomeAnalysisShowcase from '../components/HomeAnalysisShowcase'

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
        <span className="text-base font-bold text-white/70">코드 <strong className="text-white">{codeFromUrl}</strong> 적용됨</span>
        <button onClick={() => { onApply(null); sessionStorage.removeItem('chronit_code') }} className="ml-auto text-white/35 hover:text-white/70"><X size={14} /></button>
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
          className="flex-1 rounded-2xl border-2 border-white/15 bg-white/[0.04] px-5 py-4 text-base font-bold text-white placeholder-gray-400 outline-none transition-all focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/15"
        />
        <button onClick={handleApply}
          className="rounded-2xl bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] px-6 py-4 text-base font-bold text-white transition-all hover:brightness-95 active:scale-[0.98]">
          적용
        </button>
      </div>
      {status === 'ok' && <p className="text-sm font-bold text-[#0064FF]"><Check size={13} className="mr-0.5 inline align-[-2px]" /> 코드가 적용됐어요 — 결제할 때 할인이 반영됩니다</p>}
      {status === 'fail' && <p className="text-sm font-bold text-red-500">코드를 다시 확인해 주세요</p>}
    </div>
  )
}

const statusCfg = {
  active:  { label: '진행중',      cls: 'bg-[#0064FF]/12 text-[#0064FF] border-[#0064FF]/30', dot: true },
  ended:   { label: '종료됨',      cls: 'bg-white/[0.06] text-white/45 border-white/10', dot: false },
  winner:  { label: '당첨자 발표', cls: 'bg-[#FFB800]/15 text-[#b07d00] border-[#FFB800]/40', dot: false },
}
const EventBadge = ({ status, label }) => {
  const cfg = statusCfg[status] || statusCfg.active
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.cls}`}>
      {cfg.dot && <span className="badge-pulse h-1.5 w-1.5 rounded-full bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)]" />}
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
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-[#FF5A5F]">선착순 100명 무료</span>
        <span className="text-white/45">현재 {spots}명 신청</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
        <div className="h-full rounded-full transition-all" style={{ width: pct + '%', background: '#FF5A5F' }} />
      </div>
    </div>
  )
}
const wonFmt = (n) => Number(n || 0).toLocaleString('ko-KR')
const pctOff = (list, sale) => (list > 0 ? Math.round((list - sale) / list * 100) : 0)

const HERO_PERSONAS = [
  { tab: '공구·제휴', title: '판매로 이어지는 소재를 복제하세요', benefits: ['지금 터진 쇼핑 소재 실시간', '왜 터졌는지 훅·셀링포인트 분석', '확산 전 선점 (패스트벤치)', '내 니치 소재만 필터'] },
  { tab: '브랜드 SNS', title: '매일 올릴 콘텐츠, 고갈 없이', benefits: ['소재 아이디어 무한 공급', '경쟁 계정 레퍼런스 벤치마크', '니치 트렌드 모니터링', '콘텐츠 기획 시간 단축'] },
  { tab: '릴스·틱톡', title: '남들보다 먼저, 2차 창작으로', benefits: ['유사 소재 레퍼런스 확보', '터짐 속도로 타이밍 판단', '2차 창작 편집 가이드', '매일 새 소스 갱신'] },
  { tab: '부업·입문', title: '뭐 올릴지, 여기서 끝', benefits: ['막막함 즉시 해결', '감이 아니라 데이터로', '무료 월 5회로 체험', '쉬운 3단계'] },
]

const HERO_PH = [
  '경쟁 계정 @handle 을 붙여보세요',
  '지금 터지는 주방·살림템 소재 찾기',
  '이 릴스는 왜 터졌을까 — 링크 붙여넣기',
  '내 니치 트렌드 실시간으로 보기',
]

const Home = () => {
  const [scrolled, setScrolled] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [buyOpen, setBuyOpen] = useState(false)
  const [firstEligible, setFirstEligible] = useState(true)
  const [priceTab, setPriceTab] = useState('monthly')
  const [buyTab, setBuyTab] = useState('sub')
  const [buyPeriod, setBuyPeriod] = useState('monthly')
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
  const [stats, setStats] = useState(null)
  const [badgeIdx, setBadgeIdx] = useState(0)
  const [heroPersona, setHeroPersona] = useState(2)
  const [heroQuery, setHeroQuery] = useState('')
  const [phIdx, setPhIdx] = useState(0)
  useEffect(() => { supabase.rpc('public_stats_rpc').then(({ data }) => { if (data) setStats(data) }) }, [])
  const PAINS = [
    { label: '프리랜서 고용', cost: '편당 1.5만원' },
    { label: '시트 1,000개', cost: '매일 직접 찾기' },
    { label: '인스타 서치', cost: '하루 1~2시간' },
  ]
  useEffect(() => {
    if (PAINS.length < 2) return
    const t = setInterval(() => setBadgeIdx((i) => (i + 1) % PAINS.length), 2200)
    return () => clearInterval(t)
  }, [PAINS.length])
  const curPain = PAINS[badgeIdx % PAINS.length]
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
    // sign_up 전환은 App 전역 리스너(trackSignupIfNew)에서 신규 계정 1회만 발생
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
      window.location.href = '/trend'
    }
  }

  // 시작하기/무료로 시작하기 — 로그인 시 트렌드로, 아니면 로그인
  const handleStart = () => {
    if (user) { window.location.href = '/trend'; return }
    pendingStartRef.current = true
    setShowAuthModal(true)
  }

  const handleFinds = () => {
    if (user) { window.location.href = '/trend'; return }
    setShowAuthModal(true)
  }
  const heroSubmit = () => { const q = heroQuery.trim(); if (user) { window.location.href = q ? '/research?q=' + encodeURIComponent(q) : '/trend' } else { setShowAuthModal(true) } }
  const handleBuy = (tab = 'sub', period = 'monthly') => {
    setBuyTab(tab); setBuyPeriod(period)
    if (user && !user.is_anonymous) { setBuyOpen(true); return }
    setShowAuthModal(true)
  }
  useEffect(() => { supabase.rpc('finds_first_sub_eligible').then(({ data }) => setFirstEligible(data !== false)).catch(() => {}) }, [user])
  const isExistingRender = !!(user && user.created_at && new Date(user.created_at) < new Date('2026-08-12T00:00:00Z'))

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
      .from('profiles').select('nickname').eq('id', session.user.id).maybeSingle()
    // 닉네임 자동 생성(이메일 아이디 기반, 없으면 OAuth 이름) — 입력 모달로 막지 않음. 마이페이지에서 변경 가능.
    if (!prof?.nickname) {
      const em = session.user?.email || ''
      const base = em ? em.split('@')[0] : (session.user?.user_metadata?.name || session.user?.user_metadata?.nickname || '')
      try { await supabase.rpc('auto_nickname_rpc', { p_base: base }) } catch {}
    }
    // 유입경로 설문은 첫 영상 완료 후 앱에서 물어봄 — 가입을 막지 않음.
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
      const u = (session?.user && !session.user.is_anonymous) ? session.user : null
      setUser(u)
      // (제거) 로그인 시 /generate 강제 이동 — 결제/광고 랜딩 접근을 막아 비활성화함.
      //  로그인 상태여도 홈에 머무를 수 있게 함. 앱 진입은 상단 CTA/네비로.
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser((session?.user && !session.user.is_anonymous) ? session.user : null)
      if (event === 'SIGNED_IN' && session && !session.user?.is_anonymous) {
        // 온보딩 미완료(신규)면 회원가입 페이지로, 완료면 정상 진행
        // (시간 휴리스틱 대신 onboarded 기준 — 방금 가입한 계정이 계속 /register로 튕기던 버그 수정)
        supabase.from('profiles').select('onboarded').eq('id', session.user.id).maybeSingle()
          .then(({ data: prof }) => {
            if (prof && prof.onboarded === false && !session?.user?.is_anonymous) {
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
    <div className="min-h-screen overflow-x-hidden bg-[#0A0B0F] font-sans break-keep text-white/90 selection:bg-[#0064FF]/30" style={{ paddingTop: bannerH ? `${bannerH}px` : undefined }}>
      {/* 추천인 코드 배너 */}
      {refFromUrl && (
        <div className="fixed top-0 right-0 left-0 z-[61] flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] px-4 py-3 text-sm font-bold text-white shadow-md">
          <Gift size={15} />
          <span>추천 코드 <strong>{refFromUrl}</strong> 적용됨!</span>
          <button onClick={() => { setRefFromUrl(null); sessionStorage.removeItem('chronit_ref') }} className="ml-2 opacity-80 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* 할인 코드 배너 */}
      {codeFromUrl && (
        <div className={`fixed right-0 left-0 z-[60] flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap bg-[#FFB800] px-4 py-3 text-sm font-bold text-[#5b4200] shadow-md ${refFromUrl ? 'top-11' : 'top-0'}`}>
          <span>코드 <strong>{codeFromUrl}</strong> 감지됨 — 가입하면 자동으로 적용됩니다</span>
          <button onClick={() => { setCodeFromUrl(null); sessionStorage.removeItem('chronit_code') }} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* 진행중인 이벤트 배너 */}
      {eventBannerOn && (
        <div
          className="fixed right-0 left-0 z-[59] flex items-center justify-center overflow-hidden whitespace-nowrap bg-[linear-gradient(90deg,#0A1F3D_0%,#123C7A_50%,#0A1F3D_100%)] px-4 py-3 text-sm text-white cursor-pointer"
          style={{ top: `${((refFromUrl ? 1 : 0) + (codeFromUrl ? 1 : 0)) * 44}px` }}
          onClick={() => { window.location.href = '/events' }}
        >
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2A7BFF] px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white/90 animate-pulse" />EVENT
            </span>
            <span className="font-medium text-white/85">진행 중인 이벤트 <strong className="font-bold text-white">{events.filter(e => e.status === 'active').length}건</strong></span>
            <span className="inline-flex items-center gap-0.5 font-bold text-[#7FB2FF]">확인하기 <ArrowRight size={13} /></span>
          </div>
          <button onClick={e => { e.stopPropagation(); sessionStorage.setItem('chronit_event_banner_closed', '1'); window.location.reload() }} className="absolute right-3 text-white/50 transition-colors hover:text-white/90" aria-label="이벤트 배너 닫기"><X size={15} /></button>
        </div>
      )}

      {/* Header */}
      <header style={{ top: `${bannerH}px` }} className={`fixed right-0 left-0 z-50 border-b transition-[background-color,border-color,padding] duration-300 ${scrolled ? 'border-white/10 bg-[#0A0B0F]/85 py-3 backdrop-blur-md' : 'border-transparent bg-transparent py-4 md:py-5'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <a href="/" className="flex min-w-0 items-center gap-2 md:gap-3">
            <img src="/cn-white.svg" alt="Chronit" className="h-9 w-9 shrink-0 md:h-10 md:w-10" />
            <h1 className={`hidden md:block text-2xl font-bold tracking-tight md:text-3xl ${scrolled ? 'text-white' : 'text-white'}`}>Chronit</h1>
          </a>
          <SiteNav light={!scrolled} />
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <>
                  {nickname ? (
                    <Link to="/me" className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] active:scale-[0.98]">
                      <User size={16} /> <span className="max-w-[110px] truncate">{nickname}</span>
                    </Link>
                  ) : (
                    <button onClick={() => setNickOpen(true)} className="flex items-center gap-1.5 rounded-full border-2 border-[#0064FF] px-4 py-1.5 text-sm font-bold text-[#0064FF] transition-all hover:bg-[#0064FF]/10 active:scale-[0.98]">
                      <User size={16} /> 닉네임 설정
                    </button>
                  )}
                  <button onClick={() => supabase.auth.signOut()} title="로그아웃"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/45 transition-all hover:border-white/30 hover:text-white/85">
                    <LogOut size={15} />
                  </button>
                </>
              ) : (
                <button onClick={() => setShowAuthModal(true)}
                  className={`rounded-full border-2 px-5 py-2 text-base font-bold transition-all ${scrolled ? 'border-white/15 text-white/70 hover:border-white/30' : 'border-white/30 text-white hover:border-white/60'}`}>
                  로그인
                </button>
              )}
              <button onClick={handleFinds}
                className="rounded-full bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] px-7 py-2.5 text-base font-bold whitespace-nowrap text-white shadow-md shadow-black/5 transition-all hover:brightness-95 active:scale-[0.98]">
                {user ? '시작하기 →' : '무료 체험'}
              </button>
            </div>
            {/* 모바일 상단 시작하기 CTA (햄버거에 가려지지 않게 상시 노출) */}
            <button onClick={handleFinds}
              className="rounded-full bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] px-4 py-2 text-sm font-bold whitespace-nowrap text-white shadow-md shadow-black/5 transition-all active:scale-[0.98] md:hidden">
              {user ? '리서치' : '무료 체험'}
            </button>
            <button onClick={() => setMenuOpen((v) => !v)} aria-label="메뉴"
              className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all md:hidden ${scrolled ? 'border-white/15 text-white/70 hover:border-white/30' : 'border-white/30 text-white hover:border-white/60'}`}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 메뉴 */}
      <div className={`fixed top-0 left-0 right-0 z-40 transform transition-all duration-300 ease-in-out md:hidden ${menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`} style={{ paddingTop: `${bannerH + 76}px` }}>
        <div className="border-b border-white/10 bg-[#0A0B0F] px-6 py-6 shadow-lg overflow-y-auto overscroll-contain" style={{ maxHeight: `calc(100dvh - ${bannerH + 76}px)` }}>
          <nav className="flex flex-col gap-1 text-lg font-bold text-white/70">
            <Link to="/research" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-4 font-semibold text-[#0064FF] transition-colors hover:bg-[#0064FF]/5">리서치 — 터지는 소재 찾기</Link>
            <Link to="/trend" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-4 font-semibold text-[#0064FF] transition-colors hover:bg-[#0064FF]/5">실시간 트렌드</Link>
            <Link to="/manual" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-4 transition-colors hover:bg-white/[0.03] hover:text-[#0064FF]">사용 방법</Link>
            <Link to="/me" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-4 transition-colors hover:bg-white/[0.03] hover:text-[#0064FF]">마이페이지</Link>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-4 transition-colors hover:bg-white/[0.03] hover:text-[#0064FF]">가격 안내</a>
          </nav>
          <div className="mt-4 border-t border-white/10 pt-4 flex flex-col gap-2">
            {user ? (
              <>
                {nickname ? (
                  <Link to="/me" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3.5 text-lg font-bold text-white transition-colors hover:bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)]">
                    <User size={18} /> {nickname} <span className="ml-auto text-sm font-medium text-white/70">마이페이지 →</span>
                  </Link>
                ) : (
                  <button onClick={() => { setNickOpen(true); setMenuOpen(false) }} className="flex items-center gap-2 rounded-xl border-2 border-[#0064FF] px-4 py-3.5 text-lg font-bold text-[#0064FF] transition-colors hover:bg-[#0064FF]/10">
                    <User size={18} /> 닉네임 설정하기
                  </button>
                )}
                <p className="px-4 pb-1 text-xs text-white/35">{user.email}</p>
                <button onClick={() => { supabase.auth.signOut(); setMenuOpen(false) }}
                  className="flex w-full items-center gap-2 rounded-xl px-4 py-3.5 text-lg font-bold text-white/60 transition-colors hover:bg-white/[0.03]">
                  <LogOut size={18} /> 로그아웃
                </button>
              </>
            ) : (
              <button onClick={() => { setShowAuthModal(true); setMenuOpen(false) }}
                className="w-full rounded-xl border-2 border-white/15 px-4 py-3.5 text-lg font-bold text-white/70 transition-colors hover:bg-white/[0.03]">
                로그인
              </button>
            )}
            <button onClick={() => { setMenuOpen(false); handleFinds() }}
              className="w-full rounded-xl bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] px-4 py-4 text-lg font-bold text-white shadow-md transition-all hover:brightness-95 active:scale-[0.98]">
              {user ? '시작하기 →' : '무료 체험'}
            </button>
            {isExistingRender && (
              <Link to="/generate" onClick={() => setMenuOpen(false)} className="w-full rounded-xl border border-amber-300 px-4 py-3 text-center text-sm font-bold text-amber-700 hover:bg-amber-50">편집 작업실 (9/14 종료 예정)</Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#0A0B0F] px-5 pt-32 pb-24 md:px-8 md:pt-40 md:pb-32">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[2%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[#0064FF]/[0.08] blur-[170px]" />
          <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:56px_56px]" />
        </div>

        <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
          {user && (
            <div className="mb-2 w-full max-w-xl rounded-2xl border border-white/12 bg-white/[0.06] px-6 py-6 text-center shadow-[0_10px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <p className="text-xl font-bold text-white">돌아오셨어요{nickname ? `, ${nickname}님` : ''}</p>
              <p className="mt-1 mb-5 text-sm font-bold text-white/50">오늘 뜨는 소스, 보러 갈까요?</p>
              {isExistingRender ? (
                <div className="mx-auto flex w-full max-w-md gap-2">
                  <button onClick={handleFinds}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] px-4 py-4 text-base font-bold text-white shadow-lg shadow-[#0064FF]/25 transition-all hover:brightness-110 active:scale-[0.98]">
                    시작하기 <ArrowRight size={18} />
                  </button>
                  <Link to="/generate"
                    className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-amber-300/40 bg-amber-400/10 px-4 py-3 text-base font-bold leading-tight text-amber-300 transition hover:bg-amber-400/20 active:scale-[0.98]">
                    편집 작업실 <span className="mt-0.5 text-[11px] font-bold text-amber-400/70">9/14 종료 예정</span>
                  </Link>
                </div>
              ) : (
                <button onClick={handleFinds}
                  className="mx-auto flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] px-8 py-4 text-lg font-bold text-white shadow-lg shadow-[#0064FF]/25 transition-all hover:brightness-110 active:scale-[0.98]">
                  시작하기 <ArrowRight size={20} />
                </button>
              )}
            </div>
          )}
          {!user && (<>
            <p className="hero-shimmer mb-6 text-[11px] font-semibold uppercase tracking-[0.32em]">Research · Analyze · Remix</p>
            <h1 className="mb-6 text-[2.4rem] font-semibold leading-[1.16] tracking-tight text-white break-keep md:text-[3.7rem]">
              터지는 쇼핑 릴스엔<br /><span className="text-[#A9C0FF]">이유</span>가 있습니다
            </h1>
            <p className="mx-auto mb-10 max-w-md text-[15px] font-normal leading-relaxed text-white/45 break-keep md:text-base">
              릴스·틱톡으로 파는 크리에이터를 위한 소재 리서치 AI.<br />터진 영상을 찾아 분석하고, 내 상품 영상으로 복제하세요.
            </p>
            <div className="flex w-full max-w-sm flex-col items-center gap-4">
              <button onClick={handleFinds}
                className="w-full rounded-full bg-white px-8 py-4 text-base font-semibold text-[#0A0B0F] transition-all hover:bg-white/90 active:scale-[0.99]">
                무료로 시작하기
              </button>
              <p className="text-[13px] font-normal text-white/35">카드 등록 없이 · 월 5회 무료</p>
              {spots != null && spots > 0 && (
                <p className="mt-4 flex items-center gap-1.5 text-[13px] font-normal text-white/40">
                  <Users size={13} className="text-white/40" /> 이미 <span className="font-semibold text-white/70">{spots.toLocaleString('ko-KR')}</span>명의 크리에이터가 함께합니다
                </p>
              )}
            </div>
          </>)}
        </div>
      </section>

      {/* ── 문제 → 해결(핀 고정 가로 전환) ── */}
      {!user && <ProblemSolution />}

      {/* ── 제품 쇼케이스: 실제 분석 화면 ── */}
      {!user && <HomeAnalysisShowcase />}

      {/* ── 실데이터 통계 스트립 ── */}
      {stats?.clips ? (
        <section id="features" style={{ scrollMarginTop: '120px' }} className="px-5 pb-10 md:px-8">
          <Reveal className="mx-auto grid max-w-3xl grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.04] py-6 text-center">
            <div><div className="text-2xl font-bold text-white md:text-3xl">{Number(stats.clips).toLocaleString('ko-KR')}</div><div className="mt-1 text-xs text-white/35">발굴한 소스</div></div>
            <div><div className="text-2xl font-bold text-white md:text-3xl">{Number(stats.curators).toLocaleString('ko-KR')}</div><div className="mt-1 text-xs text-white/35">추적 중인 큐레이터</div></div>
            <div><div className="text-2xl font-bold text-white md:text-3xl">매일</div><div className="mt-1 text-xs text-white/35">새 소스 갱신</div></div>
          </Reveal>
        </section>
      ) : null}

      {/* ── 실사용 후기 ── */}
      <section className="px-5 py-16 md:px-8 md:py-20">
        <Reveal className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">이미 사용하는 크리에이터</h2>
            <p className="mt-3 text-base text-white/45 md:text-lg">실제 사용자의 기록입니다.</p>
          </div>
          <RevealStagger className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { name: '쇼핑 크리에이터 K', text: '영상 찾는 게 늘 힘들었는데, 그게 해결됐어요.' },
              { name: '쇼핑 크리에이터 C', text: '제품 사용해보니 영상 모아주는 게 너무 편해요.' },
              { name: '쇼핑 크리에이터 S', text: '아주 획기적입니다. 굿굿굿 정말 굿입니다.' },
              { name: '쇼핑 크리에이터 R', text: '와… 대박입니다. 안 쓸 수가 없어요.' },
            ].map(({ name, text }) => (
              <div key={name} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-none">
                <div className="mb-3 text-sm tracking-wide text-[#0064FF]">★★★★★</div>
                <p className="flex-1 text-[15px] leading-relaxed text-white/85">“{text}”</p>
                <div className="mt-4 text-sm font-semibold text-white/45">{name}</div>
              </div>
            ))}
          </RevealStagger>
        </Reveal>
      </section>

      <section id="faq" className="px-5 py-16 md:px-8 md:py-20">
        <Reveal className="mx-auto max-w-2xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">자주 묻는 질문</h2>
          </div>
          <RevealStagger className="space-y-4">
            {[
              { q: '어떤 플랫폼의 소스를 찾아주나요?', a: '샤오훙슈·틱톡·인스타 등에서 지금 반응이 좋은 소스를 찾아냅니다. 국내에 아직 알려지지 않은 소스도 먼저 발견할 수 있습니다.' },
              { q: '분석은 뭘 알려주나요?', a: '영상이 왜 통했는지 — 훅(첫 3초)·셀링포인트·구성 흐름을 짚어냅니다. 그대로 벤치마크해 내 영상에 적용할 수 있습니다.' },
              { q: '이용권은 어떻게 쓰이나요?', a: '분석 1회에 이용권 1개가 사용됩니다. 검색과 트렌드 열람은 무료이며, 무료 회원에게도 매월 이용권 5개를 제공합니다.' },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-none md:p-7">
                <div className="mb-3 flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0064FF] text-sm font-semibold text-white">Q</span>
                  <p className="pt-0.5 text-lg font-bold text-white">{q}</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-sm font-bold text-white/45">A</span>
                  <p className="pt-0.5 text-base leading-relaxed text-white/60">{a}</p>
                </div>
              </div>
            ))}
          </RevealStagger>
        </Reveal>
      </section>

      {/* ── 요금제 (Finds 이용권) ── */}
      <section id="pricing" style={{ scrollMarginTop: '120px' }} className="px-5 py-16 md:px-8 md:py-24">
        <Reveal className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">필요한 만큼만</h2>
            <p className="mt-3 text-base text-white/45 md:text-lg">가입 시 무료 이용권을 제공합니다. 필요에 따라 구독하세요.</p>
          </div>
          <div className="relative mx-auto mb-2 flex max-w-sm rounded-xl bg-white/[0.06] p-1 text-sm font-bold">
            <span aria-hidden className="absolute left-1 top-1 bottom-1 w-[calc(33.333%-0.25rem)] rounded-lg bg-white/15 shadow-none transition-transform duration-300 ease-out" style={{ transform: `translateX(${priceTab === 'annual' ? '100%' : priceTab === 'pack' ? '200%' : '0%'})` }} />
            <button onClick={() => setPriceTab('monthly')} className={`relative z-10 flex-1 rounded-lg py-2 transition-colors ${priceTab === 'monthly' ? 'text-[#0064FF]' : 'text-white/45'}`}>월간</button>
            <button onClick={() => setPriceTab('annual')} className={`relative z-10 flex-1 rounded-lg py-2 transition-colors ${priceTab === 'annual' ? 'text-[#0064FF]' : 'text-white/45'}`}>연간</button>
            <button onClick={() => setPriceTab('pack')} className={`relative z-10 flex-1 rounded-lg py-2 transition-colors ${priceTab === 'pack' ? 'text-[#0064FF]' : 'text-white/45'}`}>단건팩</button>
          </div>
          <p className="mb-6 text-center text-xs font-semibold text-[#0064FF]">{priceTab === 'annual' ? '연간 결제로 3개월 무료' : priceTab === 'pack' ? '필요할 때만 1회 결제' : '매월 자동 충전 · 언제든 해지'}</p>

          {priceTab === 'pack' ? (
            <>
              <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
                {[{ credits: 10, price: 4900 }, { credits: 30, price: 12900, hot: true }, { credits: 100, price: 34900 }].map((p) => (
                  <div key={p.credits} className={`flex flex-col rounded-2xl bg-white/[0.04] p-6 shadow-none ${p.hot ? 'border-2 border-[#0064FF]' : 'border border-white/10'}`}>
                    <div className="flex items-center gap-2"><h4 className="text-lg font-semibold text-white">이용권 {p.credits}개</h4>{p.hot && <span className="rounded-full bg-[#0064FF]/10 px-2 py-0.5 text-[11px] font-semibold text-[#0064FF]">인기</span>}</div>
                    <p className="mt-1 text-sm text-white/35">1회 결제 · 유효 12개월</p>
                    <div className="mt-4 flex items-baseline gap-1"><span className="text-3xl font-bold text-white">₩{p.price.toLocaleString('ko-KR')}</span></div>
                    <div className="mt-2.5 inline-flex items-center rounded-full bg-[#0064FF]/10 px-3 py-1 text-sm font-extrabold text-[#0064FF]">개당 약 {(Math.round(p.price / p.credits / 10) * 10).toLocaleString('ko-KR')}원</div>
                    <button onClick={() => handleBuy('pack', 'monthly')} className={`mt-6 w-full rounded-xl py-2.5 text-sm font-semibold transition ${p.hot ? 'bg-[#0064FF] text-white hover:brightness-95' : 'border border-white/10 text-white/70 hover:border-[#0064FF] hover:text-[#0064FF]'}`}>구매하기</button>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-center text-sm text-white/35">단건팩은 <span className="font-semibold text-white/60">소진식</span>입니다 · 유효기간 12개월, 매월 초기화 없음</p>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-none">
                  <h4 className="text-lg font-semibold text-white">무료</h4>
                  <p className="mt-1 text-sm text-white/35">먼저 써보기</p>
                  <div className="mt-4 flex items-baseline gap-1"><span className="text-3xl font-bold text-white">₩0</span></div>
                  <p className="mt-3 text-sm leading-relaxed text-white/45">매월 이용권 5개</p>
                  <button onClick={handleFinds} className="mt-6 w-full rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-white/70 transition hover:border-[#0064FF] hover:text-[#0064FF]">무료로 시작</button>
                </div>
                {[
                  { name: '스탠다드', credits: 30, price: 9900, feats: ['월 30회 소재 분석·소스 추출', '실시간 트렌드 무제한'] },
                  { name: '프로', credits: 100, price: 19900, hot: true, feats: ['월 100회 소재 분석·소스 추출', '실시간 트렌드 무제한', '패스트벤치 선점 리스트'] },
                  { name: '비즈니스', credits: 300, price: 29900, feats: ['월 300회 소재 분석·소스 추출', '패스트벤치 선점 리스트', '니치 알림', '개인화 큐레이션'] },
                ].map((p) => {
                  const annual = priceTab === 'annual'
                  return (
                    <div key={p.name} onClick={() => handleBuy('sub', annual ? 'annual' : 'monthly')} className={`flex cursor-pointer flex-col rounded-2xl bg-white/[0.04] p-6 shadow-none transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_22px_48px_rgba(20,40,90,0.18)] ${p.hot ? 'border-2 border-[#0064FF]' : 'border border-white/10'}`}>
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-semibold text-white">{p.name}</h4>
                        {p.hot && <span className="rounded-full bg-[#0064FF]/10 px-2 py-0.5 text-[11px] font-semibold text-[#0064FF]">인기</span>}
                      </div>
                      <p className="mt-1 text-sm text-white/35">월 {p.credits}회 분석·소스</p>
                      {annual ? (
                        <div className="mt-4">
                          <div className="flex items-baseline gap-1"><span className="text-3xl font-bold text-[#0064FF]">₩{(p.price * 9).toLocaleString('ko-KR')}</span><span className="text-sm text-white/35">/ 년</span></div>
                          <div className="mt-0.5 text-xs text-white/35"><span className="line-through">₩{(p.price * 12).toLocaleString('ko-KR')}</span> · 3개월 무료</div>
                        </div>
                      ) : firstEligible ? (
                        <div className="mt-4">
                          <div className="flex items-baseline gap-1"><span className="text-3xl font-bold text-[#0064FF]">₩{(Math.floor(p.price * 0.5 / 100) * 100).toLocaleString('ko-KR')}</span><span className="text-sm text-white/35">첫 달</span></div>
                          <div className="mt-0.5 text-xs text-white/35">이후 ₩{p.price.toLocaleString('ko-KR')}/월</div>
                        </div>
                      ) : (
                        <div className="mt-4 flex items-baseline gap-1"><span className="text-3xl font-bold text-white">₩{p.price.toLocaleString('ko-KR')}</span><span className="text-sm text-white/35">/ 월</span></div>
                      )}
                      <div className="mt-2.5 inline-flex items-center rounded-full bg-[#0064FF]/10 px-3 py-1 text-sm font-extrabold text-[#0064FF]">하루 약 {(annual ? Math.round(p.price * 9 / 365 / 10) * 10 : Math.round(p.price / 30 / 10) * 10).toLocaleString('ko-KR')}원</div>
                      <ul className="mt-4 space-y-1.5 text-left">
                        {p.feats.map((f) => (
                          <li key={f} className="flex items-start gap-1.5 text-sm text-white/60"><span className="mt-0.5 shrink-0 font-bold text-[#0064FF]">✓</span><span className="break-keep">{f}</span></li>
                        ))}
                      </ul>
                      <button onClick={() => handleBuy('sub', annual ? 'annual' : 'monthly')} className={`mt-6 w-full rounded-xl py-2.5 text-sm font-semibold transition ${p.hot ? 'bg-[#0064FF] text-white hover:brightness-95' : 'border border-white/10 text-white/70 hover:border-[#0064FF] hover:text-[#0064FF]'}`}>시작하기</button>
                    </div>
                  )
                })}
              </div>
              <p className="mt-6 text-center text-sm text-white/35">이용권은 <span className="font-semibold text-white/60">매월 초기화</span>됩니다 · 남은 이용권은 이월·누적되지 않습니다.{priceTab === 'annual' ? ' 연간도 매월 자동 충전됩니다.' : ''}</p>
            </>
          )}
        </Reveal>
      </section>

      {/* 이벤트 게시판 */}
      {events.length > 0 && (
        <section id="events" className="px-5 py-12 md:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-2xl font-bold tracking-tight text-white">이벤트</h2>
            <div className="mb-1 flex border-b border-white/10">
              {[
                { key: 'active', label: '진행중인 이벤트' },
                { key: 'ended',  label: '종료된 이벤트' },
                { key: 'winner', label: '당첨자 발표' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setEventTab(tab.key)}
                  className={`px-5 py-3 text-sm font-bold transition-colors border-b-2 -mb-px ${eventTab === tab.key ? 'border-[#0064FF] text-[#0064FF]' : 'border-transparent text-white/35 hover:text-white/60'}`}>
                  {tab.label}
                  <span className="ml-1.5 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-xs text-white/45">{events.filter(e => e.status === tab.key).length}</span>
                </button>
              ))}
            </div>
            <div className="divide-y divide-white/10">
              {events.filter(e => e.status === eventTab).length === 0 ? (
                <p className="py-12 text-center text-sm text-white/35">해당 이벤트가 없습니다</p>
              ) : (
                events.filter(e => e.status === eventTab).map(ev => (
                  <Link key={ev.id} to={`/events/${ev.id}`}
                    className="flex w-full items-center gap-4 px-2 py-4 text-left transition-colors hover:bg-white/[0.03]">
                    <EventBadge status={ev.status} label={ev.label} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/85">{ev.title}</span>
                    <span className="shrink-0 text-xs text-white/35">
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
      <Footer user={user} dark />

      <style>{`
        .event-content img { max-width:100%; border-radius:8px; margin:0.5em 0; }
        .event-content p { margin:0.6em 0; line-height:1.8; }
        .event-content h1 { font-size:1.6em; font-weight:800; margin:0.8em 0 0.4em; color:#e6e7eb; }
        .event-content h2 { font-size:1.3em; font-weight:700; margin:0.8em 0 0.4em; color:#e6e7eb; }
        .event-content h3 { font-size:1.1em; font-weight:700; margin:0.6em 0 0.3em; color:#e6e7eb; }
        .event-content ul, .event-content ol { padding-left:1.5em; margin:0.5em 0; }
        .event-content li { margin:0.3em 0; }
        .event-content blockquote { border-left:3px solid #0064FF; padding-left:1em; color:#6b7280; margin:0.6em 0; }
        .event-content a { color:#0064FF; text-decoration:underline; }
        .event-content strong { color:#e6e7eb; font-weight:700; }
        @keyframes badge-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .badge-pulse { animation: badge-pulse 2s ease-in-out infinite; }
        html { scroll-behavior: smooth; }
        body { -webkit-font-smoothing: antialiased; }
      `}</style>

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} referralCode={refFromUrl} />
      <FindsPricing open={buyOpen} onClose={() => setBuyOpen(false)} defaultTab={buyTab} defaultPeriod={buyPeriod} />
      <TermsModal open={showTermsModal} onAgree={handleTermsAgree} onClose={() => setShowTermsModal(false)} />
      <NicknameModal open={nickOpen} required={nickRequired} onClose={handleNicknameClose} onDone={handleNicknameDone} />
      <PaymentModal
        key={selectedPlan + (paymentOpen ? '-open' : '-closed')}
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        defaultPlan={selectedPlan}
        initialCode={codeFromUrl}
        autoBilling
      />
    </div>
  )
}

/* ── 데모 영상 캐러셀 ── */
// 정적 호스팅(Vercel public/)에서 서빙 — Supabase egress 안 씀
const DEMO_VIDEOS = ['/demo6.mp4', '/demo1.mp4', '/demo2.mp4', '/demo3.mp4', '/demo4.mp4', '/demo5.mp4']
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
        <h2 className="text-2xl font-bold tracking-tight text-white md:text-4xl">이렇게 만들어집니다</h2>
        <p className="mt-3 text-lg text-white/45">크로닛이 실제로 만든 영상입니다.</p>
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
                transition: 'box-shadow 0.5s ease', border: '1px solid rgba(255,255,255,0.08)' }}>
                <video ref={el => { videoRefs.current[vidIdx] = el }} poster={('/posters/' + src.slice(1)).replace('.mp4', '.webp')} src={inView && absOff <= 1 ? src : undefined} muted loop playsInline autoPlay={isCenter} preload={isCenter ? 'auto' : 'none'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#15161a' }} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-8 flex items-center justify-center gap-6">
        <button onClick={prev} className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/15 bg-white/[0.04] text-white/70 shadow transition-all hover:border-[#0064FF] hover:text-[#0064FF] active:scale-[0.98]">{"<"}</button>
        <div className="flex gap-2">
          {videos.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === active ? '24px' : '6px', background: i === active ? '#0064FF' : '#d1d5db' }} />
          ))}
        </div>
        <button onClick={next} className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/15 bg-white/[0.04] text-white/70 shadow transition-all hover:border-[#0064FF] hover:text-[#0064FF] active:scale-[0.98]">{">"}</button>
      </div>
    </section>
  )
}

export default Home

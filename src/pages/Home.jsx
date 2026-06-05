import React, { useState, useEffect, useRef } from 'react'
import {
  Clock, CheckCircle2, MessageCircle, ArrowRight, Users,
  Monitor, Film, TrendingDown, LogOut, Gift, Menu, X, Play,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import AnimatedCounter from '../components/AnimatedCounter'
import PaymentModal from '../components/PaymentModal'
import AuthModal from '../components/AuthModal'
import TermsModal from '../components/TermsModal'
import { supabase } from '../lib/supabase'

const GREEN = '#03C75A'
const DOWNLOAD_URL =
  'https://github.com/Globalshorts/chronit/releases/latest/download/Chronit_Setup.exe'

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
      <div className="mx-auto mb-10 flex max-w-sm items-center gap-3 rounded-2xl border-2 border-[#03C75A]/30 bg-[#03C75A]/10 px-5 py-3">
        <Gift size={16} className="shrink-0 text-[#03C75A]" />
        <span className="text-base font-bold text-gray-700">할인 코드 <strong className="text-gray-900">{codeFromUrl}</strong> 적용됨</span>
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
          className="flex-1 rounded-2xl border-2 border-gray-300 bg-white px-5 py-4 text-base font-bold text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-[#03C75A] focus:ring-4 focus:ring-[#03C75A]/15"
        />
        <button onClick={handleApply}
          className="rounded-2xl bg-[#03C75A] px-6 py-4 text-base font-bold text-white transition-all hover:bg-[#02b350] active:scale-95">
          적용
        </button>
      </div>
      {status === 'ok' && <p className="text-sm font-bold text-[#03C75A]">✓ 코드가 적용됐어요 — 결제할 때 할인이 반영됩니다</p>}
      {status === 'fail' && <p className="text-sm font-bold text-red-500">코드를 다시 확인해 주세요</p>}
    </div>
  )
}

const statusCfg = {
  active:  { label: '진행중',      cls: 'bg-[#03C75A]/12 text-[#03C75A] border-[#03C75A]/30', dot: true },
  ended:   { label: '종료됨',      cls: 'bg-gray-100 text-gray-500 border-gray-200', dot: false },
  winner:  { label: '당첨자 발표', cls: 'bg-[#FFB800]/15 text-[#b07d00] border-[#FFB800]/40', dot: false },
}
const EventBadge = ({ status, label }) => {
  const cfg = statusCfg[status] || statusCfg.active
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.cls}`}>
      {cfg.dot && <span className="badge-pulse h-1.5 w-1.5 rounded-full bg-[#03C75A]" />}
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
    }
  }

  const handleTermsAgree = () => {
    setShowTermsModal(false)
    const session = pendingSessionRef.current
    pendingSessionRef.current = null
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
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'SIGNED_IN' && session) {
        const createdAt = new Date(session.user.created_at).getTime()
        const signedInAt = new Date(session.user.last_sign_in_at).getTime()
        const isNewUser = Math.abs(signedInAt - createdAt) < 5000

        if (isNewUser) {
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
          handleAfterLogin(session)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

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
      if (menuOpen) setMenuOpen(false)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [menuOpen])

  const navItems = (
    <>
      <a href="#features" className="transition-colors hover:text-[#03C75A]">기능</a>
      <Link to="/manual" className="transition-colors hover:text-[#03C75A]">사용 방법</Link>
      <a href="#pricing" className="transition-colors hover:text-[#03C75A]">요금제</a>
      <Link to="/events" className="transition-colors hover:text-[#03C75A]">이벤트</Link>
    </>
  )

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAF8] font-sans break-keep text-gray-900 selection:bg-[#03C75A]/20">
      {/* 추천인 코드 배너 */}
      {refFromUrl && (
        <div className="fixed top-0 right-0 left-0 z-[61] flex items-center justify-center gap-2 bg-[#03C75A] px-4 py-3 text-sm font-bold text-white shadow-md">
          <Gift size={15} />
          <span>추천 코드 <strong>{refFromUrl}</strong> 적용됨 — 가입하면 <strong>500 크레딧</strong>을 드려요!</span>
          <button onClick={() => { setRefFromUrl(null); sessionStorage.removeItem('chronit_ref') }} className="ml-2 opacity-80 hover:opacity-100">✕</button>
        </div>
      )}

      {/* 할인 코드 배너 */}
      {codeFromUrl && (
        <div className={`fixed right-0 left-0 z-[60] flex items-center justify-center gap-2 bg-[#FFB800] px-4 py-3 text-sm font-bold text-[#5b4200] shadow-md ${refFromUrl ? 'top-11' : 'top-0'}`}>
          <span>🎟️ 할인 코드 <strong>{codeFromUrl}</strong> 감지됨 — 결제할 때 자동으로 적용됩니다</span>
          <button onClick={() => { setCodeFromUrl(null); sessionStorage.removeItem('chronit_code') }} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* 진행중인 이벤트 배너 */}
      {events.filter(e => e.status === 'active').length > 0 && !sessionStorage.getItem('chronit_event_banner_closed') && (
        <div
          className="fixed right-0 left-0 z-[59] flex items-center justify-center gap-2 bg-[#02b350] px-4 py-3 text-sm font-bold text-white shadow-md cursor-pointer"
          style={{ top: `${((refFromUrl ? 1 : 0) + (codeFromUrl ? 1 : 0)) * 44}px` }}
          onClick={() => { window.location.href = '/events' }}
        >
          <span>🎉</span>
          <span>진행중인 이벤트가 <strong>{events.filter(e => e.status === 'active').length}건</strong> 있어요 — 확인하기 →</span>
          <button onClick={e => { e.stopPropagation(); sessionStorage.setItem('chronit_event_banner_closed', '1'); window.location.reload() }} className="ml-2 opacity-80 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Header */}
      <header className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-gray-200 bg-[#FAFAF8]/90 py-3 backdrop-blur-md' : 'bg-transparent py-4 md:py-5'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <a href="/" className="flex min-w-0 items-center gap-2 md:gap-3">
            <img src="https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/icon.png" alt="Chronit" className="h-9 w-9 shrink-0 md:h-10 md:w-10" />
            <h1 className="text-2xl font-black tracking-tight text-gray-900 md:text-3xl">Chronit</h1>
          </a>
          <nav className="hidden gap-10 text-base font-bold text-gray-500 md:flex">
            {navItems}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <>
                  <span className="text-sm font-bold text-gray-500">{user.email?.split('@')[0]}</span>
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
              <button onClick={() => openPayment('pro')}
                className="rounded-full bg-[#03C75A] px-7 py-2.5 text-base font-bold whitespace-nowrap text-white shadow-md shadow-[#03C75A]/25 transition-all hover:bg-[#02b350] active:scale-95">
                시작하기
              </button>
            </div>
            <button onClick={() => setMenuOpen((v) => !v)} aria-label="메뉴"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition-all hover:border-gray-400 md:hidden">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 메뉴 */}
      <div className={`fixed top-0 left-0 right-0 z-40 transform transition-all duration-300 ease-in-out md:hidden ${menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`} style={{ paddingTop: '76px' }}>
        <div className="border-b border-gray-200 bg-white px-6 py-6 shadow-lg">
          <nav className="flex flex-col gap-1 text-lg font-bold text-gray-700">
            <a href="#features" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-4 transition-colors hover:bg-gray-50 hover:text-[#03C75A]">기능</a>
            <Link to="/manual" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-4 transition-colors hover:bg-gray-50 hover:text-[#03C75A]">사용 방법</Link>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-4 transition-colors hover:bg-gray-50 hover:text-[#03C75A]">요금제</a>
            <Link to="/events" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-4 transition-colors hover:bg-gray-50 hover:text-[#03C75A]">이벤트</Link>
          </nav>
          <div className="mt-4 border-t border-gray-200 pt-4 flex flex-col gap-2">
            {user ? (
              <>
                <p className="px-4 pb-1 text-sm text-gray-400">{user.email}</p>
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
            <button onClick={() => { openPayment('pro'); setMenuOpen(false) }}
              className="w-full rounded-xl bg-[#03C75A] px-4 py-4 text-lg font-extrabold text-white shadow-md transition-all hover:bg-[#02b350] active:scale-95">
              시작하기
            </button>
          </div>
        </div>
      </div>

      {/* 이벤트 모달 */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
          <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-gray-100 bg-white/95 px-6 py-4 backdrop-blur-xl">
              <div className="flex items-center gap-2 min-w-0">
                <EventBadge status={selectedEvent.status} label={selectedEvent.label} />
                <h3 className="truncate text-base font-bold text-gray-900">{selectedEvent.title}</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">✕</button>
            </div>
            <div className="event-content px-6 py-6 text-gray-700" dangerouslySetInnerHTML={{ __html: selectedEvent.content }} />
            {selectedEvent.cta_text && selectedEvent.cta_url && (
              <div className="border-t border-gray-100 px-6 py-4">
                <a href={selectedEvent.cta_url} target="_blank" rel="noopener noreferrer" onClick={() => setSelectedEvent(null)}
                  className="block w-full rounded-xl bg-[#03C75A] py-4 text-center text-base font-extrabold text-white shadow-md hover:bg-[#02b350] active:scale-95 transition-all">
                  {selectedEvent.cta_text}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="relative px-5 pt-32 pb-16 md:px-8 md:pt-40 md:pb-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 md:grid-cols-2 md:gap-12">
          <div className="flex flex-col items-start">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#FFB800]/40 bg-[#FFB800]/10 px-4 py-2 text-sm font-bold text-[#9a6b00] md:text-base">
              <CheckCircle2 size={16} className="text-[#FFB800]" /> 영상 편집, 한 번도 안 해보셨어도 괜찮아요
            </div>
            <h1 className="mb-5 text-4xl font-black leading-[1.25] tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
              복잡한 편집 없이,<br /><span className="text-[#03C75A]">하루 5분이면</span> 끝나요
            </h1>
            <p className="mb-9 text-lg leading-[1.9] text-gray-600 md:text-xl">
              쇼핑 영상 링크만 붙여넣으면<br className="hidden md:block" />
              숏폼 영상이 자동으로 만들어집니다.<br />
              어려운 설정도, 편집 기술도 필요 없어요.
            </p>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <button onClick={() => setShowAuthModal(true)}
                className="group flex items-center justify-center gap-2 rounded-2xl bg-[#03C75A] px-10 py-5 text-xl font-extrabold text-white shadow-lg shadow-[#03C75A]/30 transition-all hover:bg-[#02b350] active:scale-95">
                무료로 시작하기 <ArrowRight size={22} className="transition-transform group-hover:translate-x-1" />
              </button>
              <a href={DOWNLOAD_URL}
                onClick={() => window.gtag?.('event', 'download', { event_category: 'conversion', event_label: 'windows_download' })}
                className="group flex items-center justify-center gap-2 rounded-2xl border-2 border-gray-300 bg-white px-8 py-5 text-xl font-extrabold text-gray-700 transition-all hover:border-gray-400 active:scale-95">
                <Monitor size={22} /> Windows 다운로드
              </a>
            </div>
            <p className="mt-4 text-sm font-medium text-gray-500">
              Windows 10/11 · 첫 실행 시 <span className="font-black text-[#03C75A]">"PC 보호" 경고 → 추가 정보 → 실행</span>
            </p>
          </div>

          {/* 우측: 서비스 실제 화면 (숫자 카운트업) */}
          <div className="relative flex justify-center">
            <div className="w-full max-w-md space-y-4">
              {/* 대시보드 카드 */}
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-[0_16px_50px_-20px_rgba(0,0,0,0.18)]">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#03C75A]/12 text-lg">📊</span>
                    <p className="text-base font-black text-gray-900">대시보드</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[#03C75A]">
                    <span className="badge-pulse h-1.5 w-1.5 rounded-full bg-[#03C75A]" />실시간
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[['오늘 작업 현황', 8, '건'], ['생성 완료', 5, '개'], ['추천 상품 수', 23, '개']].map(([label, n, u]) => (
                    <div key={label} className="rounded-2xl bg-[#FAFAF8] p-3 text-center">
                      <div className="text-2xl font-black text-gray-900 md:text-3xl">
                        <AnimatedCounter to={n} suffix={u} duration={1600} />
                      </div>
                      <div className="mt-1 text-[11px] font-bold text-gray-400 leading-tight">{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 누적 지표 카드 */}
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-[0_16px_50px_-20px_rgba(0,0,0,0.18)]">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#03C75A]/12 text-lg">📈</span>
                  <p className="text-base font-black text-gray-900">크로닛이 함께 만든 결과</p>
                </div>
                <div className="space-y-2">
                  {[['누적 절약 시간', 7285, '시간'], ['생성 완료 영상', 8742, '개'], ['활성 사용자', 117, '명']].map(([label, n, u]) => (
                    <div key={label} className="flex items-center justify-between rounded-2xl bg-[#FAFAF8] px-4 py-3">
                      <span className="text-sm font-bold text-gray-600">{label}</span>
                      <span className="text-xl font-black text-[#03C75A] md:text-2xl">
                        <AnimatedCounter to={n} suffix={u} duration={1800} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 이렇게 쉬워요 (3단계) ── */}
      <section className="px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-black text-gray-900 md:text-4xl">정말 이게 전부예요</h2>
            <p className="mt-3 text-lg text-gray-500 md:text-xl">세 번만 따라 하면 영상이 완성됩니다</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
            {[
              { n: '1', emoji: '🔗', title: '링크 붙여넣기', desc: '마음에 드는 쇼핑 영상의 링크를 복사해서 붙여넣어요.' },
              { n: '2', emoji: '🎬', title: '자동으로 제작', desc: '편집·자막·자르기까지 전부 자동. 몇 분만 기다리면 돼요.' },
              { n: '3', emoji: '✅', title: '올리기만 하면 끝', desc: '완성된 영상을 그대로 내 채널에 올리면 끝납니다.' },
            ].map(({ n, emoji, title, desc }) => (
              <div key={n} className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#03C75A]/10 text-4xl">{emoji}</div>
                <span className="mb-2 inline-block rounded-full bg-[#03C75A]/12 px-3 py-1 text-sm font-black text-[#03C75A]">{n}단계</span>
                <h3 className="mb-2 text-xl font-black text-gray-900">{title}</h3>
                <p className="text-base leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 데모 캐러셀 ── */}
      <div id="demo"><DemoCarousel /></div>

      {/* ── 왜 크로닛 (시간 절약) ── */}
      <section className="px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-black text-gray-900 md:text-4xl">시간을 아껴드릴게요</h2>
            <p className="mt-3 text-lg text-gray-500 md:text-xl">어려운 건 크로닛이 대신할게요</p>
          </div>
          <div className="space-y-5">
            {[
              { emoji: '🖱️', title: '편집 기술이 없어도 됩니다', desc: '마우스 클릭 몇 번이면 끝. 자르고 붙이는 작업은 전부 자동으로 처리돼요.' },
              { emoji: '⏰', title: '하루 5분이면 충분해요', desc: '영상 하나 만드는 데 보통 몇 분. 만들어지는 동안 다른 일을 하셔도 됩니다.' },
              { emoji: '🔁', title: '반복 작업은 전부 자동', desc: '자막 달기, 길이 맞추기, 제목 추천까지 — 손이 많이 가던 일을 대신해 드려요.' },
              { emoji: '💻', title: '안정적으로 작동해요', desc: 'Windows 전용 프로그램으로 멈춤 없이 쾌적하게 작동합니다.' },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="flex items-center gap-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] md:gap-8 md:p-8">
                <div className="shrink-0 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FAFAF8] text-4xl md:h-20 md:w-20 md:text-5xl">{emoji}</div>
                <div>
                  <h3 className="mb-1 text-xl font-black text-gray-900 md:text-2xl">{title}</h3>
                  <p className="text-base leading-relaxed text-gray-500 md:text-lg">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="features" className="px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-2xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-black text-gray-900 md:text-4xl">많이 물어보시는 것들</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: '영상 편집을 한 번도 안 해봤는데 괜찮을까요?', a: '네, 괜찮습니다. 링크를 붙여넣고 버튼만 누르면 돼요. 자르기·자막·합성은 전부 자동으로 처리됩니다.' },
              { q: '복잡한 설정을 해야 하나요?', a: '아니요. 처음 화면 안내만 천천히 따라오시면 됩니다. 직접 설정할 게 거의 없어요.' },
              { q: '시간이 얼마나 걸리나요?', a: '영상 하나에 보통 몇 분이면 충분합니다. 만들어지는 동안 다른 일을 하셔도 괜찮아요.' },
              { q: '컴퓨터를 잘 못 다뤄도 되나요?', a: '클릭만 하실 수 있으면 됩니다. 프로그램 안에 쉬운 안내가 단계별로 들어 있어요.' },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] md:p-7">
                <div className="mb-3 flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#03C75A] text-sm font-black text-white">Q</span>
                  <p className="pt-0.5 text-lg font-black text-gray-900">{q}</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-black text-gray-500">A</span>
                  <p className="pt-0.5 text-base leading-relaxed text-gray-600">{a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 요금제 ── */}
      <section id="pricing" className="px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 text-center">
            <h2 className="text-3xl font-black text-gray-900 md:text-5xl">필요한 만큼만 고르세요</h2>
            <p className="mt-3 text-lg text-gray-500 md:text-xl">부담 없이 시작하고, 언제든 바꿀 수 있어요</p>
          </div>

          <CouponBar codeFromUrl={codeFromUrl} onApply={(code) => { setCodeFromUrl(code); sessionStorage.setItem('chronit_code', code) }} />

          <div className="grid gap-6 md:grid-cols-3 md:gap-7">
            {/* 스타터 */}
            <div onClick={() => openPayment('starter')} className="flex cursor-pointer flex-col rounded-[2rem] border border-gray-200 bg-white p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all hover:border-[#03C75A]/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] md:p-10">
              <h4 className="mb-2 text-xl font-black text-gray-900">스타터</h4>
              <p className="mb-5 text-base text-gray-500">처음 시작하는 분께</p>
              <div className="mb-8">
                <span className="text-base font-bold text-gray-400 line-through">49,000원</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-gray-900">29,000</span>
                  <span className="text-lg font-bold text-gray-500">원 / 월</span>
                </div>
              </div>
              <ul className="space-y-3 text-base font-medium text-gray-700">
                <li className="flex items-start gap-2"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#03C75A]" /><span>월 <strong>15개</strong> 영상 제작</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#03C75A]" />모든 자동화 기능 사용</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#03C75A]" />자동 자막·제목 추천</li>
              </ul>
            </div>

            {/* 프로 (추천) */}
            <div onClick={() => openPayment('pro')} className="relative flex cursor-pointer flex-col rounded-[2rem] border-2 border-[#03C75A] bg-[#03C75A] p-8 shadow-[0_12px_40px_-8px_rgba(3,199,90,0.5)] transition-all hover:-translate-y-1 md:p-10">
              <div className="absolute -top-3 right-6 rounded-full bg-[#FFB800] px-4 py-1 text-sm font-black text-white shadow-md">가장 인기</div>
              <h4 className="mb-2 text-xl font-black text-white">프로</h4>
              <p className="mb-5 text-base text-white/80">매일 꾸준히 올리는 분께</p>
              <div className="mb-8">
                <span className="text-base font-bold text-white/60 line-through">99,000원</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white md:text-5xl">49,000</span>
                  <span className="text-lg font-bold text-white/80">원 / 월</span>
                </div>
              </div>
              <ul className="space-y-3 text-base font-medium text-white">
                <li className="flex items-start gap-2"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-white" /><span>월 <strong>40개</strong> 영상 제작 (하루 1~2개)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-white" />스타터의 모든 기능 포함</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-white" />고급 AI 음성 사용</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-white" />워터마크 없이 깔끔하게</li>
              </ul>
            </div>

            {/* 마스터 */}
            <div onClick={() => openPayment('master')} className="flex cursor-pointer flex-col rounded-[2rem] border border-gray-200 bg-white p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all hover:border-[#03C75A]/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] md:p-10">
              <h4 className="mb-2 text-xl font-black text-gray-900">마스터</h4>
              <p className="mb-5 text-base text-gray-500">여러 채널을 운영하는 분께</p>
              <div className="mb-8">
                <span className="text-base font-bold text-gray-400 line-through">199,000원</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-gray-900">79,000</span>
                  <span className="text-lg font-bold text-gray-500">원 / 월</span>
                </div>
              </div>
              <ul className="space-y-3 text-base font-medium text-gray-700">
                <li className="flex items-start gap-2"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#03C75A]" /><span>월 <strong>100개</strong> 영상 제작</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#03C75A]" />프로의 모든 기능 포함</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#03C75A]" />새 기능 우선 체험</li>
              </ul>
            </div>
          </div>

          {/* 6개월 안심 패키지 */}
          <div onClick={() => openPayment('pkg6')}
            className="mt-6 flex cursor-pointer flex-col items-start justify-between gap-4 rounded-[2rem] border-2 border-[#FFB800] bg-[#FFFBEB] p-7 transition-all hover:shadow-[0_8px_30px_-8px_rgba(255,184,0,0.5)] sm:flex-row sm:items-center md:p-9">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full bg-[#FFB800] px-3 py-1 text-xs font-black text-white">안심 패키지</span>
                <h4 className="text-xl font-black text-gray-900">프로 6개월</h4>
              </div>
              <p className="text-base text-gray-600">프로 요금제를 <strong className="text-gray-900">6개월 동안</strong> · 매월 크레딧 충전 · 가장 알뜰한 장기 플랜</p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <span className="text-base font-bold text-gray-400 line-through">594,000원</span>
              <div className="flex items-baseline gap-1 sm:justify-end">
                <span className="text-4xl font-black text-[#b07d00]">249,000</span>
                <span className="text-lg font-bold text-gray-500">원</span>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <button onClick={() => openPayment(selectedPlan)}
              className="w-full rounded-2xl bg-[#03C75A] px-8 py-5 text-xl font-black text-white shadow-lg shadow-[#03C75A]/25 transition-all hover:bg-[#02b350] active:scale-95 sm:w-auto md:px-20 md:py-6">
              무료로 시작하기
            </button>
          </div>
        </div>
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
                  className={`px-5 py-3 text-sm font-bold transition-colors border-b-2 -mb-px ${eventTab === tab.key ? 'border-[#03C75A] text-[#03C75A]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
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
                  <button key={ev.id} onClick={() => setSelectedEvent(ev)}
                    className="flex w-full items-center gap-4 px-2 py-4 text-left transition-colors hover:bg-gray-50">
                    <EventBadge status={ev.status} label={ev.label} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">{ev.title}</span>
                    <span className="shrink-0 text-xs text-gray-400">
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
      <footer className="border-t border-gray-200 bg-white px-5 py-12 md:px-8 md:py-16">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-10 md:flex-row md:gap-16">
          <div className="max-w-md">
            <div className="mb-5 flex items-center gap-3">
              <img src="https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/icon.png" alt="Chronit" className="h-9 w-9" />
              <h1 className="text-2xl font-black tracking-tight text-gray-900">Chronit</h1>
            </div>
            <p className="text-lg leading-[1.8] font-medium text-gray-600">
              당신의 시간을 아껴주는<br />가장 쉬운 숏폼 도구.
            </p>
          </div>
          <div className="grid w-full grid-cols-3 gap-6 sm:gap-12 md:w-auto md:gap-20">
            <div className="flex flex-col gap-4">
              <span className="text-base font-bold text-gray-900">서비스</span>
              <a href="#features" className="text-base font-medium text-gray-500 transition-colors hover:text-[#03C75A]">기능</a>
              <a href="#pricing" className="text-base font-medium text-gray-500 transition-colors hover:text-[#03C75A]">요금제</a>
              <a href="/events" className="text-base font-medium text-gray-500 transition-colors hover:text-[#03C75A]">이벤트</a>
            </div>
            <div className="flex flex-col gap-4">
              <span className="text-base font-bold text-gray-900">회사</span>
              <a href="#" className="text-base font-medium text-gray-500 transition-colors hover:text-[#03C75A]">회사 소개</a>
              <a href="mailto:support@chronit.kr" className="text-base font-medium text-gray-500 transition-colors hover:text-[#03C75A]">문의하기</a>
            </div>
            <div className="flex flex-col gap-4">
              <span className="text-base font-bold text-gray-900">법적고지</span>
              <Link to="/privacy" className="text-base font-medium text-gray-500 transition-colors hover:text-[#03C75A]">개인정보처리방침</Link>
              <Link to="/terms" className="text-base font-medium text-gray-500 transition-colors hover:text-[#03C75A]">이용약관</Link>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-6 border-t border-gray-200 pt-8 md:flex-row md:pt-10">
          <p className="text-center text-sm font-medium text-gray-400">&copy; 2026 Chronit</p>
          <div className="flex gap-4">
            <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-all hover:bg-[#03C75A] hover:text-white"><Users size={20} /></div>
            <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-all hover:bg-[#03C75A] hover:text-white"><MessageCircle size={20} /></div>
          </div>
        </div>
      </footer>

      <style>{`
        .event-content img { max-width:100%; border-radius:8px; margin:0.5em 0; }
        .event-content p { margin:0.6em 0; line-height:1.8; }
        .event-content h1 { font-size:1.6em; font-weight:800; margin:0.8em 0 0.4em; color:#111827; }
        .event-content h2 { font-size:1.3em; font-weight:700; margin:0.8em 0 0.4em; color:#111827; }
        .event-content h3 { font-size:1.1em; font-weight:700; margin:0.6em 0 0.3em; color:#111827; }
        .event-content ul, .event-content ol { padding-left:1.5em; margin:0.5em 0; }
        .event-content li { margin:0.3em 0; }
        .event-content blockquote { border-left:3px solid #03C75A; padding-left:1em; color:#6b7280; margin:0.6em 0; }
        .event-content a { color:#03C75A; text-decoration:underline; }
        .event-content strong { color:#111827; font-weight:700; }
        @keyframes badge-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .badge-pulse { animation: badge-pulse 2s ease-in-out infinite; }
        html { scroll-behavior: smooth; }
        body { -webkit-font-smoothing: antialiased; }
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

/* ── 데모 영상 캐러셀 ── */
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
  const onMouseUp = (e) => { const dx = e.clientX - dragStartX.current; if (Math.abs(dx) > 40) dx < 0 ? next() : prev() }
  const onTouchStart = (e) => { dragStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => { const dx = e.changedTouches[0].clientX - dragStartX.current; if (Math.abs(dx) > 40) dx < 0 ? next() : prev() }

  if (!n) return null

  return (
    <section className="px-5 pt-16 pb-10 md:pt-20 md:pb-16">
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
                <video ref={el => { videoRefs.current[vidIdx] = el }} src={src} muted loop playsInline autoPlay={isCenter} preload="auto"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#f3f4f6' }} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-8 flex items-center justify-center gap-6">
        <button onClick={prev} className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-300 bg-white text-gray-700 shadow transition-all hover:border-[#03C75A] hover:text-[#03C75A] active:scale-95">{"<"}</button>
        <div className="flex gap-2">
          {videos.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === active ? '24px' : '6px', background: i === active ? '#03C75A' : '#d1d5db' }} />
          ))}
        </div>
        <button onClick={next} className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-300 bg-white text-gray-700 shadow transition-all hover:border-[#03C75A] hover:text-[#03C75A] active:scale-95">{">"}</button>
      </div>
    </section>
  )
}

export default Home

import { Link, useLocation, Outlet } from 'react-router-dom'
import { lazy, Suspense, useState, useEffect, useCallback } from 'react'
const lazyTrialModal = () => lazy(() => import('./TrialContinueModal'))
import { Flame, Bookmark, User, CreditCard, Download, Shield, Handshake, Trophy } from 'lucide-react'
import EnergyOrb from './EnergyOrb'
import QuestPanel from './QuestPanel'
import { supabase } from '../lib/supabase'
import { claimableCount } from '../lib/quests'
const ScriptOrbIcon = (p) => <EnergyOrb size={p && p.size ? p.size : 18} />
import { useMyRole } from '../lib/useIsAdmin'
import { ScriptGenProvider } from '../lib/useScriptGen'

// 작업 공간(핵심) / 부수 페이지 분리
const WORKSPACE_NAV = [
  { to: '/trend', label: '트렌드', title: '실시간 트렌드', Icon: Flame },
  { to: '/script', label: '대본', title: '대본 비서', Icon: ScriptOrbIcon },
  { to: '/watchlist', label: '워치리스트', title: '워치리스트', Icon: Bookmark },
]
const AUX_NAV = [
  { to: '/me', label: '마이', title: '마이페이지', Icon: User },
  { to: '/pricing', label: '이용권', title: '이용권 · 요금', Icon: CreditCard },
]
const NAV = [...WORKSPACE_NAV, ...AUX_NAV]
// 역할 전용 탭 — 데스크톱 사이드바에만 노출(모바일 하단 탭에는 넣지 않는다)
const ADMIN_NAV = { to: '/admin', label: '관리자', title: '관리자', Icon: Shield }
const PARTNER_NAV = { to: '/partner', label: '파트너', title: '파트너', Icon: Handshake }

const CHECKIN_KEY = 'chr_checkin_at'
const TrialContinueModal = lazyTrialModal()

export default function AppShell({ children }) {
  const loc = useLocation()
  const role = useMyRole()
  const content = <ScriptGenProvider>{children ?? <Outlet />}</ScriptGenProvider>
  const active = (n) => loc.pathname.startsWith(n.to)
  const roleNav = role === 'super_admin' ? ADMIN_NAV : role === 'partner' ? PARTNER_NAV : null
  const cur = NAV.find(active) ?? [ADMIN_NAV, PARTNER_NAV].find(active)

  // 미션 — 트렌드 상단 스트립에서 하단 탭으로 이동. 패널은 전역에서 한 번만 마운트한다.
  const [questOpen, setQuestOpen] = useState(false)
  const [ready, setReady] = useState(0)
  const refreshQuests = useCallback(async () => {
    try {
      const { data } = await supabase.rpc('get_quests_rpc')
      if (data?.ok) setReady(claimableCount(data.quests))
    } catch { /* noop */ }
  }, [])
  useEffect(() => {
    let dead = false
    const run = async () => {
      // 출석은 하루 한 번(서버도 날짜 단위로 중복을 막는다)
      try {
        const today = new Date().toDateString()
        if (localStorage.getItem(CHECKIN_KEY) !== today) {
          await supabase.rpc('checkin_rpc')
          try { localStorage.setItem(CHECKIN_KEY, today) } catch { /* noop */ }
        }
      } catch { /* noop */ }
      if (!dead) refreshQuests()
    }
    run()
    return () => { dead = true }
  }, [refreshQuests])

  const MissionBtn = ({ mobile }) => (
    <button onClick={() => setQuestOpen(true)}
      className={mobile
        ? `relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition ${questOpen ? 'text-[#0064FF]' : 'text-white/50'}`
        : `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-white/60 transition hover:bg-white/5 hover:text-white`}>
      <span className="relative">
        <Trophy size={mobile ? 19 : 18} />
        {ready > 0 && <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-[#0c0d11]" />}
      </span>
      미션
    </button>
  )

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white md:flex">
      <Suspense fallback={null}><TrialContinueModal /></Suspense>
      <QuestPanel open={questOpen} onClose={() => { setQuestOpen(false); refreshQuests() }} onClaimed={refreshQuests}
        onGoWatchlist={() => { setQuestOpen(false); window.location.assign('/watchlist') }} />
      {/* 데스크톱 왼쪽 내비 */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-white/10 bg-[#0c0d11] p-4 md:flex">
        <Link to="/" className="mb-6 flex items-center gap-2 px-2">
          <img src="/cn-white.svg" alt="Chronit" className="h-7 w-7" />
          <span className="text-lg font-bold tracking-tight">Chronit</span>
        </Link>
        <nav className="flex flex-col gap-1">
          <div className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wide text-white/25">작업 공간</div>
          {WORKSPACE_NAV.map((n) => (
            <Link key={n.to} to={n.to} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${active(n) ? 'bg-[#0064FF] text-white glass-active' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
              <n.Icon size={18} /> {n.label}
            </Link>
          ))}
          <MissionBtn mobile={false} />
          <div className="my-2 border-t border-white/10" />
          {AUX_NAV.map((n) => (
            <Link key={n.to} to={n.to} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${active(n) ? 'bg-[#0064FF] text-white glass-active' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
              <n.Icon size={18} /> {n.label}
            </Link>
          ))}
          {roleNav && (
            <Link to={roleNav.to} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${active(roleNav) ? 'bg-[#0064FF] text-white glass-active' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
              <roleNav.Icon size={18} /> {roleNav.label}
            </Link>
          )}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-3">
          <button onClick={() => window.dispatchEvent(new Event('chronit:open-install'))} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-white/50 hover:bg-white/5 hover:text-white">
            <Download size={16} /> 앱 설치
          </button>
        </div>
      </aside>

      {/* 콘텐츠 */}
      <div className="min-w-0 flex-1 pb-16 md:pb-0">
        {/* 모바일 상단 브랜드바 (데스크톱은 사이드바가 대체) */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-white/10 bg-[#0a0b0f]/90 px-4 py-3 backdrop-blur md:hidden">
          <Link to="/" className="flex items-center gap-1.5">
            <img src="/cn-white.svg" alt="Chronit" className="h-6 w-6" />
          </Link>
          <span className="text-base font-extrabold">{cur?.title ?? 'Chronit'}</span>
        </header>
        {content}
      </div>

      {/* 모바일 하단 탭 */}
      <nav className="fixed inset-x-0 bottom-0 flex border-t border-white/10 bg-[#0c0d11] md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 2147483000 }}>
        {WORKSPACE_NAV.map((n) => (
          <Link key={n.to} to={n.to} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition ${active(n) ? 'text-[#0064FF]' : 'text-white/50'}`}>
            <n.Icon size={19} /> {n.label}
          </Link>
        ))}
        <MissionBtn mobile={true} />
        {AUX_NAV.map((n) => (
          <Link key={n.to} to={n.to} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition ${active(n) ? 'text-[#0064FF]' : 'text-white/50'}`}>
            <n.Icon size={19} /> {n.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

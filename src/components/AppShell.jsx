import { useEffect } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { Flame, Search, Bookmark, User, CreditCard, Download } from 'lucide-react'

const NAV = [
  { to: '/trend', label: '트렌드', title: '실시간 트렌드', Icon: Flame },
  { to: '/research', label: '리서치', title: '리서치', Icon: Search },
  { to: '/saved', label: '소재 보드', title: '내 소재 보드', Icon: Bookmark },
  { to: '/me', label: '마이', title: '마이페이지', Icon: User },
  { to: '/pricing', label: '이용권', title: '이용권 · 요금', Icon: CreditCard },
]

export default function AppShell({ children }) {
  const loc = useLocation()
  const content = children ?? <Outlet />
  const active = (n) => loc.pathname.startsWith(n.to)
  // 모바일 인앱 화면: 채널톡 런처/배너가 하단 탭을 가려서 숨김 (데스크톱·랜딩은 유지)
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return
    try { window.ChannelIO && window.ChannelIO('hideChannelButton') } catch { /* noop */ }
    return () => { try { window.ChannelIO && window.ChannelIO('showChannelButton') } catch { /* noop */ } }
  }, [])
  const cur = NAV.find(active)
  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white md:flex">
      {/* 데스크톱 왼쪽 내비 */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-white/10 bg-[#0c0d11] p-4 md:flex">
        <Link to="/trend" className="mb-6 flex items-center gap-2 px-2">
          <img src="/cn-white.svg" alt="Chronit" className="h-7 w-7" />
          <span className="text-lg font-bold tracking-tight">Chronit</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${active(n) ? 'bg-[#0064FF] text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
              <n.Icon size={18} /> {n.label}
            </Link>
          ))}
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
          <Link to="/trend" className="flex items-center gap-1.5">
            <img src="/cn-white.svg" alt="Chronit" className="h-6 w-6" />
          </Link>
          <span className="text-base font-extrabold">{cur?.title ?? 'Chronit'}</span>
        </header>
        {content}
      </div>

      {/* 모바일 하단 탭 */}
      <nav className="fixed inset-x-0 bottom-0 flex border-t border-white/10 bg-[#0c0d11] md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 2147483000 }}>
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition ${active(n) ? 'text-[#0064FF]' : 'text-white/50'}`}>
            <n.Icon size={19} /> {n.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

import { Link, useLocation, Outlet } from 'react-router-dom'
import { Home, Flame, Search, Bookmark, User, Download } from 'lucide-react'

const NAV = [
  { to: '/', label: '홈', Icon: Home, exact: true },
  { to: '/trend', label: '트렌드', Icon: Flame },
  { to: '/research', label: '리서치', Icon: Search },
  { to: '/saved', label: '소재 보드', Icon: Bookmark },
  { to: '/me', label: '마이', Icon: User },
]

export default function AppShell({ children }) {
  const content = children ?? <Outlet />
  const loc = useLocation()
  const active = (n) => n.exact ? loc.pathname === n.to : loc.pathname.startsWith(n.to)
  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white md:flex">
      {/* 데스크톱 왼쪽 내비 */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-white/10 bg-[#0c0d11] p-4 md:flex">
        <Link to="/" className="mb-6 flex items-center gap-2 px-2">
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
      <div className="min-w-0 flex-1 pb-16 md:pb-0">{content}</div>

      {/* 모바일 하단 탭 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-[#0c0d11]/95 backdrop-blur md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition ${active(n) ? 'text-[#0064FF]' : 'text-white/50'}`}>
            <n.Icon size={20} /> {n.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

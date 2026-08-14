import { Link, useLocation } from 'react-router-dom'
import { Sparkles, Flame, User } from 'lucide-react'

// 모바일 하단 탭 — Finds ↔ 트렌드 ↔ 마이 빠른 전환 (md+에서는 SiteNav 사용)
const TABS = [
  { to: '/finds', label: 'Finds', icon: Sparkles },
  { to: '/trend', label: '트렌드', icon: Flame },
  { to: '/me', label: '마이', icon: User },
]

export default function FindsBottomNav() {
  const { pathname } = useLocation()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {TABS.map(({ to, label, icon: Icon }) => {
        const active = pathname === to || pathname.startsWith(to + '/')
        return (
          <Link key={to} to={to}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-bold transition-colors ${active ? 'text-[#0064FF]' : 'text-slate-400 hover:text-slate-600'}`}>
            <Icon size={20} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

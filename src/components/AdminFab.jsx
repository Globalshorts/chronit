import { Link, useLocation } from 'react-router-dom'
import { useIsAdmin } from '../lib/useIsAdmin'

// super_admin 좌하단 플로팅 바로가기.
// 2026-09-12: 상시 렌더에서 제외 — 관리자 진입은 AppShell 사이드바의 '관리자' 항목으로 이동.
// 판별 기준은 useIsAdmin(subscriptions.role === 'super_admin')으로 사이드바와 공유한다.
export default function AdminFab() {
  const isAdmin = useIsAdmin()
  const { pathname } = useLocation()

  if (!isAdmin || pathname.startsWith('/admin')) return null

  return (
    <Link
      to="/admin"
      title="관리자"
      aria-label="관리자"
      className="fixed bottom-6 left-6 z-[60] hidden h-12 w-12 items-center justify-center md:flex rounded-full bg-gray-900 text-xl text-white shadow-xl ring-2 ring-[#0064FF]/40 transition-all hover:bg-[#0064FF] active:scale-90"
    >
      👑
    </Link>
  )
}

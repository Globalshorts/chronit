import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

/**
 * 사이트 공통 상단 네비게이션 (데스크톱: 호버 드롭다운).
 * 상위 메뉴는 항상 고정, 마우스 호버 시 하위 메뉴 노출.
 * 모바일에서는 각 헤더의 햄버거 메뉴를 사용(이 컴포넌트는 md+에서만 표시).
 */
export const SITE_MENUS = [
  { key: 'service', label: '서비스', items: [
    ['/#features', '기능'],
    ['/#faq', '자주 묻는 질문'],
    ['/#pricing', '가격 안내'],
    ['/manual', '사용 방법'],
  ] },
  { key: 'community', label: '커뮤니티', items: [
    ['/board', '공지·이벤트'],
    ['https://cafe.naver.com/chronit', '공식 카페'],
  ] },
]

const NavLink = ({ to, children, className }) =>
  to.startsWith('http')
    ? <a href={to} target="_blank" rel="noreferrer" className={className}>{children}</a>
    : to.startsWith('/#')
    ? <a href={to} className={className}>{children}</a>
    : <Link to={to} className={className}>{children}</Link>

const SiteNav = ({ active = null }) => (
  <nav className="hidden items-center gap-8 text-base font-bold tracking-wide text-slate-500 md:flex">
    {SITE_MENUS.map(menu => {
      const isActive = menu.items.some(([to]) => to === active || to.replace('/#', '/') === active)
      return (
        <div key={menu.key} className="group relative">
          <button className={`flex items-center gap-1 uppercase transition-colors ${isActive ? 'text-[#03C75A]' : 'group-hover:text-[#03C75A]'}`}>
            {menu.label}
            <ChevronDown size={15} className="transition-transform group-hover:rotate-180" />
          </button>
          {/* 호버 시 하단 하위 메뉴 (pt-3로 버튼-패널 사이 호버 끊김 방지) */}
          <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
            <div className="flex min-w-[150px] flex-col gap-0.5 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl shadow-black/5">
              {menu.items.map(([to, label]) => (
                <NavLink key={to} to={to}
                  className={`rounded-xl px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 hover:text-[#03C75A] ${active === to ? 'text-[#03C75A]' : 'text-gray-600'}`}>
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )
    })}
  </nav>
)

export default SiteNav

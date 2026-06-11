import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Coins, User, Menu, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

/**
 * 사이트 공통 헤더 (커뮤니티·정보 페이지 공용).
 * - active: 'manual' | 'board' | 'points' | 'shop' | 'events' | 'me'
 * - 로그인 시 포인트 pill + 마이페이지(닉네임) 버튼, 모바일 메뉴 포함
 */
const NAV = [
  ['/manual', '사용 방법', 'manual'],
  ['/board', '게시판', 'board'],
  ['/points', '포인트', 'points'],
  ['/shop', '교환소', 'shop'],
]

const CommunityHeader = ({ active = null }) => {
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState(null)
  const [points, setPoints] = useState(null)
  const [nickname, setNickname] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) { setPoints(null); setNickname(null); return }
    supabase.rpc('get_my_points_rpc').then(({ data }) => setPoints(data ?? 0))
    supabase.from('profiles').select('nickname').eq('id', user.id).maybeSingle()
      .then(({ data }) => setNickname(data?.nickname ?? null))
  }, [user])

  const navCls = (key) =>
    `uppercase transition-colors ${active === key ? 'text-[#03C75A]' : 'hover:text-[#03C75A]'}`

  return (
    <>
      <header className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${scrolled ? 'border-b border-gray-200 bg-white/90 py-3 backdrop-blur-xl md:py-4' : 'bg-transparent py-5 md:py-8'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2 md:gap-3">
            <img src="https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/icon.png" alt="Chronit" className="h-8 w-8 shrink-0 rounded-lg md:h-10 md:w-10" />
            <h1 className="text-2xl font-black tracking-tighter text-gray-900 md:text-3xl">Chronit</h1>
          </Link>

          <nav className="hidden gap-8 text-base font-bold tracking-wide text-slate-500 md:flex">
            {NAV.map(([to, label, key]) => (
              <Link key={key} to={to} className={navCls(key)}>{label}</Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {user ? (
              <>
                <Link to="/points" className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-2 text-sm font-bold text-amber-600 ring-1 ring-amber-200 transition-all hover:bg-amber-100 active:scale-95 md:px-3.5">
                  <Coins size={16} />
                  {points === null ? '…' : `${points.toLocaleString()}P`}
                </Link>
                <Link to="/me" className="hidden items-center gap-1.5 rounded-full bg-gray-900 px-3.5 py-2 text-sm font-bold text-white transition-all hover:bg-[#03C75A] active:scale-95 md:flex">
                  <User size={16} /> <span className="max-w-[90px] truncate">{nickname || '마이페이지'}</span>
                </Link>
              </>
            ) : (
              <Link to="/generate" className="hidden rounded-full bg-[#03C75A] px-7 py-2.5 text-base font-bold whitespace-nowrap text-white shadow-lg shadow-[#03C75A]/25 transition-all hover:bg-[#02b350] active:scale-95 md:block">
                로그인 / 시작하기
              </Link>
            )}
            <button onClick={() => setMenuOpen((v) => !v)} aria-label="메뉴"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition-all hover:border-gray-400 md:hidden">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 메뉴 */}
      <div className={`fixed top-0 right-0 left-0 z-40 transform pt-[76px] transition-all duration-300 ease-in-out md:hidden ${menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="border-b border-gray-200 bg-white px-6 py-5 shadow-lg">
          <nav className="flex flex-col gap-1 text-lg font-bold text-gray-700">
            {NAV.map(([to, label, key]) => (
              <Link key={key} to={to} onClick={() => setMenuOpen(false)}
                className={`rounded-xl px-4 py-3.5 transition-colors hover:bg-gray-50 ${active === key ? 'text-[#03C75A]' : 'hover:text-[#03C75A]'}`}>{label}</Link>
            ))}
          </nav>
          <div className="mt-3 border-t border-gray-200 pt-3">
            {user ? (
              <Link to="/me" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3.5 text-lg font-bold text-white">
                <User size={18} /> {nickname || '마이페이지'} <span className="ml-auto text-sm font-medium text-white/70">마이페이지 →</span>
              </Link>
            ) : (
              <Link to="/generate" onClick={() => setMenuOpen(false)} className="block rounded-xl bg-[#03C75A] px-4 py-3.5 text-center text-lg font-bold text-white">로그인 / 시작하기</Link>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default CommunityHeader

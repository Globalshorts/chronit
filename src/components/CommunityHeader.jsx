import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Coins, User } from 'lucide-react'
import { supabase } from '../lib/supabase'

/**
 * 커뮤니티/포인트/교환소 공통 헤더.
 * - active: 'board' | 'points' | 'shop' 중 현재 페이지 강조
 * - 로그인 시 현재 포인트 잔액 pill 노출(→ /points)
 */
const CommunityHeader = ({ active = null }) => {
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState(null)
  const [points, setPoints] = useState(null)
  const [nickname, setNickname] = useState(null)

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
    <header className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${scrolled ? 'border-b border-gray-200 bg-white/90 py-3 backdrop-blur-xl md:py-4' : 'bg-transparent py-5 md:py-8'}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-2 md:gap-3">
          <img src="https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/icon.png" alt="Chronit" className="h-8 w-8 shrink-0 rounded-lg md:h-10 md:w-10" />
          <h1 className="text-2xl font-black tracking-tighter text-gray-900 md:text-3xl">Chronit</h1>
        </Link>
        <nav className="hidden gap-10 text-base font-bold tracking-wide text-slate-500 md:flex">
          <Link to="/board"  className={navCls('board')}>게시판</Link>
          <Link to="/points" className={navCls('points')}>포인트</Link>
          <Link to="/shop"   className={navCls('shop')}>교환소</Link>
          <Link to="/events" className="uppercase transition-colors hover:text-[#03C75A]">이벤트</Link>
        </nav>
        {user ? (
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/points" className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-2 text-sm font-bold text-amber-600 ring-1 ring-amber-200 transition-all hover:bg-amber-100 active:scale-95 md:px-4">
              <Coins size={16} />
              {points === null ? '…' : `${points.toLocaleString()}P`}
            </Link>
            <Link to="/me" className="flex items-center gap-1.5 rounded-full bg-gray-900 px-3.5 py-2 text-sm font-bold text-white transition-all hover:bg-[#03C75A] active:scale-95">
              <User size={16} />
              <span className="max-w-[90px] truncate">{nickname || '마이페이지'}</span>
            </Link>
          </div>
        ) : (
          <Link to="/generate" className="shrink-0 rounded-full bg-[#03C75A] px-4 py-2 text-sm font-bold whitespace-nowrap text-white shadow-lg shadow-[#03C75A]/25 transition-all hover:bg-[#02b350] active:scale-95 md:px-7 md:py-2.5 md:text-base">
            로그인 / 시작하기
          </Link>
        )}
      </div>
    </header>
  )
}

export default CommunityHeader

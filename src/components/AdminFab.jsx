import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// super_admin 에게만 모든 페이지 좌하단에 뜨는 관리자 바로가기.
export default function AdminFab() {
  const [isAdmin, setIsAdmin] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    let alive = true
    const check = async (uid) => {
      if (!uid) { if (alive) setIsAdmin(false); return }
      const { data } = await supabase.from('subscriptions').select('role').eq('user_id', uid).maybeSingle()
      if (alive) setIsAdmin(data?.role === 'super_admin')
    }
    supabase.auth.getSession().then(({ data }) => check(data.session?.user?.id))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => check(s?.user?.id))
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  if (!isAdmin || pathname.startsWith('/admin')) return null

  return (
    <Link
      to="/admin"
      title="관리자"
      aria-label="관리자"
      className="fixed bottom-6 left-6 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-xl text-white shadow-xl ring-2 ring-[#03C75A]/40 transition-all hover:bg-[#03C75A] active:scale-90"
    >
      👑
    </Link>
  )
}

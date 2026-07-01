import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// super_admin 에게만 모든 페이지 좌하단에 뜨는 관리자 바로가기.
// ⚠️ onAuthStateChange 콜백 안에서는 절대 supabase 조회를 호출하지 않는다
//    (supabase-js 데드락 → 앱 전체 멈춤). uid만 저장하고, 역할 조회는 별도 effect에서.
export default function AdminFab() {
  const [uid, setUid] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const { pathname } = useLocation()

  // 1) 세션 추적 — 콜백에서는 uid만 갱신 (조회 금지)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUid(data.session?.user?.id ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user?.id ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  // 2) 역할 조회 — 인증 콜백 바깥(별도 effect)에서 실행
  useEffect(() => {
    if (!uid) { setIsAdmin(false); return }
    let alive = true
    supabase.from('subscriptions').select('role').eq('user_id', uid).maybeSingle()
      .then(({ data }) => { if (alive) setIsAdmin(data?.role === 'super_admin') })
    return () => { alive = false }
  }, [uid])

  if (!isAdmin || pathname.startsWith('/admin')) return null

  return (
    <Link
      to="/admin"
      title="관리자"
      aria-label="관리자"
      className="fixed bottom-6 left-6 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-xl text-white shadow-xl ring-2 ring-[#0064FF]/40 transition-all hover:bg-[#0064FF] active:scale-90"
    >
      👑
    </Link>
  )
}

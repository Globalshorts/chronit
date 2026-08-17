import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AdminManage from './AdminManage'

export default function Manage() {
  const [session, setSession] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      if (!session) { setLoading(false); return }
      const { data: sub } = await supabase.from('subscriptions').select('role').eq('user_id', session.user.id).single()
      setIsAdmin(sub?.role === 'super_admin')
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8] text-sm text-gray-400">불러오는 중…</div>
  if (!session) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FAFAF8]">
      <p className="text-gray-600">로그인이 필요해요.</p>
      <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} className="rounded-xl bg-[#0064FF] px-6 py-2.5 text-sm font-bold text-white">구글로 로그인</button>
    </div>
  )
  if (!isAdmin) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FAFAF8]">
      <p className="text-gray-600">관리자 전용 페이지예요.</p>
      <Link to="/" className="text-sm font-bold text-[#0064FF]">홈으로</Link>
    </div>
  )
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-gray-900">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3">
        <div className="flex items-center gap-2"><span>👑</span><h1 className="text-base font-bold">회원·결제 관리</h1></div>
        <div className="flex items-center gap-1.5 text-sm">
          <Link to="/" className="rounded-lg border border-gray-200 px-3 py-1.5 font-bold text-gray-600 transition hover:text-[#0064FF]">홈</Link>
          <Link to="/admin" className="rounded-lg border border-gray-200 px-3 py-1.5 font-bold text-gray-600 transition hover:text-[#0064FF]">콘텐츠 관리</Link>
          <button onClick={() => supabase.auth.signOut()} className="rounded-lg border border-gray-200 px-3 py-1.5 font-bold text-gray-600 transition hover:text-red-500">로그아웃</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <AdminManage session={session} />
      </main>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// super_admin 판별 (subscriptions.role === 'super_admin').
// 관리자 전용 UI(사이드바 '관리자' 항목 등)에서 이 훅 하나만 쓴다.
// ⚠️ onAuthStateChange 콜백 안에서는 절대 supabase 조회를 호출하지 않는다
//    (supabase-js 데드락 → 앱 전체 멈춤). uid만 저장하고, 역할 조회는 별도 effect에서.
export function useIsAdmin() {
  const [uid, setUid] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

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

  return isAdmin
}

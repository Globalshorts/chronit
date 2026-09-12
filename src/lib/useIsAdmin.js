import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// 내 subscriptions.role 을 반환 ('super_admin' | 'partner' | 'user' | null).
// 관리자·파트너 전용 UI(사이드바 탭 등)는 이 훅 하나만 쓴다.
// ⚠️ onAuthStateChange 콜백 안에서는 절대 supabase 조회를 호출하지 않는다
//    (supabase-js 데드락 → 앱 전체 멈춤). uid만 저장하고, 역할 조회는 별도 effect에서.
export function useMyRole() {
  const [uid, setUid] = useState(null)
  const [role, setRole] = useState(null)

  // 1) 세션 추적 — 콜백에서는 uid만 갱신 (조회 금지)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUid(data.session?.user?.id ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user?.id ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  // 2) 역할 조회 — 인증 콜백 바깥(별도 effect)에서 실행
  useEffect(() => {
    if (!uid) { setRole(null); return }
    let alive = true
    supabase.from('subscriptions').select('role').eq('user_id', uid).maybeSingle()
      .then(({ data }) => { if (alive) setRole(data?.role ?? 'user') })
    return () => { alive = false }
  }, [uid])

  return role
}

// super_admin 판별 (subscriptions.role === 'super_admin')
export function useIsAdmin() {
  return useMyRole() === 'super_admin'
}

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// 프로(finds100)·비즈니스(finds300) 구독 중인지 + 관리자 여부.
// 패스트벤치와 샤오홍슈 참고검색이 같은 기준으로 잠긴다 — 기준을 바꿀 땐 여기만 고친다.
// ready: 판정이 끝났는지 (세션을 아직 모르면 false — 잠금 화면이 번쩍이지 않게)
export function useProPlus(session) {
  const uid = session?.user?.id || null
  const anon = !uid || session?.user?.is_anonymous === true
  // 조회 결과는 어느 사용자 것인지와 함께 들고 있다 — 계정이 바뀌면 이전 결과를 쓰지 않는다
  const [sub, setSub] = useState({ uid: null, isProPlus: false, isAdmin: false })

  useEffect(() => {
    if (anon) return
    let alive = true
    supabase.from('subscriptions').select('role, plan, expires_at').eq('user_id', uid).maybeSingle()
      .then(({ data }) => {
        if (!alive) return
        setSub({
          uid,
          isAdmin: data?.role === 'super_admin',
          isProPlus: ['finds100', 'finds300'].includes(data?.plan) && !!data?.expires_at && new Date(data.expires_at) > new Date(),
        })
      }, () => { if (alive) setSub({ uid, isProPlus: false, isAdmin: false }) })
    return () => { alive = false }
  }, [uid, anon])

  if (!session) return { ready: false, isProPlus: false, isAdmin: false }
  if (anon) return { ready: true, isProPlus: false, isAdmin: false }
  const mine = sub.uid === uid
  return { ready: mine, isProPlus: mine && sub.isProPlus, isAdmin: mine && sub.isAdmin }
}

import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { phCapture } from './posthog'

// 카드의 '저장' = 그 계정을 워치리스트에 넣기/빼기.
// 서버가 username 을 소문자로 정규화하므로 비교도 소문자로 한다.
const norm = (u) => String(u || '').trim().toLowerCase().replace(/^@/, '')

// onNeedLogin / onLimit 은 호출부가 모달을 띄우도록 넘겨주는 콜백.
export function useWatchToggle({ enabled, onNeedLogin, onLimit, source } = {}) {
  const [watched, setWatched] = useState([])   // 소문자 username 배열
  const [busy, setBusy] = useState(null)

  const reload = useCallback(() => {
    if (!enabled) { setWatched([]); return }
    supabase.from('watch_accounts').select('username').then(({ data }) => {
      if (Array.isArray(data)) setWatched(data.map((r) => norm(r.username)))
    }, () => {})
  }, [enabled])

  useEffect(() => { reload() }, [reload])

  const isWatched = useCallback((owner) => watched.includes(norm(owner)), [watched])

  const toggle = useCallback(async (owner) => {
    const name = norm(owner)
    if (!name || busy) return
    if (!enabled) { onNeedLogin?.(); return }

    const has = watched.includes(name)
    setBusy(name)
    // 낙관적 반영 — 실패하면 되돌린다
    setWatched((p) => (has ? p.filter((x) => x !== name) : [...p, name]))

    const { data, error } = await supabase.rpc('watch_toggle_account_rpc', { p_username: name, p_add: !has })
    setBusy(null)

    const status = data?.status
    if (error || data?.ok === false) {
      setWatched((p) => (has ? [...p, name] : p.filter((x) => x !== name)))   // 롤백
      if (status === 'limit') { onLimit?.(data?.limit ?? null); return }
      onNeedLogin?.()   // '로그인 필요' 등
      return
    }

    // added / exists → 감시중, removed → 해제
    if (status === 'removed') setWatched((p) => p.filter((x) => x !== name))
    else setWatched((p) => (p.includes(name) ? p : [...p, name]))
    if (status === 'added') { try { phCapture('watch_account_added', { source }) } catch { /* noop */ } }
  }, [enabled, watched, busy, onNeedLogin, onLimit, source])

  return { watched, isWatched, toggle, reload, busy }
}

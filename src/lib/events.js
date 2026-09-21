import { supabase } from './supabase'

// 여정 이벤트 로깅 — 세션별 '마지막 이벤트'가 곧 이탈 지점이다.
// 절대 await 하지 않는다. 로깅이 화면을 1ms도 붙잡으면 안 된다.
// (supabase.rpc 는 Promise 가 아니라 thenable 이라 .catch 가 없다 → .then(null, fn))

const SID_KEY = 'chr_evt_sid'

const newId = () => {
  try { if (crypto?.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return 'x' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// 탭 단위 세션 — sessionStorage 라 탭을 새로 열면 새 여정으로 잡힌다
let cached = ''
export function eventSession() {
  if (cached) return cached
  try {
    cached = sessionStorage.getItem(SID_KEY) || ''
    if (!cached) { cached = newId(); sessionStorage.setItem(SID_KEY, cached) }
  } catch { cached = cached || newId() }
  return cached
}

export function logEvent(event, props) {
  if (!event) return
  try {
    supabase.rpc('log_event_rpc', {
      p_event: event,
      p_props: props || {},
      p_path: typeof location !== 'undefined' ? location.pathname : null,
      p_session: eventSession(),
    }).then(null, () => {})
  } catch { /* noop */ }
}

// 같은 이벤트를 이 탭에서 한 번만 (app_open, fastbench_view 처럼 중복이 의미 없는 것)
const fired = new Set()
export function logEventOnce(event, props) {
  const k = event + '|' + (props ? JSON.stringify(props) : '')
  if (fired.has(k)) return
  fired.add(k)
  logEvent(event, props)
}

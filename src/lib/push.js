import { supabase } from './supabase'

// 웹푸시 구독. 서버 키는 app_config.VAPID_PUBLIC 과 같은 값이어야 한다(공개키라 노출돼도 됨).
const VAPID_PUBLIC = 'BLEz-gyDYAkLLrJ8xBb9JmikhRau-Ru59XYbENLp2qUonC9vDS8xgMFKH-21wGBCHj4y1zSsAgECXFaBTj6ZhTk'
const SW_URL = '/sw.js'

export const pushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

export const pushPermission = () => {
  try { return Notification.permission } catch { return 'default' }
}

// base64url(VAPID) → Uint8Array
const toKey = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const s = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(s)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

let reg = null
export async function registerSW() {
  if (!pushSupported()) return null
  if (reg) return reg
  try {
    reg = await navigator.serviceWorker.register(SW_URL)
    return reg
  } catch { return null }
}

// 이미 구독돼 있는지 (프롬프트를 다시 띄우지 않으려고)
export async function hasSubscription() {
  if (!pushSupported()) return false
  try {
    const r = await navigator.serviceWorker.getRegistration(SW_URL)
    if (!r) return false
    return !!(await r.pushManager.getSubscription())
  } catch { return false }
}

// 권한 요청 → 구독 → 서버 저장.
// 반환: { ok, reason }  reason: unsupported | denied | failed | saved
export async function subscribePush() {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' }
  try {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return { ok: false, reason: 'denied' }

    const r = (await registerSW()) || (await navigator.serviceWorker.ready)
    if (!r) return { ok: false, reason: 'failed' }
    await navigator.serviceWorker.ready

    const sub = (await r.pushManager.getSubscription())
      || (await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(VAPID_PUBLIC) }))

    const j = sub.toJSON()
    const endpoint = j.endpoint || sub.endpoint
    const p256dh = j.keys?.p256dh
    const auth = j.keys?.auth
    if (!endpoint || !p256dh || !auth) return { ok: false, reason: 'failed' }

    const { data, error } = await supabase.rpc('save_push_subscription_rpc', {
      p_endpoint: endpoint, p_p256dh: p256dh, p_auth: auth,
    })
    if (error || data?.ok === false) return { ok: false, reason: 'failed' }
    return { ok: true, reason: 'saved' }
  } catch {
    return { ok: false, reason: 'failed' }
  }
}

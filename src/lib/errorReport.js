import { supabase } from './supabase'

// 오류를 잡아 팝업(리포트 버튼)으로 띄우고, 동의 시 승호 이메일로 전송하는 모듈.
let _open = null          // ErrorReportModal이 등록하는 오프너
let _isOpen = false
const _seen = new Set()   // 세션 내 같은 오류 중복 팝업 방지

// 무시할 노이즈성 오류(브라우저 확장/무해한 관측자 등)
const NOISE = /ResizeObserver loop|Script error\.?$|Non-Error promise rejection/i

export function registerErrorModal(openFn) { _open = openFn }
export function setModalOpen(v) { _isOpen = v }

export function captureError(info = {}) {
  try {
    const message = String(info.message ?? info?.error?.message ?? info ?? 'Unknown error').slice(0, 2000)
    if (!message || NOISE.test(message)) return
    const key = (info.source || 'runtime') + '|' + message.slice(0, 120)
    if (_seen.has(key)) return       // 같은 오류는 세션당 1회만
    _seen.add(key)
    if (_isOpen) return              // 이미 팝업이 떠 있으면 대기
    const payload = {
      source: info.source || 'runtime',
      message,
      stack: String(info.stack ?? info?.error?.stack ?? '').slice(0, 4000),
      context: {
        url: typeof location !== 'undefined' ? location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        jobId: info.jobId ?? null,
        extra: info.extra ?? null,
        ts: new Date().toISOString(),
      },
    }
    if (_open) _open(payload)
  } catch (_) { /* 리포트 자체 오류는 무시 */ }
}

export async function sendErrorReport(payload, memo) {
  let email = null, uid = null
  try { const { data } = await supabase.auth.getUser(); email = data?.user?.email ?? null; uid = data?.user?.id ?? null } catch (_) {}
  return supabase.functions.invoke('report-error', {
    body: { ...payload, userMemo: (memo || '').slice(0, 1000), userEmail: email, userId: uid },
  })
}

let _installed = false
export function installGlobalErrorCapture() {
  if (_installed || typeof window === 'undefined') return
  _installed = true
  window.reportChronitError = captureError   // 수동 트리거(영상 생성 실패 등)
  window.addEventListener('error', (e) => {
    captureError({ source: 'runtime', message: e?.message, stack: e?.error?.stack, extra: { filename: e?.filename, lineno: e?.lineno, colno: e?.colno } })
  })
  window.addEventListener('unhandledrejection', (e) => {
    const r = e?.reason
    captureError({ source: 'promise', message: r?.message ?? String(r), stack: r?.stack })
  })
}

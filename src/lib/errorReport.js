import { supabase } from './supabase'

// 오류를 잡아 팝업(리포트 버튼)으로 띄우고, 동의 시 이메일로 전송하는 모듈.
let _open = null          // ErrorReportModal이 등록하는 오프너
let _isOpen = false
const _seen = new Set()   // 세션 내 같은 오류 중복 팝업 방지

// 무시할 노이즈성 오류(브라우저 확장·중단된 fetch·비디오·청크로드 등 — 대부분 무해)
const NOISE = /ResizeObserver loop|Script error\.?$|Non-Error promise rejection|Load failed|NetworkError|Failed to fetch|AbortError|aborted|The play\(\) request|play\(\) request was interrupted|Loading chunk \d+ failed|ChunkLoadError|cancell?ed|Network request failed/i

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
  // 명시적 트리거(영상 생성/렌더/대본 등 실제 실패)만 팝업을 띄운다.
  window.reportChronitError = captureError
  // 전역 uncaught 에러·rejection은 팝업/전송하지 않는다.
  // (중단된 fetch·비디오 로드·브라우저 확장 등 무해한 오류가 대부분이라 정상 영상에도 팝업이 뜨던 오탐 원인)
  // 진짜 렌더 크래시는 ErrorBoundary(source:'react')가 별도로 잡아 팝업한다.
  window.addEventListener('error', (e) => {
    try { console.warn('[chronit] window error (silent):', e?.message) } catch (_) {}
  })
  window.addEventListener('unhandledrejection', (e) => {
    try { console.warn('[chronit] unhandledrejection (silent):', e?.reason?.message ?? String(e?.reason)) } catch (_) {}
  })
}

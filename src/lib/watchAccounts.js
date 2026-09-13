// 워치리스트 계정 공용 유틸 — 파싱 / 상태 판정.

// 인스타 아이디 규칙: 영문·숫자·마침표·밑줄 1~30자
const VALID = /^[A-Za-z0-9._]{1,30}$/

// 줄바꿈 · 쉼표 · 공백으로 구분된 입력에서 username 만 뽑아낸다.
// '@id' / 'instagram.com/id' / 'https://www.instagram.com/id/' / 'id' 모두 인식.
// returns { valid: string[](중복 제거), invalid: string[] }
export function parseUsernames(text) {
  const valid = []
  const invalid = []
  const seen = new Set()
  String(text || '').split(/[\n,\s]+/).forEach((raw) => {
    let s = raw.trim()
    if (!s) return
    const m = s.match(/instagram\.com\/([^/?#\s]+)/i)
    if (m) s = m[1]
    s = s.replace(/^@/, '').replace(/\/+$/, '').trim()
    if (!s) return
    if (!VALID.test(s)) { invalid.push(raw.trim()); return }
    const k = s.toLowerCase()
    if (seen.has(k)) return
    seen.add(k)
    valid.push(s)
  })
  return { valid, invalid }
}

// watch-scan 의 FAIL_LIMIT 과 동일해야 한다(연속 실패 3회 = 갱신 자동 제외)
export const FAIL_LIMIT = 3
const QUIET_DAYS = 3

// 🔴 응답없음(삭제·비공개·오타 의심) / 🟡 조용함(살아있지만 최근 게시 없음) / 🟢 정상
export function statusOf(a) {
  if ((a?.fail_count ?? 0) >= FAIL_LIMIT) return 'dead'
  const lf = a?.last_found_at ? new Date(a.last_found_at).getTime() : 0
  if (!lf || Date.now() - lf > QUIET_DAYS * 86400000) return 'quiet'
  return 'live'
}

export const STATUS_META = {
  live: { label: '정상', cls: 'bg-emerald-500/15 text-emerald-400' },
  quiet: { label: '조용함', cls: 'bg-amber-500/15 text-amber-400' },
  dead: { label: '응답없음', cls: 'bg-red-500/15 text-red-400' },
}

// 갱신 대상(= 과금 대상): active && (include_dead ? 전체 : fail_count < 3)
export const scanTargets = (accounts, includeDead) =>
  (accounts || []).filter((a) => a.active !== false && (includeDead || (a.fail_count ?? 0) < FAIL_LIMIT))

export const ACCOUNTS_PER_CREDIT = 50
export const creditsFor = (n) => Math.ceil((n || 0) / ACCOUNTS_PER_CREDIT)

export const fmtWhen = (d) => {
  if (!d) return '-'
  const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000)
  if (h < 1) return '방금'
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

// CSV/시트에서 인스타 계정만 뽑아낸다 — 오탐(팔로워수·메모 등)을 거르는 게 목적.
//
// 규칙
//  1) 헤더에 계정/username/handle/아이디/링크/url 열이 있으면 그 열만 본다.
//  2) 없으면 '@핸들' 또는 'instagram.com/' 이 든 셀만 본다. 순수 숫자·평문은 무시.
//  3) URL 은 reel/p/tv/explore/stories 같은 예약 경로를 제외하고 핸들만.
//  4) @·http·슬래시 정리 + 소문자 + 중복 제거.
// 서버(watch_bulk_add_rpc)도 같은 검증을 하지만, 미리보기를 정확히 보여주려면 여기서도 걸러야 한다.

const HEADER_HINTS = ['계정', 'username', 'user name', 'handle', '핸들', '아이디', 'id', '링크', 'url', 'link', '주소']
const RESERVED = new Set(['reel', 'reels', 'p', 'tv', 'explore', 'stories', 's', 'accounts', 'about', 'direct', 'inbox', 'www'])
const VALID = /^[a-z0-9._]{1,30}$/

// 셀 하나 → username | null
export function handleFrom(cell) {
  let t = String(cell ?? '').trim()
  if (!t) return null

  const hasUrl = /instagram\.com/i.test(t)
  const hasAt = t.startsWith('@')
  if (hasUrl) {
    const m = t.match(/instagram\.com\/([^/?#\s]+)/i)
    if (!m) return null
    t = m[1]
  } else if (hasAt) {
    t = t.slice(1)
  }

  t = t.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/[/?#].*$/, '').trim().toLowerCase()
  if (!t) return null
  if (RESERVED.has(t)) return null
  if (/^[0-9]+$/.test(t)) return null      // 팔로워수 같은 숫자 열
  if (!VALID.test(t)) return null
  return t
}

const isHeaderCell = (c) => {
  const t = String(c ?? '').trim().toLowerCase()
  return !!t && HEADER_HINTS.some((h) => t.includes(h))
}

// rows: string[][] (시트/CSV 를 2차원 배열로 넘긴다)
// returns { usernames, headerUsed }
export function extractUsernames(rows) {
  const grid = (rows || []).map((r) => (Array.isArray(r) ? r : [r]))
  if (!grid.length) return { usernames: [], headerUsed: null }

  // 1) 헤더 열 찾기 — 위쪽 5행 안에서
  let headerRow = -1
  let cols = []
  for (let i = 0; i < Math.min(5, grid.length); i++) {
    const idx = grid[i].map((c, j) => (isHeaderCell(c) ? j : -1)).filter((j) => j >= 0)
    if (idx.length) { headerRow = i; cols = idx; break }
  }

  const seen = new Set()
  const out = []
  const take = (cell) => {
    const u = handleFrom(cell)
    if (u && !seen.has(u)) { seen.add(u); out.push(u) }
  }

  if (headerRow >= 0) {
    for (let i = headerRow + 1; i < grid.length; i++) cols.forEach((j) => take(grid[i][j]))
    const headerUsed = cols.map((j) => String(grid[headerRow][j] ?? '').trim()).filter(Boolean).join(', ')
    // 지정 열에서 하나도 못 뽑았으면 전체 훑기로 폴백
    if (out.length) return { usernames: out, headerUsed }
  }

  // 2) 헤더가 없거나 소득이 없으면 — @핸들/인스타 URL 이 든 셀만
  for (const row of grid) {
    for (const cell of row) {
      const t = String(cell ?? '').trim()
      if (!t) continue
      if (!t.startsWith('@') && !/instagram\.com/i.test(t)) continue
      take(t)
    }
  }
  return { usernames: out, headerUsed: null }
}

// CSV 텍스트 → 2차원 배열 (따옴표 안의 쉼표·줄바꿈 처리)
export function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  const raw = String(text || '')
  const src = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw   // 엑셀이 붙이는 BOM 제거
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++ } else quoted = false }
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
    else if (c !== '\r') cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows
}

// 파일 → usernames. xlsx 는 SheetJS 를 동적 import(번들 분리).
export async function readAccountsFile(file) {
  const name = String(file?.name || '').toLowerCase()
  if (/\.(xlsx|xls)$/.test(name)) {
    const XLSX = await import('xlsx')
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const rows = []
    wb.SheetNames.forEach((n) => {
      const sheet = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, blankrows: false, raw: false })
      sheet.forEach((r) => rows.push(r))
    })
    return extractUsernames(rows)
  }
  return extractUsernames(parseCsv(await file.text()))
}

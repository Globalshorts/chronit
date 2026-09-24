// 기기별(모바일/데스크톱) 마지막 방문 페이지 기억 → 재방문 시 그 페이지로.
// 기록이 없으면(첫 온보딩 포함) 기본 트렌드.
const ALLOWED = ['/trend', '/script', '/watchlist', '/finds', '/mypage']
const key = () => 'chr_entry_' + ((typeof window !== 'undefined' && window.innerWidth < 768) ? 'm' : 'd')

export function saveLastPath(path) {
  try {
    if (!path) return
    const base = '/' + (String(path).split('?')[0].split('/')[1] || '')
    if (ALLOWED.includes(base)) localStorage.setItem(key(), base)
  } catch { /* noop */ }
}

export function getEntryPath() {
  try { const v = localStorage.getItem(key()); if (v && ALLOWED.includes(v)) return v } catch { /* noop */ }
  return '/trend'
}

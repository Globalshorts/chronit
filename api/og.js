// /u/:handle 크롤러용 동적 OG(오픈그래프) — 앱 셸(index.html)에 유저 프로필 메타를 주입.
// 사람 브라우저는 그대로 SPA가 부팅되어 LinkPage 렌더, 크롤러(카톡·인스타 등)는 주입된 메타를 읽음.
const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWdxdGJkcG54eGNnendkbHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTU4NTYsImV4cCI6MjA5MjMzMTg1Nn0.G8ZtLSZf9rWRbKlrEUchEmFUEBdV4J2L1s_5rGEPZjY'

function esc(s = '') { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

export default async function handler(req, res) {
  const handle = String((req.query && req.query.handle) || '').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 60)
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'chronit.kr'

  let shell = ''
  try { shell = await (await fetch(`https://${host}/index.html`)).text() } catch (_) {}
  if (!shell) { res.statusCode = 302; res.setHeader('location', '/'); res.end(); return }

  let p = null
  try {
    const r = await fetch(`${SB}/rest/v1/link_pages?handle=eq.${encodeURIComponent(handle)}&active=eq.true&select=title,bio,avatar_url,handle`,
      { headers: { apikey: ANON, authorization: `Bearer ${ANON}` } })
    const rows = await r.json()
    if (Array.isArray(rows) && rows[0]) p = rows[0]
  } catch (_) {}

  if (p) {
    const name = p.title || `@${p.handle}`
    const title = `${name} · 크로닛`
    const desc = p.bio || `${name}님의 링크 모음 · 크로닛`
    const rawImg = p.avatar_url || 'https://chronit.kr/kakao-share.png?v=2'
    // 정사각 로고가 잘리지 않도록 1200x630 여백맞춤(contain)·흰 배경으로 합성 → 선명·풀샷
    const img = `https://wsrv.nl/?url=${encodeURIComponent(rawImg)}&w=1200&h=630&fit=contain&bg=white&output=png`
    const urlAbs = `https://chronit.kr/u/${handle}`
    const setMeta = (html, key, val, attr = 'property') => {
      const re = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`)
      return re.test(html) ? html.replace(re, `$1${esc(val)}$2`) : html
    }
    shell = shell.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    shell = setMeta(shell, 'og:title', title)
    shell = setMeta(shell, 'og:description', desc)
    shell = setMeta(shell, 'og:image', img)
    // 크기 힌트 주입(플랫폼이 재측정 없이 정확히 렌더)
    shell = shell.replace(/(<meta property="og:image" content="[^"]*" \/>)/,
      `$1\n    <meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />`)
    shell = shell.replace(/<meta name="twitter:card" content="[^"]*"/, '<meta name="twitter:card" content="summary_large_image"')
    shell = setMeta(shell, 'og:url', urlAbs)
    shell = setMeta(shell, 'og:type', 'profile')
    shell = setMeta(shell, 'twitter:title', title, 'name')
    shell = setMeta(shell, 'twitter:description', desc, 'name')
    shell = setMeta(shell, 'twitter:image', img, 'name')
  }

  res.statusCode = 200
  res.setHeader('content-type', 'text/html; charset=utf-8')
  res.setHeader('cache-control', 's-maxage=300, stale-while-revalidate=600')
  res.end(shell)
}

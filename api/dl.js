// 영상 다운로드 프록시 — fbcdn/인스타 CDN 영상을 서버에서 받아 첨부파일로 내려준다.
// 클라이언트가 fbcdn URL을 직접 fetch하면 CORS로 막혀 blob을 못 만든다(그래서 그냥 새 탭만 열렸음).
// 같은 오리진(/api/dl)을 거치면 Content-Disposition: attachment 로 정상 다운로드된다.
const ALLOW = /(^|\.)(cdninstagram\.com|fbcdn\.net|instagram\.com)$/i

export default async function handler(req, res) {
  try {
    const src = String((req.query && req.query.src) || '')
    const name = (String((req.query && req.query.name) || 'clip.mp4').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 80)) || 'clip.mp4'
    if (!src) { res.statusCode = 400; res.end('missing src'); return }
    let host = ''
    try { host = new URL(src).hostname } catch { res.statusCode = 400; res.end('bad src'); return }
    if (!ALLOW.test(host)) { res.statusCode = 403; res.end('host not allowed'); return }

    const upstream = await fetch(src, { headers: { 'user-agent': 'Mozilla/5.0', 'accept': '*/*' } })
    if (!upstream.ok) { res.statusCode = 502; res.end('upstream ' + upstream.status); return }

    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'video/mp4')
    const len = upstream.headers.get('content-length'); if (len) res.setHeader('Content-Length', len)
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`)
    res.setHeader('Cache-Control', 'private, no-store')

    const buf = Buffer.from(await upstream.arrayBuffer())
    res.statusCode = 200
    res.end(buf)
  } catch (e) {
    res.statusCode = 500; res.end('proxy error')
  }
}

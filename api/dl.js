// 영상 다운로드 프록시 — fbcdn/인스타 CDN 영상을 서버에서 받아 첨부파일로 내려준다.
// 핵심: 클라가 await(신선 URL 받기) 후 다운로드를 트리거하면 iOS/모바일이 사용자 제스처로
//       인정하지 않아 차단된다. 그래서 shortcode만 받으면 서버가 신선 URL을 해석(trend-reel)하고
//       바로 스트리밍한다 → 클라는 await 없이 /api/dl?shortcode=.. 로 즉시 이동만 하면 된다.
// 스트리밍(파이프)으로 큰 영상도 메모리에 통째로 안 올린다.
import { Readable } from 'stream'

const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
// anon 키는 공개값(프론트 번들에도 포함). trend-reel 호출용.
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWdxdGJkcG54eGNnendkbHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTU4NTYsImV4cCI6MjA5MjMzMTg1Nn0.G8ZtLSZf9rWRbKlrEUchEmFUEBdV4J2L1s_5rGEPZjY'
const ALLOW = /(^|\.)(cdninstagram\.com|fbcdn\.net|instagram\.com)$/i

export const config = { maxDuration: 60 }

async function resolveFromShortcode(sc) {
  try {
    const r = await fetch(`${SB}/functions/v1/trend-reel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON}`, 'apikey': ANON },
      body: JSON.stringify({ shortcode: sc }),
    })
    if (!r.ok) return ''
    const j = await r.json().catch(() => ({}))
    return (j && j.video_url) || ''
  } catch { return '' }
}

export default async function handler(req, res) {
  try {
    const q = req.query || {}
    const name = (String(q.name || 'clip.mp4').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 80)) || 'clip.mp4'
    let src = String(q.src || '')
    // src가 없거나 만료 가능 → shortcode로 서버에서 신선 URL 해석
    if ((!src || q.shortcode) && q.shortcode) {
      const fresh = await resolveFromShortcode(String(q.shortcode))
      if (fresh) src = fresh
    }
    if (!src) { res.statusCode = 404; res.end('no source'); return }
    let host = ''
    try { host = new URL(src).hostname } catch { res.statusCode = 400; res.end('bad src'); return }
    if (!ALLOW.test(host)) { res.statusCode = 403; res.end('host not allowed'); return }

    const upstream = await fetch(src, { headers: { 'user-agent': 'Mozilla/5.0', 'accept': '*/*' } })
    if (!upstream.ok || !upstream.body) { res.statusCode = 502; res.end('upstream ' + upstream.status); return }

    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'video/mp4')
    const len = upstream.headers.get('content-length'); if (len) res.setHeader('Content-Length', len)
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`)
    res.setHeader('Cache-Control', 'private, no-store')
    res.statusCode = 200
    // 통째 버퍼링 대신 스트리밍
    Readable.fromWeb(upstream.body).pipe(res)
  } catch (e) {
    try { res.statusCode = 500; res.end('proxy error') } catch { /* noop */ }
  }
}

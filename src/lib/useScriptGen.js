import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import { logEvent } from './events'

const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const FN = (n) => `${SB}/functions/v1/${n}`

// 대본 작성 2단계 공용 훅 — 트렌드/워치리스트 공용.
// 1번 클릭: 백그라운드 대본 생성(과금) → 화면 유지. 준비되면 2번째 클릭: 베라로 이동.
export function useScriptGen() {
  const nav = useNavigate()
  const [scriptGen, setScriptGen] = useState({})   // { [shortcode]: { status:'generating'|'ready'|'error', jobId, error } }

  const genScriptBg = async (it, thumb) => {
    const { data: { session: s } } = await supabase.auth.getSession()
    const t = s?.access_token
    if (!t) throw new Error('로그인이 필요해요')
    let niche = '', persona = ''
    try { const { data: pf } = await supabase.from('profiles').select('niche,persona').eq('id', s.user.id).maybeSingle(); niche = pf?.niche || ''; persona = pf?.persona || '' } catch { /* noop */ }
    const caption = String(it.caption || '').replace(/\s+/g, ' ').trim()
    let product = '', selling = caption
    try {
      const cacheKey = String(it.shortcode || caption).slice(0, 280) + '|' + niche + '|v9'
      let ad = null
      try { const { data: cached } = await supabase.rpc('get_analyze_cache_rpc', { p_key: cacheKey }); if (cached && cached.ok) ad = cached } catch { /* noop */ }
      if (!ad) {
        const ar = await fetch(FN('analyze-clip'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: caption, source: 'trend', thumbnail_url: thumb || '', niche, persona, video_id: it.shortcode }) })
        ad = await ar.json()
        if (ad?.ok) { try { await supabase.rpc('set_analyze_cache_rpc', { p_key: cacheKey, p_result: ad }) } catch { /* noop */ } }
      }
      if (ad?.ok) { product = ad.product_name || ''; const sp = Array.isArray(ad.selling_points) ? ad.selling_points.filter(Boolean) : []; selling = sp.length ? sp.join(' / ') : caption; if (product) selling = product + ' — ' + selling }
    } catch { /* noop */ }
    const r = await fetch(FN('script-assistant'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate', voice_mode: 'my', source_ref: it.shortcode, product_name: product || caption.split(/[—\-.\n]/)[0].slice(0, 60), selling_points: selling }) })
    const d = await r.json()
    if (!d.ok) { const e = new Error(d.code === 'INSUFFICIENT_CREDITS' ? `이용권이 부족해요 (10턴 세션에 2개 필요)` : (d.error || '대본 생성 실패')); e.code = d.code; throw e }
    return d.job_id
  }

  const startScript = async (it, thumb) => {
    const sc = it.shortcode
    const cur = scriptGen[sc]
    if (cur?.status === 'ready' && cur.jobId) { nav('/script', { state: { open_job: cur.jobId } }); return }
    if (cur?.status === 'generating') return
    setScriptGen((m) => ({ ...m, [sc]: { status: 'generating' } }))
    logEvent('trend_script_start', { shortcode: sc })
    try {
      const jobId = await genScriptBg(it, thumb)
      setScriptGen((m) => ({ ...m, [sc]: { status: 'ready', jobId } }))
    } catch (e) {
      setScriptGen((m) => ({ ...m, [sc]: { status: 'error', error: e.message } }))
      if (e.code === 'INSUFFICIENT_CREDITS') nav('/pricing')
    }
  }

  return { scriptGen, startScript }
}

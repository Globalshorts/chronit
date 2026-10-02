import { useState, createContext, useContext, useCallback, createElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import { logEvent } from './events'

const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const FN = (n) => `${SB}/functions/v1/${n}`

// 대본 작성 2단계 — 트렌드/워치리스트 공용.
// 1번 클릭: 백그라운드 대본 생성(과금) → 화면 유지, 버튼은 '베라에서 확인하기'.
// 2번 클릭: 언제든(생성 중이어도) 베라로 이동. 생성 중이면 awaiting_ref 를 들고 가 베라가 로딩을 띄우고 완료되면 연다.
//
// 상태를 AppShell 레벨 Context 로 올려, 트렌드→베라로 넘어가도(= 트렌드 언마운트) 진행 중 생성이 유실되지 않게 한다.
const ScriptGenContext = createContext(null)

function useProvideScriptGen() {
  const nav = useNavigate()
  // { [shortcode]: { status:'generating'|'ready'|'error', jobId, error, clip } }
  const [scriptGen, setScriptGen] = useState({})

  const genScriptBg = async (it, thumb) => {
    const { data: { session: s } } = await supabase.auth.getSession()
    const t = s?.access_token
    if (!t) throw new Error('로그인이 필요해요')
    let niche = '', persona = ''
    try { const { data: pf } = await supabase.from('profiles').select('niche,persona').eq('id', s.user.id).maybeSingle(); niche = pf?.niche || ''; persona = pf?.persona || '' } catch { /* noop */ }
    const caption = String(it.caption || '').replace(/\s+/g, ' ').trim()
    let product = '', points = '', hookStr = '', targetStr = ''
    try {
      const cacheKey = String(it.shortcode || caption).slice(0, 280) + '|' + niche + '|v9'
      let ad = null
      try { const { data: cached } = await supabase.rpc('get_analyze_cache_rpc', { p_key: cacheKey }); if (cached && cached.ok) ad = cached } catch { /* noop */ }
      if (!ad) {
        const ar = await fetch(FN('analyze-clip'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: caption, source: 'trend', thumbnail_url: thumb || '', niche, persona, video_id: it.shortcode }) })
        ad = await ar.json()
        if (ad?.ok) { try { await supabase.rpc('set_analyze_cache_rpc', { p_key: cacheKey, p_result: ad }) } catch { /* noop */ } }
      }
      if (ad?.ok) { product = ad.product_name || ''; const sp = Array.isArray(ad.selling_points) ? ad.selling_points.filter(Boolean) : []; points = sp.join(' / '); hookStr = ad.hook || ''; targetStr = ad.target || '' }
    } catch { /* noop */ }
    const subject = caption.slice(0, 240)
    const prodName = product || subject.split(/[—\-.\n|·]/)[0].trim().slice(0, 60) || subject.slice(0, 60)
    const anchor = [subject, hookStr && ('이 영상 훅: ' + hookStr), targetStr && ('타깃: ' + targetStr)].filter(Boolean).join(' / ')
    const sellingFinal = [anchor ? ('원본 소재(이 영상이 실제로 다루는 제품/주제 — 반드시 이것으로만 쓰고 절대 다른 상품으로 바꾸지 말 것): ' + anchor) : '', points].filter(Boolean).join('\n')
    const r = await fetch(FN('script-assistant'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate', voice_mode: 'my', source_ref: it.shortcode, product_name: prodName, selling_points: sellingFinal }) })
    const d = await r.json()
    if (!d.ok) { const e = new Error(d.code === 'INSUFFICIENT_CREDITS' ? '이용권이 부족해요 (10턴 세션에 2개 필요)' : (d.error || '대본 생성 실패')); e.code = d.code; throw e }
    return d.job_id
  }

  const startScript = useCallback(async (it, thumb) => {
    const sc = it.shortcode
    const clip = { source_ref: sc, caption: String(it.caption || '').replace(/\s+/g, ' ').trim(), thumb: thumb || it.thumbnail_url || '' }
    const cur = scriptGen[sc]
    // 준비 완료 → 그 대본 열기
    if (cur?.status === 'ready' && cur.jobId) { nav('/script', { state: { open_job: cur.jobId, clip } }); return }
    // 생성 중 → 2차 클릭: 지금 바로 베라로. 베라가 로딩 띄우고 완료되면 연다.
    if (cur?.status === 'generating') { nav('/script', { state: { awaiting_ref: sc, clip } }); return }
    // 첫 클릭 → 백그라운드 생성 시작하고 화면은 유지(버튼이 '베라에서 확인하기'로 바뀜)
    setScriptGen((m) => ({ ...m, [sc]: { status: 'generating', clip } }))
    logEvent('trend_script_start', { shortcode: sc })
    try {
      const jobId = await genScriptBg(it, thumb)
      setScriptGen((m) => ({ ...m, [sc]: { status: 'ready', jobId, clip } }))
    } catch (e) {
      setScriptGen((m) => ({ ...m, [sc]: { status: 'error', error: e.message, clip } }))
      if (e.code === 'INSUFFICIENT_CREDITS') nav('/pricing')
    }
  }, [scriptGen, nav])

  return { scriptGen, startScript }
}

export function ScriptGenProvider({ children }) {
  const value = useProvideScriptGen()
  return createElement(ScriptGenContext.Provider, { value }, children)
}

// Provider 밖(안전장치)에서도 깨지지 않게 — 보통은 AppShell 안에서 공유 상태를 받는다.
export function useScriptGen() {
  const ctx = useContext(ScriptGenContext)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const fallback = useProvideScriptGen()
  return ctx || fallback
}

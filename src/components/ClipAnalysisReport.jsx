import { BarChart3, Sparkles, Play, Download, ExternalLink, Loader2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { loadDetail } from '../lib/trendStore'
import { phCapture } from '../lib/posthog'
import { fmtCount } from '../lib/format'

// 소재 분석 리포트 — 베라 채팅용 다크 카드 (analyze-clip 결과 a 로 렌더)
const HOOK_LABELS = [['curiosity', '호기심 유발'], ['specificity', '구체성'], ['target_fit', '타깃 적중'], ['instant_clarity', '3초 내 명확성']]
const PAYOFF_LABELS = [['need_resolved', '니즈 해소'], ['buy_reason', '구매 근거'], ['impact', '임팩트'], ['clarity', '명확성']]

// 세부 항목 막대 (0~25)
const SubBar = ({ label, val }) => (
  <div>
    <div className="mb-0.5 flex items-center justify-between text-[11px]"><span className="text-white/55">{label}</span><span className="font-bold text-white/75">{val != null ? `${val}` : '—'}<span className="text-white/30">/25</span></span></div>
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#0064FF]" style={{ width: `${Math.max(0, Math.min(100, (Number(val) || 0) / 25 * 100))}%` }} /></div>
  </div>
)

// 총점 + 세부 내역(왜 이 점수인지)
const ScoreBlock = ({ title, score, bd, labels }) => (
  <div className="rounded-xl bg-white/5 p-3">
    <div className="mb-2 flex items-baseline justify-between">
      <span className="text-[12px] font-bold text-white/70">{title}</span>
      <span className="text-[18px] font-extrabold leading-none text-[#5AA0FF]">{score != null ? score : '—'}<span className="ml-0.5 text-[11px] font-bold text-white/35">/100</span></span>
    </div>
    {bd && typeof bd === 'object' ? (
      <div className="space-y-1.5">{labels.map(([k, lab]) => <SubBar key={k} label={lab} val={bd[k]} />)}</div>
    ) : null}
  </div>
)

// 실제 성과 수치 칸
const Stat = ({ label, val }) => (
  <div className="rounded-lg bg-white/5 py-2">
    <div className="text-[13px] font-extrabold text-white/85">{val}</div>
    <div className="mt-0.5 text-[10px] text-white/45">{label}</div>
  </div>
)

export default function ClipAnalysisReport({ a, shortcode }) {
  const [d, setD] = useState(null)
  const [video, setVideo] = useState('')       // 현재 재생 가능한 video_url
  const [vstate, setVstate] = useState('idle')  // idle | loading | playing | expired
  const [dl, setDl] = useState(false)
  const triedFresh = useRef(false)
  const freshRef = useRef(false)   // trend-reel로 받은 신선 URL 보유 여부
  useEffect(() => {
    if (!shortcode) return
    let alive = true
    freshRef.current = false; triedFresh.current = false
    loadDetail(shortcode).then((det) => { if (alive && det) { setD(det); setVideo(det.video_url || '') } })
    // 리포트가 뜨는 즉시 신선 URL을 백그라운드로 미리 받아둔다 → 재생 클릭 시 바로 재생
    ;(async () => { try { const { data } = await supabase.functions.invoke('trend-reel', { body: { shortcode } }); if (alive && data?.video_url) { setVideo(data.video_url); freshRef.current = true } } catch { /* noop */ } })()
    return () => { alive = false }
  }, [shortcode])
  const thumb = d?.thumbnail_url || (Array.isArray(d?.images) ? d.images[0] : '') || ''
  const refresh = async () => {
    try { const { data } = await supabase.functions.invoke('trend-reel', { body: { shortcode } }); if (data?.video_url) { setVideo(data.video_url); freshRef.current = true; return data.video_url } } catch { /* noop */ }
    return ''
  }
  const onPlay = async () => {
    if (freshRef.current && video) { setVstate('playing'); return }   // 프리페치 완료 → 즉시 재생
    setVstate('loading')
    const u = await refresh()
    setVstate(u ? 'playing' : 'expired')
  }
  const onVidError = async () => {
    if (triedFresh.current) { setVstate('expired'); return }
    triedFresh.current = true
    const u = await refresh()
    if (!u) setVstate('expired')
  }
  const onDownload = () => {
    // 핵심: shortcode 가 있으면 '누르는 그 순간' 서버(/api/dl)가 새로 URL을 해석하게 한다.
    //   리포트가 뜰 때 미리 받아둔 video(fbcdn)는 몇 분 지나면 서명이 만료돼서, src= 로 주면
    //   데스크톱·모바일 가리지 않고 502 로 깨진다. shortcode= 로 넘기면 서버가 그때그때 신선 URL을 뽑는다.
    // await 없이 즉시 <a> 클릭 → 모바일 제스처도 유지.
    const name = `${shortcode || 'clip'}.mp4`
    const via = shortcode ? 'shortcode' : (video ? 'src' : 'none')
    const dlUrl = shortcode
      ? `/api/dl?shortcode=${encodeURIComponent(shortcode)}&name=${encodeURIComponent(name)}`
      : (video ? `/api/dl?src=${encodeURIComponent(video)}&name=${encodeURIComponent(name)}` : '')
    try { phCapture('clip_download', { shortcode: shortcode || null, via }) } catch { /* noop */ }
    if (!dlUrl) { setVstate('expired'); return }
    const link = document.createElement('a')
    link.href = dlUrl; link.download = name
    document.body.appendChild(link); link.click(); link.remove()
    // 스피너는 잠깐만 (서버가 받는 동안 피드백). 다운로드는 이미 브라우저가 처리 중.
    setDl(true); setTimeout(() => setDl(false), 2500)
  }
  if (!a) return null
  const cs = a.comment_sentiment || {}
  const hasCs = (cs.purchase_intent || cs.positive || cs.question || cs.complaint)
  const rx = a.remix || {}
  const C = 2 * Math.PI * 14
  const segs = [['구매의도', cs.purchase_intent || 0, '#0064FF'], ['긍정', cs.positive || 0, '#22C55E'], ['질문', cs.question || 0, '#F59E0B'], ['불만', cs.complaint || 0, '#EF4444']]
  const tot = segs.reduce((s, b) => s + b[1], 0) || 100
  let acc = 0
  return (
    <div className="w-full rounded-2xl glass p-4">
      <div className="mb-3 flex items-center gap-1.5 text-sm font-bold text-white"><BarChart3 size={15} className="text-[#5AA0FF]" /> 소재 분석{a.product_name ? <span className="text-white/50">· {a.product_name}</span> : null}</div>

      <div className="space-y-2">
        <ScoreBlock title="훅 · 첫 3초" score={a.hook_score} bd={a.hook_breakdown} labels={HOOK_LABELS} />
        <ScoreBlock title="페이오프 · 결말" score={a.payoff_score} bd={a.payoff_breakdown} labels={PAYOFF_LABELS} />
      </div>

      {a.performance && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 text-[12px] font-bold text-white/60">실제 성과 <span className="font-medium text-white/30">· 인스타 지표</span></div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="조회" val={a.performance.views != null ? fmtCount(a.performance.views) : '—'} />
            <Stat label="좋아요" val={a.performance.likes != null ? fmtCount(a.performance.likes) : '—'} />
            <Stat label="댓글" val={a.performance.comments != null ? fmtCount(a.performance.comments) : '—'} />
            <Stat label="팔로워" val={a.performance.followers != null ? fmtCount(a.performance.followers) : '—'} />
            <Stat label="댓글/팔로워" val={a.performance.comment_per_follower != null ? `${(a.performance.comment_per_follower * 100).toFixed(2)}%` : '—'} />
            <Stat label="구매의도 댓글" val={a.comment_analyzed ? `${a.performance.cta_signal || 0}%` : '—'} />
          </div>
        </div>
      )}

      {a.hook && (
        <div className="mt-3 rounded-xl bg-white/5 p-3">
          <div className="text-[12px] font-bold text-[#5AA0FF]">훅 · 첫 3초{a.hook_type ? ` (${a.hook_type})` : ''}</div>
          <div className="mt-0.5 text-[13px] text-white/85">{a.hook}</div>
          {a.hook_why && <div className="mt-1 text-[12px] leading-relaxed text-white/55">{a.hook_why}</div>}
        </div>
      )}

      {Array.isArray(a.selling_points) && a.selling_points.length > 0 && (
        <div className="mt-3">
          <div className="text-[12px] font-bold text-white/70">셀링포인트</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-white/80">{a.selling_points.map((sp, i) => <li key={i}>{sp}</li>)}</ul>
        </div>
      )}
      {(a.structure || a.target) && (
        <div className="mt-3 space-y-1 text-[13px] text-white/75">
          {a.structure && <div><span className="text-white/45">구성 · </span>{a.structure}</div>}
          {a.target && <div><span className="text-white/45">타깃 · </span>{a.target}</div>}
        </div>
      )}

      {hasCs && (
        <div className="mt-3 flex items-center gap-4 rounded-xl bg-white/5 p-3">
          <svg viewBox="0 0 40 40" className="h-20 w-20 shrink-0 -rotate-90">
            {segs.map(([n, v, col]) => { const frac = v / tot; const el = <circle key={n} cx="20" cy="20" r="14" fill="none" stroke={col} strokeWidth="8" strokeDasharray={`${(frac * C).toFixed(2)} ${C.toFixed(2)}`} strokeDashoffset={`${(-acc * C).toFixed(2)}`} />; acc += frac; return el })}
          </svg>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-white/70">
            <div><span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: '#0064FF' }} />구매의도 {cs.purchase_intent || 0}%</div>
            <div><span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: '#22C55E' }} />긍정 {cs.positive || 0}%</div>
            <div><span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: '#F59E0B' }} />질문 {cs.question || 0}%</div>
            <div><span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: '#EF4444' }} />불만 {cs.complaint || 0}%</div>
          </div>
        </div>
      )}

      {(rx.hook_ideas?.length || rx.edit_script?.length || rx.differentiation?.length) ? (
        <div className="mt-3 rounded-xl border border-[#0064FF]/25 bg-[#0064FF]/[0.06] p-3">
          <div className="mb-1.5 flex items-center gap-1 text-[12px] font-bold text-[#5AA0FF]"><Sparkles size={12} /> 내 걸로 만들기</div>
          {rx.hook_ideas?.length > 0 && <div className="mb-1.5"><div className="text-[12px] font-bold text-white/70">내 상품용 훅</div><ul className="mt-0.5 list-disc space-y-0.5 pl-5 text-[13px] text-white/80">{rx.hook_ideas.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          {rx.edit_script?.length > 0 && <div className="mb-1.5"><div className="text-[12px] font-bold text-white/70">편집 컷 구성</div><ol className="mt-0.5 list-decimal space-y-0.5 pl-5 text-[13px] text-white/80">{rx.edit_script.map((x, i) => <li key={i}>{x}</li>)}</ol></div>}
          {rx.differentiation?.length > 0 && <div><div className="text-[12px] font-bold text-white/70">차별화 포인트</div><ul className="mt-0.5 list-disc space-y-0.5 pl-5 text-[13px] text-white/80">{rx.differentiation.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        </div>
      ) : null}

      {Array.isArray(a.hashtags) && a.hashtags.length > 0 && <div className="mt-3 text-[12px] text-[#5AA0FF]">{a.hashtags.join(' ')}</div>}

      {shortcode && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 text-[12px] font-bold text-white/60">원본 소재</div>
          <div className="relative mx-auto aspect-[9/16] max-h-[440px] overflow-hidden rounded-lg bg-black/50">
            {vstate === 'playing' && video ? (
              <video key={video} src={video} poster={thumb} controls autoPlay playsInline preload="auto"
                className="absolute inset-0 h-full w-full bg-black object-contain"
                controlsList="noplaybackrate noremoteplayback" onError={onVidError} />
            ) : vstate === 'expired' ? (
              <div className="absolute inset-0 grid place-items-center px-4 text-center text-[13px] leading-relaxed text-white/50">
                원본을 불러올 수 없어요<br />
                <button onClick={onPlay} className="mt-1 inline-block font-bold text-[#5AA0FF] underline">다시 시도</button>
              </div>
            ) : (
              <button onClick={onPlay} disabled={vstate === 'loading'} className="group absolute inset-0">
                {thumb && <img src={thumb} referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-contain opacity-90" />}
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-black/60 text-white transition group-hover:bg-black/80">
                    {vstate === 'loading' ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
                  </span>
                </span>
              </button>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={onDownload} disabled={dl} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/15 bg-white/5 py-2 text-[12px] font-bold text-white/75 transition hover:text-white disabled:opacity-50">{dl ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} 원본 다운로드</button>
          </div>
        </div>
      )}
    </div>
  )
}

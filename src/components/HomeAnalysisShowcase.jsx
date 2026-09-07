import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'

const BLUE = '#0064FF'
const fmt = (n) => { n = Number(n) || 0; return n >= 10000 ? (n / 10000).toFixed(n >= 100000 ? 0 : 1) + '만' : n.toLocaleString('ko-KR') }

export default function HomeAnalysisShowcase() {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  const [clips, setClips] = useState([])
  const [sel, setSel] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect() } }, { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    let alive = true
    supabase.rpc('get_home_showcase_rpc').then(({ data }) => { if (alive && Array.isArray(data)) setClips(data) }).catch(() => {})
    return () => { alive = false }
  }, [])

  if (!clips.length) return <section ref={ref} className="h-2" />

  const c = clips[Math.min(sel, clips.length - 1)]
  const a = c.analysis || {}
  const views = Number(c.view_count) || 0, likes = Number(c.like_count) || 0, cmts = Number(c.comment_count) || 0
  const engScore = views > 0 ? Math.max(0, Math.min(100, Math.round(((likes + cmts * 3) / views) * 800))) : null
  const ageH = c.taken_at ? Math.max(1, Math.round((Date.now() - new Date(c.taken_at).getTime()) / 3600000)) : null
  const vel = c.velocity != null ? Math.round(c.velocity * 10) / 10 : null
  const axes = [
    { label: '참여', kind: '측정', val: engScore },
    { label: '훅 · 첫 3초', kind: '진단', val: a.hook_score },
    { label: '페이오프 · 결말', kind: '진단', val: a.payoff_score },
  ]
  const velPath = (() => {
    const N = 26, W = 100, H = 40, pts = []
    for (let i = 0; i <= N; i++) { const t = i / N; const v = Math.pow(t, 2.1); pts.push([t * W, H - v * (H - 3) - 1.5]) }
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
    return { line, area: line + ` L${W},${H} L0,${H} Z` }
  })()
  const s = a.comment_sentiment || {}
  const donut = [['구매의도', s.purchase_intent || 0, BLUE], ['긍정', s.positive || 0, '#22C55E'], ['질문', s.question || 0, '#F59E0B'], ['불만', s.complaint || 0, '#EF4444']]
  const dtot = donut.reduce((x, y) => x + y[1], 0) || 100
  const C = 2 * Math.PI * 14
  const takeaways = Array.isArray(a.key_takeaways) ? a.key_takeaways : []
  const anim = inView

  return (
    <section ref={ref} className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-white/30">Analyze</div>
        <h2 className="text-center text-3xl font-bold leading-tight text-white break-keep md:text-[2.5rem]">터진 이유를 데이터로 진단합니다</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/50 break-keep md:text-base">
          지금 실제로 터진 쇼핑 릴을 골라, 왜 통했는지 한 화면에서 분석합니다.
        </p>

        <div className="mt-10 flex gap-3 overflow-x-auto pb-2 md:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {clips.map((cl, i) => (
            <button key={cl.shortcode} onMouseEnter={() => setSel(i)} onFocus={() => setSel(i)} onClick={() => setSel(i)}
              className={`group relative aspect-[9/13] w-[104px] shrink-0 overflow-hidden rounded-xl border transition-all md:w-[118px] ${i === sel ? 'border-[#0064FF] ring-2 ring-[#0064FF]/40' : 'border-white/10 opacity-70 hover:opacity-100'}`}>
              <img src={cl.thumb_url} alt={cl.owner} loading="lazy" className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-1.5 pt-6 text-left">
                <div className="truncate text-[10px] font-bold text-white">@{cl.owner}</div>
                <div className="text-[9px] text-white/70">조회 {fmt(cl.view_count)}</div>
              </div>
              {cl.velocity != null && <div className="absolute right-1 top-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold text-[#7DA2FF]">↑{Math.round(cl.velocity)}</div>}
            </button>
          ))}
        </div>

        <div key={c.shortcode} className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold text-white">“{a.hook || '—'}”</div>
              <div className="mt-0.5 text-[12px] text-white/50">@{c.owner} · Instagram · 조회 {fmt(views)} · 좋아요 {fmt(likes)} · 댓글 {fmt(cmts)}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0064FF]/20 text-[#7DA2FF]"><Sparkles size={14} /></span>
              <span className="text-[13px] font-bold text-white/80">벤치마크 분석</span>
              {a.comment_analyzed ? <span className="text-[12px] text-white/40">· 댓글 {a.comment_analyzed}개</span> : null}
            </div>
          </div>
          <div className="my-5 h-px w-full bg-white/10" />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-5">
              <div>
                <div className="mb-2 text-[13px] font-bold text-white/80">터짐 점수 3축</div>
                {axes.map((b, i) => (
                  <div key={b.label} className="mb-2.5">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-white/55">{b.label} <span className={b.kind === '측정' ? 'text-[#7DA2FF]' : 'text-white/35'}>({b.kind})</span></span>
                      <span className="font-bold text-white/85">{b.val == null ? '—' : b.val}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-[#0064FF] transition-[width] duration-[1000ms] ease-out" style={{ width: anim ? `${b.val || 0}%` : '0%', transitionDelay: `${i * 110}ms` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-white/80">확산 속도 <span className="rounded-full border border-white/15 px-1.5 py-0.5 text-[10px] font-bold text-white/50">진단</span></div>
                <svg viewBox="0 0 100 40" className="h-20 w-full" preserveAspectRatio="none">
                  <path d={velPath.area} fill="rgba(0,100,255,0.14)" />
                  <path d={velPath.line} fill="none" stroke={BLUE} strokeWidth="2.5" vectorEffect="non-scaling-stroke" pathLength="1" strokeDasharray="1" style={{ strokeDashoffset: anim ? 0 : 1, transition: 'stroke-dashoffset 1300ms ease-out' }} />
                </svg>
                <div className="mt-1 flex justify-between text-[11px] text-white/40"><span>업로드 {ageH}h 전</span>{vel != null && <span className="font-bold text-[#7DA2FF]">실측 {vel} 댓글/시간</span>}</div>
              </div>
            </div>

            <div className="space-y-5">
              {dtot > 0 && (
                <div>
                  <div className="mb-2 text-[13px] font-bold text-white/80">댓글 반응 <span className="font-normal text-white/35">샘플 {a.comment_analyzed || 0}개</span></div>
                  <div className="flex items-center gap-4">
                    <svg viewBox="0 0 40 40" className="h-24 w-24 shrink-0 -rotate-90">
                      {(() => { let acc = 0; return donut.map(([n, v, col]) => { const frac = (v || 0) / dtot; const el = <circle key={n} cx="20" cy="20" r="14" fill="none" stroke={col} strokeWidth="8" strokeDasharray={`${(frac * C).toFixed(2)} ${C.toFixed(2)}`} strokeDashoffset={`${(-acc * C).toFixed(2)}`} style={{ opacity: anim ? 1 : 0, transition: `opacity 600ms ease ${acc * 400}ms` }} />; acc += frac; return el }) })()}
                    </svg>
                    <div className="space-y-1.5 text-[13px] leading-tight text-white/70">
                      {donut.map(([n, v, col]) => (
                        <div key={n} className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: col }} />{n} <span className="font-bold text-white/90">{Math.round(((v || 0) / dtot) * 100)}%</span></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {takeaways.length > 0 && (
                <div className="rounded-2xl border border-[#0064FF]/20 bg-[#0064FF]/[0.07] p-4">
                  <div className="mb-2 flex items-center gap-1.5 text-[13px] font-extrabold text-[#7DA2FF]"><Sparkles size={13} />핵심 벤치마크 포인트</div>
                  <ul className="space-y-2">
                    {takeaways.map((t, i) => (
                      <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-white/80"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0064FF]" />{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

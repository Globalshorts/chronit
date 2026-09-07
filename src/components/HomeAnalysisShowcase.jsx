import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'

const BLUE = '#0064FF'
const fmt = (n) => { n = Number(n) || 0; return n >= 10000 ? (n / 10000).toFixed(n >= 100000 ? 0 : 1) + '만' : n.toLocaleString('ko-KR') }

export default function HomeAnalysisShowcase() {
  const rootRef = useRef(null)
  const gridRef = useRef(null)
  const thumbRefs = useRef([])
  const [inView, setInView] = useState(false)
  const [clips, setClips] = useState([])
  const [sel, setSel] = useState(0)
  const [drawn, setDrawn] = useState(false)
  const [cursor, setCursor] = useState({ x: 40, y: 20, click: false, show: false })

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect() } }, { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    let alive = true
    supabase.rpc('get_home_showcase_rpc').then(({ data }) => { if (alive && Array.isArray(data)) setClips(data) }).catch(() => {})
    return () => { alive = false }
  }, [])

  // 선택 바뀔 때 그래프 다시 그려지게
  useEffect(() => {
    setDrawn(false)
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)))
    return () => cancelAnimationFrame(r)
  }, [sel, clips.length])

  // 자동 커서 애니메이션: 썸네일로 이동 → 클릭 → 분석 → 다음
  useEffect(() => {
    if (!inView || clips.length < 2) return
    let alive = true; const timers = []
    const wait = (ms) => new Promise((res) => timers.push(setTimeout(res, ms)))
    const moveTo = (i) => {
      const el = thumbRefs.current[i], g = gridRef.current
      if (!el || !g) return
      const r = el.getBoundingClientRect(), gr = g.getBoundingClientRect()
      setCursor({ x: r.left - gr.left + r.width * 0.5, y: r.top - gr.top + r.height * 0.5, click: false, show: true })
    }
    const run = async () => {
      await wait(600)
      let i = 0
      while (alive) {
        moveTo(i); await wait(950)
        if (!alive) break
        setCursor((c) => ({ ...c, click: true })); await wait(160)
        setSel(i); setCursor((c) => ({ ...c, click: false }))
        await wait(4600)
        i = (i + 1) % clips.length
      }
    }
    run()
    return () => { alive = false; timers.forEach(clearTimeout) }
  }, [inView, clips.length])

  if (!clips.length) return <section ref={rootRef} className="h-2" />

  const c = clips[Math.min(sel, clips.length - 1)]
  const a = c.analysis || {}
  const views = Number(c.view_count) || 0, likes = Number(c.like_count) || 0, cmts = Number(c.comment_count) || 0
  const engScore = views > 0 ? Math.max(0, Math.min(100, Math.round(((likes + cmts * 3) / views) * 800))) : null
  const ageH = c.taken_at ? Math.max(1, Math.round((Date.now() - new Date(c.taken_at).getTime()) / 3600000)) : null
  const vel = c.velocity != null ? Math.round(c.velocity * 10) / 10 : null
  const maxVel = Math.max(...clips.map((x) => Number(x.velocity) || 0), 1)
  const axes = [
    { label: '참여도', kind: '측정', val: engScore },
    { label: '훅 · 첫 3초', kind: '진단', val: a.hook_score },
    { label: '페이오프 · 결말', kind: '진단', val: a.payoff_score },
  ]
  const selling = Array.isArray(a.selling_points) ? a.selling_points.slice(0, 3) : []
  const takeaways = Array.isArray(a.key_takeaways) ? a.key_takeaways.slice(0, 3) : []
  const tags = Array.isArray(a.hashtags) ? a.hashtags.slice(0, 5) : []

  return (
    <section ref={rootRef} className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-white/30">Analyze</div>
        <h2 className="text-center text-3xl font-bold leading-tight text-white break-keep md:text-[2.5rem]">터진 이유를 데이터로 진단합니다</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/50 break-keep md:text-base">
          지금 실제로 터진 쇼핑 릴을 고르면, 왜 통했는지 한 화면에서 분석합니다.
        </p>

        <div ref={gridRef} className="relative mt-10">
          <div className="flex gap-3 overflow-x-auto pb-2 md:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {clips.map((cl, i) => (
              <div key={cl.shortcode} ref={(el) => (thumbRefs.current[i] = el)}
                className={`group relative aspect-[9/13] w-[104px] shrink-0 overflow-hidden rounded-xl border transition-all duration-300 md:w-[118px] ${i === sel ? 'scale-[1.04] border-[#0064FF] ring-2 ring-[#0064FF]/40' : 'border-white/10 opacity-60'}`}>
                <img src={cl.thumb_url} alt={cl.owner} loading="lazy" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-1.5 pt-6 text-left">
                  <div className="truncate text-[10px] font-bold text-white">@{cl.owner}</div>
                  <div className="text-[9px] text-white/70">조회 {fmt(cl.view_count)}</div>
                </div>
                {cl.velocity != null && <div className="absolute right-1 top-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold text-[#7DA2FF]">↑{Math.round(cl.velocity)}</div>}
              </div>
            ))}
          </div>
          <div aria-hidden className="pointer-events-none absolute left-0 top-0 z-20" style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)`, opacity: cursor.show ? 1 : 0, transition: 'transform 900ms cubic-bezier(.4,0,.2,1), opacity 300ms ease' }}>
            {cursor.click && <span className="absolute -left-3 -top-3 h-6 w-6 animate-ping rounded-full bg-[#0064FF]/50" />}
            <svg width="22" height="22" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.5))' }}><path d="M4 2 L4 18 L8.6 13.6 L11.6 20.2 L14.1 19.1 L11.1 12.6 L17.2 12.6 Z" fill="#fff" stroke="#0a0b0f" strokeWidth="1.3" strokeLinejoin="round" /></svg>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-bold text-white break-keep">“{a.hook || '—'}”</div>
              <div className="mt-1 text-[12px] text-white/50">@{c.owner} · Instagram · 조회 {fmt(views)} · 좋아요 {fmt(likes)} · 댓글 {fmt(cmts)}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0064FF]/20 text-[#7DA2FF]"><Sparkles size={14} /></span>
              <span className="text-[13px] font-bold text-white/80">벤치마크 분석</span>
            </div>
          </div>
          <div className="my-5 h-px w-full bg-white/10" />

          <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
            <div className="space-y-6">
              <div>
                <div className="mb-2.5 text-[13px] font-bold text-white/80">터짐 점수 3축</div>
                {axes.map((b, i) => (
                  <div key={b.label} className="mb-3">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-white/55">{b.label} <span className={b.kind === '측정' ? 'text-[#7DA2FF]' : 'text-white/35'}>({b.kind})</span></span>
                      <span className="font-bold text-white/85">{b.val == null ? '—' : b.val}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-[#0064FF] transition-[width] duration-[1000ms] ease-out" style={{ width: drawn ? `${b.val || 0}%` : '0%', transitionDelay: `${i * 110}ms` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-[13px] font-bold text-white/80">
                  <span>확산 속도 <span className="text-[10px] font-bold text-[#7DA2FF]">(측정)</span></span>
                  <span className="text-white/85">{vel != null ? `${vel}` : '—'} <span className="text-[11px] font-normal text-white/45">댓글/시간</span></span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-2.5 rounded-full bg-gradient-to-r from-[#0064FF] to-[#22D3EE] transition-[width] duration-[1100ms] ease-out" style={{ width: drawn ? `${Math.max(4, Math.round(((vel || 0) / maxVel) * 100))}%` : '0%' }} />
                </div>
                <div className="mt-1.5 text-[11px] text-white/40">업로드 {ageH}시간 전 · 동일 니치 최고 대비</div>
              </div>
            </div>

            <div className="space-y-5">
              {selling.length > 0 && (
                <div>
                  <div className="mb-2 text-[13px] font-bold text-white/80">셀링포인트</div>
                  <ul className="space-y-1.5">
                    {selling.map((sp, i) => (
                      <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-white/75"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/40" />{sp}</li>
                    ))}
                  </ul>
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
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t, i) => <span key={i} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[12px] text-white/60">{t}</span>)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

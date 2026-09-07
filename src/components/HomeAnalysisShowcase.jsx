import { useEffect, useRef, useState } from 'react'
import { Sparkles, Search, Scissors } from 'lucide-react'
import { supabase } from '../lib/supabase'

const BLUE = '#0064FF'
const fmt = (n) => { n = Number(n) || 0; return n >= 10000 ? (n / 10000).toFixed(n >= 100000 ? 0 : 1) + '만' : n.toLocaleString('ko-KR') }
const STEPS = ['소재 발굴', '터짐 분석', '2차 창작 가이드']

export default function HomeAnalysisShowcase() {
  const rootRef = useRef(null)
  const winRef = useRef(null)
  const thumbRefs = useRef([])
  const [inView, setInView] = useState(false)
  const [clips, setClips] = useState([])
  const [pick, setPick] = useState(0)
  const [step, setStep] = useState(0)
  const [cursor, setCursor] = useState({ x: 60, y: 40, click: false })

  useEffect(() => {
    const el = rootRef.current; if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect() } }, { threshold: 0.25 })
    io.observe(el); return () => io.disconnect()
  }, [])
  useEffect(() => {
    let alive = true
    supabase.rpc('get_home_showcase_rpc').then(({ data }) => { if (alive && Array.isArray(data)) setClips(data.slice(0, 5)) }).catch(() => {})
    return () => { alive = false }
  }, [])
  useEffect(() => {
    if (!inView || !clips.length) return
    let alive = true; const timers = []
    const wait = (ms) => new Promise((r) => timers.push(setTimeout(r, ms)))
    const run = async () => {
      let p = 0
      while (alive) {
        setPick(p); setStep(0); await wait(700)
        const el = thumbRefs.current[p], w = winRef.current
        if (el && w) { const r = el.getBoundingClientRect(), wr = w.getBoundingClientRect(); setCursor({ x: r.left - wr.left + r.width / 2, y: r.top - wr.top + r.height / 2, click: false }) }
        await wait(950); if (!alive) break
        setCursor((c) => ({ ...c, click: true })); await wait(240); setCursor((c) => ({ ...c, click: false }))
        setStep(1); await wait(4000); if (!alive) break
        setStep(2); await wait(4200); if (!alive) break
        p = (p + 1) % clips.length
      }
    }
    run()
    return () => { alive = false; timers.forEach(clearTimeout) }
  }, [inView, clips.length])

  if (!clips.length) return <section ref={rootRef} className="h-2" />

  const c = clips[Math.min(pick, clips.length - 1)]
  const a = c.analysis || {}
  const rmx = a.remix || {}
  const views = Number(c.view_count) || 0, likes = Number(c.like_count) || 0, cmts = Number(c.comment_count) || 0
  const engScore = views > 0 ? Math.max(0, Math.min(100, Math.round(((likes + cmts * 3) / views) * 800))) : null
  const vel = c.velocity != null ? Math.round(c.velocity * 10) / 10 : null
  const axes = [
    { label: '참여도', kind: '측정', val: engScore },
    { label: '훅 · 첫 3초', kind: '진단', val: a.hook_score },
    { label: '페이오프 · 결말', kind: '진단', val: a.payoff_score },
  ]
  const selling = Array.isArray(a.selling_points) ? a.selling_points.slice(0, 3) : []
  const takeaways = Array.isArray(a.key_takeaways) ? a.key_takeaways.slice(0, 2) : []
  const rHooks = Array.isArray(rmx.hook_ideas) ? rmx.hook_ideas.slice(0, 2) : []
  const rEdit = Array.isArray(rmx.edit_script) ? rmx.edit_script.slice(0, 4) : []
  const rDiff = Array.isArray(rmx.differentiation) ? rmx.differentiation.slice(0, 2) : []
  const tags = Array.isArray(a.hashtags) ? a.hashtags.slice(0, 5) : []
  const vs = (i) => ({ transform: `translateX(${(i - step) * 100}%)`, opacity: i === step ? 1 : 0, transition: 'transform 650ms cubic-bezier(.5,0,.2,1), opacity 550ms ease', position: 'absolute', inset: 0, overflow: 'auto' })

  return (
    <section ref={rootRef} className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-white/30">Research → Analyze → Remix</div>
        <h2 className="text-center text-3xl font-bold leading-tight text-white break-keep md:text-[2.5rem]">왜 터졌는지, 어떻게 복제할지</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/50 break-keep md:text-base">실제로 터진 쇼핑 릴을 골라 훅·확산 속도·2차 창작 편집 가이드까지 한 번에.</p>

        <div className="mx-auto mt-9 flex max-w-xl items-center justify-center gap-1.5 md:gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5 md:gap-2">
              <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition-all md:px-3 md:text-[12px] ${i === step ? 'bg-[#0064FF] text-white' : 'bg-white/[0.06] text-white/45'}`}>
                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${i === step ? 'bg-white/25' : 'bg-white/10'}`}>{i + 1}</span>{s}
              </div>
              {i < STEPS.length - 1 && <span className="text-white/20">→</span>}
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d11] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="ml-2 flex items-center gap-1.5 text-[12px] text-white/40"><Search size={12} />chronit.kr · 리서치</span>
          </div>
          <div ref={winRef} className="relative h-[520px] overflow-hidden md:h-[440px]">
            {/* 0 · 발굴 */}
            <div style={vs(0)} className="p-5">
              <div className="mb-3 text-[13px] font-bold text-white/70">지금 터진 쇼핑 릴 <span className="font-normal text-white/35">· 실시간</span></div>
              <div className="grid grid-cols-5 gap-2.5">
                {clips.map((cl, i) => (
                  <div key={cl.shortcode} ref={(el) => (thumbRefs.current[i] = el)}
                    className={`relative aspect-[9/14] overflow-hidden rounded-lg border transition-all duration-300 ${step === 0 && i === pick && cursor.click ? 'scale-[1.05] border-[#0064FF] ring-2 ring-[#0064FF]/50' : 'border-white/10'}`}>
                    <img src={cl.thumb_url} alt={cl.owner} className="h-full w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-1 pt-4"><div className="truncate text-[8px] font-bold text-white"><span className="select-none blur-[2.5px]">@{cl.owner}</span></div></div>
                    {cl.velocity != null && <div className="absolute right-0.5 top-0.5 rounded bg-black/60 px-1 text-[7px] font-bold text-[#7DA2FF]">↑{Math.round(cl.velocity)}</div>}
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center text-[12px] text-white/35">막 터진 소재 수백 개 · 매일 자동 갱신</div>
            </div>

            {/* 1 · 분석 */}
            <div style={vs(1)} className="p-5 md:p-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0064FF]/20 text-[#7DA2FF]"><Sparkles size={14} /></span>
                <span className="text-[14px] font-bold text-white">터짐 분석</span>
                <span className="ml-auto min-w-0 truncate text-[12px] text-white/45">“{a.hook || ''}” · <span className="select-none blur-[3px]">@{c.owner}</span></span>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-[12px] font-bold text-white/70">터짐 점수 3축</div>
                  {axes.map((b, i) => (
                    <div key={b.label} className="mb-2.5">
                      <div className="flex justify-between text-[11px]"><span className="text-white/55">{b.label} <span className={b.kind === '측정' ? 'text-[#7DA2FF]' : 'text-white/35'}>({b.kind})</span></span><span className="font-bold text-white/85">{b.val == null ? '—' : b.val}</span></div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-2 rounded-full bg-[#0064FF] transition-[width] duration-[900ms] ease-out" style={{ width: step === 1 ? `${b.val || 0}%` : '0%', transitionDelay: `${i * 120}ms` }} /></div>
                    </div>
                  ))}
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-[11px]"><span className="text-white/55">확산 속도 <span className="text-[#7DA2FF]">(측정)</span></span><span className="font-bold text-white/90">{vel ?? '—'} <span className="font-normal text-white/45">댓글/시간</span></span></div>
                </div>
                <div className="space-y-3">
                  {selling.length > 0 && (
                    <div><div className="mb-1.5 text-[12px] font-bold text-white/70">셀링포인트</div>
                      <ul className="space-y-1">{selling.map((sp, i) => <li key={i} className="flex gap-1.5 text-[12px] text-white/75"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/40" />{sp}</li>)}</ul></div>
                  )}
                  {takeaways.length > 0 && (
                    <div className="rounded-xl border border-[#0064FF]/20 bg-[#0064FF]/[0.07] p-3">
                      <div className="mb-1.5 flex items-center gap-1 text-[12px] font-extrabold text-[#7DA2FF]"><Sparkles size={12} />핵심 포인트</div>
                      <ul className="space-y-1.5">{takeaways.map((t, i) => <li key={i} className="flex gap-1.5 text-[12px] leading-relaxed text-white/80"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0064FF]" />{t}</li>)}</ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2 · 2차 창작 가이드 */}
            <div style={vs(2)} className="p-5 md:p-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0064FF]/20 text-[#7DA2FF]"><Scissors size={14} /></span>
                <span className="text-[14px] font-bold text-white">2차 창작 가이드</span>
                <span className="ml-auto text-[12px] text-white/40">내 상품 영상으로 복제</span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  {rHooks.length > 0 && (
                    <div><div className="mb-1.5 text-[12px] font-bold text-white/70">내 상품용 훅</div>
                      <ul className="space-y-1.5">{rHooks.map((t, i) => <li key={i} className="rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white/80">“{t}”</li>)}</ul></div>
                  )}
                  {rDiff.length > 0 && (
                    <div><div className="mb-1.5 text-[12px] font-bold text-white/70">차별화 포인트</div>
                      <ul className="space-y-1">{rDiff.map((t, i) => <li key={i} className="flex gap-1.5 text-[12px] text-white/75"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/40" />{t}</li>)}</ul></div>
                  )}
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="mb-1.5 text-[12px] font-bold text-white/70">편집 컷 구성</div>
                  <ol className="space-y-1.5">{rEdit.map((t, i) => (
                    <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-white/80"><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0064FF]/20 text-[9px] font-bold text-[#7DA2FF]">{i + 1}</span>{t}</li>
                  ))}</ol>
                </div>
              </div>
              {tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{tags.map((t, i) => <span key={i} className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-white/55">{t}</span>)}</div>}
            </div>

            <div aria-hidden className="pointer-events-none absolute left-0 top-0 z-20" style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)`, opacity: step === 0 ? 1 : 0, transition: 'transform 850ms cubic-bezier(.4,0,.2,1), opacity 300ms ease' }}>
              {cursor.click && <span className="absolute -left-3 -top-3 h-6 w-6 animate-ping rounded-full bg-[#0064FF]/50" />}
              <svg width="22" height="22" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.55))' }}><path d="M4 2 L4 18 L8.6 13.6 L11.6 20.2 L14.1 19.1 L11.1 12.6 L17.2 12.6 Z" fill="#fff" stroke="#0a0b0f" strokeWidth="1.3" strokeLinejoin="round" /></svg>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-[11px] text-white/30">실제 트렌드 검색 결과 예시 · 계정명은 비공개 처리</p>
      </div>
    </section>
  )
}

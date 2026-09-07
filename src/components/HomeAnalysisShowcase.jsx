import { useEffect, useRef, useState } from 'react'
import { Sparkles, Play } from 'lucide-react'

const BLUE = '#0064FF'

// 홈 제품 쇼케이스 — 실제 분석 화면(터짐 점수·확산 속도·댓글 감정·포화도)을 예시 데이터로 임베드
export default function HomeAnalysisShowcase() {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect() } }, { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!inView) return
    let alive = true, t
    const cycle = () => {
      setRevealed(false)
      t = setTimeout(() => {
        if (!alive) return
        setRevealed(true)
        t = setTimeout(() => { if (alive) cycle() }, 6000)
      }, 1700)
    }
    cycle()
    return () => { alive = false; clearTimeout(t) }
  }, [inView])

  const axes = [
    { label: '참여', kind: '측정', val: 88 },
    { label: '훅 · 첫 3초', kind: '진단', val: 92 },
    { label: '페이오프 · 결말', kind: '진단', val: 79 },
  ]
  const velPath = (() => {
    const N = 26, W = 100, H = 40, pts = []
    for (let i = 0; i <= N; i++) { const t = i / N; const v = Math.pow(t, 2.2); pts.push([t * W, H - v * (H - 3) - 1.5]) }
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
    return { line, area: line + ` L${W},${H} L0,${H} Z` }
  })()
  const donut = [['구매의도', 34, BLUE], ['긍정', 41, '#22C55E'], ['질문', 18, '#F59E0B'], ['불만', 7, '#EF4444']]
  const C = 2 * Math.PI * 14
  const takeaways = [
    '3초 훅 “손 안 대고 변기 싹” — 즉각적인 이득 제시',
    '댓글 34%가 구매의도 — 링크 요청이 집중됨',
    '확산 가속 구간 — 지금이 2차 창작 선점 타이밍',
  ]

  return (
    <section ref={ref} className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-white/30">Analyze</div>
        <h2 className="text-center text-3xl font-bold leading-tight text-white break-keep md:text-[2.5rem]">터진 이유를 데이터로 진단합니다</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/50 break-keep md:text-base">
          3초 훅, 확산 속도, 댓글 반응까지 — 이 소재가 왜 통했는지 한 화면에서 분석합니다.
        </p>

        <div className="relative mx-auto mt-12 max-w-4xl">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold text-white">무선 변기 청소 브러시</span>
                <span className="rounded-full bg-[#0064FF] px-2 py-0.5 text-[10px] font-bold text-white">확산 가속</span>
              </div>
              <div className="mt-0.5 text-[12px] text-white/50">@clean.home · Instagram · 조회 92.4만 · 좋아요 5.1만 · 댓글 1,240</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0064FF]/20 text-[#7DA2FF]"><Sparkles size={14} /></span>
              <span className="text-[13px] font-bold text-white/80">벤치마크 분석</span>
              <span className="text-[12px] text-white/40">· 18회 실측</span>
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
                        <span className="font-bold text-white/85">{b.val}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-2 rounded-full bg-[#0064FF] transition-[width] duration-[1100ms] ease-out" style={{ width: revealed ? `${b.val}%` : '0%', transitionDelay: `${i * 120}ms` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-white/80">확산 속도 <span className="rounded-full border border-[#0064FF]/40 bg-[#0064FF]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#7DA2FF]">측정</span></div>
                  <svg viewBox="0 0 100 40" className="h-20 w-full" preserveAspectRatio="none">
                    <path d={velPath.area} fill="rgba(0,100,255,0.14)" />
                    <path d={velPath.line} fill="none" stroke={BLUE} strokeWidth="2.5" vectorEffect="non-scaling-stroke" pathLength="1"
                      strokeDasharray="1" style={{ strokeDashoffset: revealed ? 0 : 1, transition: 'stroke-dashoffset 1400ms ease-out' }} />
                  </svg>
                  <div className="mt-1 flex justify-between text-[11px] text-white/40"><span>업로드</span><span>최근 42 댓글/시간</span></div>
                </div>
                <div>
                  <div className="mb-2 text-[13px] font-bold text-white/80">포화도</div>
                  <div className="flex gap-1.5">
                    {['확산 초기', '확산 중', '포화 근접'].map((s, idx) => (
                      <div key={s} className="flex-1 text-center">
                        <div className={`h-2 rounded-full ${idx === 0 ? 'bg-[#0064FF]' : 'bg-white/10'}`} />
                        <div className={`mt-1.5 text-[11px] ${idx === 0 ? 'font-bold text-[#7DA2FF]' : 'text-white/35'}`}>{s}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-[12px] text-white/55">확산 가속 중 — 지금이 선점 타이밍입니다.</div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="mb-2 text-[13px] font-bold text-white/80">댓글 감정 <span className="font-normal text-white/35">샘플 25개</span></div>
                  <div className="flex items-center gap-4">
                    <svg viewBox="0 0 40 40" className="h-24 w-24 shrink-0 -rotate-90">
                      {(() => { let acc = 0; return donut.map(([n, v, col]) => { const frac = v / 100; const el = <circle key={n} cx="20" cy="20" r="14" fill="none" stroke={col} strokeWidth="8" strokeDasharray={`${(frac * C).toFixed(2)} ${C.toFixed(2)}`} strokeDashoffset={`${(-acc * C).toFixed(2)}`} style={{ opacity: revealed ? 1 : 0, transition: `opacity 700ms ease ${acc * 500}ms` }} />; acc += frac; return el }) })()}
                    </svg>
                    <div className="space-y-1.5 text-[13px] leading-tight text-white/70">
                      {donut.map(([n, v, col]) => (
                        <div key={n} className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: col }} />{n} <span className="font-bold text-white/90">{v}%</span></div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-[#0064FF]/20 bg-[#0064FF]/[0.07] p-4">
                  <div className="mb-2 flex items-center gap-1.5 text-[13px] font-extrabold text-[#7DA2FF]"><Sparkles size={13} />핵심 벤치마크 포인트</div>
                  <ul className="space-y-2">
                    {takeaways.map((t, i) => (
                      <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-white/80"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0064FF]" />{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div aria-hidden
            className={`absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-[#0c0d11]/92 text-center backdrop-blur-sm transition-opacity duration-500 ${revealed ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
            <span className="absolute left-4 top-4 rounded-full bg-[#0064FF] px-2.5 py-1 text-[11px] font-bold text-white">확산 가속</span>
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0064FF] text-white shadow-lg shadow-[#0064FF]/30"><Play size={26} fill="currentColor" /></span>
            <span className="mt-4 text-[15px] font-bold text-white">무선 변기 청소 브러시</span>
            <span className="mt-1 text-[12px] text-white/55">@clean.home · 조회 92.4만 · 좋아요 5.1만</span>
            <span className="mt-4 text-[13px] font-semibold text-[#7DA2FF]">자동 분석 중</span>
          </div>
        </div>
      </div>
    </section>
  )
}

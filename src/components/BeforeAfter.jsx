import { useEffect, useRef, useState } from 'react'
import { Sparkles, Check } from 'lucide-react'

export default function BeforeAfter() {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setInView(true); return }
    const io = new IntersectionObserver((es) => es.forEach((e) => setInView(e.isIntersecting)), { threshold: 0.15, rootMargin: '0px 0px -10% 0px' })
    io.observe(el); return () => io.disconnect()
  }, [])
  const cx = (base, d) => `${base} cr-reveal ${inView ? 'cr-in' : ''}`

  return (
    <section ref={ref} className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-white/30">Before / After</div>
        <h2 className="text-center text-3xl font-bold leading-tight text-white break-keep md:text-[2.5rem]">감으로 찾던 소재, 이제 데이터로</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/50 break-keep md:text-base">막막하게 스크롤하던 소재 찾기가, 몇 분이면 끝나는 리서치로 바뀝니다.</p>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* BEFORE */}
          <div className={cx('relative overflow-hidden rounded-3xl border border-white/10')} style={{ transitionDelay: '0ms' }}>
            <img src="/ba-before.jpg" alt="크로닛 없이" className="h-full min-h-[360px] w-full object-cover grayscale" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0f] via-[#0a0b0f]/80 to-[#0a0b0f]/30" />
            <div className="absolute inset-0 flex flex-col p-6">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px] font-bold text-white/70">크로닛 없이</span>
              <div className="mt-auto">
                <div className="text-[14px] text-white/70">감으로, 흩어진 채</div>
                <div className="mt-1 flex items-baseline gap-2"><span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">소재 찾기</span><span className="text-2xl font-bold text-red-300 md:text-3xl">하루 1~2시간</span></div>
              </div>
            </div>
          </div>

          {/* AFTER */}
          <div className={cx('relative overflow-hidden rounded-3xl border border-[#0064FF]/30 bg-[linear-gradient(160deg,#0f1a33,#0a0d16)]')} style={{ transitionDelay: '140ms' }}>
            <div aria-hidden className="pointer-events-none absolute right-[-10%] top-[-20%] h-64 w-64 rounded-full bg-[#0064FF]/20 blur-3xl" />
            <div className="relative flex min-h-[360px] flex-col p-6">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#0064FF] px-3 py-1 text-[12px] font-bold text-white"><Sparkles size={12} />크로닛과 함께</span>
              {/* 미니 분석 그래픽 (장식) */}
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-2 text-[12px] font-bold text-white/70">터짐 점수 · 확산 속도</div>
                {[76, 92, 64].map((w, i) => (
                  <div key={i} className="mb-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-2 rounded-full bg-gradient-to-r from-[#0064FF] to-[#22D3EE] transition-[width] duration-[1100ms] ease-out" style={{ width: inView ? `${w}%` : '0%', transitionDelay: `${300 + i * 140}ms` }} /></div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {['터진 소재를 실시간으로', '왜 통했는지 데이터로 진단', '내 상품 영상용 2차 창작 가이드'].map((t) => (
                  <div key={t} className="flex items-start gap-2 text-[14px] text-white/85"><Check size={15} className="mt-0.5 shrink-0 text-[#22D3EE]" />{t}</div>
                ))}
              </div>
              <div className="mt-auto flex items-baseline gap-2 pt-4"><span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">소재 찾기</span><span className="text-2xl font-bold text-[#7DA2FF] md:text-3xl">단 3분</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

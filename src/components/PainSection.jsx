import { useEffect, useRef, useState } from 'react'

const PAINS = [
  { img: '/pain/scroll.jpg', tag: '무한 스크롤', line: '뭘 올릴지 몰라 피드만 하루 1~2시간' },
  { img: '/pain/cost.jpg', tag: '외주 비용', line: '레퍼런스 외주는 편당 1~2만원' },
  { img: '/pain/luck.jpg', tag: '감으로 복불복', line: '감으로 올려 조회수는 복불복' },
]

export default function PainSection() {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setInView(true); return }
    const io = new IntersectionObserver((es) => es.forEach((e) => setInView(e.isIntersecting)), { threshold: 0.15, rootMargin: '0px 0px -10% 0px' })
    io.observe(el); return () => io.disconnect()
  }, [])

  return (
    <section ref={ref} className="px-5 py-20 md:px-8 md:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-white/30">The Problem</div>
        <h2 className="text-center text-3xl font-bold leading-tight text-white break-keep md:text-[2.5rem]">매일 이렇게 소재를 찾고 있진 않나요?</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/50 break-keep md:text-base">쇼핑 크리에이터의 하루 — 시간도, 돈도, 확신도 새어 나갑니다.</p>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PAINS.map((p, i) => (
            <div key={p.tag} className={`slide-rev ${inView ? 'slide-in' : ''} overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]`} style={{ transitionDelay: `${i * 130}ms` }}>
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={p.img} alt={p.tag} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d11] via-[#0c0d11]/20 to-transparent" />
                <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white/85 backdrop-blur-sm">{p.tag}</span>
              </div>
              <div className="p-5">
                <p className="flex items-start gap-2 text-[15px] leading-relaxed text-white/75"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />{p.line}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

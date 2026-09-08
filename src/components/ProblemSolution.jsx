import { useEffect, useRef } from 'react'
import { Sparkles, Check } from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const PAINS = [
  { img: '/pain/scroll.jpg', tag: '무한 스크롤', line: '뭘 올릴지 몰라 피드만 하루 1~2시간' },
  { img: '/pain/cost.jpg', tag: '외주 비용', line: '레퍼런스 외주는 편당 1~2만원' },
  { img: '/pain/luck.jpg', tag: '감으로 복불복', line: '감으로 올려 조회수는 복불복' },
]

export default function ProblemSolution() {
  const trigRef = useRef(null)
  const pinRef = useRef(null)
  const painRef = useRef(null)
  const baRef = useRef(null)

  useEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(min-width: 768px)', () => {
      gsap.set(painRef.current, { xPercent: 0, autoAlpha: 1 })
      gsap.set(baRef.current, { autoAlpha: 0 })
      // 스크럽이 아니라 '자체 속도로 한 번 재생'되는 타임라인 → 중간 겹침 프레임 없음
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } })
      tl.to(painRef.current, { xPercent: 22, autoAlpha: 0, duration: 0.4, ease: 'power2.in' })
      tl.fromTo(baRef.current, { xPercent: -40, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.55, ease: 'power3.out' })
      const st = ScrollTrigger.create({
        trigger: trigRef.current,
        start: 'top top',
        end: '+=650',
        pin: pinRef.current,
        anticipatePin: 1,
        onEnter: () => tl.play(),
        onLeaveBack: () => tl.reverse(),
      })
      return () => { st.kill(); tl.kill() }
    })
    return () => mm.revert()
  }, [])

  const Pain = (
    <div ref={painRef} className="w-full px-5 py-16 md:absolute md:inset-0 md:flex md:flex-col md:justify-center md:py-0">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-white/30">The Problem</div>
        <h2 className="text-center text-3xl font-bold leading-tight text-white break-keep md:text-[2.5rem]">매일 이렇게 소재를 찾고 있진 않나요?</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/50 break-keep md:text-base">쇼핑 크리에이터의 하루 — 시간도, 돈도, 확신도 새어 나갑니다.</p>
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PAINS.map((p) => (
            <div key={p.tag} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={p.img} alt={p.tag} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d11] via-[#0c0d11]/20 to-transparent" />
                <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white/85 backdrop-blur-sm">{p.tag}</span>
              </div>
              <div className="p-5"><p className="flex items-start gap-2 text-[15px] leading-relaxed text-white/75"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />{p.line}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const BA = (
    <div ref={baRef} className="w-full px-5 py-16 md:absolute md:inset-0 md:flex md:flex-col md:justify-center md:py-0">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-white/30">Before / After</div>
        <h2 className="text-center text-3xl font-bold leading-tight text-white break-keep md:text-[2.5rem]">감으로 찾던 소재, 이제 데이터로</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/50 break-keep md:text-base">막막하게 스크롤하던 소재 찾기가, 몇 분이면 끝나는 리서치로 바뀝니다.</p>
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-3xl border border-white/10">
            <img src="/ba-before.jpg" alt="크로닛 없이" className="h-full min-h-[320px] w-full object-cover grayscale" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0f] via-[#0a0b0f]/80 to-[#0a0b0f]/30" />
            <div className="absolute inset-0 flex flex-col p-6">
              <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-[12px] font-bold text-white/70">크로닛 없이</span>
              <div className="mt-auto"><div className="text-[14px] text-white/70">감으로, 흩어진 채</div><div className="mt-1 flex items-baseline gap-2"><span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">소재 찾기</span><span className="text-2xl font-bold text-red-300 md:text-3xl">하루 1~2시간</span></div></div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-[#0064FF]/30 bg-[linear-gradient(160deg,#0f1a33,#0a0d16)]">
            <div aria-hidden className="pointer-events-none absolute right-[-10%] top-[-20%] h-64 w-64 rounded-full bg-[#0064FF]/20 blur-3xl" />
            <div className="relative flex min-h-[320px] flex-col p-6">
              <span className="w-fit rounded-full bg-[#0064FF] px-3 py-1 text-[12px] font-bold text-white"><span className="mr-1 inline-block align-[-1px]"><Sparkles size={12} className="inline" /></span>크로닛과 함께</span>
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
    </div>
  )

  return (
    <section ref={trigRef} className="relative">
      <div ref={pinRef} className="relative overflow-hidden md:h-screen">
        {Pain}
        {BA}
      </div>
    </section>
  )
}

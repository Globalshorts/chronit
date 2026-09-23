import { useEffect, useRef, useState } from 'react'
import { Check, MousePointer2, Eye } from 'lucide-react'
import Reveal from './Reveal'
import EnergyOrb from './EnergyOrb'

// 랜딩 데모(2단계): 트렌드 그리드에서 소재 선택(커서) → 베라가 내 말투로 대본 작성(타이핑)
const GRID = [
  { emoji: '🧴', g: 'from-rose-500/25 to-rose-500/5', v: '82만' },
  { emoji: '🍳', g: 'from-amber-500/25 to-amber-500/5', v: '54만' },
  { emoji: '🧸', g: 'from-sky-500/25 to-sky-500/5', v: '120만' },
  { emoji: '🧹', g: 'from-emerald-500/25 to-emerald-500/5', v: '47만' },
  { emoji: '📦', g: 'from-violet-500/25 to-violet-500/5', v: '99만' },
  { emoji: '💡', g: 'from-cyan-500/25 to-cyan-500/5', v: '31만' },
]
const PICK = 2 // 선택할 카드 인덱스(장난감 정리함)
const SCRIPT_LINES = [
  '장난감 블록 밟아본 사람 손!',
  '그 아픔은 진짜 겪어본 사람만 알잖아요?',
  '근데 이 정리함 하나 두고부터 거실이 싹 바뀌었어요',
  '애가 스스로 쏙쏙 넣더라고요',
  '칸이 나눠져 있어서 뭐가 어디 있는지 딱 보이고',
  '바퀴 달려서 청소할 때 쓱 밀면 끝',
  '이거 진짜 육아템 top이에요',
  '궁금하면 댓글에 정리함 남겨주세요',
]
const STEPS = [
  { t: '소재 고르기', d: '반응 터진 릴스에서 마우스로 선택' },
  { t: '베라가 내 말투로 대본', d: '고른 소재로 30초면 완성' },
]

export default function HomeAnalysisShowcase() {
  const rootRef = useRef(null)
  const [inView, setInView] = useState(false)
  const [step, setStep] = useState(0)
  const [typed, setTyped] = useState(0)
  const [picked, setPicked] = useState(false)
  const [cur, setCur] = useState({ x: 12, y: 14 })

  useEffect(() => {
    const el = rootRef.current; if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.2 })
    io.observe(el)
    const onVis = () => { if (document.hidden) setInView(false) }
    document.addEventListener('visibilitychange', onVis)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  useEffect(() => {
    if (!inView) return
    let alive = true; const timers = []
    const wait = (ms) => new Promise((r) => timers.push(setTimeout(r, ms)))
    const run = async () => {
      while (alive) {
        setStep(0); setPicked(false); setTyped(0); setCur({ x: 8, y: 8 }); await wait(500); if (!alive) break
        setCur({ x: 82, y: 26 }); await wait(1300); if (!alive) break   // 커서를 우상단 장난감 카드로
        setPicked(true); await wait(800); if (!alive) break             // 클릭
        setStep(1)
        for (let i = 1; i <= SCRIPT_LINES.length; i++) { if (!alive) break; setTyped(i); await wait(560) }
        await wait(2600)
      }
    }
    run()
    return () => { alive = false; timers.forEach(clearTimeout) }
  }, [inView])

  return (
    <section ref={rootRef} className="px-5 py-16 md:px-8 md:py-20">
      <Reveal className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h2 className="text-center text-3xl font-bold leading-tight text-white break-keep md:text-[2.5rem]">고른 소재로, 내 말투 대본까지</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/50 break-keep md:text-base">반응 터진 쇼핑 릴스를 고르면, 베라가 내가 말하는 그대로 대본을 써줘요.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-[260px_1fr] md:items-center">
          <div className="flex flex-col gap-3">
            {STEPS.map((s, i) => (
              <div key={i} className={`rounded-2xl border p-4 transition-all duration-300 ${step === i ? 'border-[#0064FF]/50 bg-[#0064FF]/10' : 'border-white/10 bg-white/[0.03]'}`}>
                <div className="flex items-center gap-2">
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold transition ${step >= i ? 'bg-[#0064FF] text-white' : 'bg-white/10 text-white/50'}`}>{i + 1}</span>
                  <span className="text-sm font-bold text-white">{s.t}</span>
                </div>
                <div className="mt-1 pl-8 text-[13px] text-white/50">{s.d}</div>
              </div>
            ))}
          </div>

          <div className="mx-auto w-full max-w-sm rounded-3xl glass p-4">
            {/* STEP 0: 트렌드 그리드 + 커서 */}
            {step === 0 && (
              <div>
                <div className="mb-2 text-[11px] font-bold text-white/45">🔥 실시간 트렌드</div>
                <div className="relative">
                  <div className="grid grid-cols-3 gap-2">
                    {GRID.map((c, i) => (
                      <div key={i} className={`relative aspect-[9/12] overflow-hidden rounded-xl bg-gradient-to-br ${c.g} ring-1 transition-all duration-200 ${picked && i === PICK ? 'ring-2 ring-[#5AA0FF] scale-[1.04]' : 'ring-white/10'}`}>
                        <div className="flex h-full items-center justify-center text-2xl">{c.emoji}</div>
                        <div className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/45 px-1 text-[9px] font-bold text-white/80"><Eye size={8} />{c.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="pointer-events-none absolute z-10 -translate-x-1 -translate-y-1 transition-all duration-[1200ms] ease-out" style={{ left: `${cur.x}%`, top: `${cur.y}%` }}>
                    {picked && <span className="absolute -left-2 -top-2 h-7 w-7 animate-ping rounded-full bg-[#5AA0FF]/50" />}
                    <MousePointer2 size={22} className="relative text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" fill="white" />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1: 베라 대본 타이핑 */}
            {step === 1 && (
              <div>
                <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-2.5">
                  <div className="grid h-12 w-9 shrink-0 place-items-center rounded-lg bg-sky-500/20 text-xl">🧸</div>
                  <div className="min-w-0"><div className="text-[11px] font-bold text-[#5AA0FF]">🔥 트렌드 소재</div><div className="truncate text-[13px] font-medium text-white/85">아이 장난감 정리함</div></div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <EnergyOrb size={40} />
                  <span className="text-[13px] font-bold text-white">베라</span>
                  {typed >= SCRIPT_LINES.length
                    ? <span className="ml-auto flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400"><Check size={10} /> 내 말투 완성</span>
                    : <span className="ml-auto text-[11px] font-bold text-[#5AA0FF]">대본 쓰는 중…</span>}
                </div>
                <div className="mt-2 min-h-[212px] rounded-2xl bg-black/30 p-3.5 text-left">
                  <div className="space-y-1.5">
                    {SCRIPT_LINES.slice(0, typed).map((l, i) => (
                      <div key={i} className="text-[13px] leading-relaxed text-white/90">{l}</div>
                    ))}
                    {typed < SCRIPT_LINES.length && <span className="inline-block h-4 w-[3px] animate-pulse bg-[#5AA0FF] align-middle" />}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  )
}

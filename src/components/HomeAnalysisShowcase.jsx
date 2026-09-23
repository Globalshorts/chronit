import { useEffect, useRef, useState } from 'react'
import { Flame, Check } from 'lucide-react'
import Reveal from './Reveal'
import EnergyOrb from './EnergyOrb'

// 랜딩 데모: 트렌드 소재 → 베라가 내 말투로 대본 작성(타이핑) → 완성
const SCRIPT_LINES = [
  '장난감 블록 밟아본 사람 손',
  '그 아픔은 진짜 겪어본 사람만 알잖아요',
  '근데 이 정리함 하나 두고부터 거실이 싹 바뀌었어요',
  '애가 스스로 쏙쏙 넣더라고요',
  '칸이 나눠져 있어서 뭐가 어디 있는지 딱 보이고',
  '바퀴 달려서 청소할 때 쓱 밀면 끝',
  '이거 진짜 육아템 top이에요',
  '궁금하면 댓글에 정리함 남겨주세요',
]
const STEPS = [
  { t: '소재 고르기', d: '반응 터진 쇼핑 릴스에서 선택' },
  { t: '베라가 대본 작성', d: '내 말투 그대로, 30초면 완성' },
  { t: '바로 촬영·편집', d: '레드노트 클립 얹어 릴스로' },
]

export default function HomeAnalysisShowcase() {
  const rootRef = useRef(null)
  const [inView, setInView] = useState(false)
  const [step, setStep] = useState(0)
  const [typed, setTyped] = useState(0)

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
        setStep(0); setTyped(0); await wait(1600); if (!alive) break
        setStep(1)
        for (let i = 1; i <= SCRIPT_LINES.length; i++) { if (!alive) break; setTyped(i); await wait(600) }
        await wait(900); if (!alive) break
        setStep(2); await wait(2800)
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

        <div className="grid gap-6 md:grid-cols-[280px_1fr] md:items-center">
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
            <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-2.5">
              <div className="grid h-14 w-11 shrink-0 place-items-center rounded-lg bg-[#0064FF]/15"><Flame size={18} className="text-[#5AA0FF]" /></div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-[#5AA0FF]">🔥 트렌드 소재</div>
                <div className="truncate text-[13px] font-medium text-white/85">아이 장난감 정리함</div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <EnergyOrb size={22} />
              <span className="text-[13px] font-bold text-white">베라</span>
              {step >= 2
                ? <span className="ml-auto flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400"><Check size={10} /> 내 말투 완성</span>
                : step === 1 ? <span className="ml-auto text-[11px] font-bold text-[#5AA0FF]">대본 쓰는 중…</span> : null}
            </div>

            <div className="mt-2 min-h-[228px] rounded-2xl bg-black/30 p-3.5 text-left">
              {step === 0 && <div className="flex h-[204px] items-center justify-center text-[13px] text-white/40">소재를 고르는 중…</div>}
              {step >= 1 && (
                <div className="space-y-1.5">
                  {SCRIPT_LINES.slice(0, step === 1 ? typed : SCRIPT_LINES.length).map((l, i) => (
                    <div key={i} className="text-[13px] leading-relaxed text-white/90">{l}</div>
                  ))}
                  {step === 1 && typed < SCRIPT_LINES.length && <span className="inline-block h-4 w-[3px] animate-pulse bg-[#5AA0FF] align-middle" />}
                </div>
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

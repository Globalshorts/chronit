import { useEffect, useRef, useState } from 'react'
import { Sparkles, Search, Scissors, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import SHOWCASE from '../data/homeShowcase.json'
const SC_LQIP = {"Dc207thtU7B": "data:image/webp;base64,UklGRpQBAABXRUJQVlA4IIgBAADwCACdASoeADUAPtFaoUwoJSMiMBgKAQAaCUAWI/HRWxYLBb3h70gwl5S5Fn9uYO50nNVxW6DRqHpTfc643KdMcSeDfVB3jkDJj8IelRWdwAD+9+5ViP6dNdBIFi8ulK2z/nBPMQT6qAFRguzklHtuj0Etf9NYAV/B5a8I8ZRlq6R3kF+Rsq2ublNV4jofUHtr4uXVv6DpDtqaulKkNRuulDaPrlK3+GQOjDU60Zh9RsK5esoWafONZp+J2031fshQLz8HUMrx/iq7Dw+fTpoxhNJveo9Fiwvh3pUCXONu+GKhsHOYolgGlsFVYMVk1HDiNHB4ssopvGnIufTqf0ljMesp2x7TAfAEcaw/SF+3xSd03CLfP7/zonWKRGR5LuFXiQgw52sqDUjBm/diY/fGR9IpP8xOEllFOCmgwmN2Nsu5Rlu5os1fksoTZO3wj47T48kxYZZV8uz1lm0dC3+Kl03ZK24TDqNPLa+p1NzmPplToapx8NGRcaXoih6R/kTIT6UmaqQAAA==", "Dc46U-GhrD1": "data:image/webp;base64,UklGRhwBAABXRUJQVlA4IBABAAAQBgCdASoeADUAPtFYp0uoJSOhqA1RABoJQBhfCLXO4r/0+szE0SQ3Q+SDe9vKAn+tIv8E5VDpnIAA/uALWzssD9NKX/kSGjf9f1zpDnyNB0/tDetMaaVYjwq2CG7ugjgyK3v3oQWsIqS3/b2h2L5+1D0UUNM0gd3E3ywC45tXCLcWM6eofyPUY1UOBitD+0Dz2J4Ne1KXCpZuiNjWf9e6gqScWWkF0oAjE5gU11piMhEnDjmL0fuRcBbqXTUKWlJMzEpP1VUL45UrhGvs68QoF2+dagVSlZXT8hANlxeKMPee81p20d8e/UvDuwyHUreDM2nnYawau56UxjY5P/1vSD4GH7mUgzwjgZQAFywAAA==", "Dc7EsLHyeB5": "data:image/webp;base64,UklGRowCAABXRUJQVlA4IIACAABwCwCdASoeADUAPrVGm0unI6Kht+gA4BaJbACdMvUjIcDft9Fe4AY2PePVWFY94MpXg9pcWeB901y5v2CLfUGuyMGcA69nKfA3OcvynU+o+A/jZ3zszpO2gcnhSBRUCTuqbYX4AP7idXN+UBxkTIX2PaTdQUc3p1Lh9Hg/U6PJlRNReNGoz6C2M51ig84MnIdgHnbll2tZdltRB6tCh5a51cWg3VZVcALtGBmVA8YPsLWsabtYWPHPYK0/cwC3KL3Ry6SOu7q1UtuSHyxbxt1xr2vepo7et5t/rMu/6wYss+Yzv9wYjWytSv2i28I/WW9qheXaX4MpKjOcf65aUMPeqgm80/TcAQj+d1DNsbASExpWa/rLXq7eGPeySQBZ6EJZteCk+2ONE/xNKT6lMjq3/kc9vii9Rm8haDnXGZppqD4bEOfPwuj8OFKjRl6HcIheZADjXfMWnAxKTOuX1EmXi7TqoHKTK2nEPjQMnLlJidav7/2r3zNRn5N5xs1l9JIjruZGoEpcO4OUvhOAZ21nvn5s9j2V2V3ra4A/xAfMVVBSRr3ruQ6P+NXKmk6EBAbP8tlKSIIfiFEsMIaBEOo8qzF0QEcyFA1KGNIrGXOHDahOF02GPxYEl4+QQFqj2C7bGS7oTdOg4tDhm9jJjEam0pMtdMG6FMyH6K4GoE2nCr9x5D/7D0uXgf776bHYWIPYXlvylr7fxfYOK38V5s5bQH908erGJ9gEyJDQybMPVvrMSZhVJssqwNgnaWOIBlIlidkocZs7pCuS3Ge6rdeW16ife/NBYqAAc+4Q5F2DpNgts4F36bs9eiJqMpyNqkKan6T6oDb54t6Uwa2cAAAA", "DcvW2kDTM2m": "data:image/webp;base64,UklGRpQBAABXRUJQVlA4IIgBAADwCACdASoeADUAPtFYpEwoJSOiLBqsyQAaCUAYm4E/ste0fgLE7zbH5qhrWOEh6m6VYMQjoHAPobiDndqp8XH2mPWzDL2tj4dhnsFxvimr0AD81/fXJJATwRwiX+BFN2+jM8BQ/5fbUDC/62P4qQ0b5mmjJ/UE3SH2+nypPnWUbcUI2P49shQzdkOgUPJrX7RMFKLUVmC5XW/xyzE7MXk4L0EBHxLwXBVObdUp+/6aAWmFYRckvY85MZBi9qG+UNL+okvmrOd1VXlrbiu2Ix0RVBjJJu46XxLfb2mB0A/s1EOngRcStYAsjAvrHgF2FWsWaG9wTF7BsNMSy0Zfxm8i0yV2YuoIXXs1mm2L05ydewRthzwPoE8miBhPE+rnezHPIMROvUytgBv93ugJYq0fmwRADmUypThDgCaHdJ+E0Fy9P1Wif3Szrt3gpUgyPBEQSJeL64KiwO8qyjXv+y/bsChafxrmi/f+QbAY7f/48sbDLVCjPwec7nI8JstnGtlkI+NaiYAAAA=="}

import Reveal from './Reveal'

const BLUE = '#0064FF'
const fmt = (n) => { n = Number(n) || 0; return n >= 10000 ? (n / 10000).toFixed(n >= 100000 ? 0 : 1) + '만' : n.toLocaleString('ko-KR') }
const STEPS = ['소재 발굴', '터짐 분석', '2차 창작 가이드']

export default function HomeAnalysisShowcase() {
  const rootRef = useRef(null)
  const winRef = useRef(null)
  const thumbRefs = useRef([])
  const [inView, setInView] = useState(false)
  const [clips] = useState(SHOWCASE)
  const [pick, setPick] = useState(0)
  const [step, setStep] = useState(0)
  const [cursor, setCursor] = useState({ x: 60, y: 40, click: false })

  useEffect(() => {
    const el = rootRef.current; if (!el) return
    // 화면 안에 있을 때만 데모 재생 (벗어나면 inView=false → 루프/리렌더 정지) — 모바일 상시 CPU 방지
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 })
    io.observe(el)
    const onVis = () => { if (document.hidden) setInView(false) }
    document.addEventListener('visibilitychange', onVis)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', onVis) }
  }, [])
  useEffect(() => {
    if (!inView || !clips.length) return
    let alive = true; const timers = []
    const wait = (ms) => new Promise((r) => timers.push(setTimeout(r, ms)))
    const run = async () => {
      let p = 0
      setPick(0); setStep(0)
      while (alive) {
        setStep(0); await wait(1200); if (!alive) break          // 발굴: 현재 릴 정지
        setStep(1); await wait(2000); if (!alive) break          // 터짐 분석
        setStep(2); await wait(2000); if (!alive) break          // 2차 창작 가이드
        setStep(0); await wait(750); if (!alive) break           // 발굴로 복귀 (이전 릴 그대로)
        p = (p + 1) % clips.length
        setPick(p); await wait(1050); if (!alive) break          // 다음 릴로 코버플로우 슬라이드 (눈에 보이게)
      }
    }
    run()
    return () => { alive = false; timers.forEach(clearTimeout) }
  }, [inView, clips.length])

  if (!clips.length) return (
    <section ref={rootRef} className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-white/30">Research → Analyze → Remix</div>
        <h2 className="text-center text-3xl font-bold leading-tight text-white break-keep md:text-[2.5rem]">왜 터졌는지, 어떻게 복제할지</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/50 break-keep md:text-base">실제로 터진 쇼핑 릴을 골라 훅·확산 속도·2차 창작 편집 가이드까지 한 번에.</p>
        <div className="mx-auto mt-9 h-[520px] max-w-4xl animate-pulse rounded-2xl border border-white/10 bg-white/[0.04] md:h-[440px]" />
      </div>
    </section>
  )

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
      <Reveal className="mx-auto max-w-4xl">
        <div className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-white/30">Research → Analyze → Remix</div>
        <h2 className="text-center text-3xl font-bold leading-tight text-white break-keep md:text-[2.5rem]">왜 터졌는지, 어떻게 복제할지</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/50 break-keep md:text-base">실제로 터진 쇼핑 릴을 골라 훅·확산 속도·2차 창작 편집 가이드까지 한 번에.</p>

        <div className="mx-auto mt-9 flex max-w-xl items-center justify-center gap-1.5 md:gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5 md:gap-2">
              <div onClick={() => setStep(i)} role="button" className={`flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition-all md:px-3 md:text-[12px] ${i === step ? 'bg-[#0064FF] text-white' : 'bg-white/[0.06] text-white/45'}`}>
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
            {/* 0 · 발굴 — 코버플로우 캐러셀 */}
            <div style={vs(0)} className="flex h-full flex-col p-5">
              <div className="mb-1 text-[13px] font-bold text-white/70">지금 터진 쇼핑 릴 <span className="font-normal text-white/35">· 실시간</span></div>
              <div className="relative min-h-0 flex-1">
                {clips.map((cl, i) => {
                  let off = i - pick
                  if (off > clips.length / 2) off -= clips.length
                  if (off < -clips.length / 2) off += clips.length
                  const vis = Math.abs(off) <= 1
                  return (
                    <div key={cl.shortcode} onClick={() => setPick(i)} role="button"
                      className="absolute left-1/2 top-1/2 aspect-[9/16] h-[94%] cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#111]"
                      style={{ transform: `translate(-50%,-50%) translateX(${off * 60}%) scale(${off === 0 ? 1 : 0.8})`, opacity: vis ? (off === 0 ? 1 : 0.38) : 0, zIndex: 10 - Math.abs(off), transition: 'transform 650ms cubic-bezier(.5,0,.2,1), opacity 550ms ease', pointerEvents: vis ? 'auto' : 'none', boxShadow: off === 0 ? '0 22px 55px -14px rgba(0,0,0,.75)' : 'none' }}>
                      <img src={`/showcase/${cl.shortcode}.webp`} alt={cl.owner} loading="lazy" decoding="async" style={{ backgroundImage: `url(${SC_LQIP[cl.shortcode] || ''})`, backgroundSize: 'cover', backgroundPosition: 'center' }} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 top-0 bg-gradient-to-b from-black/55 to-transparent p-2"><span className="select-none text-[10px] font-bold text-white blur-[2.5px]">@{cl.owner}</span></div>
                      {off === 0 && <div className="absolute inset-0 flex items-center justify-center"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"><Play size={18} fill="#fff" stroke="none" /></span></div>}
                      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-xl bg-black/55 px-2.5 py-1.5 backdrop-blur-sm">
                        <span className="flex items-center gap-1 text-[12px] font-extrabold text-[#7DA2FF]"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l8 8h-5v8h-6v-8H4z"/></svg>{cl.velocity != null ? Math.round(cl.velocity) : '—'}</span>
                        <span className="text-[10px] text-white/50">댓글/시간</span>
                      </div>
                    </div>
                  )
                })}
                <button aria-label="이전" onClick={() => setPick((pick - 1 + clips.length) % clips.length)} className="absolute left-0 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white/80 backdrop-blur-sm active:scale-90"><ChevronLeft size={18} /></button>
                <button aria-label="다음" onClick={() => setPick((pick + 1) % clips.length)} className="absolute right-0 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white/80 backdrop-blur-sm active:scale-90"><ChevronRight size={18} /></button>
              </div>
              <div className="mt-3 flex items-center justify-center gap-1.5">
                {clips.map((cl, i) => <span key={cl.shortcode} className={`h-1.5 rounded-full transition-all ${i === pick ? 'w-5 bg-[#0064FF]' : 'w-1.5 bg-white/20'}`} />)}
              </div>
              <div className="mt-2 text-center text-[12px] text-white/35">막 터진 소재 수백 개 · 매일 자동 갱신</div>
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

            <div aria-hidden className="pointer-events-none absolute left-0 top-0 z-20" style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)`, opacity: 0, transition: 'transform 850ms cubic-bezier(.4,0,.2,1), opacity 300ms ease' }}>
              {cursor.click && <span className="absolute -left-3 -top-3 h-6 w-6 animate-ping rounded-full bg-[#0064FF]/50" />}
              <svg width="22" height="22" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.55))' }}><path d="M4 2 L4 18 L8.6 13.6 L11.6 20.2 L14.1 19.1 L11.1 12.6 L17.2 12.6 Z" fill="#fff" stroke="#0a0b0f" strokeWidth="1.3" strokeLinejoin="round" /></svg>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-[11px] text-white/30">실제 트렌드 검색 결과 예시 · 계정명은 비공개 처리</p>
      </Reveal>
    </section>
  )
}

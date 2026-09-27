import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import Footer from '../components/Footer'
import { phCapture } from '../lib/posthog'
import { logEvent } from '../lib/events'

const IMG = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/manual-images/vera'

const STEPS = [
  { n: '01', t: '지금 터지는 소재를 실시간으로', d: '조회수·댓글로 거르고, 아직 덜 퍼진 선점 소재까지. 감으로 고르지 않아요.', img: `${IMG}/lp_trend.jpg` },
  { n: '02', t: '터진 이유를 숫자로 진단', d: '훅·구성·타깃을 점수로, 댓글 반응은 감정 비율로. 뭘 따라 하면 될지 콕 집어줘요.', img: `${IMG}/lp_analysis.jpg` },
  { n: '03', t: '그대로, 내 말투 대본으로', d: '소재만 고르면 베라가 초안을 씁니다. 고칠수록 내 말투를 배워요.', img: `${IMG}/lp_script.jpg` },
]
const BENEFITS = [
  { t: '소재 발굴 자동', d: '뭘 찍을지 고민하는 시간을 지웁니다. 지금 팔리는 소재만 모아서 보여줘요.' },
  { t: '훅·감정 분석', d: '왜 터졌는지 숫자로 설명해요. 감이 아니라 근거로 기획하세요.' },
  { t: '내 말투 학습', d: '고칠수록 나다운 대본. 남의 말투가 아니라 당신 목소리로.' },
]

const track = (e) => { try { phCapture(e); logEvent(e, {}) } catch { /* noop */ } }

export default function Vera() {
  useEffect(() => { track('vera_landing_view') }, [])
  return (
    <div className="min-h-screen bg-[#0A0B0F] font-sans break-keep text-white/90">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0A0B0F]/80 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <a href="/" className="flex items-center gap-2.5"><img src="/cn-white.svg" alt="Chronit" className="h-8 w-8" /><span className="hidden text-2xl font-bold tracking-tight text-white md:block">Chronit</span></a>
          <SiteNav light active="script" />
          <Link to="/register" onClick={() => track('vera_landing_cta')} className="rounded-full bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_100%)] px-6 py-2 text-sm font-bold text-white transition hover:brightness-110">무료로 시작</Link>
        </div>
      </header>

      <section className="relative overflow-hidden px-5 pt-36 pb-14 md:px-8 md:pt-44 md:pb-16">
        <div aria-hidden className="pointer-events-none absolute inset-0"><div className="absolute left-1/2 top-0 h-[440px] w-[760px] -translate-x-1/2 rounded-full bg-[#0064FF]/[0.08] blur-[160px]" /></div>
        <div className="relative mx-auto max-w-2xl text-center">
          <span className="mb-5 inline-block rounded-full border border-[#0064FF]/30 bg-[#0064FF]/10 px-3 py-1 text-[12px] font-bold text-[#7DA2FF]">베라 · 크로닛의 대본 비서</span>
          <h1 className="text-[2.2rem] font-semibold leading-[1.2] tracking-tight text-white md:text-[3.2rem]">소재 찾는 것도 일인데,<br/>대본까지 막막하다면</h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/55 md:text-base">크로닛이 지금 팔리는 소재를 찾아, <b className="text-white/80">당신 말투 그대로 대본까지</b> 써줍니다. 찍고 올리는 것만 당신 몫.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register" onClick={() => track('vera_landing_cta')} className="rounded-full bg-white px-7 py-3.5 text-base font-semibold text-[#0A0B0F] transition hover:bg-[#e9edf5]">무료로 시작하기</Link>
            <a href="#demo" className="rounded-full border border-white/15 px-6 py-3.5 text-base font-semibold text-white/80 transition hover:border-white/40">어떻게 되는지 보기</a>
          </div>
          <p className="mt-4 text-[13px] text-white/35">매월 무료 크레딧 제공 · 카드 등록 없이 시작</p>
        </div>
      </section>

      <section id="demo" className="px-5 pb-8 md:px-8">
        <div className="mx-auto max-w-4xl space-y-16 md:space-y-24">
          {STEPS.map((s, i) => (
            <div key={s.n} className={`flex flex-col items-center gap-7 md:gap-12 ${i % 2 ? 'md:flex-row-reverse' : 'md:flex-row'}`}>
              <div className="w-full md:w-1/2">
                <span className="text-[13px] font-bold tracking-[0.2em] text-[#7DA2FF]">{s.n}</span>
                <h3 className="mt-2 text-[1.5rem] font-semibold leading-snug text-white md:text-[1.9rem]">{s.t}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-white/55">{s.d}</p>
              </div>
              <div className="w-full md:w-1/2">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_20px_60px_-20px_rgba(0,100,255,0.25)]">
                  <img src={s.img} alt={s.t} loading="lazy" className="w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-16 md:px-8">
        <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="text-[15px] font-bold text-white">{b.t}</div>
              <p className="mt-2 text-[14px] leading-relaxed text-white/55">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pb-24 md:px-8">
        <div className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
          <div aria-hidden className="pointer-events-none absolute inset-0"><div className="absolute left-1/2 top-1/2 h-[300px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0064FF]/[0.1] blur-[140px]" /></div>
          <h2 className="relative text-[1.7rem] font-semibold leading-snug text-white md:text-[2.2rem]">콘텐츠에 쓰는 시간을,<br/>다시 당신에게</h2>
          <p className="relative mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/55">소재와 대본은 크로닛이. 당신은 찍기만 하세요.</p>
          <div className="relative mt-8">
            <Link to="/register" onClick={() => track('vera_landing_cta')} className="inline-block rounded-full bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_100%)] px-9 py-4 text-base font-bold text-white transition hover:brightness-110">무료로 시작하기</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

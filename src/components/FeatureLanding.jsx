import { Link } from 'react-router-dom'
import SiteNav from './SiteNav'
import Footer from './Footer'

export default function FeatureLanding({ active, eyebrow, badge, title, sub, benefits = [], steps = [], ctaTo = '/register', ctaText = '무료로 시작하기', altTo, altText }) {
  return (
    <div className="min-h-screen bg-[#0A0B0F] font-sans break-keep text-white/90">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0A0B0F]/80 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <a href="/" className="flex items-center gap-2.5"><img src="/cn-white.svg" alt="Chronit" className="h-8 w-8" /><span className="hidden text-2xl font-bold tracking-tight text-white md:block">Chronit</span></a>
          <SiteNav light active={active} />
          <Link to="/register" className="rounded-full bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_100%)] px-6 py-2 text-sm font-bold text-white transition hover:brightness-110">무료 체험</Link>
        </div>
      </header>

      <section className="relative overflow-hidden px-5 pt-36 pb-16 md:px-8 md:pt-44 md:pb-20">
        <div aria-hidden className="pointer-events-none absolute inset-0"><div className="absolute left-1/2 top-0 h-[440px] w-[760px] -translate-x-1/2 rounded-full bg-[#0064FF]/[0.08] blur-[160px]" /></div>
        <div className="relative mx-auto max-w-2xl text-center">
          {badge && <span className="mb-5 inline-block rounded-full border border-[#0064FF]/30 bg-[#0064FF]/10 px-3 py-1 text-[12px] font-bold text-[#7DA2FF]">{badge}</span>}
          <p className="hero-shimmer mb-5 text-[11px] font-semibold uppercase tracking-[0.3em]">{eyebrow}</p>
          <h1 className="text-[2.2rem] font-semibold leading-[1.2] tracking-tight text-white md:text-[3.2rem]">{title}</h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/50 md:text-base">{sub}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to={ctaTo} className="rounded-full bg-white px-7 py-3.5 text-base font-semibold text-[#0A0B0F] transition hover:bg-white/90">{ctaText}</Link>
            {altTo && <Link to={altTo} className="rounded-full border border-white/15 px-6 py-3.5 text-base font-semibold text-white/80 transition hover:border-white/40">{altText}</Link>}
          </div>
        </div>
      </section>

      {benefits.length > 0 && (
        <section className="px-5 pb-16 md:px-8">
          <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
            {benefits.map((b, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <div className="text-[15px] font-bold text-white">{b.title}</div>
                <p className="mt-2 text-[14px] leading-relaxed text-white/55">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {steps.length > 0 && (
        <section className="px-5 pb-24 md:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-white/30">How it works</div>
            <div className="space-y-3">
              {steps.map((s, i) => (
                <div key={i} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0064FF]/15 text-sm font-bold text-[#7DA2FF]">{i + 1}</span>
                  <div><div className="text-[15px] font-bold text-white">{s.title}</div><p className="mt-1 text-[14px] leading-relaxed text-white/55">{s.desc}</p></div>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link to={ctaTo} className="inline-block rounded-full bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_100%)] px-8 py-4 text-base font-bold text-white transition hover:brightness-110">{ctaText}</Link>
            </div>
          </div>
        </section>
      )}

      <Footer dark />
    </div>
  )
}

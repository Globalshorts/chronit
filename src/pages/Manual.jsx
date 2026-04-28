import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, Sparkles } from 'lucide-react'

const Manual = () => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#020617] font-sans break-keep text-slate-100 selection:bg-blue-500/30">
      {/* Header */}
      <header
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${scrolled ? 'border-b border-white/10 bg-[#020617]/90 py-3 backdrop-blur-xl md:py-4' : 'bg-transparent py-5 md:py-8'}`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2 md:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white shadow-xl shadow-blue-500/20 md:h-10 md:w-10">
              C
            </div>
            <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-xl font-black tracking-tighter text-transparent md:text-2xl">
              Chronit
            </h1>
          </Link>
          <nav className="hidden gap-12 text-sm font-bold tracking-wide text-slate-400 md:flex">
            <Link to="/#features" className="uppercase transition-colors hover:text-blue-400">
              Features
            </Link>
            <Link to="/manual" className="uppercase text-blue-400 transition-colors">
              Manual
            </Link>
            <Link to="/#pricing" className="uppercase transition-colors hover:text-blue-400">
              Pricing
            </Link>
          </nav>
          <Link
            to="/"
            className="shrink-0 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold whitespace-nowrap text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 active:scale-95 md:px-7 md:py-2.5 md:text-sm"
          >
            Pre-order
          </Link>
        </div>
      </header>

      {/* Manual Content */}
      <section className="relative flex min-h-screen items-center justify-center px-5 py-32 md:px-8 md:py-48">
        {/* Background grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)] md:text-sm">
            <Sparkles size={14} fill="currentColor" /> <span>준비 중</span>
          </div>

          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 shadow-2xl md:h-28 md:w-28">
            <BookOpen size={40} className="text-blue-400" />
          </div>

          <h1 className="mb-6 text-4xl font-black tracking-tight md:text-6xl">
            Manual
          </h1>

          <p className="mb-12 text-base leading-[1.8] text-slate-400 md:text-xl">
            크로닛 사용법, 설치 가이드, FAQ가 곧 공개됩니다.
            <br />
            지금은 프리오더 신청부터 진행해 주세요.
          </p>

          <Link
            to="/"
            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-slate-200 transition-all hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400 md:text-base"
          >
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
            홈으로 돌아가기
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#01030a] px-5 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-[10px] font-bold tracking-[0.3em] text-slate-600 uppercase md:text-xs md:tracking-[0.4em]">
            &copy; 2024 Chronit Labs. Crafting Future Efficiency.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Manual

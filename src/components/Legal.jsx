import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, FileText } from 'lucide-react'

/**
 * 법적 문서 페이지 (이용약관, 개인정보처리방침)
 * - title: 페이지 제목
 * - subtitle: 영문 부제
 * - markdown: 본문 마크다운 콘텐츠
 */
const Legal = ({ title, subtitle, markdown }) => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#020617] font-sans break-keep text-slate-100 selection:bg-blue-500/30">
      <header
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${scrolled ? 'border-b border-white/10 bg-[#020617]/90 py-3 backdrop-blur-xl md:py-4' : 'bg-transparent py-5 md:py-8'}`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2 md:gap-3">
            <img
              src="https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/icon.png"
              alt="Chronit"
              className="h-8 w-8 shrink-0 rounded-lg md:h-10 md:w-10"
            />
            <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-2xl font-black tracking-tighter text-transparent md:text-3xl">
              Chronit
            </h1>
          </Link>
          <Link
            to="/"
            className="shrink-0 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold whitespace-nowrap text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 active:scale-95 md:px-7 md:py-2.5 md:text-base"
          >
            홈으로
          </Link>
        </div>
      </header>

      <section className="relative px-5 pt-32 pb-12 md:px-8 md:pt-48 md:pb-16">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,#000_60%,transparent_100%)]"></div>
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm font-bold text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)] md:text-base">
            <FileText size={14} /> <span>법적 문서</span>
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight md:text-6xl">{title}</h1>
          <p className="text-lg leading-[1.8] text-slate-400 md:text-xl">{subtitle}</p>
        </div>
      </section>

      <section className="px-5 pb-24 md:px-8 md:pb-32">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-12">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {markdown}
          </ReactMarkdown>
        </div>
      </section>

      <section className="px-5 py-12 text-center md:px-8 md:py-16">
        <Link
          to="/"
          className="group inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-slate-200 transition-all hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400 md:text-base"
        >
          <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
          홈으로 돌아가기
        </Link>
      </section>

      <footer className="border-t border-white/5 bg-[#01030a] px-5 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm font-bold tracking-[0.3em] text-slate-600 uppercase md:text-base md:tracking-[0.4em]">
            &copy; 2026 Chronit. Crafting Future Efficiency.
          </p>
        </div>
      </footer>
    </div>
  )
}

const mdComponents = {
  h1: (props) => (
    <h1 className="mt-10 mb-4 text-2xl font-black text-white md:text-3xl" {...props} />
  ),
  h2: (props) => (
    <h2
      className="mt-10 mb-3 border-l-4 border-blue-500 pl-4 text-lg font-bold text-white md:text-xl"
      {...props}
    />
  ),
  h3: (props) => <h3 className="mt-6 mb-2 text-lg font-bold text-white md:text-xl" {...props} />,
  p: (props) => (
    <p className="my-3 text-sm leading-[1.9] text-slate-300 md:text-base" {...props} />
  ),
  ul: (props) => <ul className="my-3 list-disc space-y-2 pl-6 text-slate-300" {...props} />,
  ol: (props) => <ol className="my-3 list-decimal space-y-2 pl-6 text-slate-300" {...props} />,
  li: (props) => <li className="text-sm leading-[1.9] md:text-base" {...props} />,
  a: (props) => (
    <a
      className="text-blue-400 underline underline-offset-4 transition-colors hover:text-blue-300"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  strong: (props) => <strong className="font-bold text-white" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-4 rounded-r-2xl border-l-4 border-yellow-500/60 bg-yellow-500/[0.06] py-3 pr-4 pl-5 text-sm leading-relaxed text-yellow-100 md:text-base"
      {...props}
    />
  ),
  table: (props) => (
    <div className="my-4 overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full border-collapse text-left text-sm md:text-base" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-blue-500/10" {...props} />,
  th: (props) => (
    <th
      className="border-b border-white/10 px-4 py-3 text-xs font-black tracking-widest text-blue-300 uppercase"
      {...props}
    />
  ),
  td: (props) => (
    <td
      className="border-b border-white/5 px-4 py-3 text-slate-300 last:border-b-0"
      {...props}
    />
  ),
  hr: (props) => <hr className="my-8 border-white/10" {...props} />,
}

export default Legal

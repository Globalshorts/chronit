import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft,
  Download,
  PlayCircle,
  Keyboard,
  HelpCircle,
  Sparkles,
} from 'lucide-react'

// 마크다운 콘텐츠를 raw text로 import (Vite의 ?raw)
import installMd from '../content/install.md?raw'
import usageMd from '../content/usage.md?raw'
import shortcutsMd from '../content/shortcuts.md?raw'
import faqMd from '../content/faq.md?raw'

const Manual = () => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // FAQ는 ## Q. 헤딩 기준으로 파싱
  const faqItems = useMemo(() => parseFaq(faqMd), [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#020617] font-sans break-keep text-slate-100 selection:bg-blue-500/30">
      <header
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${scrolled ? 'border-b border-white/10 bg-[#020617]/90 py-3 backdrop-blur-xl md:py-4' : 'bg-transparent py-5 md:py-8'}`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2 md:gap-3">
            <img
              src="/favicon.png"
              alt="Chronit"
              className="h-12 w-12 shrink-0 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)] md:h-16 md:w-16"
            />
            <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-2xl font-black tracking-tighter text-transparent md:text-3xl">
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

      <section className="relative px-5 pt-32 pb-12 md:px-8 md:pt-48 md:pb-16">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,#000_60%,transparent_100%)]"></div>
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)] md:text-sm">
            <Sparkles size={14} fill="currentColor" /> <span>크로닛 사용 매뉴얼</span>
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight md:text-6xl">Manual</h1>
          <p className="text-base leading-[1.8] text-slate-400 md:text-xl">
            설치부터 첫 영상 제작까지, 5분 안에 익히는 크로닛 사용법.
          </p>
        </div>
      </section>

      <section className="px-5 pb-12 md:px-8 md:pb-16">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[
            { id: 'install', icon: Download, label: '설치' },
            { id: 'usage', icon: PlayCircle, label: '사용법' },
            { id: 'shortcuts', icon: Keyboard, label: '단축키' },
            { id: 'faq', icon: HelpCircle, label: 'FAQ' },
          ].map(({ id, icon: Icon, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className="group flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-bold text-slate-300 transition-all hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-white md:text-base"
            >
              <Icon size={18} className="text-blue-400 transition-transform group-hover:scale-110" />
              {label}
            </a>
          ))}
        </div>
      </section>

      <MarkdownSection id="install" icon={Download} title="1. 설치하기" subtitle="Installation">
        <Markdown>{installMd}</Markdown>
      </MarkdownSection>

      <MarkdownSection id="usage" icon={PlayCircle} title="2. 사용법" subtitle="Getting Started">
        <Markdown>{usageMd}</Markdown>
      </MarkdownSection>

      <MarkdownSection id="shortcuts" icon={Keyboard} title="3. 단축키" subtitle="Keyboard Shortcuts">
        <Markdown>{shortcutsMd}</Markdown>
      </MarkdownSection>

      <MarkdownSection id="faq" icon={HelpCircle} title="4. 자주 묻는 질문" subtitle="FAQ">
        <div className="space-y-3 md:space-y-4">
          {faqItems.map((item, idx) => (
            <FaqItem key={idx} question={item.question} answer={item.answer} />
          ))}
        </div>
      </MarkdownSection>

      <section className="px-5 py-16 text-center md:px-8 md:py-24">
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
          <p className="text-[10px] font-bold tracking-[0.3em] text-slate-600 uppercase md:text-xs md:tracking-[0.4em]">
            &copy; 2026 Chronit Labs. Crafting Future Efficiency.
          </p>
        </div>
      </footer>
    </div>
  )
}

const MarkdownSection = ({ id, icon: Icon, title, subtitle, children }) => (
  <section id={id} className="px-5 py-16 md:px-8 md:py-24">
    <div className="mx-auto max-w-4xl">
      <div className="mb-10 flex items-center gap-4 md:mb-14">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-blue-500/10 text-blue-400 md:h-14 md:w-14">
          <Icon size={24} />
        </div>
        <div>
          <p className="text-[10px] font-black tracking-[0.3em] text-blue-500 uppercase md:text-xs">
            {subtitle}
          </p>
          <h2 className="text-2xl font-black tracking-tight md:text-4xl">{title}</h2>
        </div>
      </div>
      {children}
    </div>
  </section>
)

// 다크 테마용 마크다운 컴포넌트 매핑
const mdComponents = {
  h1: (props) => (
    <h1 className="mt-10 mb-4 text-2xl font-black text-white md:text-3xl" {...props} />
  ),
  h2: (props) => (
    <h2
      className="mt-10 mb-3 border-l-4 border-blue-500 pl-4 text-xl font-bold text-white md:text-2xl"
      {...props}
    />
  ),
  h3: (props) => <h3 className="mt-6 mb-2 text-lg font-bold text-white md:text-xl" {...props} />,
  p: (props) => (
    <p className="my-3 text-base leading-[1.9] text-slate-300 md:text-lg" {...props} />
  ),
  ul: (props) => <ul className="my-3 list-disc space-y-2 pl-6 text-slate-300" {...props} />,
  ol: (props) => <ol className="my-3 list-decimal space-y-2 pl-6 text-slate-300" {...props} />,
  li: (props) => <li className="text-base leading-[1.9] md:text-lg" {...props} />,
  a: (props) => (
    <a
      className="text-blue-400 underline underline-offset-4 transition-colors hover:text-blue-300"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  strong: (props) => <strong className="font-bold text-white" {...props} />,
  em: (props) => <em className="text-slate-200 italic" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-4 rounded-r-2xl border-l-4 border-yellow-500/60 bg-yellow-500/[0.06] py-3 pr-4 pl-5 text-sm leading-relaxed text-yellow-100 md:text-base"
      {...props}
    />
  ),
  code: ({ inline, ...props }) =>
    inline ? (
      <code
        className="rounded-md bg-blue-500/15 px-1.5 py-0.5 font-mono text-sm text-blue-300"
        {...props}
      />
    ) : (
      <code className="block rounded-xl bg-black/40 p-4 font-mono text-sm text-slate-200" {...props} />
    ),
  pre: (props) => (
    <pre className="my-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4" {...props} />
  ),
  table: (props) => (
    <div className="my-4 overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full border-collapse text-left text-sm md:text-base" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-blue-500/10" {...props} />,
  th: (props) => (
    <th className="border-b border-white/10 px-4 py-3 text-xs font-black tracking-widest text-blue-300 uppercase" {...props} />
  ),
  td: (props) => (
    <td className="border-b border-white/5 px-4 py-3 text-slate-300 last:border-b-0" {...props} />
  ),
  hr: (props) => <hr className="my-8 border-white/10" {...props} />,
}

const Markdown = ({ children }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
    {children}
  </ReactMarkdown>
)

const FaqItem = ({ question, answer }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-white/[0.03] md:p-6"
      >
        <span className="text-sm font-bold text-white md:text-base">Q. {question}</span>
        <span
          className={`text-xl text-blue-400 transition-transform md:text-2xl ${open ? 'rotate-45' : ''}`}
        >
          +
        </span>
      </button>
      {open && (
        <div className="border-t border-white/5 px-5 pt-4 pb-5 md:px-6 md:pt-5 md:pb-6">
          <div className="prose-faq">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {answer}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * faq.md 파싱: "## Q. 질문" 기준으로 항목 분리
 */
function parseFaq(md) {
  const lines = md.split('\n')
  const items = []
  let current = null
  for (const line of lines) {
    const match = line.match(/^##\s+Q\.\s*(.+)$/)
    if (match) {
      if (current) items.push(current)
      current = { question: match[1].trim(), answer: '' }
    } else if (current) {
      current.answer += line + '\n'
    }
  }
  if (current) items.push(current)
  return items.map((i) => ({ ...i, answer: i.answer.trim() }))
}

export default Manual

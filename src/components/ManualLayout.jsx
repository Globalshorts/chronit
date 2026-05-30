import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { X } from 'lucide-react'

const ICON = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/icon.png'

/* ── 헤더 ── */
export const ManualHeader = ({ currentPath = '/manual' }) => {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return (
    <header className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${scrolled ? 'border-b border-white/10 bg-[#020617]/90 py-3 backdrop-blur-xl md:py-4' : 'bg-transparent py-5 md:py-8'}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-2 md:gap-3">
          <img src={ICON} alt="Chronit" className="h-8 w-8 shrink-0 md:h-10 md:w-10" />
          <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-2xl font-black tracking-tighter text-transparent md:text-3xl">Chronit</h1>
        </Link>
        <nav className="hidden gap-12 text-base font-bold tracking-wide text-slate-400 md:flex">
          <Link to="/#features" className="uppercase transition-colors hover:text-blue-400">기능</Link>
          <Link to="/manual" className={`uppercase transition-colors ${currentPath.startsWith('/manual') ? 'text-blue-400' : 'hover:text-blue-400'}`}>사용 방법</Link>
          <Link to="/#pricing" className="uppercase transition-colors hover:text-blue-400">요금제</Link>
          <Link to="/events" className="uppercase transition-colors hover:text-blue-400">이벤트</Link>
        </nav>
        <Link to="/#pricing" className="shrink-0 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold whitespace-nowrap text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 active:scale-95 md:px-7 md:py-2.5 md:text-base">
          시작하기
        </Link>
      </div>
    </header>
  )
}

/* ── 푸터 ── */
export const ManualFooter = () => (
  <footer className="border-t border-white/5 bg-[#01030a] px-5 py-12 md:px-8 md:py-16">
    <div className="mx-auto max-w-7xl text-center">
      <p className="text-[10px] font-bold tracking-[0.3em] text-slate-600 uppercase md:text-sm md:tracking-[0.4em]">
        &copy; 2026 Chronit Labs. Crafting Future Efficiency.
      </p>
    </div>
  </footer>
)

/* ── 라이트박스 ── */
export const Lightbox = ({ src, alt, onClose }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
    <button className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors" onClick={onClose}>
      <X size={24} />
    </button>
    <img src={src} alt={alt} className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
  </div>
)

/* ── 마크다운 렌더러 ── */
const makeMdComponents = (onImageClick) => ({
  h1: (p) => <h1 className="mt-8 mb-3 text-xl font-black text-white md:text-2xl" {...p} />,
  h2: (p) => <h2 className="mt-8 mb-3 text-lg font-black text-white md:text-xl" {...p} />,
  h3: (p) => <h3 className="mt-5 mb-2 text-base font-bold text-slate-200 md:text-lg" {...p} />,
  p:  (p) => <p className="my-2 text-base leading-[1.9] text-slate-300 [overflow-wrap:anywhere] md:text-lg" {...p} />,
  ul: (p) => <ul className="my-2 list-disc space-y-1.5 pl-5 text-slate-300 [overflow-wrap:anywhere]" {...p} />,
  ol: (p) => <ol className="my-2 list-decimal space-y-1.5 pl-5 text-slate-300 [overflow-wrap:anywhere]" {...p} />,
  li: (p) => <li className="text-base leading-[1.9] [overflow-wrap:anywhere] md:text-lg" {...p} />,
  a:  (p) => <a className="text-blue-400 underline underline-offset-4 hover:text-blue-300" target="_blank" rel="noopener noreferrer" {...p} />,
  strong: (p) => <strong className="font-bold text-white [overflow-wrap:anywhere]" {...p} />,
  em:     (p) => <em className="italic text-slate-200" {...p} />,
  blockquote: (p) => (
    <blockquote className="my-3 rounded-r-xl border-l-4 border-yellow-500/60 bg-yellow-500/[0.06] py-2 pr-4 pl-4 text-sm leading-relaxed text-yellow-100 [overflow-wrap:anywhere] md:text-base" {...p} />
  ),
  code: ({ inline, ...p }) =>
    inline
      ? <code className="rounded bg-blue-500/15 px-1.5 py-0.5 font-mono text-sm text-blue-300" {...p} />
      : <code className="block rounded-xl bg-black/40 p-4 font-mono text-sm text-slate-200" {...p} />,
  pre: (p) => <pre className="my-3 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4" {...p} />,
  table: (p) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full border-collapse text-left text-sm" {...p} />
    </div>
  ),
  thead: (p) => <thead className="bg-blue-500/10" {...p} />,
  th: (p) => <th className="border-b border-white/10 px-4 py-2 text-xs font-black tracking-widest text-blue-300 uppercase" {...p} />,
  td: (p) => <td className="border-b border-white/5 px-4 py-2.5 text-slate-300 last:border-b-0" {...p} />,
  hr: (p) => <hr className="my-8 border-white/10" {...p} />,
  img: ({ src, alt, ...p }) => (
    <img
      src={src} alt={alt}
      className="my-4 max-h-96 w-auto max-w-full cursor-zoom-in rounded-xl border border-white/10 shadow-xl transition-opacity hover:opacity-90"
      style={{ display: 'block' }}
      onClick={() => onImageClick?.({ src, alt })}
      {...p}
    />
  ),
})

export const Markdown = ({ children, onImageClick }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={makeMdComponents(onImageClick)}>
    {children}
  </ReactMarkdown>
)

/* ── FAQ 파서 ── */
export function parseFaq(md) {
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
  return items.map(i => ({ ...i, answer: i.answer.trim() }))
}

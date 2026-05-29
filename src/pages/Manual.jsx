import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { ArrowLeft, Sparkles, X } from 'lucide-react'

import installMd    from '../content/install.md?raw'
import usageMd      from '../content/usage.md?raw'
import automationMd from '../content/automation.md?raw'
import tipsMd       from '../content/tips.md?raw'
import faqMd        from '../content/faq.md?raw'

/* ────────────────────────────────────────────────────────
   이미지 라이트박스
──────────────────────────────────────────────────────── */
const Lightbox = ({ src, alt, onClose }) => (
  <div
    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    onClick={onClose}
  >
    <button
      className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
      onClick={onClose}
    >
      <X size={24} />
    </button>
    <img
      src={src}
      alt={alt}
      className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl"
      onClick={e => e.stopPropagation()}
    />
  </div>
)

const Manual = () => {
  const [scrolled, setScrolled] = useState(false)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // ESC로 닫기
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const faqItems = useMemo(() => parseFaq(faqMd), [])
  const startMd = installMd + '\n\n---\n\n' + usageMd

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#020617] font-sans text-slate-100 selection:bg-blue-500/30">
      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}

      {/* 헤더 */}
      <header className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${scrolled ? 'border-b border-white/10 bg-[#020617]/90 py-3 backdrop-blur-xl md:py-4' : 'bg-transparent py-5 md:py-8'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2 md:gap-3">
            <img src="https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/icon.png" alt="Chronit" className="h-8 w-8 shrink-0 rounded-lg md:h-10 md:w-10" />
            <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-2xl font-black tracking-tighter text-transparent md:text-3xl">Chronit</h1>
          </Link>
          <nav className="hidden gap-12 text-base font-bold tracking-wide text-slate-400 md:flex">
            <Link to="/#features" className="uppercase transition-colors hover:text-blue-400">기능</Link>
            <Link to="/manual"    className="uppercase text-blue-400">매뉴얼</Link>
            <Link to="/#pricing"  className="uppercase transition-colors hover:text-blue-400">요금제</Link>
            <Link to="/events"    className="uppercase transition-colors hover:text-blue-400">이벤트</Link>
          </nav>
          <Link to="/#pricing" className="shrink-0 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold whitespace-nowrap text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 active:scale-95 md:px-7 md:py-2.5 md:text-base">
            시작하기
          </Link>
        </div>
      </header>

      {/* 히어로 */}
      <section className="relative px-5 pt-32 pb-12 md:px-8 md:pt-48 md:pb-16">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,#000_60%,transparent_100%)]" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm font-bold text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)] md:text-base">
            <Sparkles size={14} fill="currentColor" /> <span>크로닛 사용 매뉴얼</span>
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight md:text-6xl">매뉴얼</h1>
          <p className="text-lg leading-[1.8] text-slate-400 md:text-xl">설치부터 첫 영상 제작까지, 5분 안에 익히는 크로닛 사용법.</p>
        </div>
      </section>

      {/* 핵심 안내 배너 */}
      <div className="px-5 pb-6 md:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-sm leading-relaxed text-blue-100 md:text-base">
          ⚡ 쇼핑 릴스 링크만 입력하면 영상 1개가 완성되기까지 <strong className="text-white">약 2분</strong>. 그동안 당신이 직접 할 일은 <strong className="text-white">없습니다.</strong> <span className="text-blue-300">(단, 1회 3·4·5 단계에서 목소리·자막·썸네일 스타일을 설정해두면 퀄리티를 높일 수 있습니다)</span>
        </div>
      </div>

      {/* 본문 */}
      <section className="px-5 pb-24 md:px-8">
        <div className="mx-auto max-w-3xl space-y-3">

          <GroupToggle emoji="🚀" title="크로닛 시작하기" callout="아래 순서를 그대로 따라와주세요." defaultOpen>
            <Markdown onImageClick={setLightbox}>{startMd}</Markdown>
          </GroupToggle>

          <GroupToggle emoji="⚙️" title="필수 기능" callout="헷갈리기 쉬운 주요 기능을 정리했어요.">
            <Markdown onImageClick={setLightbox}>{automationMd}</Markdown>
          </GroupToggle>

          <GroupToggle emoji="💡" title="꿀팁">
            <Markdown onImageClick={setLightbox}>{tipsMd}</Markdown>
          </GroupToggle>

          <GroupToggle emoji="❓" title="자주 묻는 질문 (FAQ)">
            <div className="space-y-2">
              {faqItems.map((item, i) => (
                <FaqItem key={i} question={item.question} answer={item.answer} onImageClick={setLightbox} />
              ))}
            </div>
          </GroupToggle>

        </div>
      </section>

      <section className="px-5 py-16 text-center md:px-8 md:py-24">
        <Link to="/" className="group inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-base font-bold text-slate-200 transition-all hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400 md:text-lg">
          <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
          홈으로 돌아가기
        </Link>
      </section>

      <footer className="border-t border-white/5 bg-[#01030a] px-5 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-[10px] font-bold tracking-[0.3em] text-slate-600 uppercase md:text-sm md:tracking-[0.4em]">
            &copy; 2026 Chronit Labs. Crafting Future Efficiency.
          </p>
        </div>
      </footer>
    </div>
  )
}

/* ────────────────────────────────────────────────────────
   대분류 토글
──────────────────────────────────────────────────────── */
const GroupToggle = ({ emoji, title, callout, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.03] md:px-6 md:py-5"
      >
        <span className="text-xl md:text-2xl">{emoji}</span>
        <span className="flex-1 text-lg font-black tracking-tight text-white md:text-xl">{title}</span>
        <span
          className="shrink-0 text-blue-400 text-sm transition-transform duration-300"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          ▶
        </span>
      </button>

      <div
        className="grid overflow-hidden transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div style={{ minHeight: 0 }}>
          <div className="border-t border-white/5 px-5 pb-6 pt-4 md:px-6 md:pb-8">
            {callout && (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-300 md:text-base">
                <span>📌</span>
                {callout}
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────
   FAQ 전용 토글 (질문만 토글, 답변 펼침)
──────────────────────────────────────────────────────── */
const FaqItem = ({ question, answer, onImageClick }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span className="text-base font-bold text-white md:text-lg">Q. {question}</span>
        <span
          className="shrink-0 text-blue-400 text-sm transition-transform duration-200"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          ▶
        </span>
      </button>
      <div
        className="grid transition-all duration-200 ease-in-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/5 px-5 pb-4 pt-3">
            <Markdown onImageClick={onImageClick}>{answer}</Markdown>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────
   마크다운 렌더러
──────────────────────────────────────────────────────── */
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

const Markdown = ({ children, onImageClick }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={makeMdComponents(onImageClick)}>
    {children}
  </ReactMarkdown>
)

/* ────────────────────────────────────────────────────────
   유틸
──────────────────────────────────────────────────────── */
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
  return items.map(i => ({ ...i, answer: i.answer.trim() }))
}

export default Manual

import { useEffect, useState, useMemo } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ManualHeader, ManualFooter, Markdown, Lightbox, parseFaq } from '../components/ManualLayout'

import installMd    from '../content/install.md?raw'
import usageMd      from '../content/usage.md?raw'
import automationMd from '../content/automation.md?raw'
import tipsMd       from '../content/tips.md?raw'
import faqMd        from '../content/faq.md?raw'

const startMd = installMd + '\n\n---\n\n' + usageMd

/* ── tips.md 파서 ── */
function parseTips(md) {
  const lines = md.split('\n')
  const items = []
  let current = null
  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/)
    if (match) {
      if (current) items.push(current)
      current = { title: match[1].trim(), body: '' }
    } else if (current) {
      current.body += line + '\n'
    }
  }
  if (current) items.push(current)
  return items.map(i => ({ ...i, body: i.body.trim() }))
}

/* ── 팁 카드 색상 ── */
const TIP_COLORS = [
  { border: 'border-blue-200',   accent: 'bg-blue-500',   light: 'bg-blue-100 text-blue-600' },
  { border: 'border-violet-200', accent: 'bg-violet-500', light: 'bg-violet-100 text-violet-600' },
  { border: 'border-cyan-200',   accent: 'bg-cyan-500',   light: 'bg-cyan-100 text-cyan-600' },
  { border: 'border-green-200',  accent: 'bg-green-500',  light: 'bg-green-100 text-green-600' },
  { border: 'border-yellow-200', accent: 'bg-yellow-500', light: 'bg-yellow-100 text-yellow-600' },
  { border: 'border-orange-200', accent: 'bg-orange-500', light: 'bg-orange-100 text-orange-600' },
  { border: 'border-pink-200',   accent: 'bg-pink-500',   light: 'bg-pink-100 text-pink-600' },
]

/* ── 팁 카드 컴포넌트 ── */
const TipsCards = ({ md }) => {
  const tips = useMemo(() => parseTips(md), [md])
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {tips.map((tip, i) => {
        const c = TIP_COLORS[i % TIP_COLORS.length]
        return (
          <div key={i} className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm ${c.border}`}>
            {/* 상단 컬러 라인 */}
            <div className={`h-1 w-full ${c.accent}`} />
            <div className="p-5 md:p-6">
              {/* 번호 배지 */}
              <span className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-black ${c.light}`}>
                {tip.title.match(/^[①②③④⑤⑥⑦⑧⑨⑩]/)?.[0] ?? `#${i+1}`}
              </span>
              <h3 className="mb-3 text-base font-black leading-snug text-gray-900 md:text-lg">
                {tip.title.replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '')}
              </h3>
              <p className="text-sm leading-[1.9] text-slate-600 [overflow-wrap:anywhere] md:text-base whitespace-pre-line">
                {tip.body}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const SECTIONS = {
  start: {
    emoji: '🚀',
    title: '크로닛 시작하기',
    callout: '아래 순서를 그대로 따라와주세요.',
    type: 'markdown',
    content: startMd,
  },
  features: {
    emoji: '⚙️',
    title: '필수 기능',
    callout: '헷갈리기 쉬운 주요 기능을 정리했어요.',
    type: 'markdown',
    content: automationMd,
  },
  tips: {
    emoji: '💡',
    title: '꿀팁',
    callout: null,
    type: 'tips',
    content: tipsMd,
  },
  faq: {
    emoji: '❓',
    title: '자주 묻는 질문',
    callout: null,
    type: 'faq',
    content: faqMd,
  },
}

/* ── FAQ 아이템 ── */
const FaqItem = ({ question, answer, onImageClick }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50"
      >
        <span className="text-base font-bold text-gray-900 md:text-lg">Q. {question}</span>
        <span className="shrink-0 text-blue-400 text-sm transition-transform duration-200" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
      </button>
      <div className="grid transition-all duration-200 ease-in-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <div className="border-t border-gray-100 px-5 pb-4 pt-3">
            <Markdown onImageClick={onImageClick}>{answer}</Markdown>
          </div>
        </div>
      </div>
    </div>
  )
}

const ManualDetail = () => {
  const { section } = useParams()
  const { pathname } = useLocation()
  const [lightbox, setLightbox] = useState(null)
  const data = SECTIONS[section]

  const faqItems = useMemo(() => (data?.type === 'faq' ? parseFaq(data.content) : []), [data])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-900">
        <div className="text-center">
          <p className="mb-4 text-xl">페이지를 찾을 수 없습니다.</p>
          <Link to="/manual" className="text-blue-400 underline">매뉴얼로 돌아가기</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-gray-900 selection:bg-blue-500/30">
      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
      <ManualHeader currentPath={pathname} />

      {/* 히어로 */}
      <section className="relative px-5 pt-32 pb-10 md:px-8 md:pt-44 md:pb-12">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,#000_60%,transparent_100%)]" />
        <div className="relative z-10 mx-auto max-w-3xl">
          <Link to="/manual" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-blue-500">
            <ArrowLeft size={16} /> 매뉴얼 목록
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 md:text-5xl">
            <span className="mr-3">{data.emoji}</span>{data.title}
          </h1>
        </div>
      </section>

      {/* 본문 */}
      <section className="px-5 pb-24 md:px-8">
        <div className="mx-auto max-w-3xl">
          {data.callout && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 md:text-base">
              <span>📌</span> {data.callout}
            </div>
          )}

          {data.type === 'markdown' && (
            <Markdown onImageClick={setLightbox}>{data.content}</Markdown>
          )}

          {data.type === 'tips' && (
            <TipsCards md={data.content} />
          )}

          {data.type === 'faq' && (
            <div className="space-y-2">
              {faqItems.map((item, i) => (
                <FaqItem key={i} question={item.question} answer={item.answer} onImageClick={setLightbox} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 하단 네비 */}
      <section className="px-5 pb-16 md:px-8">
        <div className="mx-auto flex max-w-3xl justify-between gap-4">
          <Link to="/manual" className="group inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-all hover:border-blue-400 hover:text-blue-600">
            <ArrowLeft size={16} /> 목록으로
          </Link>
        </div>
      </section>

      <ManualFooter />
    </div>
  )
}

export default ManualDetail

import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Megaphone } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { supabase } from '../lib/supabase'

const statusCfg = {
  active: { label: '진행중',      cls: 'bg-[#03C75A]/15 text-[#03C75A] border-[#03C75A]/30',  dot: true  },
  ended:  { label: '종료됨',      cls: 'bg-slate-100 text-slate-500 border-slate-200',         dot: false },
  winner: { label: '당첨자 발표', cls: 'bg-amber-100 text-amber-700 border-amber-200',         dot: false },
}

const EventBadge = ({ status, label }) => {
  const cfg = statusCfg[status] || statusCfg.active
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${cfg.cls}`}>
      {cfg.dot && <span className="h-1.5 w-1.5 rounded-full bg-[#03C75A] animate-[badge-pulse_1.4s_ease-in-out_infinite]" />}
      {label || cfg.label}
    </span>
  )
}

const fmtDate = (s) => new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

const EventDetail = () => {
  const { id } = useParams()
  const [scrolled, setScrolled] = useState(false)
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    supabase.from('events').select('*').eq('id', id).maybeSingle()
      .then(({ data }) => { setEvent(data); setLoading(false) })
  }, [id])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAF8] font-sans break-keep text-gray-900">

      {/* 헤더 */}
      <header className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${scrolled ? 'border-b border-gray-200 bg-white/90 py-3 backdrop-blur-xl md:py-4' : 'bg-transparent py-5 md:py-8'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2 md:gap-3">
            <img src="https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/icon.png" alt="Chronit" className="h-8 w-8 shrink-0 rounded-lg md:h-10 md:w-10" />
            <h1 className="text-2xl font-black tracking-tighter text-gray-900 md:text-3xl">Chronit</h1>
          </Link>
          <nav className="hidden gap-12 text-base font-bold tracking-wide text-slate-500 md:flex">
            <Link to="/#features" className="uppercase transition-colors hover:text-[#03C75A]">기능</Link>
            <Link to="/manual"    className="uppercase transition-colors hover:text-[#03C75A]">매뉴얼</Link>
            <Link to="/#pricing"  className="uppercase transition-colors hover:text-[#03C75A]">요금제</Link>
            <Link to="/events"    className="uppercase text-[#03C75A]">이벤트</Link>
          </nav>
          <Link to="/#pricing" className="shrink-0 rounded-full bg-[#03C75A] px-4 py-2 text-sm font-bold whitespace-nowrap text-white shadow-lg shadow-[#03C75A]/25 transition-all hover:bg-[#02b350] active:scale-95 md:px-7 md:py-2.5 md:text-base">
            시작하기
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 pt-28 pb-28 md:px-8 md:pt-40">
        {/* 목록으로 */}
        <Link to="/events" className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-[#03C75A]">
          <ArrowLeft size={16} /> 이벤트 목록
        </Link>

        {loading ? (
          <p className="py-20 text-center text-sm text-slate-500">불러오는 중...</p>
        ) : !event ? (
          <div className="py-20 text-center">
            <p className="text-base font-bold text-gray-700">이벤트를 찾을 수 없어요</p>
            <Link to="/events" className="mt-4 inline-block rounded-xl bg-[#03C75A] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#02b350]">이벤트 목록으로</Link>
          </div>
        ) : (
          <>
            {/* 메타 */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <EventBadge status={event.status} label={event.label} />
              <span className="text-sm text-slate-400">{fmtDate(event.created_at)}</span>
            </div>

            {/* 제목 */}
            <h1 className="mb-7 text-3xl font-black leading-[1.25] tracking-tight text-gray-900 md:text-4xl">{event.title}</h1>

            {/* 대표 이미지 */}
            {event.thumbnail_url && (
              <img src={event.thumbnail_url} alt="" className="mb-8 w-full rounded-3xl border border-gray-100 object-cover shadow-sm" />
            )}

            {/* 본문 */}
            <div className="event-post">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{event.content || ''}</ReactMarkdown>
            </div>

            {/* CTA */}
            {event.cta_text && event.cta_url && (
              <a href={event.cta_url} target="_blank" rel="noopener noreferrer"
                className="mt-10 flex w-full items-center justify-center rounded-2xl bg-[#03C75A] px-6 py-4 text-base font-black text-white shadow-lg shadow-[#03C75A]/25 transition-all hover:bg-[#02b350] active:scale-[0.99]">
                {event.cta_text} →
              </a>
            )}

            {/* 하단 목록으로 */}
            <div className="mt-12 border-t border-gray-200 pt-8 text-center">
              <Link to="/events" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-all hover:border-[#03C75A] hover:text-[#03C75A]">
                <ArrowLeft size={16} /> 다른 이벤트 보기
              </Link>
            </div>
          </>
        )}
      </article>

      <style>{`
        @keyframes badge-pulse { 0%,100%{opacity:1;} 50%{opacity:.4;} }
        .event-post { color:#374151; font-size:1.05rem; line-height:1.85; }
        .event-post > :first-child { margin-top:0; }
        .event-post h1,.event-post h2 { font-size:1.5rem; font-weight:800; color:#111827; margin:1.7em 0 .6em; line-height:1.35; }
        .event-post h3 { font-size:1.2rem; font-weight:800; color:#111827; margin:1.4em 0 .5em; }
        .event-post p { margin:0 0 1.1em; }
        .event-post ul,.event-post ol { margin:0 0 1.1em; padding-left:1.4em; }
        .event-post ul { list-style:disc; }
        .event-post ol { list-style:decimal; }
        .event-post li { margin:.45em 0; }
        .event-post strong { color:#111827; font-weight:800; }
        .event-post a { color:#03C75A; text-decoration:underline; font-weight:600; }
        .event-post img { max-width:100%; border-radius:14px; margin:1.3em 0; }
        .event-post hr { border:0; border-top:1px solid #e5e7eb; margin:1.8em 0; }
        .event-post blockquote { border-left:3px solid #03C75A; background:rgba(3,199,90,.06); padding:.7em 1.1em; border-radius:10px; margin:1.2em 0; }
        .event-post blockquote p { margin:0; }
      `}</style>
    </div>
  )
}

export default EventDetail

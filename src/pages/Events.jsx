import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from '../lib/supabase'

const statusCfg = {
  active: { label: '진행중',      cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30',   dot: true  },
  ended:  { label: '종료됨',      cls: 'bg-slate-600/30 text-slate-400 border-slate-500/20', dot: false },
  winner: { label: '당첨자 발표', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30', dot: false },
}

const EventBadge = ({ status, label }) => {
  const cfg = statusCfg[status] || statusCfg.active
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.cls}`}>
      {cfg.dot && <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-[badge-pulse_1.4s_ease-in-out_infinite]" />}
      {label || cfg.label}
    </span>
  )
}

const Events = () => {
  const [scrolled, setScrolled]         = useState(false)
  const [events, setEvents]             = useState([])
  const [eventTab, setEventTab]         = useState('active')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    supabase.from('events').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setEvents(data || []); setLoading(false) })
  }, [])

  const tabs = [
    { key: 'active', label: '진행중인 이벤트' },
    { key: 'ended',  label: '종료된 이벤트' },
    { key: 'winner', label: '당첨자 발표' },
  ]

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans break-keep text-gray-900">

      {/* 헤더 */}
      <header className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${scrolled ? 'border-b border-gray-200 bg-white/90 py-3 backdrop-blur-xl md:py-4' : 'bg-transparent py-5 md:py-8'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2 md:gap-3">
            <img src="https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/icon.png" alt="Chronit" className="h-8 w-8 shrink-0 rounded-lg md:h-10 md:w-10" />
            <h1 className="text-2xl font-black tracking-tighter text-gray-900 md:text-3xl">Chronit</h1>
          </Link>
          <nav className="hidden gap-12 text-base font-bold tracking-wide text-slate-500 md:flex">
            <Link to="/#features" className="uppercase transition-colors hover:text-blue-400">기능</Link>
            <Link to="/manual"    className="uppercase transition-colors hover:text-blue-400">사용 방법</Link>
            <Link to="/#pricing"  className="uppercase transition-colors hover:text-blue-400">요금제</Link>
            <Link to="/events"    className="uppercase text-blue-400">이벤트</Link>
          </nav>
          <Link to="/#pricing" className="shrink-0 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold whitespace-nowrap text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 active:scale-95 md:px-7 md:py-2.5 md:text-base">
            시작하기
          </Link>
        </div>
      </header>

      {/* 히어로 */}
      <section className="relative px-5 pt-32 pb-12 md:px-8 md:pt-48 md:pb-16">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,#000_60%,transparent_100%)]" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm font-bold text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)] md:text-base">
            <Megaphone size={14} /> <span>크로닛 이벤트</span>
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-gray-900 md:text-6xl">이벤트</h1>
          <p className="text-lg leading-[1.8] text-slate-500 md:text-xl">크로닛의 다양한 이벤트와 혜택을 확인하세요.</p>
        </div>
      </section>

      {/* 본문 */}
      <section className="px-5 pb-32 md:px-8">
        <div className="mx-auto max-w-4xl">
          {/* 탭 */}
          <div className="mb-1 flex border-b border-gray-200">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setEventTab(tab.key)}
                className={`px-5 py-3 text-sm font-bold transition-colors border-b-2 -mb-px ${
                  eventTab === tab.key
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-slate-500">
                  {events.filter(e => e.status === tab.key).length}
                </span>
              </button>
            ))}
          </div>

          {/* 목록 */}
          <div className="divide-y divide-gray-100">
            {loading ? (
              <p className="py-12 text-center text-sm text-slate-600">불러오는 중...</p>
            ) : events.filter(e => e.status === eventTab).length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-600">해당 이벤트가 없습니다</p>
            ) : (
              events.filter(e => e.status === eventTab).map(ev => (
                <button
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className="flex w-full items-center gap-4 px-2 py-4 text-left transition-colors hover:bg-gray-50"
                >
                  <EventBadge status={ev.status} label={ev.label} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">{ev.title}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {new Date(ev.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 이벤트 상세 모달 */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white md:rounded-3xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-6 py-4 backdrop-blur-xl">
              <div className="flex items-center gap-2 min-w-0">
                <EventBadge status={selectedEvent.status} label={selectedEvent.label} />
                <h3 className="truncate text-base font-bold text-gray-900">{selectedEvent.title}</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-gray-100 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-6">
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedEvent.content}</ReactMarkdown>
              </div>
              {selectedEvent.cta_text && selectedEvent.cta_url && (
                <a
                  href={selectedEvent.cta_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 flex w-full items-center justify-center rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-95"
                >
                  {selectedEvent.cta_text}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes badge-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

export default Events

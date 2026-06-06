import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import { supabase } from '../lib/supabase'

const statusCfg = {
  active: { label: '진행중',      cls: 'bg-[#03C75A]/20 text-[#03C75A] border-[#03C75A]/30',   dot: true  },
  ended:  { label: '종료됨',      cls: 'bg-slate-600/30 text-slate-400 border-slate-500/20', dot: false },
  winner: { label: '당첨자 발표', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30', dot: false },
}

const EventBadge = ({ status, label }) => {
  const cfg = statusCfg[status] || statusCfg.active
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.cls}`}>
      {cfg.dot && <span className="h-1.5 w-1.5 rounded-full bg-[#03C75A] animate-[badge-pulse_1.4s_ease-in-out_infinite]" />}
      {label || cfg.label}
    </span>
  )
}

// 본문(마크다운/HTML)에서 미리보기 텍스트 추출
const excerpt = (src = '', n = 90) => {
  const txt = src
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return txt.length > n ? txt.slice(0, n) + '…' : txt
}
const fmtDate = (s) => new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')

const Events = () => {
  const [scrolled, setScrolled]         = useState(false)
  const [events, setEvents]             = useState([])
  const [eventTab, setEventTab]         = useState('active')
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
            <Link to="/manual"    className="uppercase transition-colors hover:text-[#03C75A]">사용 방법</Link>
            <Link to="/#pricing"  className="uppercase transition-colors hover:text-[#03C75A]">요금제</Link>
            <Link to="/events"    className="uppercase text-[#03C75A]">이벤트</Link>
          </nav>
          <Link to="/#pricing" className="shrink-0 rounded-full bg-[#03C75A] px-4 py-2 text-sm font-bold whitespace-nowrap text-white shadow-lg shadow-[#03C75A]/25 transition-all hover:bg-[#02b350] active:scale-95 md:px-7 md:py-2.5 md:text-base">
            시작하기
          </Link>
        </div>
      </header>

      {/* 히어로 */}
      <section className="relative px-5 pt-32 pb-12 md:px-8 md:pt-48 md:pb-16">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,#000_60%,transparent_100%)]" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#03C75A]/20 bg-[#03C75A]/10 px-4 py-1.5 text-sm font-bold text-[#03C75A] shadow-[0_0_20px_rgba(59,130,246,0.15)] md:text-base">
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
                    ? 'border-[#03C75A] text-[#03C75A]'
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
          {loading ? (
            <p className="py-16 text-center text-sm text-slate-500">불러오는 중...</p>
          ) : events.filter(e => e.status === eventTab).length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">해당 이벤트가 없습니다</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 pt-6 sm:grid-cols-2">
              {events.filter(e => e.status === eventTab).map(ev => (
                <Link
                  key={ev.id}
                  to={`/events/${ev.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#03C75A]/40 hover:shadow-lg"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-[#03C75A]/15 to-[#03C75A]/5">
                    {ev.thumbnail_url ? (
                      <img src={ev.thumbnail_url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Megaphone size={40} className="text-[#03C75A]/40" />
                      </div>
                    )}
                    <div className="absolute left-3 top-3">
                      <EventBadge status={ev.status} label={ev.label} />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <h3 className="text-lg font-black leading-snug text-gray-900 md:text-xl">{ev.title}</h3>
                    {excerpt(ev.content) && (
                      <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">{excerpt(ev.content)}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <span className="text-xs text-slate-400">{fmtDate(ev.created_at)}</span>
                      <span className="flex items-center gap-1 text-sm font-bold text-[#03C75A] transition-all group-hover:gap-2">자세히 보기 →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

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

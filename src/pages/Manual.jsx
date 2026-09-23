import { Link, useLocation } from 'react-router-dom'
import { Sparkles, ChevronRight } from 'lucide-react'
import { ManualHeader, ManualFooter } from '../components/ManualLayout'

const CARDS = [
  {
    to: '/manual/start',
    title: '크로닛 제작 흐름',
    desc: '소재 찾기부터\n릴스 완성까지 전체 순서',
    color: 'border-white/10 hover:border-[#0064FF]/50',
    badge: '필수',
    badgeColor: 'bg-[#0064FF]/15 text-[#0064FF]',
  },
  {
    to: '/manual/search',
    title: 'AI 비서 베라 사용법',
    desc: '대본 작성·채널 분석\n베라로 할 수 있는 것',
    color: 'border-white/10 hover:border-[#0064FF]/50',
    badge: '추천',
    badgeColor: 'bg-[#0064FF]/15 text-[#0064FF]',
  },
  {
    to: '/manual/trend',
    title: '실시간 트렌드 보는 법',
    desc: '잘 뜬 쇼핑 숏폼을\n한곳에 모아보기',
    color: 'border-white/10 hover:border-[#0064FF]/50',
    badge: '핵심',
    badgeColor: 'bg-[#FFB800]/15 text-[#FFB800]',
  },
  {
    to: '/manual/credits',
    title: '요금제 · 이용권',
    desc: '이용권 어떻게 쓰나\n요금·환불 안내',
    color: 'border-white/10 hover:border-[#0064FF]/50',
    badge: null,
    badgeColor: '',
  },
  {
    to: '/manual/app',
    title: '앱으로 설치해 쓰기',
    desc: '휴대폰 홈 화면에 추가해\n앱처럼 사용하기',
    color: 'border-white/10 hover:border-[#0064FF]/50',
    badge: null,
    badgeColor: '',
  },
  {
    to: '/manual/faq',
    title: '자주 묻는 질문',
    desc: '막힐 때 바로 찾는\n답변 모음',
    color: 'border-white/10 hover:border-[#0064FF]/50',
    badge: null,
    badgeColor: '',
  },
]

const Manual = () => {
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0b0f] font-sans text-white selection:bg-[#0064FF]/30">
      <ManualHeader currentPath={pathname} />

      {/* 히어로 */}
      <section className="relative px-5 pt-32 pb-12 md:px-8 md:pt-48 md:pb-16">
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0064FF]/20 bg-[#0064FF]/10 px-4 py-1.5 text-sm font-bold text-[#0064FF] shadow-[0_0_20px_rgba(59,130,246,0.15)] md:text-base">
            <Sparkles size={14} fill="currentColor" /> <span>크로닛 사용 방법</span>
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-6xl">사용 방법</h1>
          <p className="text-lg leading-[1.8] text-white/45 md:text-xl">소재 찾기부터 대본·제작까지,<br />크로닛을 제대로 쓰는 법.</p>
        </div>
      </section>

      {/* 2x2 카드 그리드 */}
      <section className="px-5 pb-24 md:px-8">
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {CARDS.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className={`group relative flex flex-col gap-3 rounded-2xl glass p-6 transition-all duration-200 hover:-translate-y-0.5 ${card.color}`}
            >
              {card.badge && (
                <span className={`absolute top-4 right-4 rounded-full px-2.5 py-0.5 text-xs font-bold ${card.badgeColor}`}>
                  {card.badge}
                </span>
              )}
              <div>
                <h2 className="text-lg font-bold text-white">{card.title}</h2>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-white/55">{card.desc}</p>
              </div>
              <div className="mt-auto flex items-center gap-1 text-sm font-bold text-[#0064FF] transition-gap group-hover:gap-2">
                바로가기 <ChevronRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-5 py-8 text-center md:px-8">
        <Link to="/" className="group inline-flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.04] px-6 py-3 text-base font-bold text-white/75 transition-all hover:border-[#0064FF] hover:text-[#0064FF] md:text-lg">
          홈으로 돌아가기
        </Link>
      </section>

      <ManualFooter />
    </div>
  )
}

export default Manual

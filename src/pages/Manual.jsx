import { Link, useLocation } from 'react-router-dom'
import { Sparkles, ChevronRight } from 'lucide-react'
import { ManualHeader, ManualFooter } from '../components/ManualLayout'

const CARDS = [
  {
    to: '/manual/start',
    emoji: '👋',
    title: '이렇게 쓰면 돼요',
    desc: '링크 붙여넣고 버튼 한 번,\n3단계면 영상 완성',
    color: 'from-[#0064FF]/10 to-[#0064FF]/10 border-[#0064FF]/30 hover:border-[#0064FF] bg-white',
    badge: '필수',
    badgeColor: 'bg-[#0064FF]/15 text-[#0064FF]',
  },
  {
    to: '/manual/revenue',
    emoji: '💰',
    title: '쿠팡 파트너스 & 수익 구조',
    desc: '뭔지, 어떻게 쓰는지,\n돈이 통장에 어떻게 들어오는지',
    color: 'from-[#0064FF]/10 to-[#0064FF]/10 border-[#0064FF]/30 hover:border-[#0064FF] bg-white',
    badge: '꼭 읽기',
    badgeColor: 'bg-[#FFB800]/15 text-[#9a6b00]',
  },
  {
    to: '/manual/features',
    emoji: '📸',
    title: '사진 보고 따라하기 (전체 흐름)',
    desc: '세팅(처음 한 번만)부터 영상 만들기·내 링크 공유까지\n다음 ▶ 으로 한 단계씩',
    color: 'from-[#0064FF]/10 to-[#0064FF]/10 border-[#0064FF]/30 hover:border-[#0064FF] bg-white',
    badge: '추천',
    badgeColor: 'bg-[#0064FF]/15 text-[#0064FF]',
  },
  {
    to: '/manual/app',
    emoji: '📱',
    title: '앱으로 사용하는 방법',
    desc: '휴대폰 홈 화면에 추가해\n앱처럼 사용하기',
    color: 'from-[#0064FF]/10 to-[#0064FF]/10 border-[#0064FF]/30 hover:border-[#0064FF] bg-white',
    badge: null,
    badgeColor: '',
  },
  {
    to: '/manual/credits',
    emoji: '🪙',
    title: '서비스 이용 안내',
    desc: '영상 1개 = 이용권 1개\n플랜·환불 안내',
    color: 'from-yellow-50 to-yellow-50 border-yellow-300 hover:border-yellow-400 bg-white',
    badge: null,
    badgeColor: '',
  },
  {
    to: '/manual/tips',
    emoji: '💡',
    title: '꿀팁',
    desc: '더 빠르고 스마트하게\n사용하는 방법',
    color: 'from-yellow-50 to-orange-50 border-yellow-200 hover:border-yellow-400 bg-white',
    badge: null,
    badgeColor: '',
  },
  {
    to: '/manual/faq',
    emoji: '❓',
    title: '자주 묻는 질문',
    desc: '사용 중 막힐 때\n바로 찾는 FAQ',
    color: 'from-slate-50 to-gray-50 border-slate-200 hover:border-slate-400 bg-white',
    badge: null,
    badgeColor: '',
  },
]

const Manual = () => {
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAF8] font-sans text-gray-900 selection:bg-[#0064FF]/30">
      <ManualHeader currentPath={pathname} />

      {/* 히어로 */}
      <section className="relative px-5 pt-32 pb-12 md:px-8 md:pt-48 md:pb-16">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,#000_60%,transparent_100%)]" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0064FF]/20 bg-[#0064FF]/10 px-4 py-1.5 text-sm font-bold text-[#0064FF] shadow-[0_0_20px_rgba(59,130,246,0.15)] md:text-base">
            <Sparkles size={14} fill="currentColor" /> <span>크로닛 사용 방법</span>
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-gray-900 md:text-6xl">사용 방법</h1>
          <p className="text-lg leading-[1.8] text-slate-500 md:text-xl">로그인부터 첫 영상 제작까지, 5분 안에 익히는 크로닛 사용법.</p>
        </div>
      </section>

      {/* 2x2 카드 그리드 */}
      <section className="px-5 pb-24 md:px-8">
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {CARDS.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className={`group relative flex flex-col gap-3 rounded-2xl border bg-gradient-to-br p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${card.color}`}
            >
              {card.badge && (
                <span className={`absolute top-4 right-4 rounded-full px-2.5 py-0.5 text-xs font-bold ${card.badgeColor}`}>
                  {card.badge}
                </span>
              )}
              <span className="text-3xl">{card.emoji}</span>
              <div>
                <h2 className="text-lg font-black text-gray-900">{card.title}</h2>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-500">{card.desc}</p>
              </div>
              <div className="mt-auto flex items-center gap-1 text-sm font-bold text-[#0064FF] transition-gap group-hover:gap-2">
                바로가기 <ChevronRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-5 py-8 text-center md:px-8">
        <Link to="/" className="group inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-base font-bold text-slate-700 transition-all hover:border-[#0064FF] hover:text-[#0064FF] md:text-lg">
          홈으로 돌아가기
        </Link>
      </section>

      <ManualFooter />
    </div>
  )
}

export default Manual

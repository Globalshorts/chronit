import { Link, useLocation } from 'react-router-dom'
import { Sparkles, ChevronRight } from 'lucide-react'
import { ManualHeader, ManualFooter } from '../components/ManualLayout'

const CARDS = [
  {
    to: '/manual/start',
    emoji: '🚀',
    title: '크로닛 시작하기',
    desc: '설치부터 첫 영상 완성까지\n단계별 가이드',
    color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 hover:border-blue-400/50',
    badge: '필수',
    badgeColor: 'bg-blue-500/20 text-blue-300',
  },
  {
    to: '/manual/features',
    emoji: '⚙️',
    title: '필수 기능',
    desc: '자동화 흐름과\n핵심 기능 한눈에 보기',
    color: 'from-violet-500/20 to-purple-500/10 border-violet-500/30 hover:border-violet-400/50',
    badge: '추천',
    badgeColor: 'bg-violet-500/20 text-violet-300',
  },
  {
    to: '/manual/tips',
    emoji: '💡',
    title: '꿀팁',
    desc: '더 빠르고 스마트하게\n사용하는 방법',
    color: 'from-yellow-500/20 to-orange-500/10 border-yellow-500/30 hover:border-yellow-400/50',
    badge: null,
    badgeColor: '',
  },
  {
    to: '/manual/faq',
    emoji: '❓',
    title: '자주 묻는 질문',
    desc: '사용 중 막힐 때\n바로 찾는 FAQ',
    color: 'from-slate-500/20 to-slate-600/10 border-slate-500/30 hover:border-slate-400/50',
    badge: null,
    badgeColor: '',
  },
]

const Manual = () => {
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#020617] font-sans text-slate-100 selection:bg-blue-500/30">
      <ManualHeader currentPath={pathname} />

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
      <div className="px-5 pb-10 md:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-yellow-400/40 bg-gradient-to-r from-yellow-500/15 to-orange-500/10 px-6 py-5">
          <p className="text-base font-bold text-yellow-100 md:text-lg">
            ⚡ 링크만 입력하면 영상 1개 완성까지 <span className="text-yellow-300">약 2분</span>, 당신이 할 일은 없습니다.
          </p>
          <p className="mt-1 text-sm text-yellow-200/70 md:text-base">
            단, 처음 한 번만 2·3·4·5단계에서 영상 길이·목소리·자막·썸네일 스타일을 설정해두세요.
          </p>
        </div>
      </div>

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
                <h2 className="text-lg font-black text-white">{card.title}</h2>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-400">{card.desc}</p>
              </div>
              <div className="mt-auto flex items-center gap-1 text-sm font-bold text-blue-400 transition-gap group-hover:gap-2">
                바로가기 <ChevronRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-5 py-8 text-center md:px-8">
        <Link to="/" className="group inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-base font-bold text-slate-200 transition-all hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400 md:text-lg">
          홈으로 돌아가기
        </Link>
      </section>

      <ManualFooter />
    </div>
  )
}

export default Manual

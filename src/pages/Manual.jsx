import { Link, useLocation } from 'react-router-dom'
import { Sparkles, ChevronRight } from 'lucide-react'
import { ManualHeader, ManualFooter } from '../components/ManualLayout'

const CARDS = [
  {
    to: '/manual/start',
    emoji: '👋',
    title: '이렇게 쓰면 돼요',
    desc: '링크 붙여넣고 버튼 한 번,\n3단계면 영상 완성',
    color: 'from-[#03C75A]/10 to-[#03C75A]/10 border-[#03C75A]/30 hover:border-[#03C75A] bg-white',
    badge: '필수',
    badgeColor: 'bg-[#03C75A]/15 text-[#03C75A]',
  },
  {
    to: '/manual/features',
    emoji: '⚙️',
    title: '필수 기능',
    desc: '자동화 흐름과\n핵심 기능 한눈에 보기',
    color: 'from-[#03C75A]/10 to-[#03C75A]/10 border-[#03C75A]/30 hover:border-[#03C75A] bg-white',
    badge: '추천',
    badgeColor: 'bg-[#03C75A]/15 text-[#03C75A]',
  },
  {
    to: '/manual/app',
    emoji: '📱',
    title: '앱으로 사용하는 방법',
    desc: '휴대폰 홈 화면에 추가해\n앱처럼 사용하기',
    color: 'from-[#03C75A]/10 to-[#03C75A]/10 border-[#03C75A]/30 hover:border-[#03C75A] bg-white',
    badge: null,
    badgeColor: '',
  },
  {
    to: '/manual/credits',
    emoji: '🪙',
    title: '크레딧 안내',
    desc: '영상 1개당 크레딧과\n플랜·이월·환불 안내',
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
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAF8] font-sans text-gray-900 selection:bg-[#03C75A]/30">
      <ManualHeader currentPath={pathname} />

      {/* 히어로 */}
      <section className="relative px-5 pt-32 pb-12 md:px-8 md:pt-48 md:pb-16">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,#000_60%,transparent_100%)]" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#03C75A]/20 bg-[#03C75A]/10 px-4 py-1.5 text-sm font-bold text-[#03C75A] shadow-[0_0_20px_rgba(59,130,246,0.15)] md:text-base">
            <Sparkles size={14} fill="currentColor" /> <span>크로닛 사용 매뉴얼</span>
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-gray-900 md:text-6xl">매뉴얼</h1>
          <p className="text-lg leading-[1.8] text-slate-500 md:text-xl">로그인부터 첫 영상 제작까지, 5분 안에 익히는 크로닛 사용법.</p>
        </div>
      </section>

      {/* 핵심 안내 배너 */}
      <div className="px-5 pb-10 md:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50 px-6 py-5">
          <p className="text-base font-bold text-yellow-800 md:text-lg">
            ⚡ 링크만 입력하면 영상 1개 완성까지 <span className="text-yellow-600">약 2분</span>, 당신이 할 일은 없습니다.
          </p>
          <p className="mt-1 text-sm text-yellow-700 md:text-base">
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
                <h2 className="text-lg font-black text-gray-900">{card.title}</h2>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-500">{card.desc}</p>
              </div>
              <div className="mt-auto flex items-center gap-1 text-sm font-bold text-[#03C75A] transition-gap group-hover:gap-2">
                바로가기 <ChevronRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-5 py-8 text-center md:px-8">
        <Link to="/" className="group inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-base font-bold text-slate-700 transition-all hover:border-[#03C75A] hover:text-[#03C75A] md:text-lg">
          홈으로 돌아가기
        </Link>
      </section>

      <ManualFooter />
    </div>
  )
}

export default Manual

import { Link } from 'react-router-dom'
import { Sparkles, PenLine, TrendingUp, HelpCircle, MessageCircle, Film } from 'lucide-react'
import AnimatedCounter from './AnimatedCounter'

// 게시판 글이 0개일 때 보여주는 "살아있는" 빈 화면.
// - 운영자 환영 + 이번 주 챌린지
// - "이렇게 시작해보세요" 카테고리 프롬프트 (수익인증 / 질문 / 자유)
// - 자랑하기·새 친구 자동글이 채워질 자리(점선)
// totalVideos: 실제 누적 제작 수. 값이 있을 때만 상단 배너 노출(숫자 부풀리기 X).
const PROMPTS = [
  { icon: TrendingUp,   badge: '수익인증', badgeCls: 'bg-[#03C75A]/15 text-[#03C75A]', title: '첫 주문·매출 후기를 남겨보세요', desc: '작은 인증도 누군가에겐 큰 힘이 돼요' },
  { icon: HelpCircle,   badge: '질문',     badgeCls: 'bg-amber-100 text-amber-600',   title: '막히는 거, 편하게 물어보세요',   desc: '상품·편집·판매 무엇이든' },
  { icon: MessageCircle,badge: '자유',     badgeCls: 'bg-gray-100 text-gray-500',     title: '오늘 장사 어땠는지 한 줄',     desc: '같은 길 걷는 사람들과 공감해요' },
]

export default function BoardEmptyState({ totalVideos = null }) {
  return (
    <div className="py-6">
      {totalVideos ? (
        <div className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white">
          <Film size={16} className="text-[#03C75A]" />
          <span>지금까지 <b className="text-[#03C75A]"><AnimatedCounter to={totalVideos} />개</b>의 숏폼이 만들어졌어요</span>
        </div>
      ) : null}

      {/* 운영자 환영 + 챌린지 */}
      <div className="mb-4 rounded-2xl border border-[#03C75A]/20 bg-white p-5 shadow-sm">
        <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#03C75A]">
          <Sparkles size={14} /> 운영자 공지 · BETA
        </div>
        <h3 className="text-lg font-black text-gray-900">환영해요 👋 만든 숏폼 자랑하고 노하우 나눠요</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          이번 주 챌린지 — <b className="text-gray-700">첫 글 남기면 포인트 2배</b>
        </p>
        <Link
          to="/board/write"
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#03C75A] px-4 py-3 text-sm font-bold text-white transition-all hover:bg-[#02b350] active:scale-95"
        >
          <PenLine size={16} /> 첫 글 남기기
        </Link>
      </div>

      {/* 이렇게 시작해보세요 */}
      <p className="mb-2 px-1 text-xs font-bold text-slate-400">이렇게 시작해보세요</p>
      <div className="space-y-2">
        {PROMPTS.map((p, i) => {
          const Icon = p.icon
          return (
            <Link
              key={i}
              to="/board/write"
              className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#03C75A]/40 hover:shadow-md"
            >
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[#03C75A]/10 text-[#03C75A]">
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <span className={`mb-1 inline-block rounded-md px-2 py-0.5 text-xs font-bold ${p.badgeCls}`}>{p.badge}</span>
                <h4 className="truncate text-sm font-bold text-gray-900">{p.title}</h4>
                <p className="truncate text-xs text-slate-400">{p.desc}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* 자랑하기·새 친구 자동글이 채워질 자리 */}
      <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-5 text-center text-sm text-slate-400">
        곧 친구들의 활동(자랑하기·새 친구)이<br className="sm:hidden" /> 여기에 자동으로 채워져요 ✨
      </div>
    </div>
  )
}

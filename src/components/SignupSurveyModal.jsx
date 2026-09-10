import { supabase } from '../lib/supabase'

// 가입 직후 "카테고리 1-탭" — 강제 설문 X. 피드 개인화용, 건너뛰기 가능, 보상 없음.
// (보너스 이용권은 '첫 분석 완료' 시 지급 — grant_first_analysis_bonus_rpc)
const NICHE_OPTIONS = ['뷰티·화장품', '패션·의류', '리빙·홈·주방', '잡화·소품', '푸드·식품', '육아·키즈', '헬스·건강', '반려동물', '디지털·가전', '전체(여러 카테고리)']

const SignupSurveyModal = ({ open, onDone, onClose }) => {
  if (!open) return null

  const pick = (cat) => {
    try { localStorage.setItem('chr_niche', cat) } catch { /* noop */ }
    supabase.rpc('set_onboarding_niche_rpc', { p_niche: cat }).catch(() => {})   // 백그라운드 저장(대기 X)
    onDone?.()
  }
  const skip = () => { onClose ? onClose() : onDone?.() }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-6 backdrop-blur-sm sm:items-center">
      <div className="relative my-auto max-h-[92dvh] w-full max-w-sm overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
        <button onClick={skip} aria-label="나중에 하기" className="absolute right-4 top-4 text-xl leading-none text-gray-300 hover:text-gray-500">×</button>

        <p className="text-center text-lg font-bold text-gray-900">어떤 트렌드를 먼저 볼까요?</p>
        <p className="mt-1 text-center text-sm text-gray-500">고르면 그 카테고리 소재부터 보여드려요<br />(나중에 언제든 바꿀 수 있어요)</p>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {NICHE_OPTIONS.map((cat) => (
            <button key={cat} onClick={() => pick(cat)}
              className="rounded-xl border border-gray-200 bg-[#FAFAF8] px-3 py-3 text-sm font-bold text-gray-800 transition hover:border-[#0064FF] hover:text-[#0064FF] active:scale-[0.98]">
              {cat}
            </button>
          ))}
        </div>

        <button onClick={skip} className="mt-4 w-full py-1 text-center text-xs font-medium text-gray-400 hover:text-gray-600">나중에 하기</button>
      </div>
    </div>
  )
}

export default SignupSurveyModal

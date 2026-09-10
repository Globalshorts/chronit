import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SOURCE_OPTIONS = ['유튜브', '인스타그램', '지인 추천', '블로그·카페', '검색(구글·네이버)', '기타']
const PERSONA_OPTIONS = ['공구·제휴 크리에이터', '브랜드·쇼핑몰 SNS 운영', '릴스·틱톡 쇼핑 크리에이터', '부업·N잡 (막 시작)', '콘텐츠 대행사·편집자', '기타']
const NICHE_OPTIONS = ['뷰티·화장품', '패션·의류', '리빙·홈·주방', '잡화·소품', '푸드·식품', '육아·키즈', '헬스·건강', '반려동물', '디지털·가전', '기타']

/**
 * 가입 온보딩 설문 — 강제 게이트 X. 건너뛸 수 있는 "보상형" 프롬프트.
 *  - 완료 시 분석 이용권 5개 지급(survey_reward_rpc)
 *  - hasSource=false: 1p 유입경로 → 2p 직군+카테고리 / true: 2p만
 * onDone(): 완료 콜백 · onClose(): 나중에 하기(건너뛰기)
 */
const SignupSurveyModal = ({ open, hasSource = false, onDone, onClose }) => {
  const [page, setPage] = useState(hasSource ? 2 : 1)
  const [saving, setSaving] = useState(false)
  const [rewarded, setRewarded] = useState(false)
  const [persona, setPersona] = useState('')
  const [personaOther, setPersonaOther] = useState('')
  const [niche, setNiche] = useState('')
  const [nicheOther, setNicheOther] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => { if (open) { setPage(hasSource ? 2 : 1); setRewarded(false) } }, [open, hasSource])
  if (!open) return null

  const chooseSource = (src) => {
    setPage(2)
    supabase.rpc('set_signup_source_rpc', { p_source: src }).catch(() => {})
  }

  const skip = () => { onClose ? onClose() : onDone?.() }

  const finish = async () => {
    if (!persona) { setErr('직군을 선택해주세요'); return }
    if (!niche) { setErr('주력 카테고리를 선택해주세요'); return }
    const p = persona === '기타' ? (personaOther.trim() || '기타') : persona
    const n = niche === '기타' ? (nicheOther.trim() || '기타') : niche
    setSaving(true)
    try {
      const { data, error } = await supabase.rpc('survey_reward_rpc', { p_persona: p, p_niche: n })
      setSaving(false)
      if (error) { setErr('저장에 실패했어요. 다시 시도해주세요.'); return }
      if (data?.granted > 0) { setRewarded(true); return }
      onDone?.()
    } catch { setSaving(false); setErr('저장에 실패했어요. 다시 시도해주세요.') }
  }

  const selCls = 'mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#0064FF]'

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-6 backdrop-blur-sm sm:items-center">
      <div className="relative my-auto max-h-[92dvh] w-full max-w-sm overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">

        {rewarded ? (
          <div className="py-6 text-center">
            <div className="mb-3 text-4xl">🎉</div>
            <p className="text-lg font-bold text-gray-900">분석 이용권 5개가 지급됐어요!</p>
            <p className="mt-1 text-sm text-gray-500">이제 딱 맞는 소재를 골라 분석해보세요.</p>
            <button onClick={() => onDone?.()}
              className="mt-6 w-full rounded-xl bg-[#0064FF] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0052D6] active:scale-[0.98]">
              소재 보러 가기
            </button>
          </div>
        ) : (
          <>
            {/* 나중에 하기 (건너뛰기) */}
            <button onClick={skip} aria-label="나중에 하기"
              className="absolute right-4 top-4 text-xl leading-none text-gray-300 hover:text-gray-500">×</button>

            {!hasSource && (
              <div className="mb-4 flex items-center justify-center gap-1.5">
                <span className={`h-1.5 rounded-full transition-all ${page === 1 ? 'w-6 bg-[#0064FF]' : 'w-1.5 bg-gray-300'}`} />
                <span className={`h-1.5 rounded-full transition-all ${page === 2 ? 'w-6 bg-[#0064FF]' : 'w-1.5 bg-gray-300'}`} />
              </div>
            )}

            {/* 보상 배너 */}
            <div className="mb-4 rounded-xl bg-[#0064FF]/10 px-3 py-2 text-center text-[13px] font-bold text-[#0064FF]">
              🎁 30초 설문 완료 시 분석 이용권 5개 지급
            </div>

            {page === 1 ? (
              <>
                <p className="text-center text-lg font-bold text-gray-900">크로닛을 어떻게 알게 되셨어요?</p>
                <p className="mt-1 text-center text-sm text-gray-500">더 나은 서비스를 위해 참고할게요 🙏</p>
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  {SOURCE_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => chooseSource(opt)}
                      className="rounded-xl border border-gray-200 bg-[#FAFAF8] px-3 py-3 text-sm font-bold text-gray-800 transition hover:border-[#0064FF] hover:text-[#0064FF] active:scale-[0.98]">
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-center text-lg font-bold text-gray-900">거의 다 됐어요!</p>
                <p className="mt-1 text-center text-sm text-gray-500">알려주면 딱 맞는 소재를 추천해드려요</p>

                <div className="mt-5">
                  <label className="text-sm font-bold text-gray-700">어떤 일을 하세요?</label>
                  <select value={persona} onChange={e => { setPersona(e.target.value); setErr('') }} className={selCls}>
                    <option value="" disabled>직군을 선택하세요</option>
                    {PERSONA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {persona === '기타' && (
                    <input value={personaOther} onChange={e => setPersonaOther(e.target.value)} maxLength={40} autoFocus
                      placeholder="직접 입력해주세요"
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#0064FF]" />
                  )}
                </div>

                <div className="mt-4">
                  <label className="text-sm font-bold text-gray-700">주로 어떤 상품/카테고리를 다뤄요?</label>
                  <select value={niche} onChange={e => { setNiche(e.target.value); setErr('') }} className={selCls}>
                    <option value="" disabled>카테고리를 선택하세요</option>
                    {NICHE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {niche === '기타' && (
                    <input value={nicheOther} onChange={e => setNicheOther(e.target.value)} maxLength={40} autoFocus
                      placeholder="직접 입력해주세요"
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#0064FF]" />
                  )}
                </div>

                {err && <p className="mt-3 text-sm font-medium text-red-500">{err}</p>}

                <button onClick={finish} disabled={saving}
                  className="mt-5 w-full rounded-xl bg-[#0064FF] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0052D6] active:scale-[0.98] disabled:opacity-50">
                  {saving ? '저장 중...' : '완료하고 이용권 5개 받기'}
                </button>
              </>
            )}

            <button onClick={skip}
              className="mt-3 w-full py-1 text-center text-xs font-medium text-gray-400 hover:text-gray-600">
              나중에 하기
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default SignupSurveyModal

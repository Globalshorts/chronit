import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SOURCE_OPTIONS = ['유튜브', '인스타그램', '지인 추천', '블로그·카페', '검색(구글·네이버)', '기타']
const PERSONA_OPTIONS = ['공구·제휴 크리에이터', '브랜드·쇼핑몰 SNS 운영', '릴스·틱톡 쇼핑 크리에이터', '부업·N잡 (막 시작)', '콘텐츠 대행사·편집자', '기타']
const NICHE_OPTIONS = ['뷰티·화장품', '패션·의류', '리빙·홈·주방', '잡화·소품', '푸드·식품', '육아·키즈', '헬스·건강', '반려동물', '디지털·가전', '기타']

/**
 * 가입 온보딩 설문 (못 닫음).
 *  - hasSource=false: 1p 유입경로 → 2p 직군+카테고리
 *  - hasSource=true : 2p 직군+카테고리만 (경로 이미 답함 → 스킵)
 * onDone(): 설문 완료 콜백
 */
const SignupSurveyModal = ({ open, hasSource = false, onDone }) => {
  const [page, setPage] = useState(hasSource ? 2 : 1)
  const [saving, setSaving] = useState(false)
  const [persona, setPersona] = useState('')
  const [personaOther, setPersonaOther] = useState('')
  const [niche, setNiche] = useState('')
  const [nicheOther, setNicheOther] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => { if (open) setPage(hasSource ? 2 : 1) }, [open, hasSource])
  if (!open) return null

  const chooseSource = async (src) => {
    setSaving(true)
    try { await supabase.rpc('set_signup_source_rpc', { p_source: src }) } catch { /* noop */ }
    setSaving(false)
    setPage(2)
  }

  const finish = async () => {
    if (!persona) { setErr('직군을 선택해주세요'); return }
    if (!niche) { setErr('주력 카테고리를 선택해주세요'); return }
    const p = persona === '기타' ? (personaOther.trim() || '기타') : persona
    const n = niche === '기타' ? (nicheOther.trim() || '기타') : niche
    setSaving(true)
    try {
      const { error } = await supabase.rpc('set_profile_persona_niche_rpc', { p_persona: p, p_niche: n })
      setSaving(false)
      if (error) { setErr('저장에 실패했어요. 다시 시도해주세요.'); return }
      onDone?.()
    } catch { setSaving(false); setErr('저장에 실패했어요. 다시 시도해주세요.') }
  }

  const selCls = 'mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#0064FF]'

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
        {!hasSource && (
          <div className="mb-4 flex items-center justify-center gap-1.5">
            <span className={`h-1.5 rounded-full transition-all ${page === 1 ? 'w-6 bg-[#0064FF]' : 'w-1.5 bg-gray-300'}`} />
            <span className={`h-1.5 rounded-full transition-all ${page === 2 ? 'w-6 bg-[#0064FF]' : 'w-1.5 bg-gray-300'}`} />
          </div>
        )}

        {page === 1 ? (
          <>
            <p className="text-center text-lg font-bold text-gray-900">크로닛을 어떻게 알게 되셨어요?</p>
            <p className="mt-1 text-center text-sm text-gray-500">더 나은 서비스를 위해 참고할게요 🙏</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {SOURCE_OPTIONS.map(opt => (
                <button key={opt} disabled={saving} onClick={() => chooseSource(opt)}
                  className="rounded-xl border border-gray-200 bg-[#FAFAF8] px-3 py-3 text-sm font-bold text-gray-800 transition hover:border-[#0064FF] hover:text-[#0064FF] active:scale-[0.98] disabled:opacity-50">
                  {opt}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-center text-lg font-bold text-gray-900">거의 다 됐어요!</p>
            <p className="mt-1 text-center text-sm text-gray-500">딱 맞는 소재를 추천해드릴게요</p>

            <div className="mt-5">
              <label className="text-sm font-bold text-gray-700">어떤 일을 하세요?</label>
              <select value={persona} onChange={e => { setPersona(e.target.value); setErr('') }} className={selCls}>
                <option value="" disabled>직군을 선택하세요</option>
                {PERSONA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {persona === '기타' && (
                <input value={personaOther} onChange={e => setPersonaOther(e.target.value)} maxLength={40}
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
                <input value={nicheOther} onChange={e => setNicheOther(e.target.value)} maxLength={40}
                  placeholder="직접 입력해주세요"
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#0064FF]" />
              )}
            </div>

            {err && <p className="mt-3 text-sm font-medium text-red-500">{err}</p>}

            <button onClick={finish} disabled={saving}
              className="mt-5 w-full rounded-xl bg-[#0064FF] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0052D6] active:scale-[0.98] disabled:opacity-50">
              {saving ? '저장 중...' : '시작하기'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default SignupSurveyModal

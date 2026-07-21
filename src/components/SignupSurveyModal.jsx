import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getFp } from '../lib/fp'

const OPTIONS = ['유튜브', '인스타그램', '지인 추천', '블로그·카페', '검색(구글·네이버)', '기타']

/**
 * 가입 온보딩 설문 (못 닫음).
 *  - 1페이지: 유입경로 — 필수 (건너뛰기/닫기 불가)
 *  - 2페이지: 추천코드 — 선택 (건너뛰고 시작하기 가능)
 * onDone(): 설문 완료 콜백
 */
const SignupSurveyModal = ({ open, onDone }) => {
  const [page, setPage] = useState(1)
  const [saving, setSaving] = useState(false)
  const [refCode, setRefCode] = useState('')
  const [refMsg, setRefMsg] = useState(null)
  const [refLoading, setRefLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setPage(1)
    try {
      const urlRef = new URLSearchParams(window.location.search).get('ref')
      const stored = sessionStorage.getItem('chronit_ref')
      const code = (urlRef || stored || '').toUpperCase()
      if (code) setRefCode(code)
    } catch { /* noop */ }
  }, [open])

  if (!open) return null

  const chooseSource = async (src) => {
    setSaving(true)
    try { await supabase.rpc('set_signup_source_rpc', { p_source: src }) } catch { /* noop */ }
    setSaving(false)
    setPage(2)
  }

  const applyReferral = async () => {
    const code = refCode.trim()
    if (!code) { setRefMsg({ ok: false, text: '추천 코드를 입력해주세요' }); return }
    setRefLoading(true); setRefMsg(null)
    try {
      const { data } = await supabase.rpc('redeem_referral_rpc', { p_referral_code: code, p_fingerprint: getFp() })
      if (data?.ok) {
        setRefMsg({ ok: true, text: `🎉 추천 코드 적용! 프로 7일 체험이 시작됐어요` })
        setTimeout(() => onDone?.(), 1400)
      } else {
        setRefMsg({ ok: false, text: data?.error ?? '추천 코드 적용에 실패했어요' })
      }
    } catch { setRefMsg({ ok: false, text: '추천 코드 적용에 실패했어요' }) }
    setRefLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
        {/* 진행 표시 */}
        <div className="mb-4 flex items-center justify-center gap-1.5">
          <span className={`h-1.5 rounded-full transition-all ${page === 1 ? 'w-6 bg-[#0064FF]' : 'w-1.5 bg-gray-300'}`} />
          <span className={`h-1.5 rounded-full transition-all ${page === 2 ? 'w-6 bg-[#0064FF]' : 'w-1.5 bg-gray-300'}`} />
        </div>

        {page === 1 ? (
          <>
            <p className="text-center text-lg font-black text-gray-900">크로닛을 어떻게 알게 되셨어요?</p>
            <p className="mt-1 text-center text-sm text-gray-500">더 나은 서비스를 위해 참고할게요 🙏</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {OPTIONS.map(opt => (
                <button key={opt} disabled={saving} onClick={() => chooseSource(opt)}
                  className="rounded-xl border border-gray-200 bg-[#FAFAF8] px-3 py-3 text-sm font-bold text-gray-800 transition hover:border-[#0064FF] hover:text-[#0064FF] active:scale-[0.98] disabled:opacity-50">
                  {opt}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-center text-lg font-black text-gray-900">추천 코드가 있나요?</p>
            <p className="mt-1 text-center text-sm text-gray-500">입력하면 프로 7일 무료 체험! (선택)</p>
            <div className="mt-5 flex gap-2">
              <input value={refCode} onChange={e => setRefCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && applyReferral()}
                placeholder="추천 코드"
                className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-3 text-base font-bold tracking-widest text-gray-900 outline-none focus:border-[#0064FF]" />
              <button onClick={applyReferral} disabled={refLoading}
                className="shrink-0 rounded-xl bg-[#0064FF] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0052D6] disabled:opacity-50">
                {refLoading ? '...' : '적용'}
              </button>
            </div>
            {refMsg && <p className={`mt-2 text-sm font-medium ${refMsg.ok ? 'text-green-600' : 'text-red-500'}`}>{refMsg.text}</p>}
            <button onClick={() => onDone?.()} className="mt-4 w-full text-center text-sm font-bold text-gray-400 hover:text-gray-600">
              건너뛰고 시작하기
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default SignupSurveyModal

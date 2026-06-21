import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const ICON = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/icon.png'
const SOURCE_OPTIONS = ['유튜브', '인스타그램', '지인 추천', '블로그·카페', '검색(구글·네이버)', '기타']

// 스텝 인덱스
const STEP = { TERMS: 0, NICK: 1, SOURCE: 2, REFERRAL: 3 }
const TOTAL = 4

const Register = () => {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [step, setStep] = useState(STEP.TERMS)
  const [saving, setSaving] = useState(false)
  const startedRef = useRef(false)

  // 약관
  const [agree, setAgree] = useState(false)
  const [marketing, setMarketing] = useState(false)
  // 닉네임
  const [nick, setNick] = useState('')
  const [nickErr, setNickErr] = useState('')
  // 추천코드
  const [refCode, setRefCode] = useState('')
  const [refMsg, setRefMsg] = useState(null)
  const [refApplied, setRefApplied] = useState(false)
  // 휴대폰
  const [phone, setPhone] = useState('')

  // 초기화: 세션 확인 → 프로필 상태로 시작 스텝 결정 → 추천코드 자동적용
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    ;(async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) { window.location.href = '/'; return }
      setSession(s)

      const { data: prof } = await supabase
        .from('profiles')
        .select('nickname, signup_source, terms_agreed_at, onboarded')
        .eq('id', s.user.id).maybeSingle()

      if (prof?.onboarded) { window.location.href = '/generate'; return }

      // 링크 추천코드 자동 적용 (chronit_ref / ?ref)
      try {
        const urlRef = new URLSearchParams(window.location.search).get('ref')
        const stored = sessionStorage.getItem('chronit_ref')
        const code = (urlRef || stored || '').toUpperCase()
        if (code) {
          await supabase.rpc('apply_referral_code_rpc', { p_new_user_id: s.user.id, p_referral_code: code })
          setRefApplied(true)
          sessionStorage.removeItem('chronit_ref')
        }
      } catch { /* noop */ }

      // 시작 스텝: 비어있는 첫 단계부터
      if (!prof?.terms_agreed_at) setStep(STEP.TERMS)
      else if (!prof?.nickname) setStep(STEP.NICK)
      else if (!prof?.signup_source) setStep(STEP.SOURCE)
      else setStep(STEP.REFERRAL)

      if (prof?.nickname) setNick(prof.nickname)
      setLoading(false)
    })()
  }, [])

  const finish = async () => {
    setSaving(true)
    try { await supabase.rpc('complete_onboarding_rpc') } catch { /* noop */ }
    window.location.href = '/generate'
  }

  // ── 각 스텝 핸들러 ──
  const submitTerms = async () => {
    if (!agree || saving) return
    setSaving(true)
    try { await supabase.rpc('set_terms_consent_rpc', { p_marketing: marketing }) } catch { /* noop */ }
    setSaving(false)
    setStep(STEP.NICK)
  }

  const submitNick = async () => {
    if (saving) return
    setNickErr(''); setSaving(true)
    const { data, error } = await supabase.rpc('set_nickname_rpc', { p_nick: nick.trim() })
    setSaving(false)
    if (error) { setNickErr('오류가 발생했어요. 잠시 후 다시 시도해주세요.'); return }
    if (!data?.ok) { setNickErr(data?.error || '닉네임을 설정할 수 없어요'); return }
    setStep(STEP.SOURCE)
  }

  const chooseSource = async (src) => {
    if (saving) return
    setSaving(true)
    try { await supabase.rpc('set_signup_source_rpc', { p_source: src }) } catch { /* noop */ }
    setSaving(false)
    setStep(STEP.REFERRAL)
  }

  const applyReferral = async () => {
    const code = refCode.trim().toUpperCase()
    if (!code) { setRefMsg({ ok: false, text: '추천 코드를 입력해주세요' }); return }
    setSaving(true); setRefMsg(null)
    try {
      const { data } = await supabase.rpc('redeem_referral_rpc', { p_referral_code: code })
      if (data?.ok) { setRefMsg({ ok: true, text: `🎉 추천 코드 적용! 프로 7일 체험이 시작됐어요` }); setRefApplied(true) }
      else setRefMsg({ ok: false, text: data?.error ?? '추천 코드 적용에 실패했어요' })
    } catch { setRefMsg({ ok: false, text: '추천 코드 적용에 실패했어요' }) }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8]">
        <img src={ICON} alt="" className="h-12 w-12 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">
        {/* 헤더 */}
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={ICON} alt="크로닛" className="mb-3 h-12 w-12" />
          <h1 className="text-xl font-black text-gray-900">크로닛 시작하기</h1>
          <p className="mt-1 text-sm text-gray-500">{session?.user?.email}</p>
        </div>

        {/* 진행바 */}
        <div className="mb-7 flex items-center justify-center gap-1.5">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-7 bg-[#03C75A]' : i < step ? 'w-1.5 bg-[#03C75A]/50' : 'w-1.5 bg-gray-200'}`} />
          ))}
        </div>

        {/* ── STEP 1. 약관 ── */}
        {step === STEP.TERMS && (
          <div>
            <h2 className="mb-1 text-lg font-black text-gray-900">서비스 이용 동의</h2>
            <p className="mb-5 text-sm leading-relaxed text-gray-500">시작하려면 아래 약관에 동의해주세요.</p>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 bg-[#FAFAF8] p-4 transition-all hover:border-[#03C75A]/40">
              <div className="mt-0.5 shrink-0">
                {agree ? <CheckCircle2 size={20} className="text-[#03C75A]" /> : <div className="h-5 w-5 rounded-full border-2 border-gray-300" />}
              </div>
              <input type="checkbox" className="sr-only" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span className="text-sm leading-relaxed text-gray-600">
                <Link to="/terms" className="font-bold text-[#03C75A] underline underline-offset-2" target="_blank">이용약관</Link>{' '}및{' '}
                <Link to="/privacy" className="font-bold text-[#03C75A] underline underline-offset-2" target="_blank">개인정보처리방침</Link>에 동의합니다. <span className="text-red-400">(필수)</span>
              </span>
            </label>

            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:border-[#03C75A]/40">
              <div className="mt-0.5 shrink-0">
                {marketing ? <CheckCircle2 size={20} className="text-[#03C75A]" /> : <div className="h-5 w-5 rounded-full border-2 border-gray-300" />}
              </div>
              <input type="checkbox" className="sr-only" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
              <span className="text-sm leading-relaxed text-gray-600">
                <span className="font-bold text-gray-400">[선택]</span> 마케팅 정보 수신에 동의합니다.
                <span className="mt-0.5 block text-xs text-gray-400">혜택·이벤트·신규 기능 소식을 이메일/카카오톡 등으로 받아봅니다.</span>
              </span>
            </label>

            <button onClick={submitTerms} disabled={!agree || saving}
              className="mt-6 w-full rounded-2xl bg-[#03C75A] px-6 py-3.5 text-base font-black text-white shadow-[0_10px_30px_-10px_rgba(3,199,90,0.5)] transition-all hover:bg-[#02b350] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40">
              동의하고 계속하기
            </button>
          </div>
        )}

        {/* ── STEP 2. 닉네임 ── */}
        {step === STEP.NICK && (
          <div>
            <h2 className="mb-1 text-lg font-black text-gray-900">닉네임 설정</h2>
            <p className="mb-5 text-sm leading-relaxed text-gray-500">서비스에 표시될 닉네임을 정해주세요. (2~10자, 중복 불가)</p>
            <input value={nick} onChange={(e) => setNick(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitNick()}
              maxLength={10} placeholder="예: 숏폼장인" autoFocus
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base text-gray-900 outline-none focus:border-[#03C75A]" />
            {nickErr && <p className="mt-2 text-sm font-medium text-red-500">{nickErr}</p>}
            <button onClick={submitNick} disabled={saving || nick.trim().length < 2}
              className="mt-6 w-full rounded-2xl bg-[#03C75A] px-6 py-3.5 text-base font-black text-white transition-all hover:bg-[#02b350] active:scale-[0.98] disabled:opacity-40">
              {saving ? '저장 중…' : '다음'}
            </button>
          </div>
        )}

        {/* ── STEP 3. 유입경로 ── */}
        {step === STEP.SOURCE && (
          <div>
            <h2 className="mb-1 text-lg font-black text-gray-900">크로닛을 어떻게 알게 되셨어요?</h2>
            <p className="mb-5 text-sm leading-relaxed text-gray-500">더 나은 서비스를 위해 참고할게요 🙏</p>
            <div className="grid grid-cols-2 gap-2.5">
              {SOURCE_OPTIONS.map((opt) => (
                <button key={opt} disabled={saving} onClick={() => chooseSource(opt)}
                  className="rounded-xl border border-gray-200 bg-[#FAFAF8] px-3 py-3.5 text-sm font-bold text-gray-800 transition hover:border-[#03C75A] hover:text-[#03C75A] active:scale-[0.98] disabled:opacity-50">
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 4. 추천코드 (선택) ── */}
        {step === STEP.REFERRAL && (
          <div>
            <h2 className="mb-1 text-lg font-black text-gray-900">추천 코드가 있나요?</h2>
            <p className="mb-5 text-sm leading-relaxed text-gray-500">입력하면 프로 7일 무료 체험! <span className="text-gray-400">(선택)</span></p>
            {refApplied ? (
              <div className="rounded-2xl bg-green-500/10 px-4 py-4 text-center text-sm font-bold text-green-600">🎉 추천 코드가 적용됐어요</div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input value={refCode} onChange={(e) => setRefCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && applyReferral()}
                    placeholder="추천 코드"
                    className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-3 text-base font-bold tracking-widest text-gray-900 outline-none focus:border-[#03C75A]" />
                  <button onClick={applyReferral} disabled={saving}
                    className="shrink-0 rounded-xl bg-[#03C75A] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#02b350] disabled:opacity-50">적용</button>
                </div>
                {refMsg && <p className={`mt-2 text-sm font-medium ${refMsg.ok ? 'text-green-600' : 'text-red-500'}`}>{refMsg.text}</p>}
              </>
            )}
            <button onClick={finish} disabled={saving}
              className="mt-6 w-full rounded-2xl bg-[#03C75A] px-6 py-3.5 text-base font-black text-white transition-all hover:bg-[#02b350] active:scale-[0.98] disabled:opacity-40">
              {saving ? '시작하는 중…' : '시작하기'}
            </button>
            {!refApplied && (
              <button onClick={finish} disabled={saving} className="mt-2 w-full text-center text-sm font-bold text-gray-400 hover:text-gray-600">건너뛰고 시작하기</button>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export default Register

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { logEvent } from '../lib/events'
import { phCapture } from '../lib/posthog'
import { usePlans } from '../lib/usePlans'
import { loadToss } from '../lib/tossBilling'

const track = (e, p) => { try { logEvent(e, p || {}); phCapture(e, p || {}) } catch { /* noop */ } }

export function submitVeraFeedback(kind, rating, reason, comment, jobId) {
  try {
    supabase.rpc('submit_vera_feedback_rpc', { p_kind: kind, p_rating: rating || '', p_reason: reason || '', p_comment: comment || '', p_job_id: jobId ? String(jobId) : '' }).then(null, () => {})
    track(kind === 'pmf' ? 'pmf_answered' : 'vera_feedback_reason', { rating, reason })
  } catch { /* noop */ }
}

// 바텀시트 공통 껍데기
function Sheet({ onClose, children, z = 2147483200 }) {
  return (
    <div className="fixed inset-0 flex items-end justify-center bg-black/55 backdrop-blur-[2px] sm:items-center" style={{ zIndex: z }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#111318] p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

// D1 — 이용권 소진 시 요금제 시트
// 손실 문구(못 쓰게 되는 것) + 3개 요금제 비교(프로 추천) + 선택 플랜으로 바로 결제, 닫을 때 이유 칩
const BCK = import.meta.env.VITE_TOSS_BILLING_CLIENT_KEY || ''
const FINDS = ['finds30', 'finds100', 'finds300']
const won = (n) => Number(n || 0).toLocaleString('ko-KR')
const WHY = ['가격이 부담돼요', '더 써보고 정할게요', '자동결제가 걱정돼요', '기타']

export function PaywallSheet({ open, where, onClose, onPlans }) {
  const plans = usePlans()
  const [sel, setSel] = useState('finds100')
  const [cur, setCur] = useState(null)
  const [step, setStep] = useState('plans')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  useEffect(() => {
    if (!open) return
    track('paywall_view', { where: where || '' })
    setStep('plans'); setSel('finds100'); setMsg(''); setBusy(false)
    supabase.rpc('get_my_balance_rpc').then(({ data }) => setCur(data?.plan || 'free'), () => setCur('free'))
  }, [open, where])
  if (!open) return null

  const paid = FINDS.includes(cur)
  const p = plans.find((x) => x.id === sel) || plans[1] || plans[0]
  const close = (reason) => { track('paywall_dismiss', { where: where || '', reason: reason || '' }); onClose() }
  const go = async () => {
    if (busy) return
    track('paywall_click', { where: where || '', plan: sel })
    if (paid || !BCK) { onPlans(); return } // 구독 중이면 요금제 변경(차액 결제) 화면으로
    setBusy(true); setMsg('')
    try {
      const { data: ses } = await supabase.auth.getSession()
      const user = ses?.session?.user
      if (!user || user.is_anonymous) { setMsg('로그인이 필요해요'); setBusy(false); return }
      try { phCapture('checkout_started', { plan: sel, amount: p.price, period: 'monthly', from: 'paywall' }); logEvent('checkout_start', { plan: sel, amount: p.price, period: 'monthly', from: 'paywall' }) } catch { /* noop */ }
      await loadToss()
      const payment = window.TossPayments(BCK).payment({ customerKey: user.id })
      await payment.requestBillingAuth({
        method: 'CARD', customerEmail: user.email,
        successUrl: `${window.location.origin}/payments/success?type=billing&plan=${sel}&period=monthly`,
        failUrl: `${window.location.origin}/payments/fail`,
      })
    } catch (e) { if (e?.code !== 'USER_CANCEL') setMsg('결제 오류: ' + (e?.message || e)); setBusy(false) }
  }

  if (step === 'why') {
    return (
      <Sheet onClose={() => close('')}>
        <div className="text-lg font-extrabold text-white">어떤 점이 걸리셨어요?</div>
        <div className="mt-1 text-[13px] text-white/50">하나만 골라주시면 더 나은 요금제를 만드는 데 써요</div>
        <div className="mt-4 flex flex-wrap gap-2">
          {WHY.map((r) => (
            <button key={r} onClick={() => close(r)} className="rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-bold text-white/80 hover:bg-white/10">{r}</button>
          ))}
        </div>
        <button onClick={() => close('')} className="mt-4 w-full py-2 text-xs font-bold text-white/40">그냥 닫기</button>
      </Sheet>
    )
  }

  return (
    <Sheet onClose={() => close('')}>
      <div className="text-lg font-extrabold text-white">{paid ? '이번 달 이용권을 다 썼어요' : '무료 이용권을 다 썼어요'}</div>
      <div className="mt-1.5 text-[13px] leading-relaxed text-white/70">결제하지 않으면 대본·캡션 생성, 소재 분석, 채널 분석, 벤치마크 갱신을 더 이상 쓸 수 없어요.</div>
      <div className="mt-1 text-[12px] text-white/40">트렌드 피드는 계속 무료로 볼 수 있어요</div>
      <div className="mt-4 space-y-2">
        {plans.map((x) => {
          const on = x.id === sel
          const hot = x.id === 'finds100'
          const isCur = paid && x.id === cur
          return (
            <button key={x.id} onClick={() => setSel(x.id)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${on ? 'border-[#0064FF] bg-[#0064FF]/12' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}>
              <div className="flex items-center gap-3">
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${on ? 'border-[#0064FF]' : 'border-white/30'}`}>{on && <span className="h-2 w-2 rounded-full bg-[#0064FF]" />}</span>
                <div>
                  <div className="text-sm font-extrabold text-white">
                    {x.name}
                    {hot && <span className="ml-1.5 rounded bg-[#0064FF] px-1.5 py-0.5 text-[10px] font-bold text-white">추천</span>}
                    {isCur && <span className="ml-1.5 rounded bg-white/15 px-1.5 py-0.5 text-[10px] text-white/70">현재</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-white/50">이용권 {won(x.credits)}개 · 대본 최대 {won(Math.floor(x.credits / 2))}건</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-extrabold text-white">월 {won(x.price)}원</div>
                <div className="text-[10px] text-white/35">이용권 1개 {won(Math.round(x.price / x.credits))}원</div>
              </div>
            </button>
          )
        })}
      </div>
      {msg && <div className="mt-3 text-center text-xs text-red-300">{msg}</div>}
      <button onClick={go} disabled={busy || (paid && sel === cur)} className="mt-4 w-full rounded-2xl bg-[#0064FF] py-3.5 text-sm font-extrabold text-white disabled:opacity-50">
        {busy ? '결제창 여는 중…' : paid ? (sel === cur ? '현재 이용 중인 요금제예요' : `${p?.name}로 바꾸기`) : `${won(p?.price)}원으로 이어서 만들기`}
      </button>
      <div className="mt-2 text-center text-[11px] text-white/40">자동결제는 마이페이지에서 언제든 해지할 수 있어요</div>
      <div className="mt-3 flex items-center justify-between text-xs font-bold">
        <button onClick={() => setStep('why')} className="text-white/45 hover:text-white/70">다음에 할게요</button>
        <button onClick={() => { track('paywall_more', { where: where || '' }); onPlans() }} className="text-white/45 hover:text-white/70">연간·단건팩 보기</button>
      </div>
    </Sheet>
  )
}

// 대본 👍👎 이유 한 번 누르기
const REASONS = {
  up: ['그대로 썼어요', '고쳐서 썼어요'],
  down: ['말투가 안 맞아요', '훅이 약해요', '내용이 틀려요', '너무 길어요'],
}
export function RatingReasons({ rating, jobId, onDone }) {
  const [typing, setTyping] = useState(false)
  const [txt, setTxt] = useState('')
  const send = (reason, comment) => { submitVeraFeedback('script', rating, reason, comment, jobId); onDone() }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {REASONS[rating].map((r) => (
        <button key={r} onClick={() => send(r, '')} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/75 hover:bg-white/10">{r}</button>
      ))}
      {rating === 'down' && !typing && (
        <button onClick={() => setTyping(true)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/50 hover:bg-white/10">직접 입력</button>
      )}
      {typing && (
        <div className="flex w-full items-center gap-1.5">
          <input autoFocus value={txt} onChange={(e) => setTxt(e.target.value)} maxLength={300} placeholder="어떤 점이 아쉬웠나요?"
            onKeyDown={(e) => { if (e.key === 'Enter' && txt.trim()) send('직접 입력', txt) }}
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/35 outline-none focus:border-[#0064FF]" />
          <button onClick={() => txt.trim() && send('직접 입력', txt)} className="rounded-xl bg-[#0064FF] px-3 py-2 text-xs font-bold text-white">보내기</button>
        </div>
      )}
    </div>
  )
}

// "크로닛이 없어지면 얼마나 아쉬울까요?" — 대본 2회 이상 복사한 사람에게 1회
export function PmfSurvey({ open, onClose }) {
  const [pick, setPick] = useState('')
  const [why, setWhy] = useState('')
  useEffect(() => { if (open) track('pmf_view') }, [open])
  if (!open) return null
  const opts = [['very', '매우 아쉬울 거예요'], ['some', '조금 아쉬울 거예요'], ['not', '별로 안 아쉬워요']]
  const submit = () => { if (!pick) return; submitVeraFeedback('pmf', pick, '', why, null); onClose(true) }
  return (
    <Sheet onClose={() => onClose(false)}>
      <div className="text-lg font-extrabold text-white">크로닛이 없어지면 얼마나 아쉬울까요?</div>
      <div className="mt-1 text-[13px] text-white/50">한 번만 여쭤볼게요. 더 좋게 만드는 데 그대로 반영해요.</div>
      <div className="mt-4 space-y-2">
        {opts.map(([k, label]) => (
          <button key={k} onClick={() => setPick(k)} className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${pick === k ? 'border-[#0064FF] bg-[#0064FF]/15 text-white' : 'border-white/10 bg-white/[0.03] text-white/75'}`}>{label}</button>
        ))}
      </div>
      {pick && (
        <textarea value={why} onChange={(e) => setWhy(e.target.value)} maxLength={300} rows={2}
          placeholder={pick === 'very' ? '어떤 점 때문에 아쉬울 것 같나요? (한 줄이면 충분해요)' : '어떤 게 있으면 더 쓸 것 같나요? (한 줄이면 충분해요)'}
          className="mt-3 w-full resize-none rounded-2xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/35 outline-none focus:border-[#0064FF]" />
      )}
      <div className="mt-4 flex gap-2">
        <button onClick={() => onClose(false)} className="flex-1 rounded-2xl border border-white/15 py-3 text-sm font-bold text-white/60">건너뛰기</button>
        <button onClick={submit} disabled={!pick} className="flex-[1.4] rounded-2xl bg-[#0064FF] py-3 text-sm font-extrabold text-white disabled:opacity-40">보내기</button>
      </div>
    </Sheet>
  )
}

// D2 — 가입 경로 1문항 (로그인 사용자 중 미응답자에게 1회, 앱 사용 20초 뒤)
const SOURCES = ['인스타그램', '스레드', '네이버 블로그', '인스타·페이스북 광고', '지인 추천', '기타']
export function SourceSurvey() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    let timer = null
    try { if (localStorage.getItem('chronit_source_asked')) return } catch { /* noop */ }
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const p = window.location.pathname
        if (p === '/' || p.startsWith('/register') || p.startsWith('/payments') || p.startsWith('/admin')) return
        const { data } = await supabase.rpc('source_survey_needed_rpc')
        if (data === true) { setOpen(true); track('source_survey_view') }
        else { try { localStorage.setItem('chronit_source_asked', '1') } catch { /* noop */ } }
      } catch { /* noop */ }
    }
    // 가입 직후 첫 화면(니치 선택·피드 로딩)에서는 묻지 않는다 — 첫 대본을 받은 뒤, 또는 가입 다음 날 이후 방문에서만
    const arm = (ms) => { if (!timer) timer = setTimeout(check, ms) }
    const onScript = () => arm(15000)
    let seen = false
    try { seen = localStorage.getItem('chr_script_seen') === '1' } catch { /* noop */ }
    if (seen) arm(20000)
    else {
      supabase.auth.getSession().then(({ data }) => {
        const c = data?.session?.user?.created_at
        if (c && Date.now() - new Date(c).getTime() > 24 * 3600 * 1000) arm(20000)
      }, () => {})
      window.addEventListener('chr:script-shown', onScript)
    }
    return () => { if (timer) clearTimeout(timer); window.removeEventListener('chr:script-shown', onScript) }
  }, [])
  const done = (src) => {
    try { localStorage.setItem('chronit_source_asked', '1') } catch { /* noop */ }
    supabase.rpc('mark_source_asked_rpc').then(null, () => {})
    if (src) { supabase.rpc('set_signup_source_rpc', { p_source: src }).then(null, () => {}); track('source_survey_answer', { src }) }
    setOpen(false)
  }
  if (!open) return null
  return (
    <Sheet onClose={() => done('')} z={2147483000}>
      <div className="text-lg font-extrabold text-white">크로닛을 어디서 알게 되셨나요?</div>
      <div className="mt-1 text-[13px] text-white/50">한 번만 여쭤볼게요</div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {SOURCES.map((s) => (
          <button key={s} onClick={() => done(s)} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm font-bold text-white/80 hover:border-[#0064FF] hover:bg-[#0064FF]/10">{s}</button>
        ))}
      </div>
      <button onClick={() => done('')} className="mt-3 w-full py-2 text-xs text-white/40">건너뛰기</button>
    </Sheet>
  )
}

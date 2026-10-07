import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { logEvent } from '../lib/events'
import { phCapture } from '../lib/posthog'

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

// D1 — 이용권 소진 시 요금제 시트 (가격·대본 건수 정보만)
export function PaywallSheet({ open, where, onClose, onPlans }) {
  useEffect(() => { if (open) track('paywall_view', { where: where || '' }) }, [open, where])
  if (!open) return null
  const Row = ({ name, price, credits, scripts, hot }) => (
    <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${hot ? 'border-[#0064FF]/60 bg-[#0064FF]/10' : 'border-white/10 bg-white/[0.03]'}`}>
      <div>
        <div className="text-sm font-extrabold text-white">{name}</div>
        <div className="mt-0.5 text-xs text-white/50">이용권 {credits}개 = 대본 최대 {scripts}건</div>
      </div>
      <div className="text-right text-sm font-extrabold text-white">월 {price}원</div>
    </div>
  )
  return (
    <Sheet onClose={() => { track('paywall_dismiss', { where: where || '' }); onClose() }}>
      <div className="text-lg font-extrabold text-white">이용권을 다 썼어요</div>
      <div className="mt-1 text-[13px] text-white/50">대본 1건 = 이용권 2개 · 트렌드 피드는 계속 무료예요</div>
      <div className="mt-4 space-y-2">
        <Row name="스탠다드" price="9,900" credits={60} scripts={30} hot />
        <Row name="프로" price="24,900" credits={180} scripts={90} />
      </div>
      <div className="mt-5 flex gap-2">
        <button onClick={() => { track('paywall_dismiss', { where: where || '' }); onClose() }} className="flex-1 rounded-2xl border border-white/15 py-3 text-sm font-bold text-white/70">다음에 할게요</button>
        <button onClick={() => { track('paywall_click', { where: where || '' }); onPlans() }} className="flex-[1.4] rounded-2xl bg-[#0064FF] py-3 text-sm font-extrabold text-white">요금제 보기</button>
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

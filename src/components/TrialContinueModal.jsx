import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { usePlans } from '../lib/usePlans'
import { PLAN_LABEL } from '../lib/planLabels'

const FINDS = ['finds30', 'finds100', 'finds300']
const fmtDate = (d) => { try { const x = new Date(d); return `${x.getMonth() + 1}월 ${x.getDate()}일` } catch { return '' } }
const todayKey = () => { const d = new Date(); return `chr_trialpop_${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}` }

// 무료 체험 종료 5일 전부터, 앱 진입 시 하루 1회 노출되는 계속-이용 확인 팝업.
// 옵트인: [이 요금제로 계속]을 눌러야만 결제. 닫으면 청구 없이 무료로 전환된다.
export default function TrialContinueModal() {
  const plans = usePlans()
  const [sub, setSub] = useState(null)
  const [show, setShow] = useState(false)
  const [sel, setSel] = useState('finds300')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.is_anonymous) return
      const { data } = await supabase.from('subscriptions')
        .select('plan,is_trial,expires_at,continue_confirmed_at').eq('user_id', user.id).maybeSingle()
      if (!alive || !data) return
      setSub(data)
      setSel(FINDS.includes(data.plan) ? data.plan : 'finds300')
      const exp = data.expires_at ? new Date(data.expires_at).getTime() : 0
      const within5 = exp && exp > Date.now() && exp < Date.now() + 5 * 86400000
      let shownToday = false
      try { shownToday = localStorage.getItem(todayKey()) === '1' } catch { /* noop */ }
      if (data.is_trial === true && !data.continue_confirmed_at && within5 && !shownToday) setShow(true)
    })()
    return () => { alive = false }
  }, [])

  if (!show || !sub) return null
  const daysLeft = Math.max(0, Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000))
  const markShown = () => { try { localStorage.setItem(todayKey(), '1') } catch { /* noop */ } }
  const dismiss = () => { markShown(); setShow(false) }
  const confirm = async () => {
    setBusy(true)
    try { const { data } = await supabase.rpc('confirm_trial_continue_rpc', { p_plan: sel }); if (data?.ok) { markShown(); setDone(true) } }
    catch { /* noop */ } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={dismiss}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111318] p-6 text-white" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#0064FF]/20 text-[#5AA0FF]"><Check size={24} /></div>
            <h3 className="text-lg font-bold">계속 이용이 확정됐어요</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">{fmtDate(sub.expires_at)}부터 <b className="text-white/85">{PLAN_LABEL[sel]}</b> 요금제로 결제돼요.<br />언제든 마이페이지에서 해지할 수 있어요.</p>
            <button onClick={() => setShow(false)} className="mt-5 w-full rounded-xl bg-white/10 py-3 text-sm font-bold hover:bg-white/15">확인</button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold leading-snug">무료 체험이 {daysLeft}일 후 종료돼요</h3>
              <button onClick={dismiss} className="shrink-0 text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-white/60">계속 이용하려면 요금제를 선택하세요. <b className="text-white/85">안 고르시면 요금이 청구되지 않고 무료 등급으로 전환</b>돼요.</p>
            <div className="mt-4 space-y-2">
              {plans.map((p) => (
                <button key={p.id} onClick={() => setSel(p.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${sel === p.id ? 'border-[#0064FF] bg-[#0064FF]/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20'}`}>
                  <div>
                    <div className="text-sm font-bold">{p.name}{sub.plan === p.id ? <span className="ml-1.5 text-[11px] font-medium text-[#5AA0FF]">체험 중</span> : null}</div>
                    <div className="text-[12px] text-white/45">월 이용권 {p.credits.toLocaleString('ko-KR')}개</div>
                  </div>
                  <div className="text-right"><div className="text-sm font-bold">월 {p.price.toLocaleString('ko-KR')}원</div><div className="text-[10px] text-white/40">부가세 포함</div></div>
                </button>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={dismiss} className="flex-1 rounded-xl border border-white/15 py-3 text-sm font-bold text-white/70 hover:text-white">나중에</button>
              <button onClick={confirm} disabled={busy} className="flex-[1.6] rounded-xl bg-[linear-gradient(140deg,#2A7BFF,#0064FF)] py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60">{busy ? '처리 중…' : '이 요금제로 계속'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

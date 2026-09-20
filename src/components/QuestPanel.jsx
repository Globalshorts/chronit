import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Gift, Check, Loader2, Trophy, Sparkles, AlertTriangle, CalendarDays, ArrowDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { phCapture } from '../lib/posthog'
import { labelOf, claimableCount, weeklyClaimable } from '../lib/quests'
import WatchlistTrack from './WatchlistTrack'

const PLATFORMS = ['인스타그램', '틱톡', '유튜브', '기타']

// 미션 패널 — 퀘스트 수령 + 성과 인증. (마이페이지가 아니라 트렌드 상단에서 연다)
export default function QuestPanel({ open, onClose, onClaimed, onGoWatchlist }) {
  const [quests, setQuests] = useState([])
  const [weekly, setWeekly] = useState([])
  const [weekBusy, setWeekBusy] = useState('')
  const proofRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState('')
  const [msg, setMsg] = useState(null)
  const [balance, setBalance] = useState(null)

  // 성과 인증 폼
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [platform, setPlatform] = useState(PLATFORMS[0])
  const [consent, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  const [proofMsg, setProofMsg] = useState(null)

  const loadBalance = useCallback(async () => {
    try {
      const { data } = await supabase.rpc('get_my_balance_rpc')
      if (data) setBalance(data.balance ?? null)
    } catch { /* noop */ }
  }, [])

  // 수령/제출 뒤 다시 읽기용 (이벤트 핸들러에서만 호출)
  const load = useCallback(async () => {
    let list = []
    let wk = []
    try {
      const { data } = await supabase.rpc('get_quests_rpc')
      list = data?.ok && Array.isArray(data.quests) ? data.quests : []
    } catch { /* noop */ }
    try {
      const { data } = await supabase.rpc('get_weekly_missions_rpc')
      wk = data?.ok && Array.isArray(data.missions) ? data.missions : []
    } catch { /* noop */ }
    setQuests(list)
    setWeekly(wk)
    setLoading(false)
    loadBalance()
  }, [loadBalance])

  // 열릴 때 1회. (setState 가 전부 await 뒤에 오도록 effect 안에서 직접 부른다)
  useEffect(() => {
    if (!open) return
    let dead = false
    const run = async () => {
      let list = []
      let wk = []
      let bal = null
      try {
        const { data } = await supabase.rpc('get_quests_rpc')
        list = data?.ok && Array.isArray(data.quests) ? data.quests : []
      } catch { /* noop */ }
      try {
        const { data } = await supabase.rpc('get_weekly_missions_rpc')
        wk = data?.ok && Array.isArray(data.missions) ? data.missions : []
      } catch { /* noop */ }
      try {
        const { data } = await supabase.rpc('get_my_balance_rpc')
        bal = data?.balance ?? null
      } catch { /* noop */ }
      if (dead) return
      setMsg(null); setProofMsg(null)
      setQuests(list); setWeekly(wk); setBalance(bal); setLoading(false)
    }
    run()
    try { phCapture('quest_panel_opened') } catch { /* noop */ }
    return () => { dead = true }
  }, [open])

  if (!open) return null

  const claim = async (key) => {
    if (busyKey) return
    setBusyKey(key); setMsg(null)
    try {
      const { data, error } = await supabase.rpc('claim_quest_rpc', { p_quest_key: key })
      if (error || !data?.ok) {
        setMsg({ ok: false, text: data?.error || '받을 수 없어요' })
      } else {
        setMsg({ ok: true, text: `이용권 ${data.reward}개를 받았어요` })
        // 받은 만큼 바로 보여주고, 서버 값으로 다시 맞춘다
        setBalance((b) => (b == null ? b : b + Number(data.reward || 0)))
        try { phCapture('quest_claimed', { key, reward: data.reward }) } catch { /* noop */ }
        onClaimed?.(data.reward)
      }
    } catch { setMsg({ ok: false, text: '받을 수 없어요' }) }
    setBusyKey('')
    load()
  }

  // 주간 미션 수령 — 자동 지급(w_proof_1)은 서버가 거부하므로 버튼 자체를 두지 않는다
  const claimWeekly = async (key) => {
    if (weekBusy) return
    setWeekBusy(key); setMsg(null)
    try {
      const { data, error } = await supabase.rpc('claim_weekly_mission_rpc', { p_key: key })
      if (error || !data?.ok) {
        setMsg({ ok: false, text: data?.error || '받을 수 없어요' })
      } else {
        setMsg({ ok: true, text: `이용권 ${data.reward}개 지급` })
        setBalance((b) => (b == null ? b : b + Number(data.reward || 0)))
        try { phCapture('weekly_mission_claimed', { key, reward: data.reward }) } catch { /* noop */ }
        onClaimed?.(data.reward)
      }
    } catch { setMsg({ ok: false, text: '받을 수 없어요' }) }
    setWeekBusy('')
    load()
  }

  const submitProof = async () => {
    if (sending) return
    setSending(true); setProofMsg(null)
    try {
      const { data, error } = await supabase.rpc('submit_success_proof_rpc', {
        p_url: url.trim(), p_result_note: note.trim(), p_platform: platform, p_consent: consent,
      })
      if (error || !data?.ok) {
        setProofMsg({ ok: false, text: data?.error || '제출하지 못했어요' })
      } else {
        // 제출 시점엔 지급되지 않는다(관리자 승인 또는 24시간 자동 지급) → 잔액을 미리 올리지 않는다
        setProofMsg({ ok: true, text: data.message || '검토 후 승인되면 지급돼요. 24시간 내 미검토 시 자동 지급됩니다.' })
        setUrl(''); setNote(''); setConsent(false)
        try { phCapture('success_proof_submitted', { platform }) } catch { /* noop */ }
        load()   // 주간 '성과인증 1건'이 달성으로 바뀐다
      }
    } catch { setProofMsg({ ok: false, text: '제출하지 못했어요' }) }
    setSending(false)
  }

  const ready = claimableCount(quests)
  // 출석은 위에 가로로 작게, 나머지는 아래 목록으로 (6개가 섞이면 읽기 어렵다)
  const attendance = weekly.filter((m) => m.group === 'attendance')
  const actions = weekly.filter((m) => m.group !== 'attendance')

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="my-auto w-full max-w-md rounded-3xl border border-white/10 p-5 shadow-2xl md:max-w-3xl" style={{ background: '#14161c' }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-base font-bold text-white">
            <Trophy size={17} className="text-amber-400" /> 미션
            {ready > 0 && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-extrabold text-slate-900">{ready}</span>}
          </h3>
          <div className="flex items-center gap-3">
            {balance != null && (
              <span className="flex items-center gap-1 text-xs text-white/50">
                <Sparkles size={12} className="text-[#0064FF]" />이용권 <b className="text-white">{balance}</b>
              </span>
            )}
            <button onClick={onClose} aria-label="닫기" className="text-white/40 hover:text-white"><X size={18} /></button>
          </div>
        </div>

        {msg && (
          <p className={`mb-3 rounded-lg px-3 py-2 text-xs font-bold ${msg.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{msg.text}</p>
        )}

        {/* PC 에서는 일회성 / 주간을 좌우로 — 모바일은 그대로 세로 스택 */}
        <div className="md:grid md:grid-cols-2 md:items-start md:gap-4">
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-white/40"><Loader2 size={15} className="animate-spin" />불러오는 중…</div>
        ) : !quests.length ? (
          <p className="py-8 text-center text-sm text-white/40">미션을 불러오지 못했어요.</p>
        ) : (
          <ul className="space-y-2">
            {quests.map((q) => {
              const meta = labelOf(q)
              const can = q.eligible && !q.claimed
              return (
                <li key={q.key} className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${can ? 'border-amber-400/30 bg-amber-400/[0.06]' : 'border-white/10 bg-white/[0.03]'}`}>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold ${q.claimed ? 'text-white/40' : 'text-white'}`}>{meta.title}</p>
                    <p className="mt-0.5 text-[11px] text-white/40">{meta.desc}</p>
                  </div>
                  <span className="shrink-0 text-[11px] font-bold text-white/45">+{q.reward}</span>
                  {q.claimed ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/35"><Check size={12} />받음</span>
                  ) : q.eligible ? (
                    <button onClick={() => claim(q.key)} disabled={!!busyKey}
                      className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-[11px] font-extrabold text-slate-900 transition hover:brightness-95 disabled:opacity-50">
                      {busyKey === q.key ? <Loader2 size={12} className="animate-spin" /> : <Gift size={12} />}받기
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-bold text-white/30">진행 중</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {/* 이번 주 미션 — 매주 월요일 리셋 */}
        {weekly.length > 0 && (
          <div className="mt-5 md:mt-0">
            <div className="mb-2 flex items-center gap-1.5">
              <CalendarDays size={14} className="text-[#7FB2FF]" />
              <h4 className="text-sm font-bold text-white">이번 주 미션</h4>
              {weeklyClaimable(weekly) > 0 && (
                <span className="rounded-full bg-[#0064FF] px-2 py-0.5 text-[11px] font-extrabold text-white">{weeklyClaimable(weekly)}</span>
              )}
              <span className="ml-auto text-[11px] text-white/35">월요일마다 초기화</span>
            </div>
            {/* 출석 — 가로 칩. 받을 수 있으면 칩 자체가 버튼이 된다 */}
            {attendance.length > 0 && (
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {attendance.map((m) => {
                  const can = m.done && !m.claimed
                  const label = (labelOf(m).title || m.key).replace(/^이번 주\s*/, '')
                  const cls = m.claimed
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : can
                      ? 'bg-[#0064FF] text-white hover:brightness-95'
                      : 'bg-white/5 text-white/45'
                  return can ? (
                    <button key={m.key} onClick={() => claimWeekly(m.key)} disabled={!!weekBusy}
                      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition disabled:opacity-50 ${cls}`}>
                      {weekBusy === m.key ? <Loader2 size={11} className="animate-spin" /> : <Gift size={11} />}{label} +{m.reward}
                    </button>
                  ) : (
                    <span key={m.key} className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold ${cls}`}>
                      {m.claimed ? <Check size={11} /> : null}{label}
                      {!m.claimed && <span className="text-white/30">{m.progress}/{m.target}</span>}
                    </span>
                  )
                })}
              </div>
            )}

            <ul className="space-y-2">
              {actions.map((m) => {
                const meta = labelOf(m)
                const pct = m.target > 0 ? Math.min(100, Math.round((m.progress / m.target) * 100)) : 0
                const can = m.done && !m.claimed && !m.auto
                return (
                  <li key={m.key} className={`rounded-xl border px-3.5 py-3 ${can ? 'border-[#0064FF]/35 bg-[#0064FF]/[0.08]' : 'border-white/10 bg-white/[0.03]'}`}>
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-bold ${m.claimed ? 'text-white/40' : 'text-white'}`}>{meta.title}</p>
                        <p className="mt-0.5 text-[11px] text-white/40">{meta.desc}</p>
                      </div>
                      <span className="shrink-0 text-[11px] font-bold text-white/45">+{m.reward}</span>
                      {m.claimed ? (
                        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/35"><Check size={12} />수령 완료</span>
                      ) : m.auto ? null : can ? (
                        <button onClick={() => claimWeekly(m.key)} disabled={!!weekBusy}
                          className="flex shrink-0 items-center gap-1 rounded-lg bg-[#0064FF] px-3 py-1.5 text-[11px] font-extrabold text-white transition hover:brightness-95 disabled:opacity-50">
                          {weekBusy === m.key ? <Loader2 size={12} className="animate-spin" /> : <Gift size={12} />}수령하기
                        </button>
                      ) : (
                        <span className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-bold text-white/30">진행 중</span>
                      )}
                    </div>

                    {/* 진행바 */}
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full rounded-full transition-[width] duration-500 ${m.done ? 'bg-emerald-400' : 'bg-[#0064FF]'}`} style={{ width: pct + '%' }} />
                      </div>
                      <span className="shrink-0 text-[11px] font-bold text-white/45">{Math.min(m.progress, m.target)}/{m.target}</span>
                    </div>

                    {/* 자동 지급(성과인증)은 수령 버튼을 두지 않는다 — 서버가 claim 을 거부한다 */}
                    {m.auto && !m.claimed && (
                      <button onClick={() => { try { proofRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch { /* noop */ } }}
                        className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[#7FB2FF] hover:underline">
                        성과인증 제출하면 자동 지급 <ArrowDown size={11} />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
        </div>

        <WatchlistTrack onGo={onGoWatchlist} onClaimed={(r) => { onClaimed?.(r); loadBalance() }} />

        {/* 성과 인증 */}
        <div ref={proofRef} className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-bold text-white">크로닛으로 터졌어요!</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">
            크로닛으로 만든 영상 링크를 남겨주시면 <b className="text-white/70">검토 후 승인 시 이용권 3개</b>를 드려요.
            24시간 내 미검토면 자동 지급돼요. (7일에 1회)
          </p>

          <input value={url} onChange={(e) => { setUrl(e.target.value); setProofMsg(null) }}
            placeholder="영상 링크 (https://…)"
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-[#0064FF]" />

          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500}
            placeholder="결과 메모 (예: 3일 만에 조회수 12만)"
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-[#0064FF]" />

          <div className="mt-2 flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => (
              <button key={p} onClick={() => setPlatform(p)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${platform === p ? 'bg-[#0064FF] text-white' : 'bg-white/5 text-white/55 hover:bg-white/10'}`}>{p}</button>
            ))}
          </div>

          <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-white/55">
            <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setProofMsg(null) }} className="mt-0.5" />
            <span>크로닛이 이 성과 사례를 홍보·마케팅에 활용하는 것에 동의합니다. <span className="text-white/35">(동의 시 이용권 3개 지급)</span> <span className="text-red-400">(필수)</span></span>
          </label>

          {/* 동의해야 제출할 수 있다 — 서버도 동의 없으면 거부하므로 이중 안전장치 */}
          <button onClick={submitProof} disabled={sending || !url.trim() || !consent}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0064FF] py-2.5 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-40">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}{sending ? '보내는 중…' : '인증하고 이용권 받기'}
          </button>

          {proofMsg && (
            <p className={`mt-2 flex items-start gap-1.5 text-xs font-bold ${proofMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
              {!proofMsg.ok && <AlertTriangle size={13} className="mt-0.5 shrink-0" />}{proofMsg.text}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

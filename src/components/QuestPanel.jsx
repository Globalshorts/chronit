import { useState, useEffect, useCallback } from 'react'
import { X, Gift, Check, Loader2, Trophy, Sparkles, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { phCapture } from '../lib/posthog'
import { sortQuests, questLabel, claimableCount } from '../lib/quests'

const PLATFORMS = ['인스타그램', '틱톡', '유튜브', '기타']

// 미션 패널 — 퀘스트 수령 + 성과 인증. (마이페이지가 아니라 트렌드 상단에서 연다)
export default function QuestPanel({ open, onClose, onClaimed }) {
  const [quests, setQuests] = useState([])
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
    try {
      const { data } = await supabase.rpc('get_quests_rpc')
      list = data?.ok ? sortQuests(data.quests) : []
    } catch { /* noop */ }
    setQuests(list)
    setLoading(false)
    loadBalance()
  }, [loadBalance])

  // 열릴 때 1회. (setState 가 전부 await 뒤에 오도록 effect 안에서 직접 부른다)
  useEffect(() => {
    if (!open) return
    let dead = false
    const run = async () => {
      let list = []
      let bal = null
      try {
        const { data } = await supabase.rpc('get_quests_rpc')
        list = data?.ok ? sortQuests(data.quests) : []
      } catch { /* noop */ }
      try {
        const { data } = await supabase.rpc('get_my_balance_rpc')
        bal = data?.balance ?? null
      } catch { /* noop */ }
      if (dead) return
      setMsg(null); setProofMsg(null)
      setQuests(list); setBalance(bal); setLoading(false)
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
        setProofMsg({ ok: true, text: `검토 후 반영돼요 · 이용권 ${data.reward}개를 먼저 드렸어요` })
        setUrl(''); setNote(''); setConsent(false)
        setBalance((b) => (b == null ? b : b + Number(data.reward || 0)))
        try { phCapture('success_proof_submitted', { platform }) } catch { /* noop */ }
        onClaimed?.(data.reward)
        loadBalance()
      }
    } catch { setProofMsg({ ok: false, text: '제출하지 못했어요' }) }
    setSending(false)
  }

  const ready = claimableCount(quests)

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="my-auto w-full max-w-md rounded-3xl border border-white/10 p-5 shadow-2xl" style={{ background: '#14161c' }} onClick={(e) => e.stopPropagation()}>
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

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-white/40"><Loader2 size={15} className="animate-spin" />불러오는 중…</div>
        ) : !quests.length ? (
          <p className="py-8 text-center text-sm text-white/40">미션을 불러오지 못했어요.</p>
        ) : (
          <ul className="space-y-2">
            {quests.map((q) => {
              const meta = questLabel(q.key)
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

        {/* 성과 인증 */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-bold text-white">크로닛으로 터졌어요!</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">
            크로닛으로 만든 영상 링크를 남겨주시면 검토 후 이용권을 드려요. (7일에 1회)
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
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            <span>크로닛 홍보에 이 사례(링크·결과)를 사용하는 데 동의해요 <span className="text-white/30">(선택)</span></span>
          </label>

          <button onClick={submitProof} disabled={sending || !url.trim()}
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

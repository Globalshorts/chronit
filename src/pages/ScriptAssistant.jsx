import { useState, useEffect, useRef } from 'react'
import { Sparkles, Send, Copy, Check, Wand2, Flame, Plus, MessageSquareText, X, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const FN = (n) => `${SB}/functions/v1/${n}`

function Droplet({ size = 84, label }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="sa-orb-wrap" style={{ width: size, height: size }}><div className="sa-orb" /><div className="sa-orb-hi" /></div>
      {label && <div className="text-sm text-white/50">{label}</div>}
    </div>
  )
}

export default function ScriptAssistant({ session: sessionProp }) {
  const [session, setSession] = useState(sessionProp || null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [jobId, setJobId] = useState(null)
  const [srcRef, setSrcRef] = useState(null)      // 선택한 트렌드 shortcode
  const [balance, setBalance] = useState(null)
  const [copiedI, setCopiedI] = useState(-1)
  const [err, setErr] = useState('')
  // 스레드 목록
  const [jobs, setJobs] = useState([])
  const [showJobs, setShowJobs] = useState(false)
  // 트렌드 소재 피커
  const [showTrend, setShowTrend] = useState(false)
  const [trend, setTrend] = useState([])
  const [trendLoading, setTrendLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (sessionProp) setSession(sessionProp)
    else supabase.auth.getSession().then(({ data }) => setSession(data.session || null))
  }, [sessionProp])
  useEffect(() => { if (session) loadJobs() }, [session])
  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: 'smooth' }) }, [messages, busy])

  const token = async () => (session?.access_token) || (await supabase.auth.getSession()).data.session?.access_token
  const lastScript = () => { for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'assistant' && messages[i].text) return messages[i].text; return '' }

  const loadJobs = async () => {
    const { data } = await supabase.from('jobs').select('id,product_name,created_at').order('created_at', { ascending: false }).limit(40)
    setJobs(data || [])
  }
  const openJob = async (id) => {
    setShowJobs(false); setErr('')
    const { data } = await supabase.from('job_messages').select('role,content').eq('job_id', id).order('created_at')
    setMessages((data || []).map(m => ({ role: m.role, text: m.content })))
    setJobId(id)
  }
  const newChat = () => { setMessages([]); setJobId(null); setSrcRef(null); setInput(''); setErr(''); setShowJobs(false) }

  const openTrend = async () => {
    setShowTrend(true)
    if (trend.length) return
    setTrendLoading(true)
    try {
      const { data } = await supabase.rpc('trend_list_rpc', { p_limit: 40 })
      setTrend(Array.isArray(data) ? data : [])
    } catch (e) { setErr('트렌드를 불러오지 못했어요') } finally { setTrendLoading(false) }
  }
  const pickTrend = (it) => {
    setSrcRef(it.shortcode || null)
    const cap = String(it.caption || '').replace(/\s+/g, ' ').trim().slice(0, 240)
    setInput(cap || '이 소재로 대본 만들어줘')
    setShowTrend(false)
  }

  const send = async () => {
    const text = input.trim(); if (!text || busy) return
    setErr(''); setInput('')
    const t = await token(); if (!t) { setErr('로그인이 필요해요'); return }
    setMessages(m => [...m, { role: 'user', text }]); setBusy(true)
    try {
      if (!jobId) {
        const r = await fetch(FN('script-assistant'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate', voice_mode: 'base', source_ref: srcRef, product_name: text.split(/[—\-.\n]/)[0].slice(0, 60), selling_points: text }) })
        const d = await r.json()
        if (!d.ok) { setErr(d.code === 'INSUFFICIENT_CREDITS' ? '이용권이 부족해요. 충전 후 다시 시도해주세요.' : (d.error || '대본 생성 실패')); return }
        setJobId(d.job_id); if (typeof d.balance === 'number') setBalance(d.balance)
        setMessages(m => [...m, { role: 'assistant', text: d.script }]); loadJobs()
      } else {
        const r = await fetch(FN('script-assistant'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'refine', job_id: jobId, instruction: text, current_script: lastScript(), voice_mode: 'base' }) })
        const d = await r.json()
        if (!d.ok) { setErr(d.error || '다듬기 실패'); return }
        setMessages(m => [...m, { role: 'assistant', text: d.script }])
      }
    } catch (e) { setErr(String(e)) } finally { setBusy(false) }
  }

  const applyMyVoice = async () => {
    setErr(''); setBusy(true)
    try {
      const t = await token()
      const r = await fetch(FN('script-assistant'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'preview_hook', selling_points: lastScript() }) })
      const d = await r.json()
      setMessages(m => [...m, { role: 'assistant', voicePreview: true, noProfile: !!d.no_profile, hook: d.hook || '' }])
    } catch (e) { setErr(String(e)) } finally { setBusy(false) }
  }
  const copy = async (text, i) => { try { await navigator.clipboard.writeText(text); setCopiedI(i); setTimeout(() => setCopiedI(-1), 1500) } catch {} }
  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <div className="relative flex min-h-[calc(100vh-0px)] flex-col px-4 pt-5 md:px-8 md:pt-7">
      <style>{`
        .sa-orb-wrap{position:relative;filter:drop-shadow(0 10px 34px rgba(0,100,255,.45))}
        .sa-orb{position:absolute;inset:0;background:radial-gradient(120% 120% at 30% 25%,#5AA0FF 0%,#0064FF 45%,#0042B8 100%);border-radius:44% 56% 61% 39%/45% 43% 57% 55%;animation:sa-blob 6s ease-in-out infinite}
        .sa-orb-hi{position:absolute;left:20%;top:16%;width:34%;height:28%;background:rgba(255,255,255,.55);border-radius:50%;filter:blur(4px);animation:sa-hi 6s ease-in-out infinite}
        @keyframes sa-blob{0%,100%{border-radius:44% 56% 61% 39%/45% 43% 57% 55%;transform:rotate(0) scale(1)}33%{border-radius:62% 38% 43% 57%/56% 49% 51% 44%;transform:rotate(120deg) scale(1.04)}66%{border-radius:39% 61% 57% 43%/47% 63% 37% 53%;transform:rotate(240deg) scale(.98)}}
        @keyframes sa-hi{0%,100%{opacity:.6;transform:translate(0,0)}50%{opacity:.9;transform:translate(3px,4px)}}
        .sa-fade{animation:sa-fade .35s ease}@keyframes sa-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      `}</style>

      {/* 헤더 */}
      <div className="mb-1 flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-white"><Sparkles size={20} className="text-[#0064FF]" /> 대본 비서</h1>
          <p className="mt-0.5 text-sm text-white/50">트렌드 소재를 고르면 기승전결 대본을 써줘요 · 대화로 다듬을수록 내 말투를 배워요</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowJobs(v => !v)} className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 hover:text-white"><MessageSquareText size={14} /> 내 대본 {jobs.length ? `(${jobs.length})` : ''} <ChevronDown size={13} /></button>
            {showJobs && (
              <div className="absolute right-0 z-30 mt-1.5 max-h-80 w-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#12141a] p-1.5 shadow-2xl">
                {jobs.length === 0 ? <div className="px-3 py-4 text-center text-xs text-white/40">아직 만든 대본이 없어요</div> :
                  jobs.map(j => (
                    <button key={j.id} onClick={() => openJob(j.id)} className={`block w-full truncate rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-white/5 ${j.id === jobId ? 'bg-white/5 text-white' : 'text-white/70'}`}>
                      <div className="truncate font-bold">{j.product_name || '(제목 없음)'}</div>
                      <div className="text-[11px] text-white/35">{new Date(j.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</div>
                    </button>
                  ))}
              </div>
            )}
          </div>
          <button onClick={newChat} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/15"><Plus size={14} /> 새 대본</button>
          {balance !== null && <div className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70">이용권 {balance}</div>}
        </div>
      </div>

      {/* 대화 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6">
        {messages.length === 0 && !busy && (
          <div className="sa-fade flex flex-col items-center justify-center gap-5 py-12 text-center">
            <Droplet size={92} />
            <div>
              <div className="text-lg font-bold text-white">어떤 소재로 대본을 만들까요?</div>
              <div className="mt-1 text-sm text-white/50">트렌드에서 소재를 고르면 상품 정보가 자동으로 들어와요.</div>
            </div>
            <button onClick={openTrend} className="flex items-center gap-2 rounded-full bg-[#0064FF] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"><Flame size={16} /> 트렌드에서 소재 고르기</button>
            <div className="text-xs text-white/35">또는 아래에 직접 적어도 돼요</div>
          </div>
        )}

        <div className="mx-auto flex max-w-[700px] flex-col gap-4">
          {srcRef && messages.length === 0 && <div className="self-center rounded-full bg-[#0064FF]/15 px-3 py-1 text-xs text-[#5AA0FF]">🔥 트렌드 소재 선택됨 · 전송하면 대본 생성</div>}
          {messages.map((m, i) => {
            if (m.voicePreview) return (
              <div key={i} className="sa-fade w-full max-w-[92%] self-start">
                <div className="rounded-2xl border border-[#0064FF]/40 bg-[#0064FF]/10 p-4">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#5AA0FF]"><Wand2 size={13} /> 내 말투 버전 (미리보기)</div>
                  {m.noProfile ? (
                    <div className="text-sm text-white/80">내 말투로 쓰려면 <b className="text-white">인스타그램 연결</b>이 필요해요. 릴스를 학습해서 내 말투 대본을 뽑아드려요.
                      <button onClick={() => alert('온보딩(인스타 연결)은 다음 단계에서 연결됩니다')} className="mt-3 block w-full rounded-xl bg-[#0064FF] py-2.5 text-sm font-bold text-white">인스타 연결하고 내 말투 배우기</button></div>
                  ) : (
                    <>
                      <div className="text-[15px] leading-relaxed text-white">{m.hook || '(훅 생성 안 됨)'}</div>
                      <div className="relative mt-2">
                        <div className="select-none text-sm leading-relaxed text-white/25 blur-[5px]">나머지 본문은 여기서 이어집니다. 내 말투 그대로, 기승전결 순서로, 바로 촬영할 수 있게 다듬어진 전체 대본이 표시됩니다.</div>
                        <div className="absolute inset-0 grid place-items-center rounded-xl bg-black/40 text-center"><div><div className="text-xs font-bold text-white/80">🔒 전체 내 말투 대본 + 단어 직접 수정</div><button onClick={() => alert('결제 모달은 다음 단계에서 연결됩니다')} className="mt-2 rounded-xl bg-[#0064FF] px-4 py-2 text-xs font-bold text-white">구독하고 전체 보기</button></div></div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
            if (m.role === 'user') return <div key={i} className="sa-fade max-w-[80%] self-end rounded-2xl rounded-br-md bg-[#0064FF] px-4 py-2.5 text-[15px] leading-relaxed text-white">{m.text}</div>
            return (
              <div key={i} className="sa-fade w-full max-w-[92%] self-start">
                <div className="whitespace-pre-wrap rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3 text-[15px] leading-relaxed text-white/95">{m.text}</div>
                <div className="mt-1.5 flex gap-1.5">
                  <button onClick={() => copy(m.text, i)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/50 hover:bg-white/10 hover:text-white/80">{copiedI === i ? <Check size={12} /> : <Copy size={12} />} 복사</button>
                  <button onClick={applyMyVoice} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#5AA0FF] hover:bg-[#0064FF]/15"><Wand2 size={12} /> 내 말투로 입히기</button>
                </div>
              </div>
            )
          })}
          {busy && <div className="sa-fade self-start rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-6 py-5"><Droplet size={44} label={jobId ? '다듬는 중…' : '대본을 짓는 중…'} /></div>}
        </div>
      </div>

      {err && <div className="mx-auto mb-2 max-w-[700px] text-sm text-amber-400">⚠ {err}</div>}

      {/* 컴포저 */}
      <div className="sticky bottom-0 border-t border-white/10 bg-[#0a0b0f]/85 pb-4 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-[700px] items-end gap-2">
          {!jobId && <button onClick={openTrend} title="트렌드에서 소재 고르기" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/5 text-[#5AA0FF] hover:text-white"><Flame size={18} /></button>}
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey} rows={1}
            placeholder={jobId ? '더 짧게, 훅 더 세게 … 대화로 다듬어요' : '트렌드에서 소재를 고르거나 직접 적어주세요 (Enter로 전송)'}
            className="max-h-32 flex-1 resize-none rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-[15px] text-white placeholder-white/35 outline-none focus:border-[#0064FF]" />
          <button onClick={send} disabled={busy || !input.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#0064FF] text-white transition disabled:opacity-40"><Send size={18} /></button>
        </div>
        <div className="mx-auto mt-1.5 max-w-[700px] text-center text-[11px] text-white/35">{jobId ? '다듬기는 무료예요 · 수정할수록 비서가 내 말투를 배워요' : '대본 만들기는 이용권 1개가 들어요'}</div>
      </div>

      {/* 트렌드 소재 피커 모달 */}
      {showTrend && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-6" onClick={() => setShowTrend(false)}>
          <div className="flex max-h-[80vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#12141a] md:rounded-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 font-bold text-white"><Flame size={16} className="text-[#0064FF]" /> 트렌드에서 소재 고르기</div>
              <button onClick={() => setShowTrend(false)} className="text-white/50 hover:text-white"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto p-2">
              {trendLoading ? <div className="py-10 text-center text-sm text-white/40">불러오는 중…</div> :
                trend.length === 0 ? <div className="py-10 text-center text-sm text-white/40">트렌드가 없어요</div> :
                trend.map((it, i) => (
                  <button key={it.shortcode || i} onClick={() => pickTrend(it)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-white/5">
                    {it.thumbnail_url ? <img src={it.thumbnail_url} referrerPolicy="no-referrer" className="h-16 w-12 shrink-0 rounded-lg object-cover" /> : <div className="h-16 w-12 shrink-0 rounded-lg bg-white/10" />}
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-[13px] leading-snug text-white/90">{String(it.caption || '(캡션 없음)').replace(/\s+/g, ' ').slice(0, 90)}</div>
                      <div className="mt-1 text-[11px] text-white/40">💬 {it.comment_count ?? 0} · ❤ {it.like_count ?? 0}</div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Sparkles, Send, Copy, Check, Wand2, Flame, Plus, MessageSquareText, ChevronDown } from 'lucide-react'
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
  const loc = useLocation()
  const nav = useNavigate()
  const [session, setSession] = useState(sessionProp || null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [jobId, setJobId] = useState(null)
  const [srcRef, setSrcRef] = useState(null)
  const [balance, setBalance] = useState(null)
  const [copiedI, setCopiedI] = useState(-1)
  const [err, setErr] = useState('')
  const [jobs, setJobs] = useState([])
  const [showJobs, setShowJobs] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (sessionProp) setSession(sessionProp)
    else supabase.auth.getSession().then(({ data }) => setSession(data.session || null))
  }, [sessionProp])
  useEffect(() => { if (session) loadJobs() }, [session])
  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: 'smooth' }) }, [messages, busy])

  // 트렌드 재생 모달에서 "대본 작성하기"로 넘어온 소재 받기
  useEffect(() => {
    const s = loc.state
    if (s && (s.source_ref || s.caption)) {
      setSrcRef(s.source_ref || null)
      setMessages([]); setJobId(null)
      const cap = String(s.caption || '').replace(/\s+/g, ' ').trim().slice(0, 240)
      if (cap) setInput(cap)
      else if (s.source_ref) {
        // 모달이 캡션을 안 넘겼으면 shortcode로 소재(캡션)를 불러와 자동 입력
        supabase.rpc('trend_detail_rpc', { p_shortcode: s.source_ref })
          .then(({ data }) => { const c = String(data?.caption || '').replace(/\s+/g, ' ').trim().slice(0, 240); if (c) setInput(c) })
          .catch(() => {})
      }
      nav('.', { replace: true, state: null })  // 새로고침 시 재적용 방지
    }
  }, [loc.state])

  const token = async () => (session?.access_token) || (await supabase.auth.getSession()).data.session?.access_token
  const lastScript = () => { for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'assistant' && messages[i].text) return messages[i].text; return '' }

  const loadJobs = async () => {
    const { data } = await supabase.from('jobs').select('id,product_name,created_at').order('created_at', { ascending: false }).limit(40)
    setJobs(data || [])
  }
  const openJob = async (id) => {
    setShowJobs(false); setErr('')
    const { data } = await supabase.from('job_messages').select('role,content').eq('job_id', id).order('created_at')
    setMessages((data || []).map(m => ({ role: m.role, text: m.content }))); setJobId(id)
  }
  const newChat = () => { setMessages([]); setJobId(null); setSrcRef(null); setInput(''); setErr(''); setShowJobs(false) }

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
          <p className="mt-0.5 text-sm text-white/50">트렌드 영상에서 '대본 작성하기'로 시작해요 · 대화로 다듬을수록 내 말투를 배워요</p>
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
              <div className="text-lg font-bold text-white">{srcRef ? '이 소재로 대본을 만들까요?' : '어떤 소재로 대본을 만들까요?'}</div>
              <div className="mt-1 text-sm text-white/50">{srcRef ? '아래 소재를 확인하고 전송하면 대본이 만들어져요.' : "트렌드에서 마음에 드는 영상을 열고 '대본 작성하기'를 누르면 시작돼요."}</div>
            </div>
            {srcRef
              ? <div className="rounded-full bg-[#0064FF]/15 px-3 py-1 text-xs text-[#5AA0FF]">🔥 트렌드 소재 선택됨 · 아래에서 전송</div>
              : <Link to="/trend" className="flex items-center gap-2 rounded-full bg-[#0064FF] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"><Flame size={16} /> 트렌드에서 영상 고르기</Link>}
          </div>
        )}

        <div className="mx-auto flex max-w-[700px] flex-col gap-4">
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
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey} rows={1}
            placeholder={jobId ? '더 짧게, 훅 더 세게 … 대화로 다듬어요' : (srcRef ? '소재 확인 후 Enter로 대본 생성' : "트렌드에서 '대본 작성하기'로 시작하거나 직접 적어주세요")}
            className="max-h-32 flex-1 resize-none rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-[15px] text-white placeholder-white/35 outline-none focus:border-[#0064FF]" />
          <button onClick={send} disabled={busy || !input.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#0064FF] text-white transition disabled:opacity-40"><Send size={18} /></button>
        </div>
        <div className="mx-auto mt-1.5 max-w-[700px] text-center text-[11px] text-white/35">{jobId ? '다듬기는 무료예요 · 수정할수록 비서가 내 말투를 배워요' : '대본 만들기는 이용권 1개가 들어요'}</div>
      </div>
    </div>
  )
}

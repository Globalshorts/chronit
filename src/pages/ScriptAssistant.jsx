import { useState, useEffect, useRef } from 'react'
import { Sparkles, Send, Copy, Check, Wand2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const FN = (n) => `${SB}/functions/v1/${n}`
const DEMO = '걸이식 식탁 의자 — 팔걸이만 식탁에 걸면 의자 다리가 바닥에서 떠서 청소가 편한 원목 의자. 로봇청소기도 안 걸리고 인테리어도 깔끔.'

// 고급 물방울 오브 (모핑 + 글로우 + 하이라이트)
function Droplet({ size = 84, label }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="sa-orb-wrap" style={{ width: size, height: size }}>
        <div className="sa-orb" />
        <div className="sa-orb-hi" />
      </div>
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
  const [balance, setBalance] = useState(null)
  const [copiedI, setCopiedI] = useState(-1)
  const [err, setErr] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    if (sessionProp) { setSession(sessionProp); return }
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null))
  }, [sessionProp])
  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: 'smooth' }) }, [messages, busy])

  const token = async () => (session?.access_token) || (await supabase.auth.getSession()).data.session?.access_token
  const lastScript = () => { for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'assistant' && messages[i].text) return messages[i].text; return '' }

  const send = async () => {
    const text = input.trim(); if (!text || busy) return
    setErr(''); setInput('')
    const t = await token(); if (!t) { setErr('로그인이 필요해요'); return }
    setMessages(m => [...m, { role: 'user', text }]); setBusy(true)
    try {
      if (!jobId) {
        const r = await fetch(FN('script-assistant'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate', voice_mode: 'base', product_name: text.split(/[—\-.\n]/)[0].slice(0, 60), selling_points: text }) })
        const d = await r.json()
        if (!d.ok) { setErr(d.code === 'INSUFFICIENT_CREDITS' ? '이용권이 부족해요. 충전 후 다시 시도해주세요.' : (d.error || '대본 생성 실패')); return }
        setJobId(d.job_id); if (typeof d.balance === 'number') setBalance(d.balance)
        setMessages(m => [...m, { role: 'assistant', text: d.script }])
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
    <div className="flex min-h-[calc(100vh-0px)] flex-col px-4 pt-5 md:px-8 md:pt-7">
      <style>{`
        .sa-orb-wrap{position:relative;filter:drop-shadow(0 10px 34px rgba(0,100,255,.45))}
        .sa-orb{position:absolute;inset:0;background:radial-gradient(120% 120% at 30% 25%,#5AA0FF 0%,#0064FF 45%,#0042B8 100%);border-radius:44% 56% 61% 39%/45% 43% 57% 55%;animation:sa-blob 6s ease-in-out infinite}
        .sa-orb-hi{position:absolute;left:20%;top:16%;width:34%;height:28%;background:rgba(255,255,255,.55);border-radius:50%;filter:blur(4px);animation:sa-hi 6s ease-in-out infinite}
        @keyframes sa-blob{0%,100%{border-radius:44% 56% 61% 39%/45% 43% 57% 55%;transform:rotate(0deg) scale(1)}33%{border-radius:62% 38% 43% 57%/56% 49% 51% 44%;transform:rotate(120deg) scale(1.04)}66%{border-radius:39% 61% 57% 43%/47% 63% 37% 53%;transform:rotate(240deg) scale(.98)}}
        @keyframes sa-hi{0%,100%{opacity:.6;transform:translate(0,0)}50%{opacity:.9;transform:translate(3px,4px)}}
        .sa-fade{animation:sa-fade .35s ease}
        @keyframes sa-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      `}</style>

      {/* 헤더 */}
      <div className="mb-1 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-white"><Sparkles size={20} className="text-[#0064FF]" /> 대본 비서</h1>
          <p className="mt-0.5 text-sm text-white/50">소재를 말하면 기승전결 대본을 써줘요 · 대화로 다듬을수록 내 말투를 배워요</p>
        </div>
        {balance !== null && <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/70">이용권 {balance}</div>}
      </div>

      {/* 대화 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6">
        {messages.length === 0 && !busy && (
          <div className="sa-fade flex flex-col items-center justify-center gap-5 py-14 text-center">
            <Droplet size={92} />
            <div>
              <div className="text-lg font-bold text-white">어떤 소재로 대본을 만들까요?</div>
              <div className="mt-1 text-sm text-white/50">트렌드에서 고른 상품과 특징을 편하게 적어주세요.</div>
            </div>
            <button onClick={() => setInput(DEMO)} className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white/70 transition hover:border-[#0064FF] hover:text-white">📦 식탁 의자 예시 넣기</button>
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
                      <button onClick={() => alert('온보딩(인스타 연결)은 다음 단계에서 연결됩니다')} className="mt-3 block w-full rounded-xl bg-[#0064FF] py-2.5 text-sm font-bold text-white">인스타 연결하고 내 말투 배우기</button>
                    </div>
                  ) : (
                    <>
                      <div className="text-[15px] leading-relaxed text-white">{m.hook || '(훅 생성 안 됨)'}</div>
                      <div className="relative mt-2">
                        <div className="select-none text-sm leading-relaxed text-white/25 blur-[5px]">나머지 본문은 여기서 이어집니다. 내 말투 그대로, 기승전결 순서로, 바로 촬영할 수 있게 다듬어진 전체 대본이 표시됩니다.</div>
                        <div className="absolute inset-0 grid place-items-center rounded-xl bg-black/40 text-center">
                          <div>
                            <div className="text-xs font-bold text-white/80">🔒 전체 내 말투 대본 + 단어 직접 수정</div>
                            <button onClick={() => alert('결제 모달은 다음 단계에서 연결됩니다')} className="mt-2 rounded-xl bg-[#0064FF] px-4 py-2 text-xs font-bold text-white">구독하고 전체 보기</button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
            if (m.role === 'user') return (
              <div key={i} className="sa-fade max-w-[80%] self-end rounded-2xl rounded-br-md bg-[#0064FF] px-4 py-2.5 text-[15px] leading-relaxed text-white">{m.text}</div>
            )
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
          {busy && (
            <div className="sa-fade self-start rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-6 py-5">
              <Droplet size={44} label={jobId ? '다듬는 중…' : '대본을 짓는 중…'} />
            </div>
          )}
        </div>
      </div>

      {err && <div className="mx-auto mb-2 max-w-[700px] text-sm text-amber-400">⚠ {err}</div>}

      {/* 컴포저 */}
      <div className="sticky bottom-0 border-t border-white/10 bg-[#0a0b0f]/85 pb-4 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-[700px] items-end gap-2">
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey} rows={1}
            placeholder={jobId ? '더 짧게, 훅 더 세게 … 대화로 다듬어요' : '소재와 특징을 적어주세요 (Enter로 전송)'}
            className="max-h-32 flex-1 resize-none rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-[15px] text-white placeholder-white/35 outline-none focus:border-[#0064FF]" />
          <button onClick={send} disabled={busy || !input.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#0064FF] text-white transition disabled:opacity-40"><Send size={18} /></button>
        </div>
        <div className="mx-auto mt-1.5 max-w-[700px] text-center text-[11px] text-white/35">{jobId ? '다듬기는 무료예요 · 수정할수록 비서가 내 말투를 배워요' : '대본 만들기는 이용권 1개가 들어요'}</div>
      </div>
    </div>
  )
}

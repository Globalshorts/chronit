import { useState, useEffect, useRef } from 'react'
import { Sparkles, Send, Copy, Check, Wand2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const FN = (n) => `${SB}/functions/v1/${n}`

const DEMO = '걸이식 식탁 의자 — 팔걸이만 식탁에 걸면 의자 다리가 바닥에서 떠서 청소가 편한 원목 의자. 로봇청소기도 안 걸리고 인테리어도 깔끔.'

// 물방울 로딩 오브
function Droplet({ size = 72, label }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="sa-orb" style={{ width: size, height: size }} />
      {label && <div className="text-sm text-gray-500">{label}</div>}
    </div>
  )
}

export default function ScriptAssistant({ session: sessionProp }) {
  const [session, setSession] = useState(sessionProp || null)
  const [messages, setMessages] = useState([])   // {role:'assistant'|'user', text, jobId?, editable?}
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [jobId, setJobId] = useState(null)
  const [balance, setBalance] = useState(null)
  const [copied, setCopied] = useState(false)
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
    const text = input.trim()
    if (!text || busy) return
    setErr(''); setInput('')
    const t = await token()
    if (!t) { setErr('로그인이 필요해요'); return }
    setMessages(m => [...m, { role: 'user', text }])
    setBusy(true)
    try {
      if (!jobId) {
        // 첫 메시지 = 소재 → 대본 생성 (이용권 1)
        const r = await fetch(FN('script-assistant'), {
          method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'generate', voice_mode: 'base', product_name: text.split(/[—\-.\n]/)[0].slice(0, 60), selling_points: text }),
        })
        const d = await r.json()
        if (!d.ok) { setErr(d.code === 'INSUFFICIENT_CREDITS' ? '이용권이 부족해요. 충전 후 다시 시도해주세요.' : (d.error || '대본 생성 실패')); return }
        setJobId(d.job_id); if (typeof d.balance === 'number') setBalance(d.balance)
        setMessages(m => [...m, { role: 'assistant', text: d.script, jobId: d.job_id }])
      } else {
        // 이후 = 다듬기 (무료 refine)
        const r = await fetch(FN('script-assistant'), {
          method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'refine', job_id: jobId, instruction: text, current_script: lastScript(), voice_mode: 'base' }),
        })
        const d = await r.json()
        if (!d.ok) { setErr(d.error || '다듬기 실패'); return }
        setMessages(m => [...m, { role: 'assistant', text: d.script, jobId }])
      }
    } catch (e) { setErr(String(e)) } finally { setBusy(false) }
  }

  const applyMyVoice = async () => {
    setErr(''); setBusy(true)
    try {
      const t = await token()
      const r = await fetch(FN('script-assistant'), {
        method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview_hook', selling_points: lastScript() }),
      })
      const d = await r.json()
      setMessages(m => [...m, { role: 'assistant', voicePreview: true, noProfile: !!d.no_profile, hook: d.hook || '' }])
    } catch (e) { setErr(String(e)) } finally { setBusy(false) }
  }

  const copy = async (text) => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {} }

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <div className="flex h-full min-h-[70vh] flex-col">
      <style>{`
        .sa-orb{border-radius:42% 58% 63% 37%/42% 42% 58% 58%;background:linear-gradient(140deg,#2A7BFF,#0064FF 60%,#0055DB);animation:sa-blob 7s ease-in-out infinite, sa-breathe 2.8s ease-in-out infinite}
        @keyframes sa-blob{0%,100%{border-radius:42% 58% 63% 37%/42% 42% 58% 58%;transform:translateY(0) rotate(0deg)}33%{border-radius:60% 40% 42% 58%/55% 48% 52% 45%;transform:translateY(-6px) rotate(120deg)}66%{border-radius:40% 60% 56% 44%/48% 62% 38% 52%;transform:translateY(4px) rotate(240deg)}}
        @keyframes sa-breathe{0%,100%{box-shadow:0 8px 40px 4px rgba(0,100,255,.22)}50%{box-shadow:0 10px 60px 12px rgba(0,100,255,.42)}}
        .sa-dot{animation:sa-bounce 1.2s infinite}
        .sa-dot:nth-child(2){animation-delay:.15s}.sa-dot:nth-child(3){animation-delay:.3s}
        @keyframes sa-bounce{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}
      `}</style>

      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-gray-200 px-1 pb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#0064FF]/10"><Sparkles size={17} className="text-[#0064FF]" /></div>
          <div>
            <div className="text-[15px] font-bold text-gray-900">대본 비서</div>
            <div className="text-[11px] text-gray-500">소재를 말하면 기승전결 대본을 써줘요 · 대화로 다듬을수록 내 말투를 배워요</div>
          </div>
        </div>
        {balance !== null && <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">이용권 {balance}</div>}
      </div>

      {/* 대화 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 py-6">
        {messages.length === 0 && !busy && (
          <div className="flex flex-col items-center justify-center gap-5 py-10 text-center">
            <Droplet size={84} />
            <div>
              <div className="text-lg font-bold text-gray-900">어떤 소재로 대본을 만들까요?</div>
              <div className="mt-1 text-sm text-gray-500">트렌드에서 고른 상품과 특징을 편하게 적어주세요.</div>
            </div>
            <button onClick={() => setInput(DEMO)} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 hover:border-[#0064FF] hover:text-[#0064FF]">📦 식탁 의자 예시 넣기</button>
          </div>
        )}

        <div className="mx-auto flex max-w-[680px] flex-col gap-4">
          {messages.map((m, i) => {
            if (m.voicePreview) return (
              <div key={i} className="self-start w-full max-w-[90%]">
                <div className="rounded-2xl border border-[#0064FF]/25 bg-[#0064FF]/[0.04] p-4">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#0064FF]"><Wand2 size={13} /> 내 말투 버전 (미리보기)</div>
                  {m.noProfile ? (
                    <div className="text-sm text-gray-700">내 말투로 쓰려면 <b>인스타그램 연결</b>이 필요해요. 릴스를 학습해서 내 말투 대본을 뽑아드려요.
                      <button onClick={() => alert('온보딩(인스타 연결)은 다음 단계에서 연결됩니다')} className="mt-3 block w-full rounded-xl bg-[#0064FF] py-2.5 text-sm font-bold text-white">인스타 연결하고 내 말투 배우기</button>
                    </div>
                  ) : (
                    <>
                      <div className="text-[15px] leading-relaxed text-gray-900">{m.hook || '(훅 생성 안 됨)'}</div>
                      <div className="relative mt-2">
                        <div className="select-none text-sm leading-relaxed text-gray-400 blur-[5px]">나머지 본문은 여기서 이어집니다. 내 말투 그대로, 기승전결 순서로, 바로 촬영할 수 있게 다듬어진 전체 대본이 표시됩니다.</div>
                        <div className="absolute inset-0 grid place-items-center rounded-xl bg-white/60 text-center">
                          <div>
                            <div className="text-xs font-bold text-gray-700">🔒 전체 내 말투 대본 + 단어 직접 수정</div>
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
              <div key={i} className="self-end max-w-[80%] rounded-2xl rounded-br-md bg-[#0064FF] px-4 py-2.5 text-[15px] leading-relaxed text-white">{m.text}</div>
            )
            return (
              <div key={i} className="self-start w-full max-w-[90%]">
                <div className="whitespace-pre-wrap rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3 text-[15px] leading-relaxed text-gray-900 shadow-sm">{m.text}</div>
                <div className="mt-1.5 flex gap-1.5">
                  <button onClick={() => copy(m.text)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">{copied ? <Check size={12} /> : <Copy size={12} />} 복사</button>
                  <button onClick={applyMyVoice} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#0064FF] hover:bg-[#0064FF]/10"><Wand2 size={12} /> 내 말투로 입히기</button>
                </div>
              </div>
            )
          })}
          {busy && (
            <div className="self-start rounded-2xl rounded-bl-md border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <Droplet size={40} label={jobId ? '다듬는 중…' : '대본을 짓는 중…'} />
            </div>
          )}
        </div>
      </div>

      {err && <div className="mx-auto mb-2 max-w-[680px] text-sm text-amber-600">⚠ {err}</div>}

      {/* 컴포저 */}
      <div className="border-t border-gray-200 px-1 pt-3">
        <div className="mx-auto flex max-w-[680px] items-end gap-2">
          <textarea
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey} rows={1}
            placeholder={jobId ? '더 짧게, 훅 더 세게 … 대화로 다듬어요' : '소재와 특징을 적어주세요 (Enter로 전송)'}
            className="max-h-32 flex-1 resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 outline-none focus:border-[#0064FF]"
          />
          <button onClick={send} disabled={busy || !input.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#0064FF] text-white disabled:opacity-40"><Send size={18} /></button>
        </div>
        <div className="mx-auto mt-1.5 max-w-[680px] text-center text-[11px] text-gray-400">{jobId ? '다듬기는 무료예요 · 수정할수록 비서가 내 말투를 배워요' : '대본 만들기는 이용권 1개가 들어요'}</div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { X, AtSign, Wand2, Check, Loader2, User, Users, MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const FN = (n) => `${SB}/functions/v1/${n}`

// 내 말투 온보딩: 인스타 ID → 릴스 학습 → 스타일카드 확인·보정
export default function VoiceOnboard({ onClose, onReady }) {
  const [step, setStep] = useState('input') // input | loading | review
  const [handle, setHandle] = useState('')
  const [err, setErr] = useState('')
  const [data, setData] = useState(null)       // voice-onboard 응답
  const [gender, setGender] = useState('')     // 남 | 여 | ''
  const [chars, setChars] = useState('')       // 콤마 구분
  const [tone, setTone] = useState('')
  const [saving, setSaving] = useState(false)

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token

  const start = async () => {
    const u = handle.trim().replace(/^@/, '')
    if (!u) { setErr('인스타그램 아이디를 입력해주세요'); return }
    setErr(''); setStep('loading')
    try {
      const t = await token(); if (!t) { setErr('로그인이 필요해요'); setStep('input'); return }
      const r = await fetch(FN('voice-onboard'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u }) })
      const d = await r.json()
      if (!d.ok) { setErr(d.error || '학습에 실패했어요'); setStep('input'); return }
      setData(d)
      const sc = d.style_card || {}
      setGender(sc.gender_guess === '남' || sc.gender_guess === '여' ? sc.gender_guess : '')
      setChars(Array.isArray(sc.recurring_characters) ? sc.recurring_characters.join(', ') : '')
      setTone(sc.tone || '')
      setStep('review')
    } catch (e) { setErr(String(e)); setStep('input') }
  }

  const save = async () => {
    setSaving(true); setErr('')
    try {
      const persona = {
        gender: gender || undefined,
        recurring_characters: chars.split(',').map(s => s.trim()).filter(Boolean),
        tone: tone.trim() || undefined,
      }
      await supabase.rpc('update_voice_persona_rpc', { p_persona: persona })
      onReady && onReady({ ...data, persona })
      onClose && onClose()
    } catch (e) { setErr(String(e)) } finally { setSaving(false) }
  }

  const sc = data?.style_card || {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#12141a] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2 text-white"><Wand2 size={18} className="text-[#5AA0FF]" /><span className="font-bold">내 말투 배우기</span></div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>

        {step === 'input' && (
          <div className="p-5">
            <p className="text-sm leading-relaxed text-white/70">내 인스타그램 릴스를 학습해서 <b className="text-white">내가 진짜 말하는 말투 그대로</b> 대본을 써드려요. 공개 계정이어야 해요.</p>
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-2.5 focus-within:border-[#0064FF]">
              <AtSign size={18} className="text-white/40" />
              <span className="text-white/40">@</span>
              <input value={handle} onChange={e => setHandle(e.target.value)} onKeyDown={e => e.key === 'Enter' && start()} placeholder="instagram_id" className="flex-1 bg-transparent text-[15px] text-white placeholder-white/30 outline-none" />
            </div>
            {err && <div className="mt-3 text-sm text-amber-400">⚠ {err}</div>}
            <button onClick={start} className="mt-4 w-full rounded-2xl bg-[#0064FF] py-3 text-sm font-bold text-white transition hover:brightness-110">릴스 학습 시작</button>
            <p className="mt-2 text-center text-[11px] text-white/35">약 30초 정도 걸려요 · 최근 릴스에서 말투를 뽑아요</p>
          </div>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center gap-4 px-5 py-12">
            <Loader2 size={40} className="animate-spin text-[#5AA0FF]" />
            <div className="text-center">
              <div className="font-bold text-white">릴스를 배우는 중…</div>
              <div className="mt-1 text-sm text-white/50">전사하고 말투를 분석하고 있어요 (30초쯤)</div>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="max-h-[70vh] overflow-y-auto p-5">
            <div className="rounded-2xl border border-[#0064FF]/30 bg-[#0064FF]/10 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#5AA0FF]"><Check size={13} /> 말투를 배웠어요 {data?.full_name ? `· ${data.full_name.split('|')[0].trim()}` : ''}</div>
              <div className="mt-2 space-y-1.5 text-[13px] text-white/80">
                {sc.narrative_pattern && <div><span className="text-white/45">서사 구조 · </span>{sc.narrative_pattern}</div>}
                {sc.opening_pattern && <div><span className="text-white/45">오프닝 · </span>{sc.opening_pattern}</div>}
                {sc.closing_pattern && <div><span className="text-white/45">맺음 · </span>{sc.closing_pattern}</div>}
                <div className="text-white/45">릴스 {data?.n_transcripts}개 학습 · 평균 {data?.avg_len}자</div>
              </div>
            </div>

            <div className="mt-4 text-xs font-bold text-white/50">필요하면 여기서 보정해요</div>
            <div className="mt-2 space-y-3">
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-white/60"><User size={12} /> 성별 (호칭·화자 정확도)</label>
                <div className="flex gap-2">
                  {[['남', '남성'], ['여', '여성'], ['', '지정 안 함']].map(([v, l]) => (
                    <button key={l} onClick={() => setGender(v)} className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${gender === v ? 'border-[#0064FF] bg-[#0064FF]/15 text-white' : 'border-white/15 bg-white/5 text-white/60'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-white/60"><Users size={12} /> 단골 등장인물 (콤마로 구분)</label>
                <input value={chars} onChange={e => setChars(e.target.value)} placeholder="예: 와이프, 친구" className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#0064FF]" />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-white/60"><MessageCircle size={12} /> 톤 (선택)</label>
                <input value={tone} onChange={e => setTone(e.target.value)} placeholder="예: 깐깐한 디자이너 시선, 유쾌함" className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#0064FF]" />
              </div>
            </div>
            {err && <div className="mt-3 text-sm text-amber-400">⚠ {err}</div>}
            <button onClick={save} disabled={saving} className="mt-4 w-full rounded-2xl bg-[#0064FF] py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40">{saving ? '저장 중…' : '내 말투 저장하고 시작'}</button>
          </div>
        )}
      </div>
    </div>
  )
}

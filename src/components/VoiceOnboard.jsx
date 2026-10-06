import { useState } from 'react'
import { X, AtSign, Wand2, Check, Loader2, User, Users, MessageCircle, Target } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const FN = (n) => `${SB}/functions/v1/${n}`

// 내 말투 온보딩: 인스타 ID → 릴스 학습 → 스타일카드 확인·보정
export default function VoiceOnboard({ onClose, onReady, defaultHandle = '', onBackground, initialData = null, initialStep = 'input' }) {
  const _isc = initialData?.style_card || {}
  const [step, setStep] = useState(initialStep) // input | loading | review | done
  const [handle, setHandle] = useState(defaultHandle)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [data, setData] = useState(initialData) // voice-onboard 응답
  const [gender, setGender] = useState(_isc.gender_guess === '남' || _isc.gender_guess === '여' ? _isc.gender_guess : '') // 남 | 여 | ''
  const [chars, setChars] = useState(Array.isArray(_isc.recurring_characters) ? _isc.recurring_characters.join(', ') : '') // 콤마 구분
  const [charMode, setCharMode] = useState(initialData?.persona?.character_mode || (Array.isArray(_isc.recurring_characters) && _isc.recurring_characters.length ? 'fixed' : 'auto')) // auto(자유) | solo(혼자) | fixed(고정)
  const [tone, setTone] = useState(_isc.tone || '')
  const [target, setTarget] = useState(initialData?.persona?.target || '')
  const [saving, setSaving] = useState(false)

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token

  const cleanHandle = () => handle.trim().replace(/^@/, '')
  const buildPersona = () => ({
    gender: gender || undefined,
    character_mode: charMode,
    recurring_characters: charMode === 'fixed' ? chars.split(',').map(s => s.trim()).filter(Boolean) : [],
    tone: tone.trim() || undefined,
    target: target.trim() || undefined,
  })
  // 기본 설정 + 핸들은 항상 먼저 저장(긁어올 게시물/캡션이 없어도 등록되게). 핸들은 ig_username으로 저장돼 캡션에 바로 쓰임
  const persistBasic = async () => {
    const persona = buildPersona()
    await supabase.rpc('update_voice_persona_rpc', { p_persona: persona })
    const h = cleanHandle()
    if (h) { try { await supabase.rpc('set_voice_handle_rpc', { p_handle: h }) } catch { /* noop */ } }
    return persona
  }

  const start = async () => {
    const u = cleanHandle()
    if (!u) { setErr('인스타그램 아이디를 입력해주세요'); return }
    if (onBackground) { try { await persistBasic() } catch { /* noop */ } ; onBackground(u); return }   // 백그라운드 학습
    setErr(''); setStep('loading')
    // 학습 전에 기본 설정 + 핸들 저장(게시물 없거나 학습 실패여도 날아가지 않게)
    try { await persistBasic() } catch { /* noop */ }
    try {
      const t = await token(); if (!t) { setErr('로그인이 필요해요'); setStep('input'); return }
      const r = await fetch(FN('voice-onboard'), { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u }) })
      const d = await r.json()
      if (!d.ok) {
        if (d.code === 'INSUFFICIENT_CREDITS') { setErr('재학습에 이용권 1개가 필요해요. 충전 후 다시 시도해주세요'); setStep('input'); return }
        // 게시물 없음/비공개/학습 실패 — 기본 설정은 이미 저장됨
        setMsg('게시물이 없어 기본 설정만 저장했어요. 나중에 "최근 게시물 학습하기"로 말투를 배울 수 있어요'); setStep('done'); onReady && onReady({ ...data, persona: buildPersona() }); return
      }
      if (d.skipped) { setMsg(d.message || '새로 올린 릴스가 없어 기본 설정만 저장했어요'); setStep('done'); onReady && onReady(d); return }
      setData(d)
      const sc = d.style_card || {}
      // input 화면에서 직접 정한 값은 유지하고, 비워둔 것만 학습 결과로 채운다
      setGender((g) => g || (sc.gender_guess === '남' || sc.gender_guess === '여' ? sc.gender_guess : ''))
      setChars((c) => c || (Array.isArray(sc.recurring_characters) ? sc.recurring_characters.join(', ') : ''))
      setTone((t) => t || (sc.tone || ''))
      setStep('review')
    } catch (e) { setMsg('기본 설정은 저장했어요. 말투 학습은 나중에 다시 시도해주세요'); setStep('done'); onReady && onReady({ ...data, persona: buildPersona() }) }
  }

  const save = async () => {
    setSaving(true); setErr('')
    try {
      const persona = await persistBasic()
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
          <div className="max-h-[75vh] overflow-y-auto p-5">
            <p className="text-sm leading-relaxed text-white/70">인스타 릴스를 학습하면 <b className="text-white">내가 진짜 말하는 말투 그대로</b> 써드려요. 핸들이 없어도 아래 기본만 정하면 대본 호칭·눈높이가 맞춰져요.</p>
            <label className="mt-4 mb-1 block text-xs font-bold text-white/55">인스타 아이디 <span className="font-normal text-white/35">(선택 — 넣으면 말투까지 학습)</span></label>
            <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-2.5 focus-within:border-[#0064FF]">
              <AtSign size={18} className="text-white/40" />
              <span className="text-white/40">@</span>
              <input value={handle} onChange={e => setHandle(e.target.value)} onKeyDown={e => e.key === 'Enter' && (handle.trim() ? start() : save())} placeholder="instagram_id" className="flex-1 bg-transparent text-[15px] text-white placeholder-white/30 outline-none" />
            </div>
            <p className="mt-1.5 text-[11px] text-white/35">공개 계정이어야 학습돼요 · 약 30초{defaultHandle ? ' · 첫 학습 무료, 재학습 이용권 1개' : ''}</p>

            <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <div className="text-[11px] font-bold text-white/45">기본 설정 · 핸들 없어도 적용돼요</div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-white/60"><User size={12} /> 성별 (호칭·화자 정확도)</label>
                <div className="flex gap-2">
                  {[['남', '남성'], ['여', '여성'], ['', '지정 안 함']].map(([v, l]) => (
                    <button key={l} onClick={() => setGender(v)} className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${gender === v ? 'border-[#0064FF] bg-[#0064FF]/15 text-white' : 'border-white/15 bg-white/5 text-white/60'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-white/60"><Users size={12} /> 출연 인물</label>
                <div className="flex gap-2">
                  {[['auto', '자유롭게'], ['solo', '화자 혼자'], ['fixed', '고정']].map(([v, l]) => (
                    <button key={v} onClick={() => setCharMode(v)} className={`flex-1 rounded-xl border px-2 py-2 text-sm font-bold transition ${charMode === v ? 'border-[#0064FF] bg-[#0064FF]/15 text-white' : 'border-white/15 bg-white/5 text-white/60'}`}>{l}</button>
                  ))}
                </div>
                {charMode === 'fixed' && <input value={chars} onChange={e => setChars(e.target.value)} placeholder="예: 아내, 친구" className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#0064FF]" />}
                <p className="mt-1 text-[11px] text-white/30">{charMode === 'auto' ? '상황에 맞는 인물이 매번 다르게 등장해요 (다양성↑)' : charMode === 'solo' ? '등장인물 없이 화자 혼자 이야기해요' : '여기 적은 인물 위주로만 등장해요'}</p>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-white/60"><Target size={12} /> 타깃 시청자 (선택)</label>
                <input value={target} onChange={e => setTarget(e.target.value)} placeholder="예: 좁은 자취방 2030, 살림 초보" className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#0064FF]" />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-white/60"><MessageCircle size={12} /> 톤 (선택)</label>
                <input value={tone} onChange={e => setTone(e.target.value)} placeholder="예: 유쾌함, 깐깐한 시선" className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#0064FF]" />
              </div>
            </div>

            {err && <div className="mt-3 text-sm text-amber-400">⚠ {err}</div>}
            <button onClick={() => (handle.trim() ? start() : save())} disabled={saving} className="mt-4 w-full rounded-2xl bg-[#0064FF] py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40">{saving ? '저장 중…' : (handle.trim() ? (defaultHandle ? '다시 학습하기' : '릴스 학습하고 저장') : '기본 설정 저장하고 시작')}</button>
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
            {data?.n_transcripts ? (
            <div className="rounded-2xl border border-[#0064FF]/30 bg-[#0064FF]/10 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#5AA0FF]"><Check size={13} /> 말투를 배웠어요 {data?.full_name ? `· ${data.full_name.split('|')[0].trim()}` : ''}</div>
              <div className="mt-2 space-y-1.5 text-[13px] text-white/80">
                {sc.narrative_pattern && <div><span className="text-white/45">서사 구조 · </span>{sc.narrative_pattern}</div>}
                {sc.opening_pattern && <div><span className="text-white/45">오프닝 · </span>{sc.opening_pattern}</div>}
                {sc.closing_pattern && <div><span className="text-white/45">맺음 · </span>{sc.closing_pattern}</div>}
                <div className="text-white/45">릴스 {data?.n_transcripts}개 학습 · 평균 {data?.avg_len}자</div>
              </div>
            </div>
            ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-[13px] leading-relaxed text-white/70">인스타 학습 없이 기본 설정만 할게요. 성별·타깃·톤을 지정하면 대본의 호칭과 눈높이가 맞춰져요. (나중에 '내 말투 배우기'로 릴스 학습을 추가할 수 있어요)</div>
            )}

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
                <label className="mb-1 flex items-center gap-1 text-xs text-white/60"><Users size={12} /> 출연 인물</label>
                <div className="flex gap-2">
                  {[['auto', '자유롭게'], ['solo', '화자 혼자'], ['fixed', '고정']].map(([v, l]) => (
                    <button key={v} onClick={() => setCharMode(v)} className={`flex-1 rounded-xl border px-2 py-2 text-sm font-bold transition ${charMode === v ? 'border-[#0064FF] bg-[#0064FF]/15 text-white' : 'border-white/15 bg-white/5 text-white/60'}`}>{l}</button>
                  ))}
                </div>
                {charMode === 'fixed' && <input value={chars} onChange={e => setChars(e.target.value)} placeholder="예: 아내, 친구" className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#0064FF]" />}
                <p className="mt-1 text-[11px] text-white/30">{charMode === 'auto' ? '상황에 맞는 인물이 매번 다르게 등장해요 (다양성↑)' : charMode === 'solo' ? '등장인물 없이 화자 혼자 이야기해요' : '여기 적은 인물 위주로만 등장해요'}</p>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-white/60"><MessageCircle size={12} /> 톤 (선택)</label>
                <input value={tone} onChange={e => setTone(e.target.value)} placeholder="예: 깐깐한 디자이너 시선, 유쾌함" className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#0064FF]" />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-white/60"><Target size={12} /> 타깃 시청자 (선택)</label>
                <input value={target} onChange={e => setTarget(e.target.value)} placeholder="예: 좁은 자취방 사는 2030, 살림 초보" className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#0064FF]" />
              </div>
            </div>
            {data?.charged && <div className="mt-3 text-center text-xs font-bold text-[#5AA0FF]">💧 재학습 · 이용권 1개 차감{typeof data?.balance === 'number' ? ` (남은 이용권 ${data.balance})` : ''}</div>}
            {err && <div className="mt-3 text-sm text-amber-400">⚠ {err}</div>}
            <button onClick={save} disabled={saving} className="mt-4 w-full rounded-2xl bg-[#0064FF] py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40">{saving ? '저장 중…' : (data?.n_transcripts ? '내 말투 저장하고 시작' : '기본 설정 저장하고 시작')}</button>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-4 px-5 py-12 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[#0064FF]/15"><Check size={28} className="text-[#5AA0FF]" /></div>
            <div>
              <div className="font-bold text-white">{msg}</div>
              <div className="mt-1 text-sm text-white/50">새 릴스를 올린 뒤 다시 학습하면 최신 말투로 갱신돼요</div>
            </div>
            <button onClick={onClose} className="rounded-2xl bg-white/10 px-6 py-2.5 text-sm font-bold text-white hover:bg-white/15">닫기</button>
          </div>
        )}
      </div>
    </div>
  )
}

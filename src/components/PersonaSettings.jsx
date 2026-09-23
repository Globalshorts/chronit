import { useState, useEffect } from 'react'
import { X, User, Target, Wand2, Users, MessageCircle, Check, RefreshCw, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'

// 설문과 동일한 정식 니치 값
const NICHE_OPTIONS = ['뷰티·화장품', '패션·의류', '리빙·홈·주방', '잡화·소품', '푸드·식품', '육아·키즈', '헬스·건강', '반려동물', '디지털·가전', '기타']
// 타깃(주 시청자)
const TARGET_OPTIONS = ['20·30대 자취·1인가구', '신혼·새댁', '3040 주부·살림', '육아맘·키즈', '학생·사회초년생', '시니어·4050', '전 연령', '기타']

// 베라 개인화 설정 드로어: 닉네임 · 니치 · 타깃 · 내 말투(보정)
export default function PersonaSettings({ onClose, onRelearn, onChanged }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [nick, setNick] = useState('')
  const [niche, setNiche] = useState('')
  const [nicheOther, setNicheOther] = useState('')
  const [target, setTarget] = useState('')
  const [targetOther, setTargetOther] = useState('')
  const [voice, setVoice] = useState(null)
  const [gender, setGender] = useState('')
  const [chars, setChars] = useState('')
  const [tone, setTone] = useState('')

  useEffect(() => { (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      const [{ data: pf }, { data: vc }] = await Promise.all([
        uid ? supabase.from('profiles').select('nickname,niche').eq('id', uid).maybeSingle() : Promise.resolve({ data: null }),
        supabase.rpc('get_voice_context_rpc'),
      ])
      setNick(pf?.nickname || '')
      const nv = pf?.niche || ''
      if (nv && !NICHE_OPTIONS.includes(nv)) { setNiche('기타'); setNicheOther(nv) } else setNiche(nv)
      setVoice(vc || null)
      const sc = vc?.style_card || {}, pv = vc?.persona || {}
      const tv = pv.target || ''
      if (tv && !TARGET_OPTIONS.includes(tv)) { setTarget('기타'); setTargetOther(tv) } else setTarget(tv)
      setGender(pv.gender || (sc.gender_guess === '남' || sc.gender_guess === '여' ? sc.gender_guess : ''))
      setChars((pv.recurring_characters || sc.recurring_characters || []).join(', '))
      setTone(pv.tone || sc.tone || '')
    } catch { /* noop */ } finally { setLoading(false) }
  })() }, [])

  const hasVoice = !!(voice && voice.base_profile && Array.isArray(voice.base_profile.transcripts) && voice.base_profile.transcripts.length > 0)
  const sc = voice?.style_card || {}

  const save = async () => {
    setSaving(true); setSaved(false)
    try {
      const nicheVal = niche === '기타' ? (nicheOther.trim() || '기타') : niche
      const targetVal = target === '기타' ? (targetOther.trim() || '기타') : target
      await supabase.rpc('set_profile_personalization_rpc', { p_nickname: nick.trim(), p_niche: nicheVal })
      await supabase.rpc('update_voice_persona_rpc', { p_persona: {
        target: targetVal || undefined,
        gender: gender || undefined,
        recurring_characters: chars.split(',').map(s => s.trim()).filter(Boolean),
        tone: tone.trim() || undefined,
      } })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch { /* noop */ } finally { setSaving(false) }
  }

  const resetVoice = async () => {
    if (!window.confirm('학습한 내 말투를 초기화할까요? 전사·스타일카드가 삭제되고, 다시 인스타로 학습해야 해요. (닉네임·니치는 유지)')) return
    try { await supabase.rpc('reset_voice_profile_rpc'); onChanged && onChanged(); onClose && onClose() } catch { /* noop */ }
  }

  const selCls = 'w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#0064FF]'
  const inCls = 'w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#0064FF]'

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#12141a] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2 text-white"><Sparkles size={18} className="text-[#5AA0FF]" /><span className="font-bold">베라 개인화</span></div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center text-white/40">불러오는 중…</div>
        ) : (
          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            <section>
              <label className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white"><User size={14} className="text-[#5AA0FF]" /> 베라가 부를 이름</label>
              <input value={nick} onChange={e => setNick(e.target.value)} placeholder="닉네임" className={inCls + ' py-2.5'} />
            </section>

            <section>
              <label className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white"><Target size={14} className="text-[#5AA0FF]" /> 니치 (주력 카테고리)</label>
              <select value={niche} onChange={e => setNiche(e.target.value)} className={selCls}>
                <option value="">선택 안 함</option>
                {NICHE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {niche === '기타' && <input value={nicheOther} onChange={e => setNicheOther(e.target.value)} placeholder="직접 입력" className={inCls + ' mt-2'} />}
            </section>

            <section>
              <label className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white"><Users size={14} className="text-[#5AA0FF]" /> 타깃 (주 시청자)</label>
              <select value={target} onChange={e => setTarget(e.target.value)} className={selCls}>
                <option value="">선택 안 함</option>
                {TARGET_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {target === '기타' && <input value={targetOther} onChange={e => setTargetOther(e.target.value)} placeholder="직접 입력" className={inCls + ' mt-2'} />}
              <p className="mt-1.5 text-[11px] text-white/35">이들이 공감할 표현·예시로 대본을 써요</p>
            </section>

            <section>
              <label className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white"><Wand2 size={14} className="text-[#5AA0FF]" /> 내 말투</label>
              {hasVoice ? (
                <div className="rounded-2xl border border-[#0064FF]/30 bg-[#0064FF]/10 p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#5AA0FF]"><Check size={13} /> {voice.ig_username ? `@${voice.ig_username}` : '학습됨'} · 릴스 {voice.base_profile.transcripts.length}개</div>
                    <button onClick={onRelearn} className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/15"><RefreshCw size={11} /> 다시 학습</button>
                  </div>
                  {sc.narrative_pattern && <div className="mt-2 text-[12px] text-white/70"><span className="text-white/45">서사 · </span>{sc.narrative_pattern}</div>}
                  <button onClick={resetVoice} className="mt-2.5 text-[11px] text-white/35 underline underline-offset-2 hover:text-amber-400">말투 초기화</button>
                </div>
              ) : (
                <button onClick={onRelearn} className="w-full rounded-2xl border border-dashed border-white/20 py-3 text-sm font-bold text-[#5AA0FF] hover:bg-white/5">＋ 내 인스타 릴스로 말투 배우기</button>
              )}

              {hasVoice && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-xs text-white/60"><User size={12} /> 성별 (호칭 정확도)</label>
                    <div className="flex gap-2">
                      {[['남', '남성'], ['여', '여성'], ['', '지정 안 함']].map(([v, l]) => (
                        <button key={l} onClick={() => setGender(v)} className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${gender === v ? 'border-[#0064FF] bg-[#0064FF]/15 text-white' : 'border-white/15 bg-white/5 text-white/60'}`}>{l}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-xs text-white/60"><Users size={12} /> 단골 등장인물 (콤마)</label>
                    <input value={chars} onChange={e => setChars(e.target.value)} placeholder="예: 와이프, 친구" className={inCls} />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-xs text-white/60"><MessageCircle size={12} /> 톤 (선택)</label>
                    <input value={tone} onChange={e => setTone(e.target.value)} placeholder="예: 깐깐한 디자이너 시선" className={inCls} />
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {!loading && (
          <div className="border-t border-white/10 p-4">
            <button onClick={save} disabled={saving} className="w-full rounded-2xl bg-[#0064FF] py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40">{saved ? '저장됨 ✓' : saving ? '저장 중…' : '저장'}</button>
          </div>
        )}
      </div>
    </div>
  )
}

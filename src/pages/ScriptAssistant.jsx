import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const FN = (n) => `${SB}/functions/v1/${n}`

const DEMO = {
  product_name: '걸이식 식탁 의자',
  selling_points: '청소할 때 무거운 의자 안 빼도 됨, 팔걸이만 식탁에 살짝 걸면 다리가 바닥에서 뜸, 밑 공간 싹 비워져 로봇청소기 안 걸림, 원목 질감 부드럽고 디자인 예뻐 인테리어 깔끔',
  cta_keyword: '의자',
}

// 개발 초기 데모 페이지 — 대본 비서 핵심 루프(대본 만들기 → 다듬기/학습 → 내 말투 입히기)
export default function ScriptAssistant() {
  const [user, setUser] = useState(undefined)
  const [form, setForm] = useState({ product_name: '', selling_points: '', cta_keyword: '' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [jobId, setJobId] = useState(null)
  const [script, setScript] = useState('')
  const [editText, setEditText] = useState('')
  const [balance, setBalance] = useState(null)
  const [savedMsg, setSavedMsg] = useState('')
  const [hook, setHook] = useState(null)     // 내 말투 입히기 미리보기(훅만)
  const [noProfile, setNoProfile] = useState(false)
  const [hookLoading, setHookLoading] = useState(false)

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null)) }, [])

  const token = async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  const generate = async (voice_mode) => {
    setErr(''); setLoading(true); setHook(null); setNoProfile(false); setSavedMsg('')
    try {
      const t = await token()
      if (!t) { setErr('로그인이 필요해요'); return }
      const r = await fetch(FN('script-assistant'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', voice_mode, ...form }),
      })
      const d = await r.json()
      if (!d.ok) { setErr(d.code === 'INSUFFICIENT_CREDITS' ? '이용권이 부족해요. 충전 후 다시 시도해주세요.' : (d.error || '대본 생성 실패')); return }
      setJobId(d.job_id); setScript(d.script); setEditText(d.script)
      if (typeof d.balance === 'number') setBalance(d.balance)
    } catch (e) { setErr(String(e)) } finally { setLoading(false) }
  }

  const applyMyVoice = async () => {
    setHookLoading(true); setErr(''); setNoProfile(false)
    try {
      const t = await token()
      const r = await fetch(FN('script-assistant'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview_hook', ...form }),
      })
      const d = await r.json()
      if (d.no_profile) { setNoProfile(true); return }
      setHook(d.hook || '')
    } catch (e) { setErr(String(e)) } finally { setHookLoading(false) }
  }

  const saveEdit = async () => {
    if (!jobId || editText.trim() === script.trim()) return
    try {
      await supabase.rpc('record_edit_rpc', { p_job_id: jobId, p_before: script, p_after: editText })
      setScript(editText); setSavedMsg('이 수정을 비서가 학습했어요. 다음 대본이 더 내 말투에 가까워져요.')
      setTimeout(() => setSavedMsg(''), 4000)
    } catch (e) { setErr(String(e)) }
  }

  if (user === undefined) return <div style={{ padding: 40, color: '#9aa' }}>불러오는 중…</div>

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 18px 80px', color: '#e7ebf3', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Apple SD Gothic Neo",sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>대본 비서</h1>
        <span style={{ fontSize: 11, background: 'rgba(91,140,255,.15)', border: '1px solid rgba(91,140,255,.4)', color: '#a9c2ff', borderRadius: 20, padding: '3px 9px' }}>개발 초기</span>
      </div>
      <p style={{ color: '#8b93a7', fontSize: 13, marginTop: 6, marginBottom: 20 }}>
        트렌드 소재의 셀링포인트를 넣으면 대본을 써줘요. 기승전결 구조로. 수정하면 비서가 내 말투를 배워요.
      </p>

      {!user && (
        <div style={{ background: '#1b202b', border: '1px solid #262c3a', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 14 }}>
          로그인 후 이용할 수 있어요. <Link to="/" style={{ color: '#5b8cff' }}>홈으로</Link>
        </div>
      )}

      {/* 입력 */}
      <div style={{ background: '#151922', border: '1px solid #262c3a', borderRadius: 14, padding: 16 }}>
        <label style={lbl}>상품명</label>
        <input style={inp} value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} placeholder="예: 걸이식 식탁 의자" />
        <label style={lbl}>핵심 셀링포인트</label>
        <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={form.selling_points} onChange={e => setForm({ ...form, selling_points: e.target.value })} placeholder="이 상품의 특징·효과" />
        <label style={lbl}>댓글 키워드</label>
        <input style={inp} value={form.cta_keyword} onChange={e => setForm({ ...form, cta_keyword: e.target.value })} placeholder="예: 의자" />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button style={chip} onClick={() => setForm(DEMO)}>📦 식탁 의자 데모 채우기</button>
        </div>
        <button style={{ ...btn, marginTop: 14, opacity: (loading || !user) ? .5 : 1 }} disabled={loading || !user} onClick={() => generate('base')}>
          {loading ? '대본 쓰는 중…' : '기본 말투로 대본 만들기 (이용권 1)'}
        </button>
        {balance !== null && <div style={{ fontSize: 12, color: '#8b93a7', marginTop: 8 }}>남은 이용권: {balance}</div>}
        {err && <div style={{ color: '#ffb454', fontSize: 13, marginTop: 10 }}>⚠ {err}</div>}
      </div>

      {/* 대본 스레드 */}
      {script && (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>대본 <span style={{ color: '#8b93a7', fontWeight: 400, fontSize: 12 }}>· 기승전결</span></div>
          <div style={{ background: '#151922', border: '1px solid #262c3a', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#8b93a7', marginBottom: 8 }}>✏️ 직접 고치면 비서가 학습해요</div>
            <textarea style={{ ...inp, minHeight: 150, lineHeight: 1.7, resize: 'vertical' }} value={editText} onChange={e => setEditText(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button style={{ ...btnOutline, opacity: editText.trim() === script.trim() ? .5 : 1 }} disabled={editText.trim() === script.trim()} onClick={saveEdit}>수정 반영(학습)</button>
              <button style={btnOutline} onClick={applyMyVoice} disabled={hookLoading}>{hookLoading ? '입히는 중…' : '✨ 내 말투로 입히기'}</button>
            </div>
            {savedMsg && <div style={{ color: '#38d39f', fontSize: 12, marginTop: 10 }}>✓ {savedMsg}</div>}
          </div>

          {/* 내 말투 입히기 미리보기 (훅만 공개 + 나머지 잠금) */}
          {noProfile && (
            <div style={{ ...lockBox, marginTop: 12 }}>
              내 말투로 쓰려면 <b>인스타그램 연결</b>이 필요해요. 릴스를 학습해서 OO님 말투로 대본을 뽑아드려요.
              <button style={{ ...btn, marginTop: 10 }} onClick={() => alert('온보딩(인스타 연결)은 다음 단계에서 붙습니다')}>인스타 연결하고 내 말투 배우기</button>
            </div>
          )}
          {hook !== null && !noProfile && (
            <div style={{ marginTop: 12, background: '#151922', border: '1px solid #262c3a', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#a9c2ff', marginBottom: 8 }}>✨ 내 말투 버전 (미리보기)</div>
              <div style={{ fontSize: 15, lineHeight: 1.6 }}>{hook || '(훅 생성 안 됨)'}</div>
              <div style={{ position: 'relative', marginTop: 8 }}>
                <div style={{ filter: 'blur(6px)', userSelect: 'none', color: '#8b93a7', fontSize: 14, lineHeight: 1.7 }}>
                  나머지 본문은 여기서 이어집니다. 내 말투 그대로, 기승전결 순서로, 바로 촬영할 수 있게 다듬어진 전체 대본이 표시됩니다. 단어도 직접 수정할 수 있어요.
                </div>
                <div style={lockBox}>
                  🔒 전체 내 말투 대본 + 단어 직접 수정은 <b>구독</b>에서
                  <button style={{ ...btn, marginTop: 10 }} onClick={() => alert('결제 모달 연결은 다음 단계')}>구독하고 전체 보기</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const lbl = { display: 'block', fontSize: 12, color: '#8b93a7', margin: '12px 0 6px' }
const inp = { width: '100%', background: '#1b202b', border: '1px solid #262c3a', borderRadius: 9, color: '#e7ebf3', padding: '11px 12px', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }
const btn = { width: '100%', background: '#5b8cff', color: '#fff', border: 0, borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const btnOutline = { background: '#1b202b', color: '#e7ebf3', border: '1px solid #262c3a', borderRadius: 9, padding: '9px 14px', fontSize: 13, cursor: 'pointer' }
const chip = { background: '#1b202b', border: '1px solid #262c3a', color: '#8b93a7', borderRadius: 20, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }
const lockBox = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: 'rgba(13,15,20,.55)', borderRadius: 10, fontSize: 13, padding: 12 }

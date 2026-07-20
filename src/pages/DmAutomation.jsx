import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// 인스타 자동 DM 설정 페이지 (멀티테넌트, 검수/테스트용)
const IG_CLIENT_ID = '1704122604098446'
const IG_REDIRECT = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co/functions/v1/ig-oauth-callback'
const IG_SCOPE = 'instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages,instagram_business_content_publish'

export default function DmAutomation() {
  const [user, setUser] = useState(null)
  const [conn, setConn] = useState(null)
  const [rules, setRules] = useState([])
  const [logs, setLogs] = useState([])
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [kw, setKw] = useState('')
  const [dm, setDm] = useState('')
  const [pub, setPub] = useState(true)
  const [mediaId, setMediaId] = useState('')

  const load = async (uid) => {
    const [{ data: c }, { data: r }, { data: l }] = await Promise.all([
      supabase.from('ig_connections').select('id, ig_user_id, ig_username, status, token_expires_at, connected_at').eq('user_id', uid).maybeSingle(),
      supabase.from('dm_rules').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('dm_logs').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(20),
    ])
    setConn(c || null); setRules(r || []); setLogs(l || [])
  }

  // 연결된 계정의 게시물 목록 불러오기 (규칙을 특정 게시물에 걸 때 선택용)
  const loadMedia = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ig-media')
      if (!error && Array.isArray(data?.media)) setMedia(data.media)
    } catch { /* 무시: 전체 게시물 규칙은 그대로 사용 가능 */ }
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUser(user)
      const p = new URLSearchParams(window.location.search)
      const ig = p.get('ig')
      if (ig === 'connected') setMsg('✅ 인스타 계정이 연결됐어요' + (p.get('u') ? ` (@${p.get('u')})` : ''))
      else if (ig === 'denied') setMsg('연결이 취소됐어요')
      else if (ig === 'fail' || ig === 'error') setMsg('연결 실패: ' + (p.get('msg') || '다시 시도해 주세요'))
      if (ig) window.history.replaceState({}, '', '/dm')
      await load(user.id)
      setLoading(false)
    })()
  }, [])

  useEffect(() => { if (conn) loadMedia() }, [conn])

  const connect = () => {
    if (!user) return
    const state = encodeURIComponent(`${user.id}::${window.location.origin}`)
    window.location.href = `https://www.instagram.com/oauth/authorize?client_id=${IG_CLIENT_ID}&redirect_uri=${encodeURIComponent(IG_REDIRECT)}&response_type=code&scope=${encodeURIComponent(IG_SCOPE)}&state=${state}`
  }

  const disconnect = async () => {
    if (!conn || !window.confirm('인스타 연결을 해제할까요? 자동 DM이 멈춰요.')) return
    await supabase.from('ig_connections').delete().eq('id', conn.id)
    setConn(null); setMedia([]); setMsg('연결을 해제했어요')
  }

  const addRule = async () => {
    if (!conn) { setMsg('먼저 인스타를 연결해 주세요'); return }
    if (!kw.trim() || !dm.trim()) { setMsg('키워드와 DM 문구를 입력해 주세요'); return }
    const { data, error } = await supabase.from('dm_rules').insert({
      user_id: user.id, ig_user_id: conn.ig_user_id, keyword: kw.trim(), dm_text: dm.trim(),
      public_replies: pub ? ['방금 DM 보냈어요 📩', 'DM 확인해보세요 👀'] : [],
      media_id: mediaId || null, active: true,
    }).select('*').single()
    if (error) { setMsg('저장 실패: ' + error.message); return }
    setRules((p) => [data, ...p]); setKw(''); setDm(''); setMediaId(''); setMsg('규칙을 추가했어요')
  }

  const toggleRule = async (rule) => {
    const { data } = await supabase.from('dm_rules').update({ active: !rule.active }).eq('id', rule.id).select('*').single()
    if (data) setRules((p) => p.map((x) => x.id === data.id ? data : x))
  }
  const delRule = async (rule) => {
    if (!window.confirm('이 규칙을 삭제할까요?')) return
    await supabase.from('dm_rules').delete().eq('id', rule.id)
    setRules((p) => p.filter((x) => x.id !== rule.id))
  }

  // 게시물 라벨 (캡션 앞부분 + 날짜)
  const mediaOptLabel = (m) => {
    const cap = (m.caption || '').replace(/\s+/g, ' ').trim()
    const d = m.ts ? new Date(m.ts).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : ''
    return `${d ? d + ' · ' : ''}${cap ? cap.slice(0, 30) : '(캡션 없음)'}`
  }
  const scopeLabel = (id) => {
    if (!id) return '📄 전체 게시물'
    const m = media.find((x) => String(x.id) === String(id))
    return '🎯 특정 게시물' + (m ? ` · ${mediaOptLabel(m).slice(0, 24)}` : '')
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>불러오는 중…</div>
  if (!user) return <div style={{ padding: 40, textAlign: 'center' }}>로그인이 필요해요.</div>

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px', fontFamily: "'Apple SD Gothic Neo','Malgun Gothic',sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>💬 인스타 댓글 자동 DM</h1>
      <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 20 }}>내 인스타를 연결하고, 특정 키워드 댓글에 자동으로 DM(링크)을 보내세요.</p>
      {msg && <div style={{ background: '#F0F7FF', border: '1px solid #cfe3ff', color: '#0052D6', borderRadius: 12, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{msg}</div>}

      {/* 연결 상태 */}
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 10 }}>1. 인스타 계정 연결</p>
        {conn ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontWeight: 800 }}>@{conn.ig_username || conn.ig_user_id}</p>
              <p style={{ fontSize: 12, color: '#10B981' }}>연결됨 · {conn.status}</p>
            </div>
            <button onClick={disconnect} style={{ borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontWeight: 700, fontSize: 13, padding: '8px 14px', cursor: 'pointer' }}>연결 해제</button>
          </div>
        ) : (
          <button onClick={connect} style={{ width: '100%', borderRadius: 12, border: 'none', background: 'linear-gradient(90deg,#833AB4,#FD1D1D,#FCB045)', color: '#fff', fontWeight: 800, fontSize: 15, padding: '13px', cursor: 'pointer' }}>📷 인스타그램 연결하기</button>
        )}
      </div>

      {/* 규칙 */}
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, marginBottom: 20, opacity: conn ? 1 : 0.5 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 10 }}>2. 자동 DM 규칙</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="트리거 키워드 (예: 크로닛)" disabled={!conn}
            style={{ borderRadius: 10, border: '1px solid #D1D5DB', padding: '10px 12px', fontSize: 14 }} />
          <div>
            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>적용 게시물</label>
            <select value={mediaId} onChange={(e) => setMediaId(e.target.value)} disabled={!conn}
              style={{ width: '100%', borderRadius: 10, border: '1px solid #D1D5DB', padding: '10px 12px', fontSize: 14, background: '#fff' }}>
              <option value="">전체 게시물 (모든 게시물에 적용)</option>
              {media.map((m) => (
                <option key={m.id} value={m.id}>{mediaOptLabel(m)}</option>
              ))}
            </select>
            {conn && !media.length && <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>게시물을 불러오는 중이거나 없어요. 전체 게시물로도 바로 쓸 수 있어요.</p>}
          </div>
          <textarea value={dm} onChange={(e) => setDm(e.target.value)} placeholder="보낼 DM 문구 (예: 아래 링크에서 확인하세요! https://…)" rows={3} disabled={!conn}
            style={{ borderRadius: 10, border: '1px solid #D1D5DB', padding: '10px 12px', fontSize: 14, resize: 'none' }} />
          <label style={{ fontSize: 13, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} disabled={!conn} /> 공개 답글도 남기기 ("방금 DM 보냈어요")
          </label>
          <button onClick={addRule} disabled={!conn} style={{ borderRadius: 10, border: 'none', background: '#0064FF', color: '#fff', fontWeight: 800, fontSize: 14, padding: '11px', cursor: conn ? 'pointer' : 'default' }}>규칙 추가</button>
        </div>
        {rules.map((r) => (
          <div key={r.id} style={{ borderTop: '1px solid #F3F4F6', padding: '10px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 800, fontSize: 14 }}>“{r.keyword}” 댓글 → DM</p>
              <p style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 700, margin: '2px 0' }}>{scopeLabel(r.media_id)}</p>
              <p style={{ fontSize: 12, color: '#6B7280', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{r.dm_text}</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => toggleRule(r)} style={{ borderRadius: 8, border: '1px solid #E5E7EB', background: r.active ? '#ECFDF5' : '#fff', color: r.active ? '#059669' : '#9CA3AF', fontWeight: 700, fontSize: 12, padding: '5px 9px', cursor: 'pointer' }}>{r.active ? 'ON' : 'OFF'}</button>
              <button onClick={() => delRule(r)} style={{ borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#EF4444', fontWeight: 700, fontSize: 12, padding: '5px 9px', cursor: 'pointer' }}>삭제</button>
            </div>
          </div>
        ))}
        {conn && !rules.length && <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '8px 0' }}>아직 규칙이 없어요. 위에서 추가해 주세요.</p>}
      </div>

      {/* 로그 */}
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 16, padding: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 10 }}>3. 최근 자동 DM 발송</p>
        {logs.length ? logs.map((l) => (
          <div key={l.id} style={{ borderTop: '1px solid #F3F4F6', padding: '8px 0', fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span>@{l.commenter_username || '?'} · "{l.matched_keyword}"</span>
            <span style={{ color: l.dm_status >= 200 && l.dm_status < 300 ? '#10B981' : '#EF4444' }}>{l.dm_status >= 200 && l.dm_status < 300 ? 'DM 전송됨' : '실패'}</span>
          </div>
        )) : <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '8px 0' }}>아직 발송 내역이 없어요.</p>}
      </div>
    </div>
  )
}

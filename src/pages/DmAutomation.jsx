import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AtSign, Plus, Trash2, Check, MessageCircle, FileText, Target, Send } from 'lucide-react'

// 인스타 자동 DM 설정 페이지 (멀티테넌트 · 다계정 지원)
const IG_CLIENT_ID = '1704122604098446'
const IG_REDIRECT = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co/functions/v1/ig-oauth-callback'
const IG_SCOPE = 'instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages'

export default function DmAutomation() {
  const [user, setUser] = useState(null)
  const [conns, setConns] = useState([])         // 연결된 계정들 (다계정)
  const [activeIg, setActiveIg] = useState(null) // 현재 선택된 ig_user_id
  const [rules, setRules] = useState([])
  const [logs, setLogs] = useState([])
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [kw, setKw] = useState('')
  const [dm, setDm] = useState('')
  const [pub, setPub] = useState(true)
  const [mediaId, setMediaId] = useState('')

  const conn = conns.find((c) => c.ig_user_id === activeIg) || null

  const loadConns = async (uid) => {
    const { data } = await supabase.from('ig_connections')
      .select('id, ig_user_id, ig_username, status, token_expires_at, connected_at')
      .eq('user_id', uid).order('connected_at', { ascending: true })
    const list = data || []
    setConns(list)
    setActiveIg((prev) => (prev && list.some((c) => c.ig_user_id === prev)) ? prev : (list[0]?.ig_user_id ?? null))
    return list
  }

  const loadRulesLogs = async (uid, ig) => {
    if (!ig) { setRules([]); setLogs([]); return }
    const [{ data: r }, { data: l }] = await Promise.all([
      supabase.from('dm_rules').select('*').eq('user_id', uid).eq('ig_user_id', ig).order('created_at', { ascending: false }),
      supabase.from('dm_logs').select('*').eq('user_id', uid).eq('ig_user_id', ig).order('created_at', { ascending: false }).limit(20),
    ])
    setRules(r || []); setLogs(l || [])
  }

  // 선택 계정의 게시물 목록 (규칙을 특정 게시물에 걸 때 선택용)
  const loadMedia = async (ig) => {
    if (!ig) { setMedia([]); return }
    try {
      const { data, error } = await supabase.functions.invoke('ig-media', { body: { ig_user_id: ig } })
      if (!error && Array.isArray(data?.media)) setMedia(data.media); else setMedia([])
    } catch { setMedia([]) }
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUser(user)
      const p = new URLSearchParams(window.location.search)
      const ig = p.get('ig')
      if (ig === 'connected') setMsg('인스타 계정이 연결됐어요' + (p.get('u') ? ` (@${p.get('u')})` : ''))
      else if (ig === 'denied') setMsg('연결이 취소됐어요')
      else if (ig === 'fail' || ig === 'error') setMsg('연결 실패: ' + (p.get('msg') || '다시 시도해 주세요'))
      if (ig) window.history.replaceState({}, '', '/dm')
      await loadConns(user.id)
      setLoading(false)
    })()
  }, [])

  // 계정 전환/최초 로드 시 그 계정 기준으로 규칙·로그·게시물 로드
  useEffect(() => {
    if (!user || !activeIg) { setRules([]); setLogs([]); setMedia([]); return }
    loadRulesLogs(user.id, activeIg)
    loadMedia(activeIg)
    setMediaId('')
  }, [activeIg, user])

  const connect = () => {
    if (!user) return
    const state = encodeURIComponent(`${user.id}::${window.location.origin}`)
    window.location.href = `https://www.instagram.com/oauth/authorize?client_id=${IG_CLIENT_ID}&redirect_uri=${encodeURIComponent(IG_REDIRECT)}&response_type=code&scope=${encodeURIComponent(IG_SCOPE)}&state=${state}`
  }

  const disconnect = async (c) => {
    if (!c || !window.confirm(`@${c.ig_username || c.ig_user_id} 연결을 해제할까요?\n이 계정의 자동 DM이 멈춰요.`)) return
    await supabase.from('ig_connections').delete().eq('id', c.id)
    setMsg('연결을 해제했어요')
    await loadConns(user.id)
  }

  const addRule = async () => {
    if (!conn) { setMsg('먼저 인스타를 연결해 주세요'); return }
    if (!dm.trim()) { setMsg('DM 문구를 입력해 주세요'); return }
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

  const mediaOptLabel = (m) => {
    const cap = (m.caption || '').replace(/\s+/g, ' ').trim()
    const d = m.ts ? new Date(m.ts).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : ''
    return `${d ? d + ' · ' : ''}${cap ? cap.slice(0, 30) : '(캡션 없음)'}`
  }
  const scopeLabel = (id) => {
    if (!id) return '전체 게시물'
    const m = media.find((x) => String(x.id) === String(id))
    return '특정 게시물' + (m ? ` · ${mediaOptLabel(m).slice(0, 24)}` : '')
  }

  if (loading) return <div className="py-16 text-center text-gray-500">불러오는 중…</div>
  if (!user) return <div className="py-16 text-center text-gray-500">로그인이 필요해요.</div>

  const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#0064FF] focus:ring-1 focus:ring-[#0064FF] transition"

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="mb-1 flex items-center gap-2 text-xl font-black text-gray-900"><MessageCircle size={22} className="text-[#0064FF]" /> 인스타 댓글 자동 DM</h1>
      <p className="mb-5 text-sm text-gray-500">내 인스타를 연결하고, 특정 키워드 댓글에 자동으로 DM(링크)을 보내세요. 계정은 여러 개 연결할 수 있어요.</p>
      {msg && <div className="mb-4 rounded-xl border border-[#0064FF]/20 bg-[#0064FF]/5 px-4 py-2.5 text-sm font-medium text-[#0052D6]">{msg}</div>}

      {/* 1. 계정 연결 (다계정) */}
      <div className="mb-5 rounded-2xl border border-gray-200 p-4">
        <p className="mb-3 text-sm font-black text-gray-700">1. 인스타 계정 연결</p>
        {conns.length > 0 ? (
          <div className="flex flex-col gap-2">
            {conns.map((c) => {
              const on = c.ig_user_id === activeIg
              return (
                <div key={c.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition ${on ? 'border-[#0064FF] bg-[#0064FF]/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <button onClick={() => setActiveIg(c.ig_user_id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${on ? 'bg-[#0064FF] text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {on ? <Check size={16} strokeWidth={3} /> : <AtSign size={16} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-gray-900">@{c.ig_username || c.ig_user_id}</span>
                      <span className={`block text-xs ${c.status === 'active' ? 'text-emerald-500' : 'text-gray-400'}`}>{c.status === 'active' ? '연결됨' : c.status}{on ? ' · 선택됨' : ''}</span>
                    </span>
                  </button>
                  <button onClick={() => disconnect(c)} title="연결 해제"
                    className="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-400 hover:border-red-200 hover:text-red-500 transition"><Trash2 size={13} /></button>
                </div>
              )
            })}
            <button onClick={connect}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2.5 text-sm font-bold text-gray-500 hover:border-[#0064FF] hover:text-[#0064FF] transition">
              <Plus size={15} strokeWidth={2.5} /> 계정 추가 연결
            </button>
          </div>
        ) : (
          <button onClick={connect}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-black text-white transition active:scale-[0.99]"
            style={{ background: 'linear-gradient(90deg,#833AB4,#FD1D1D,#FCB045)' }}>
            <AtSign size={18} /> 인스타그램 연결하기
          </button>
        )}
      </div>

      {/* 2. 규칙 (선택 계정 기준) */}
      <div className={`mb-5 rounded-2xl border border-gray-200 p-4 ${conn ? '' : 'opacity-50'}`}>
        <p className="mb-3 text-sm font-black text-gray-700">2. 자동 DM 규칙{conn ? ` · @${conn.ig_username || conn.ig_user_id}` : ''}</p>
        <div className="mb-3 flex flex-col gap-2">
          <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="트리거 키워드 (비우면 모든 댓글에 DM)" disabled={!conn} className={inputCls} />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">적용 게시물</label>
            <select value={mediaId} onChange={(e) => setMediaId(e.target.value)} disabled={!conn} className={inputCls}>
              <option value="">전체 게시물 (모든 게시물에 적용)</option>
              {media.map((m) => (<option key={m.id} value={m.id}>{mediaOptLabel(m)}</option>))}
            </select>
            {conn && !media.length && <p className="mt-1 text-[11px] text-gray-400">게시물을 불러오는 중이거나 없어요. 전체 게시물로도 바로 쓸 수 있어요.</p>}
          </div>
          <textarea value={dm} onChange={(e) => setDm(e.target.value)} rows={3} disabled={!conn}
            placeholder="보낼 DM 문구 (예: 아래 링크에서 확인하세요! https://…)" className={`${inputCls} resize-none`} />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} disabled={!conn} className="h-4 w-4 rounded" />
            공개 답글도 남기기 ("방금 DM 보냈어요")
          </label>
          <button onClick={addRule} disabled={!conn}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0064FF] px-4 py-2.5 text-sm font-black text-white hover:bg-[#0052D6] disabled:opacity-40 transition">
            <Plus size={15} strokeWidth={2.5} /> 규칙 추가
          </button>
        </div>
        {rules.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-3 border-t border-gray-100 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900">{r.keyword ? `"${r.keyword}" 댓글` : '모든 댓글'} → DM</p>
              <p className="my-0.5 flex items-center gap-1 text-xs font-bold text-[#8B5CF6]">
                {r.media_id ? <Target size={11} /> : <FileText size={11} />} {scopeLabel(r.media_id)}
              </p>
              <p className="whitespace-pre-wrap break-all text-xs text-gray-500">{r.dm_text}</p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button onClick={() => toggleRule(r)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${r.active ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-gray-200 bg-white text-gray-400'}`}>{r.active ? 'ON' : 'OFF'}</button>
              <button onClick={() => delRule(r)}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-red-500 hover:border-red-200 transition"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {conn && !rules.length && <p className="py-2 text-center text-sm text-gray-400">아직 규칙이 없어요. 위에서 추가해 주세요.</p>}
      </div>

      {/* 3. 로그 (선택 계정 기준) */}
      <div className="rounded-2xl border border-gray-200 p-4">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-black text-gray-700"><Send size={14} className="text-[#0064FF]" /> 최근 자동 DM 발송{conn ? ` · @${conn.ig_username || conn.ig_user_id}` : ''}</p>
        {logs.length ? logs.map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-2 border-t border-gray-100 py-2 text-sm">
            <span className="min-w-0 truncate text-gray-700">@{l.commenter_username || '?'} · "{l.matched_keyword}"</span>
            <span className={`shrink-0 font-bold ${l.dm_status >= 200 && l.dm_status < 300 ? 'text-emerald-500' : 'text-red-500'}`}>{l.dm_status >= 200 && l.dm_status < 300 ? 'DM 전송됨' : '실패'}</span>
          </div>
        )) : <p className="py-2 text-center text-sm text-gray-400">아직 발송 내역이 없어요.</p>}
      </div>
    </div>
  )
}

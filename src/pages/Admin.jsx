import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  Megaphone, Save, LogOut, ShieldCheck, Loader, Eye, EyeOff,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter,
  AlignRight, List, ListOrdered, Link, Image, Minus, Plus, Pencil, Trash2, ChevronLeft,
  Film, ChevronUp, ChevronDown, Upload, Gift,
} from 'lucide-react'

const ToolBtn = ({ onClick, title, children }) => (
  <button type="button" title={title}
    onMouseDown={e => { e.preventDefault(); onClick() }}
    className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
    {children}
  </button>
)
const Divider = () => <div className="mx-1 h-5 w-px bg-white/10" />

const RichEditor = ({ value, onChange }) => {
  const editorRef = useRef(null)
  const isInit = useRef(false)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!isInit.current && editorRef.current) {
      editorRef.current.innerHTML = value || ''
      isInit.current = true
    }
  }, [value])

  const exec = (cmd, val = null) => { editorRef.current?.focus(); document.execCommand(cmd, false, val) }
  const insertLink = () => { const u = prompt('URL:', 'https://'); if (u) exec('createLink', u) }

  const insertImageFromFile = async (file) => {
    if (!file?.type.startsWith('image/')) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `event-images/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('event-assets').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('event-assets').getPublicUrl(path)
      editorRef.current?.focus()
      document.execCommand('insertImage', false, publicUrl)
    } catch {
      const reader = new FileReader()
      reader.onload = e => { editorRef.current?.focus(); document.execCommand('insertImage', false, e.target.result) }
      reader.readAsDataURL(file)
    } finally { setUploading(false) }
  }

  const handleDrop = async e => {
    e.preventDefault(); setDragging(false)
    for (const file of Array.from(e.dataTransfer.files)) await insertImageFromFile(file)
  }

  return (
    <div className={`overflow-hidden rounded-xl border transition-colors ${dragging ? 'border-blue-500/60' : 'border-white/12'}`}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-white/10 bg-slate-800/80 px-3 py-2">
        <select onChange={e => exec('fontSize', e.target.value)} defaultValue="3"
          className="h-8 rounded border border-white/10 bg-slate-700 px-2 text-xs text-slate-300 outline-none">
          <option value="1">small</option><option value="3">normal</option>
          <option value="5">large</option><option value="7">x-large</option>
        </select>
        <Divider />
        <ToolBtn onClick={() => exec('bold')} title="bold"><Bold size={14} /></ToolBtn>
        <ToolBtn onClick={() => exec('italic')} title="italic"><Italic size={14} /></ToolBtn>
        <ToolBtn onClick={() => exec('underline')} title="underline"><Underline size={14} /></ToolBtn>
        <ToolBtn onClick={() => exec('strikeThrough')} title="strike"><Strikethrough size={14} /></ToolBtn>
        <Divider />
        <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-sm font-bold text-slate-400 hover:bg-white/10">
          A<input type="color" className="sr-only" onChange={e => exec('foreColor', e.target.value)} />
        </label>
        <Divider />
        <ToolBtn onClick={() => exec('justifyLeft')} title="left"><AlignLeft size={14} /></ToolBtn>
        <ToolBtn onClick={() => exec('justifyCenter')} title="center"><AlignCenter size={14} /></ToolBtn>
        <ToolBtn onClick={() => exec('justifyRight')} title="right"><AlignRight size={14} /></ToolBtn>
        <Divider />
        <ToolBtn onClick={() => exec('insertUnorderedList')} title="ul"><List size={14} /></ToolBtn>
        <ToolBtn onClick={() => exec('insertOrderedList')} title="ol"><ListOrdered size={14} /></ToolBtn>
        <Divider />
        <ToolBtn onClick={insertLink} title="link"><Link size={14} /></ToolBtn>
        <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-white/10">
          <Image size={14} />
          <input type="file" accept="image/*" className="sr-only" onChange={e => { insertImageFromFile(e.target.files?.[0]); e.target.value='' }} />
        </label>
        <ToolBtn onClick={() => exec('insertHorizontalRule')} title="hr"><Minus size={14} /></ToolBtn>
        <Divider />
        <ToolBtn onClick={() => exec('removeFormat')} title="clear"><span className="text-xs font-bold">Tx</span></ToolBtn>
      </div>
      <div className="relative">
        {uploading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-b-xl">
            <Loader size={18} className="animate-spin text-blue-400" />
          </div>
        )}
        {dragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-500/10 border-2 border-dashed border-blue-500/50 rounded-b-xl">
            <p className="text-sm font-bold text-blue-400">drop image here</p>
          </div>
        )}
        <div ref={editorRef} contentEditable suppressContentEditableWarning
          onInput={() => onChange(editorRef.current?.innerHTML || '')}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className="min-h-[360px] bg-[#0f172a] p-5 text-slate-200 outline-none"
          style={{ fontSize: '15px', lineHeight: '1.8' }}
          data-placeholder="write content..."
        />
      </div>
      <style>{`
        [data-placeholder]:empty::before { content: attr(data-placeholder); color: #475569; pointer-events: none; }
        [contenteditable] img { max-width:100%; border-radius:8px; display:block; margin:4px 0; }
        [contenteditable] a { color:#60a5fa; text-decoration:underline; }
        [contenteditable] ul { list-style:disc; padding-left:1.5em; }
        [contenteditable] ol { list-style:decimal; padding-left:1.5em; }
        [contenteditable] hr { border-color:rgba(255,255,255,0.1); margin:1em 0; }
      `}</style>
    </div>
  )
}

const STATUS_CFG = {
  active:  { label: '진행중',      cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30', dot: true },
  ended:   { label: '종료됨',      cls: 'bg-slate-600/30 text-slate-400 border-slate-500/20', dot: false },
  winner:  { label: '당첨자 발표', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30', dot: false },
}

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.active
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.cls}`}>
      {cfg.dot && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />}
      {cfg.label}
    </span>
  )
}

const emptyForm = () => ({ title: '', content: '', status: 'active', cta_text: '', cta_url: '', thumbnail_url: '' })

const DemoVideosPanel = () => {
  const [videos, setVideos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [msg, setMsg] = useState(null)

  const load = async () => {
    const { data } = await supabase.from('demo_videos').select('*').order('sort_order')
    if (data) setVideos(data)
  }

  useEffect(() => { load() }, [])

  const showMsg = (text, isErr = false) => {
    setMsg({ text, isErr })
    setTimeout(() => setMsg(null), 2500)
  }

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      if (!file.type.startsWith('video/')) continue
      const ext = file.name.split('.').pop()
      const path = `demo/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('demo-videos').upload(path, file, { upsert: false })
      if (upErr) { showMsg('Upload failed: ' + upErr.message, true); continue }
      const { data: { publicUrl } } = supabase.storage.from('demo-videos').getPublicUrl(path)
      const maxOrder = videos.length ? Math.max(...videos.map(v => v.sort_order)) : -1
      await supabase.from('demo_videos').insert({ url: publicUrl, sort_order: maxOrder + 1 })
    }
    await load()
    setUploading(false)
    e.target.value = ''
    showMsg('Upload complete!')
  }

  const handleDelete = async (video) => {
    setDeleting(video.id)
    try {
      const urlPath = new URL(video.url).pathname
      const storagePath = urlPath.split('/demo-videos/')[1]
      if (storagePath) await supabase.storage.from('demo-videos').remove([storagePath])
    } catch {}
    await supabase.from('demo_videos').delete().eq('id', video.id)
    await load()
    setDeleting(null)
  }

  const move = async (idx, dir) => {
    const next = idx + dir
    if (next < 0 || next >= videos.length) return
    const a = videos[idx], b = videos[next]
    await supabase.from('demo_videos').update({ sort_order: b.sort_order }).eq('id', a.id)
    await supabase.from('demo_videos').update({ sort_order: a.sort_order }).eq('id', b.id)
    await load()
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film size={18} className="text-blue-400" />
          <h2 className="text-base font-bold">Demo Videos</h2>
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-slate-400">{videos.length}</span>
        </div>
        <label className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-95 ${uploading ? 'bg-slate-700 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
          {uploading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Uploading...' : 'Add Video'}
          <input type="file" accept="video/*" multiple className="sr-only" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {msg && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-bold ${msg.isErr ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-green-500/30 bg-green-500/10 text-green-400'}`}>
          {msg.text}
        </div>
      )}

      {videos.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          <Film size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No demo videos yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map((v, idx) => (
            <div key={v.id} className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
              <video src={v.url} className="h-16 w-9 shrink-0 rounded-lg bg-black object-cover" muted playsInline preload="metadata" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-400">#{idx + 1}</p>
                <p className="truncate text-xs text-slate-600">{v.url.split('/').pop()}</p>
              </div>
              <div className="flex flex-col gap-0.5">
                <button onClick={() => move(idx, -1)} disabled={idx === 0}
                  className="flex h-6 w-6 items-center justify-center rounded text-slate-500 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-20">
                  <ChevronUp size={14} />
                </button>
                <button onClick={() => move(idx, 1)} disabled={idx === videos.length - 1}
                  className="flex h-6 w-6 items-center justify-center rounded text-slate-500 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-20">
                  <ChevronDown size={14} />
                </button>
              </div>
              <button onClick={() => handleDelete(v)} disabled={deleting === v.id}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-red-400 disabled:opacity-40">
                {deleting === v.id ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-slate-600">Use arrows to reorder. Changes reflect on homepage immediately.</p>
    </div>
  )
}

// 영상 만들기 → "무료 크레딧 받기" 모달에 노출되는 이벤트(미션) 관리
const emptyMission = () => ({
  title: '', description: '', reward: 100, badge_label: '이벤트',
  badge_color: '#03C75A', type: 'claim', action_url: '', action_label: '받기',
  active: true, sort_order: 0,
  start_at: '', end_at: '', req_plan: 'any', req_audience: 'all',
  req_signup_days: 7, req_min_videos: 0, auto: false,
})
// timestamptz <-> datetime-local 변환
const toInput = (v) => { if (!v) return ''; const d = new Date(v); if (isNaN(d)) return ''; const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` }
const fromInput = (v) => v ? new Date(v).toISOString() : null
const MissionsPanel = () => {
  const [list, setList] = useState([])
  const [editing, setEditing] = useState(null)   // id or 'new'
  const [form, setForm] = useState(emptyMission())
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = async () => {
    const { data } = await supabase.from('missions').select('*').order('sort_order').order('created_at')
    setList(Array.isArray(data) ? data : [])
  }
  useEffect(() => { load() }, [])

  const openNew = () => { setForm(emptyMission()); setEditing('new') }
  const openEdit = (m) => {
    setForm({ title: m.title || '', description: m.description || '', reward: m.reward || 0,
      badge_label: m.badge_label || '이벤트', badge_color: m.badge_color || '#03C75A',
      type: m.type || 'claim', action_url: m.action_url || '', action_label: m.action_label || '받기',
      active: !!m.active, sort_order: m.sort_order || 0,
      start_at: toInput(m.start_at), end_at: toInput(m.end_at),
      req_plan: m.req_plan || 'any', req_audience: m.req_audience || 'all',
      req_signup_days: m.req_signup_days ?? 7, req_min_videos: m.req_min_videos || 0, auto: !!m.auto })
    setEditing(m.id)
  }
  const save = async () => {
    setSaving(true); setMsg(null)
    const payload = { ...form,
      reward: Math.max(0, Math.floor(Number(form.reward) || 0)),
      sort_order: Math.floor(Number(form.sort_order) || 0),
      start_at: fromInput(form.start_at), end_at: fromInput(form.end_at),
      req_signup_days: Math.max(0, Math.floor(Number(form.req_signup_days) || 0)),
      req_min_videos: Math.max(0, Math.floor(Number(form.req_min_videos) || 0)) }
    let error
    if (editing === 'new') ({ error } = await supabase.from('missions').insert(payload))
    else ({ error } = await supabase.from('missions').update(payload).eq('id', editing))
    setSaving(false)
    if (error) { setMsg({ ok: false, text: error.message }); return }
    setMsg({ ok: true, text: '저장됨' }); setEditing(null); load()
  }
  const del = async (id) => {
    if (!confirm('이 이벤트를 삭제할까요? (이미 받은 기록은 남습니다)')) return
    await supabase.from('missions').delete().eq('id', id); load()
  }
  const toggle = async (m) => { await supabase.from('missions').update({ active: !m.active }).eq('id', m.id); load() }

  const inputCls = 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500'
  const labelCls = 'mb-1 block text-xs font-bold text-slate-400'

  if (editing) return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-white"><ChevronLeft size={18} /></button>
        <h2 className="text-lg font-black text-white">{editing === 'new' ? '새 이벤트' : '이벤트 수정'}</h2>
      </div>
      <div><label className={labelCls}>제목</label><input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="예) 첫 영상 만들기 도전!" /></div>
      <div><label className={labelCls}>설명</label><textarea className={inputCls} rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="이벤트 안내 문구 (줄바꿈 가능)" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className={labelCls}>지급 크레딧</label><input type="number" className={inputCls} value={form.reward} onChange={e => set('reward', e.target.value)} /></div>
        <div><label className={labelCls}>정렬 순서 (작을수록 위)</label><input type="number" className={inputCls} value={form.sort_order} onChange={e => set('sort_order', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className={labelCls}>배지 문구</label><input className={inputCls} value={form.badge_label} onChange={e => set('badge_label', e.target.value)} placeholder="이벤트" /></div>
        <div><label className={labelCls}>배지 색</label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.badge_color} onChange={e => set('badge_color', e.target.value)} className="h-9 w-12 rounded border border-white/10 bg-transparent" />
            <input className={inputCls} value={form.badge_color} onChange={e => set('badge_color', e.target.value)} />
          </div>
        </div>
      </div>
      <div>
        <label className={labelCls}>유형</label>
        <div className="flex gap-2">
          <button onClick={() => set('type', 'claim')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${form.type === 'claim' ? 'bg-blue-600 text-white' : 'border border-white/10 text-slate-400'}`}>즉시 지급 (버튼 누르면 크레딧)</button>
          <button onClick={() => set('type', 'link')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${form.type === 'link' ? 'bg-blue-600 text-white' : 'border border-white/10 text-slate-400'}`}>링크 이동 (구글폼 등)</button>
        </div>
        {form.type === 'link' && <p className="mt-1 text-xs text-slate-500">※ 링크형은 크레딧을 자동 지급하지 않아요. 지급은 수동/쿠폰으로.</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className={labelCls}>버튼 문구</label><input className={inputCls} value={form.action_label} onChange={e => set('action_label', e.target.value)} placeholder={form.type === 'link' ? '참여하기' : '받기'} /></div>
        {form.type === 'link' && <div><label className={labelCls}>이동 URL</label><input className={inputCls} value={form.action_url} onChange={e => set('action_url', e.target.value)} placeholder="https://..." /></div>}
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} /> 공개 (영상 만들기 모달에 노출)</label>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
        <p className="text-xs font-bold text-slate-300">받기 조건 <span className="font-normal text-slate-500">(받기 누를 때 자동 검사 · 즉시 지급형만 적용)</span></p>
        {form.type === 'claim' && (
          <div>
            <label className={labelCls}>지급 방식</label>
            <div className="flex gap-2">
              <button onClick={() => set('auto', false)} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${!form.auto ? 'bg-blue-600 text-white' : 'border border-white/10 text-slate-400'}`}>버튼 눌러 받기</button>
              <button onClick={() => set('auto', true)} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${form.auto ? 'bg-blue-600 text-white' : 'border border-white/10 text-slate-400'}`}>🎯 자동 지급 (퀘스트)</button>
            </div>
            <p className="mt-1 text-xs text-slate-500">{form.auto ? '조건을 충족하는 순간 자동으로 지급돼요 (영상 생성 완료 시 즉시 / 모달 열 때 소급).' : '조건 충족 후 사용자가 모달에서 "받기"를 눌러야 지급돼요.'}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>시작일시 (선택)</label><input type="datetime-local" className={inputCls} value={form.start_at} onChange={e => set('start_at', e.target.value)} /></div>
          <div><label className={labelCls}>종료일시 (선택)</label><input type="datetime-local" className={inputCls} value={form.end_at} onChange={e => set('end_at', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>대상 플랜</label>
            <select className={inputCls} value={form.req_plan} onChange={e => set('req_plan', e.target.value)}>
              <option value="any">전체</option><option value="free">무료 유저만</option><option value="paid">유료 유저만</option>
            </select>
          </div>
          <div><label className={labelCls}>최소 생성 영상 수</label><input type="number" min="0" className={inputCls} value={form.req_min_videos} onChange={e => set('req_min_videos', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>대상 유저</label>
            <select className={inputCls} value={form.req_audience} onChange={e => set('req_audience', e.target.value)}>
              <option value="all">전체</option><option value="new">신규 (가입 N일 이내)</option><option value="existing">기존 (가입 N일 이후)</option>
            </select>
          </div>
          {form.req_audience !== 'all' && (
            <div><label className={labelCls}>기준 일수 (N일)</label><input type="number" min="1" className={inputCls} value={form.req_signup_days} onChange={e => set('req_signup_days', e.target.value)} /></div>
          )}
        </div>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>}
      <button onClick={save} disabled={saving || !form.title.trim()} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">
        {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />} 저장
      </button>
    </div>
  )

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black text-white">이벤트 (크레딧 미션)</h2>
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-slate-400">{list.length}</span>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"><Plus size={15} /> 새 이벤트</button>
      </div>
      <p className="mb-4 text-xs text-slate-500">영상 만들기 → "🎁 무료 크레딧 받기" 모달에 노출됩니다. 추천·후기 미션은 코드 고정이라 여기엔 없어요.</p>
      {list.length === 0 ? (
        <div className="py-12 text-center text-slate-500"><Gift size={28} className="mx-auto mb-2 opacity-40" /><p className="text-sm">아직 이벤트가 없어요</p></div>
      ) : (
        <div className="space-y-2">
          {list.map(m => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
              <span className="inline-block rounded-lg px-2 py-1 text-xs font-bold text-white shrink-0" style={{ backgroundColor: m.badge_color }}>{m.badge_label}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{m.title || '(제목 없음)'}</p>
                <p className="text-xs text-slate-500">{m.type === 'link' ? `링크 · ${m.action_url || '-'}` : `즉시 지급 +${m.reward} CR`}{m.active ? '' : ' · 비공개'}</p>
              </div>
              <button onClick={() => toggle(m)} title={m.active ? '숨기기' : '공개'} className="text-slate-400 hover:text-white">{m.active ? <Eye size={16} /> : <EyeOff size={16} />}</button>
              <button onClick={() => openEdit(m)} className="text-slate-400 hover:text-white"><Pencil size={16} /></button>
              <button onClick={() => del(m.id)} className="text-slate-400 hover:text-red-400"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// 로딩 중 노출되는 '숏폼 부업 꿀팁' 관리
const TipsPanel = () => {
  const [list, setList] = useState([])
  const [editing, setEditing] = useState(null)   // id or 'new'
  const [form, setForm] = useState({ emoji: '💡', text: '', category: '', active: true, sort_order: 0 })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const load = async () => {
    const { data } = await supabase.from('loading_tips').select('*').order('sort_order').order('created_at')
    setList(Array.isArray(data) ? data : [])
  }
  useEffect(() => { load() }, [])
  const openNew = () => { setForm({ emoji: '💡', text: '', category: '', active: true, sort_order: 0 }); setEditing('new') }
  const openEdit = (t) => { setForm({ emoji: t.emoji || '💡', text: t.text || '', category: t.category || '', active: !!t.active, sort_order: t.sort_order || 0 }); setEditing(t.id) }
  const save = async () => {
    if (!form.text.trim()) return
    setSaving(true)
    const payload = { ...form, sort_order: Math.floor(Number(form.sort_order) || 0) }
    if (editing === 'new') await supabase.from('loading_tips').insert(payload)
    else await supabase.from('loading_tips').update(payload).eq('id', editing)
    setSaving(false); setEditing(null); load()
  }
  const del = async (id) => { if (!confirm('이 꿀팁을 삭제할까요?')) return; await supabase.from('loading_tips').delete().eq('id', id); load() }
  const toggle = async (t) => { await supabase.from('loading_tips').update({ active: !t.active }).eq('id', t.id); load() }
  const inputCls = 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500'

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black text-white">숏폼 부업 꿀팁</h2>
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-slate-400">{list.length}</span>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"><Plus size={15} /> 새 꿀팁</button>
      </div>
      <p className="mb-4 text-xs text-slate-500">영상 생성 로딩 화면에 30초마다 랜덤으로 노출돼요.</p>

      {editing && (
        <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
          <div className="flex gap-3">
            <div className="w-20"><label className="mb-1 block text-xs font-bold text-slate-400">이모지</label><input className={inputCls + ' text-center'} value={form.emoji} onChange={e => set('emoji', e.target.value)} /></div>
            <div className="flex-1"><label className="mb-1 block text-xs font-bold text-slate-400">분류 (선택)</label><input className={inputCls} value={form.category} onChange={e => set('category', e.target.value)} placeholder="후킹 / 수익화 / 크로닛 ..." /></div>
            <div className="w-24"><label className="mb-1 block text-xs font-bold text-slate-400">순서</label><input type="number" className={inputCls} value={form.sort_order} onChange={e => set('sort_order', e.target.value)} /></div>
          </div>
          <div><label className="mb-1 block text-xs font-bold text-slate-400">팁 내용</label><textarea rows={2} className={inputCls} value={form.text} onChange={e => set('text', e.target.value)} placeholder="예) 첫 3초가 조회수의 80%를 좌우해요." /></div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} /> 노출</label>
            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400">취소</button>
              <button onClick={save} disabled={saving || !form.text.trim()} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />} 저장</button>
            </div>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="py-12 text-center text-slate-500"><p className="text-sm">아직 꿀팁이 없어요</p></div>
      ) : (
        <div className="space-y-1.5">
          {list.map(t => (
            <div key={t.id} className={`flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-2.5 ${t.active ? '' : 'opacity-50'}`}>
              <span className="text-xl shrink-0 w-7 text-center">{t.emoji}</span>
              <p className="min-w-0 flex-1 truncate text-sm text-white">{t.text}</p>
              {t.category && <span className="shrink-0 rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-slate-400">{t.category}</span>}
              <button onClick={() => toggle(t)} className="text-slate-400 hover:text-white">{t.active ? <Eye size={15} /> : <EyeOff size={15} />}</button>
              <button onClick={() => openEdit(t)} className="text-slate-400 hover:text-white"><Pencil size={15} /></button>
              <button onClick={() => del(t.id)} className="text-slate-400 hover:text-red-400"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const Admin = () => {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState([])
  const [tab, setTab] = useState('events')
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [preview, setPreview] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      setUser(session.user)
      const { data: sub } = await supabase.from('subscriptions').select('role').eq('user_id', session.user.id).single()
      if (sub?.role === 'super_admin') {
        setIsAdmin(true)
        await loadEvents()
      }
      setLoading(false)
    }
    init()
  }, [])

  const loadEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false })
    if (data) setEvents(data)
  }

  const openNew = () => { setForm(emptyForm()); setEditing(null); setPreview(false); setView('form') }
  const openEdit = ev => {
    setForm({ title: ev.title, content: ev.content, status: ev.status, cta_text: ev.cta_text || '', cta_url: ev.cta_url || '', thumbnail_url: ev.thumbnail_url || '' })
    setEditing(ev.id); setPreview(false); setView('form')
  }

  const [thumbUploading, setThumbUploading] = useState(false)
  const uploadThumbnail = async (file) => {
    if (!file?.type.startsWith('image/')) return
    setThumbUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `thumbnails/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('event-assets').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('event-assets').getPublicUrl(path)
      set('thumbnail_url', publicUrl)
    } catch { setSaveMsg('이미지 업로드 실패'); setTimeout(() => setSaveMsg(null), 2000) }
    finally { setThumbUploading(false) }
  }

  const handleSave = async () => {
    if (!form.title.trim()) { setSaveMsg('title required'); setTimeout(() => setSaveMsg(null), 2000); return }
    setSaving(true); setSaveMsg(null)
    const payload = {
      title: form.title, content: form.content, status: form.status,
      label: STATUS_CFG[form.status]?.label || '진행중',
      cta_text: form.cta_text, cta_url: form.cta_url, thumbnail_url: form.thumbnail_url || '',
      updated_at: new Date().toISOString(), created_by: user.id,
    }
    let error
    if (editing) {
      ({ error } = await supabase.from('events').update(payload).eq('id', editing))
    } else {
      ({ error } = await supabase.from('events').insert(payload))
    }
    setSaving(false)
    if (error) { setSaveMsg('Error: ' + error.message) }
    else { setSaveMsg('Saved!'); await loadEvents(); setTimeout(() => { setSaveMsg(null); setView('list') }, 1000) }
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    await supabase.from('events').delete().eq('id', id)
    await loadEvents()
    setDeleting(null)
  }

  const formatDate = s => new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#020617]"><Loader size={24} className="animate-spin text-slate-400" /></div>

  if (!user) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#020617] text-slate-100">
      <ShieldCheck size={48} className="text-slate-600" />
      <p className="text-lg font-bold text-slate-400">Login required</p>
      <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
        className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-500">Sign in with Google</button>
    </div>
  )

  if (!isAdmin) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#020617] text-slate-100">
      <ShieldCheck size={48} className="text-red-500/60" />
      <p className="text-lg font-bold text-slate-400">No admin access</p>
      <p className="text-sm text-slate-600">{user.email}</p>
      <button onClick={() => supabase.auth.signOut()}
        className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-slate-400 hover:text-white">
        <LogOut size={15} /> Sign out
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] px-4 py-16 text-slate-100">
      <div className="mx-auto max-w-3xl">

        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tab === 'events' && view === 'form' && (
              <button onClick={() => setView('list')} className="mr-1 flex items-center gap-1 text-sm text-slate-400 hover:text-white">
                <ChevronLeft size={16} /> Back
              </button>
            )}
            <ShieldCheck size={22} className="text-blue-400" />
            <h1 className="text-xl font-black tracking-tight">Chronit Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white">🏠 홈</a>
            <a href="/generate" className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white">🎬 영상 만들기</a>
            <button onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400 hover:text-white">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>

        <div className="mb-6 flex gap-2">
          {[
            { key: 'events', icon: <Megaphone size={15} />, label: 'Events' },
            { key: 'missions', icon: <Gift size={15} />, label: '이벤트(크레딧)' },
            { key: 'tips', icon: <Megaphone size={15} />, label: '꿀팁' },
            { key: 'videos', icon: <Film size={15} />, label: 'Demo Videos' },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setView('list') }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${tab === t.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'border border-white/10 text-slate-400 hover:text-white'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {tab === 'videos' && <DemoVideosPanel />}
        {tab === 'missions' && <MissionsPanel />}
        {tab === 'tips' && <TipsPanel />}

        {tab === 'events' && view === 'list' && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone size={18} className="text-violet-400" />
                <h2 className="text-base font-bold">Events</h2>
                <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-slate-400">{events.length}</span>
              </div>
              <button onClick={openNew}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500 active:scale-95">
                <Plus size={15} /> New Event
              </button>
            </div>
            {events.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Megaphone size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No events yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map(ev => (
                  <div key={ev.id} className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.04]">
                    <StatusBadge status={ev.status} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-200">{ev.title}</p>
                      <p className="text-xs text-slate-500">{formatDate(ev.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(ev)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-blue-400">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(ev.id)} disabled={deleting === ev.id}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-red-400 disabled:opacity-40">
                        {deleting === ev.id ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'events' && view === 'form' && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8">
            <h2 className="mb-6 text-base font-bold">{editing ? 'Edit Event' : 'New Event'}</h2>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-slate-400">Title</label>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="Event title"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50" />
            </div>
            <div className="mb-5">
              <label className="mb-2 block text-sm font-bold text-slate-400">Status</label>
              <div className="flex gap-3">
                {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => set('status', key)}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${form.status === key ? cfg.cls + ' border-current' : 'border-white/10 text-slate-500 hover:text-slate-300'}`}>
                    {key === 'active' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />}
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-5 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-400">CTA Text</label>
                <input value={form.cta_text} onChange={e => set('cta_text', e.target.value)} placeholder="Join Now"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-400">CTA URL</label>
                <input value={form.cta_url} onChange={e => set('cta_url', e.target.value)} placeholder="https://..."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50" />
              </div>
            </div>
            <div className="mb-5">
              <label className="mb-2 block text-sm font-bold text-slate-400">대표 이미지 (썸네일)</label>
              <div className="flex items-center gap-4">
                {form.thumbnail_url ? (
                  <img src={form.thumbnail_url} alt="" className="h-20 w-32 rounded-lg border border-white/10 object-cover" />
                ) : (
                  <div className="flex h-20 w-32 items-center justify-center rounded-lg border border-dashed border-white/15 text-xs text-slate-500">없음</div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-slate-300 hover:text-white">
                    {thumbUploading ? '업로드 중...' : '이미지 업로드'}
                    <input type="file" accept="image/*" className="sr-only" onChange={e => { uploadThumbnail(e.target.files?.[0]); e.target.value = '' }} />
                  </label>
                  {form.thumbnail_url && (
                    <button type="button" onClick={() => set('thumbnail_url', '')} className="text-left text-xs text-slate-500 hover:text-red-400">이미지 제거</button>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">목록 카드에 표시됩니다. 가로형(예: 1200×630) 이미지를 권장해요.</p>
            </div>
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-bold text-slate-400">Content</label>
                <button onClick={() => setPreview(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 transition-colors hover:text-slate-300">
                  {preview ? <EyeOff size={13} /> : <Eye size={13} />}
                  {preview ? 'Edit' : 'Preview'}
                </button>
              </div>
              {preview ? (
                <div className="min-h-[360px] rounded-xl border border-white/10 bg-[#0f172a] p-6 text-slate-200"
                  style={{ fontSize: '15px', lineHeight: '1.8' }}
                  dangerouslySetInnerHTML={{ __html: form.content || '<p style="color:#475569">No content</p>' }} />
              ) : (
                <RichEditor value={form.content} onChange={v => set('content', v)} />
              )}
            </div>
            <div className="flex items-center gap-4">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-50">
                {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                {editing ? 'Update' : 'Save'}
              </button>
              <button onClick={() => setView('list')}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-400 transition-colors hover:text-white">
                Cancel
              </button>
              {saveMsg && (
                <span className={`text-sm font-bold ${saveMsg.includes('Error') || saveMsg.includes('required') ? 'text-red-400' : 'text-green-400'}`}>
                  {saveMsg}
                </span>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default Admin

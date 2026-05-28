import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  Megaphone, Save, LogOut, ShieldCheck, Loader, Eye, EyeOff,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter,
  AlignRight, List, ListOrdered, Link, Image, Minus, Plus, Pencil, Trash2, ChevronLeft
} from 'lucide-react'

/* ── 툴바 ── */
const ToolBtn = ({ onClick, title, children }) => (
  <button type="button" title={title}
    onMouseDown={e => { e.preventDefault(); onClick() }}
    className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
    {children}
  </button>
)
const Divider = () => <div className="mx-1 h-5 w-px bg-white/10" />

/* ── 리치 에디터 ── */
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
  const insertLink = () => { const u = prompt('링크 URL:', 'https://'); if (u) exec('createLink', u) }

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
          <option value="1">작게</option><option value="3">보통</option>
          <option value="5">크게</option><option value="7">매우 크게</option>
        </select>
        <Divider />
        <ToolBtn onClick={() => exec('bold')} title="굵게"><Bold size={14} /></ToolBtn>
        <ToolBtn onClick={() => exec('italic')} title="기울기"><Italic size={14} /></ToolBtn>
        <ToolBtn onClick={() => exec('underline')} title="밑줄"><Underline size={14} /></ToolBtn>
        <ToolBtn onClick={() => exec('strikeThrough')} title="취소선"><Strikethrough size={14} /></ToolBtn>
        <Divider />
        <label title="글자색" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-sm font-bold text-slate-400 hover:bg-white/10">
          가<input type="color" className="sr-only" onChange={e => exec('foreColor', e.target.value)} />
        </label>
        <label title="배경색" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-sm font-bold text-slate-400 hover:bg-white/10">
          A<input type="color" className="sr-only" onChange={e => exec('hiliteColor', e.target.value)} />
        </label>
        <Divider />
        <ToolBtn onClick={() => exec('justifyLeft')} title="왼쪽"><AlignLeft size={14} /></ToolBtn>
        <ToolBtn onClick={() => exec('justifyCenter')} title="가운데"><AlignCenter size={14} /></ToolBtn>
        <ToolBtn onClick={() => exec('justifyRight')} title="오른쪽"><AlignRight size={14} /></ToolBtn>
        <Divider />
        <ToolBtn onClick={() => exec('insertUnorderedList')} title="목록"><List size={14} /></ToolBtn>
        <ToolBtn onClick={() => exec('insertOrderedList')} title="번호 목록"><ListOrdered size={14} /></ToolBtn>
        <Divider />
        <ToolBtn onClick={insertLink} title="링크"><Link size={14} /></ToolBtn>
        <label title="이미지 업로드" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-white/10">
          <Image size={14} />
          <input type="file" accept="image/*" className="sr-only" onChange={e => { insertImageFromFile(e.target.files?.[0]); e.target.value='' }} />
        </label>
        <ToolBtn onClick={() => exec('insertHorizontalRule')} title="구분선"><Minus size={14} /></ToolBtn>
        <Divider />
        <ToolBtn onClick={() => exec('removeFormat')} title="서식 제거"><span className="text-xs font-bold">T×</span></ToolBtn>
      </div>
      <div className="relative">
        {uploading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-b-xl">
            <Loader size={18} className="animate-spin text-blue-400" />
            <span className="ml-2 text-sm text-slate-300">업로드 중...</span>
          </div>
        )}
        {dragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-500/10 border-2 border-dashed border-blue-500/50 rounded-b-xl">
            <p className="text-sm font-bold text-blue-400">이미지를 여기에 놓으세요</p>
          </div>
        )}
        <div ref={editorRef} contentEditable suppressContentEditableWarning
          onInput={() => onChange(editorRef.current?.innerHTML || '')}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className="min-h-[360px] bg-[#0f172a] p-5 text-slate-200 outline-none"
          style={{ fontSize: '15px', lineHeight: '1.8' }}
          data-placeholder="이벤트 내용을 입력하세요 (이미지는 드래그 앤 드롭)"
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

/* ── 상태 설정 ── */
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

const emptyForm = () => ({ title: '', content: '', status: 'active', cta_text: '', cta_url: '' })

/* ── 메인 ── */
const Admin = () => {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState([])
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
  const openEdit = ev => { setForm({ title: ev.title, content: ev.content, status: ev.status, cta_text: ev.cta_text || '', cta_url: ev.cta_url || '' }); setEditing(ev.id); setPreview(false); setView('form') }

  const handleSave = async () => {
    if (!form.title.trim()) { setSaveMsg('제목을 입력하세요'); setTimeout(() => setSaveMsg(null), 2000); return }
    setSaving(true); setSaveMsg(null)
    const payload = {
      title: form.title,
      content: form.content,
      status: form.status,
      label: STATUS_CFG[form.status]?.label || '진행중',  // 상태에서 자동 설정
      cta_text: form.cta_text,
      cta_url: form.cta_url,
      updated_at: new Date().toISOString(),
      created_by: user.id,
    }
    let error
    if (editing) {
      ({ error } = await supabase.from('events').update(payload).eq('id', editing))
    } else {
      ({ error } = await supabase.from('events').insert(payload))
    }
    setSaving(false)
    if (error) { setSaveMsg('저장 실패: ' + error.message) }
    else { setSaveMsg('저장 완료!'); await loadEvents(); setTimeout(() => { setSaveMsg(null); setView('list') }, 1000) }
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
      <p className="text-lg font-bold text-slate-400">로그인이 필요합니다</p>
      <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
        className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-500">Google로 로그인</button>
    </div>
  )

  if (!isAdmin) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#020617] text-slate-100">
      <ShieldCheck size={48} className="text-red-500/60" />
      <p className="text-lg font-bold text-slate-400">관리자 권한이 없습니다</p>
      <p className="text-sm text-slate-600">{user.email}</p>
      <button onClick={() => supabase.auth.signOut()}
        className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-slate-400 hover:text-white">
        <LogOut size={15} /> 로그아웃</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] px-4 py-16 text-slate-100">
      <div className="mx-auto max-w-3xl">

        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view === 'form' && (
              <button onClick={() => setView('list')} className="mr-1 flex items-center gap-1 text-sm text-slate-400 hover:text-white">
                <ChevronLeft size={16} /> 목록
              </button>
            )}
            <ShieldCheck size={22} className="text-blue-400" />
            <h1 className="text-xl font-black tracking-tight">Chronit 관리자</h1>
          </div>
          <button onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400 hover:text-white">
            <LogOut size={14} /> 로그아웃</button>
        </div>

        {/* 목록 */}
        {view === 'list' && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone size={18} className="text-violet-400" />
                <h2 className="text-base font-bold">이벤트 관리</h2>
                <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-slate-400">{events.length}개</span>
              </div>
              <button onClick={openNew}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500 active:scale-95">
                <Plus size={15} /> 새 이벤트
              </button>
            </div>

            {events.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Megaphone size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">등록된 이벤트가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map(ev => (
                  <div key={ev.id} className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04] transition-colors">
                    <StatusBadge status={ev.status} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-200">{ev.title}</p>
                      <p className="text-xs text-slate-500">{formatDate(ev.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(ev)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-blue-400 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(ev.id)} disabled={deleting === ev.id}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-red-400 transition-colors disabled:opacity-40">
                        {deleting === ev.id ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 폼 */}
        {view === 'form' && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8">
            <h2 className="mb-6 text-base font-bold">{editing ? '이벤트 수정' : '새 이벤트 작성'}</h2>

            {/* 제목 */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-slate-400">제목</label>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="이벤트 제목을 입력하세요"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50" />
            </div>

            {/* 상태 */}
            <div className="mb-5">
              <label className="mb-2 block text-sm font-bold text-slate-400">상태</label>
              <div className="flex gap-3">
                {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => set('status', key)}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${
                      form.status === key ? cfg.cls + ' border-current' : 'border-white/10 text-slate-500 hover:text-slate-300'
                    }`}>
                    {key === 'active' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />}
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA 버튼 (선택) */}
            <div className="mb-5 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-400">버튼 텍스트 <span className="font-normal text-slate-600">(선택)</span></label>
                <input value={form.cta_text} onChange={e => set('cta_text', e.target.value)}
                  placeholder="지금 참여"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-400">버튼 링크 <span className="font-normal text-slate-600">(선택)</span></label>
                <input value={form.cta_url} onChange={e => set('cta_url', e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50" />
              </div>
            </div>

            {/* 본문 */}
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-bold text-slate-400">본문</label>
                <button onClick={() => setPreview(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors">
                  {preview ? <EyeOff size={13} /> : <Eye size={13} />}
                  {preview ? '편집으로 돌아가기' : '미리보기'}
                </button>
              </div>
              {preview ? (
                <div className="min-h-[360px] rounded-xl border border-white/10 bg-[#0f172a] p-6 text-slate-200"
                  style={{ fontSize: '15px', lineHeight: '1.8' }}
                  dangerouslySetInnerHTML={{ __html: form.content || '<p style="color:#475569">본문 없음</p>' }} />
              ) : (
                <RichEditor value={form.content} onChange={v => set('content', v)} />
              )}
            </div>

            {/* 저장 */}
            <div className="flex items-center gap-4">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-500 active:scale-95 disabled:opacity-50 transition-all">
                {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                {editing ? '수정 저장' : '등록'}
              </button>
              <button onClick={() => setView('list')}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-400 hover:text-white transition-colors">
                취소
              </button>
              {saveMsg && (
                <span className={`text-sm font-bold ${saveMsg.includes('실패') || saveMsg.includes('입력') ? 'text-red-400' : 'text-green-400'}`}>
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

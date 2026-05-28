import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Megaphone, Save, LogOut, ShieldCheck, Loader, Eye, EyeOff,
         Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter,
         AlignRight, List, ListOrdered, Link, Image, Minus } from 'lucide-react'

const ToolBtn = ({ onClick, title, children }) => (
  <button
    type="button"
    title={title}
    onMouseDown={e => { e.preventDefault(); onClick() }}
    className="flex h-8 w-8 items-center justify-center rounded text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
  >{children}</button>
)

const Divider = () => <div className="mx-1 h-5 w-px bg-white/10" />

const RichEditor = ({ value, onChange }) => {
  const editorRef = useRef(null)
  const isInit = useRef(false)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!isInit.current && editorRef.current && value) {
      editorRef.current.innerHTML = value
      isInit.current = true
    }
  }, [value])

  const exec = (cmd, val = null) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
  }

  const insertLink = () => {
    const url = prompt('링크 URL:', 'https://')
    if (url) exec('createLink', url)
  }

  const insertImageFromFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `event-images/${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('event-assets')
        .upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage
        .from('event-assets')
        .getPublicUrl(path)
      editorRef.current?.focus()
      document.execCommand('insertImage', false, publicUrl)
    } catch {
      // Storage 실패 시 base64 fallback
      const reader = new FileReader()
      reader.onload = e => {
        editorRef.current?.focus()
        document.execCommand('insertImage', false, e.target.result)
      }
      reader.readAsDataURL(file)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = async e => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    for (const file of files) await insertImageFromFile(file)
  }

  const handleFileInput = async e => {
    const file = e.target.files?.[0]
    if (file) await insertImageFromFile(file)
    e.target.value = ''
  }

  const handleInput = () => onChange(editorRef.current?.innerHTML || '')

  return (
    <div className={`overflow-hidden rounded-xl border transition-colors ${dragging ? 'border-blue-500/60' : 'border-white/12'}`}>
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-white/10 bg-slate-800/80 px-3 py-2">
        <select
          onChange={e => exec('fontSize', e.target.value)}
          defaultValue="3"
          className="h-8 rounded border border-white/10 bg-slate-700 px-2 text-xs text-slate-300 outline-none"
        >
          <option value="1">작게</option>
          <option value="3">보통</option>
          <option value="5">크게</option>
          <option value="7">매우 크게</option>
        </select>
        <Divider />
        <ToolBtn onClick={() => exec('bold')} title="굵게"><Bold size={14} /></ToolBtn>
        <ToolBtn onClick={() => exec('italic')} title="기울기"><Italic size={14} /></ToolBtn>
        <ToolBtn onClick={() => exec('underline')} title="밑줄"><Underline size={14} /></ToolBtn>
        <ToolBtn onClick={() => exec('strikeThrough')} title="취소선"><Strikethrough size={14} /></ToolBtn>
        <Divider />
        <label title="글자색" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white text-sm font-bold">
          가<input type="color" className="sr-only" onChange={e => exec('foreColor', e.target.value)} />
        </label>
        <label title="배경색" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white text-sm font-bold">
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
        <label title="이미지 업로드" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white">
          <Image size={14} />
          <input type="file" accept="image/*" className="sr-only" onChange={handleFileInput} />
        </label>
        <ToolBtn onClick={() => exec('insertHorizontalRule')} title="구분선"><Minus size={14} /></ToolBtn>
        <Divider />
        <ToolBtn onClick={() => exec('removeFormat')} title="서식 제거">
          <span className="text-xs font-bold">T×</span>
        </ToolBtn>
      </div>

      {/* 편집 영역 */}
      <div className="relative">
        {uploading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-b-xl">
            <Loader size={20} className="animate-spin text-blue-400" />
            <span className="ml-2 text-sm text-slate-300">이미지 업로드 중...</span>
          </div>
        )}
        {dragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-500/10 border-2 border-dashed border-blue-500/50 rounded-b-xl">
            <p className="text-sm font-bold text-blue-400">이미지를 여기에 놓으세요</p>
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className="min-h-[400px] bg-[#0f172a] p-5 text-slate-200 outline-none"
          style={{ fontSize: '15px', lineHeight: '1.8' }}
          data-placeholder="이벤트 내용을 입력하세요 (이미지는 드래그 앤 드롭으로 첨부)"
        />
      </div>

      <style>{`
        [data-placeholder]:empty::before { content: attr(data-placeholder); color: #475569; pointer-events: none; }
        [contenteditable] img { max-width: 100%; border-radius: 8px; display: block; margin: 4px 0; }
        [contenteditable] a { color: #60a5fa; text-decoration: underline; }
        [contenteditable] ul { list-style: disc; padding-left: 1.5em; }
        [contenteditable] ol { list-style: decimal; padding-left: 1.5em; }
        [contenteditable] hr { border-color: rgba(255,255,255,0.1); margin: 1em 0; }
      `}</style>
    </div>
  )
}

const Admin = () => {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState({ id: null, active: false, label: '', text: '', cta_text: '', cta_url: '' })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      setUser(session.user)
      const { data: sub } = await supabase.from('subscriptions').select('role').eq('user_id', session.user.id).single()
      if (sub?.role === 'super_admin') {
        setIsAdmin(true)
        const { data } = await supabase.from('site_events').select('*').limit(1).single()
        if (data) setEvent({ ...data, cta_url: data.cta_url || '' })
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleSave = async () => {
    setSaving(true); setSaveMsg(null)
    const { error } = await supabase.from('site_events').update({
      active: event.active, label: event.label,
      text: event.text, cta_text: event.cta_text,
      cta_url: event.cta_url,
      updated_at: new Date().toISOString(), updated_by: user.id,
    }).eq('id', event.id)
    setSaving(false)
    setSaveMsg(error ? '저장 실패: ' + error.message : '저장 완료!')
    setTimeout(() => setSaveMsg(null), 3000)
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617]">
      <Loader size={24} className="animate-spin text-slate-400" />
    </div>
  )
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
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck size={22} className="text-blue-400" />
            <h1 className="text-xl font-black tracking-tight">Chronit 관리자</h1>
          </div>
          <button onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400 hover:text-white">
            <LogOut size={14} /> 로그아웃</button>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8">
          <div className="mb-6 flex items-center gap-2">
            <Megaphone size={18} className="text-violet-400" />
            <h2 className="text-base font-bold">홈페이지 이벤트 공지</h2>
          </div>

          {/* 활성화 토글 */}
          <div className="mb-6 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-5 py-4">
            <div>
              <p className="font-bold text-slate-200">이벤트 활성화</p>
              <p className="mt-0.5 text-sm text-slate-500">켜면 홈페이지에 이벤트 배너가 표시됩니다</p>
            </div>
            <button onClick={() => setEvent(e => ({ ...e, active: !e.active }))}
              className={`relative h-7 w-12 rounded-full transition-colors ${event.active ? 'bg-blue-600' : 'bg-white/10'}`}>
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${event.active ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {/* 배지 라벨 + CTA 텍스트 */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-400">배지 라벨</label>
              <input value={event.label} onChange={e => setEvent(ev => ({ ...ev, label: e.target.value }))}
                placeholder="이벤트 진행중"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-400">버튼 텍스트</label>
              <input value={event.cta_text} onChange={e => setEvent(ev => ({ ...ev, cta_text: e.target.value }))}
                placeholder="지금 참여"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50" />
            </div>
          </div>

          {/* 버튼 링크 URL */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-bold text-slate-400">버튼 링크 URL <span className="font-normal text-slate-600">(비워두면 모달만 열림)</span></label>
            <input value={event.cta_url} onChange={e => setEvent(ev => ({ ...ev, cta_url: e.target.value }))}
              placeholder="https://example.com/event"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50" />
          </div>

          {/* 에디터 */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-bold text-slate-400">이벤트 본문</label>
              <button onClick={() => setPreview(v => !v)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors">
                {preview ? <EyeOff size={13} /> : <Eye size={13} />}
                {preview ? '편집으로 돌아가기' : '미리보기'}
              </button>
            </div>
            {preview ? (
              <div className="min-h-[400px] rounded-xl border border-white/10 bg-[#0f172a] p-6 text-slate-200"
                style={{ fontSize: '15px', lineHeight: '1.8' }}
                dangerouslySetInnerHTML={{ __html: event.text || '<p style="color:#475569">본문 없음</p>' }} />
            ) : (
              <RichEditor value={event.text} onChange={text => setEvent(ev => ({ ...ev, text }))} />
            )}
          </div>

          {/* 저장 */}
          <div className="flex items-center gap-4">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-50">
              {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              저장
            </button>
            {saveMsg && (
              <span className={`text-sm font-bold ${saveMsg.includes('실패') ? 'text-red-400' : 'text-green-400'}`}>
                {saveMsg}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Admin

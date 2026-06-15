import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter,
  AlignRight, List, ListOrdered, Link, Image, Minus, Loader,
} from 'lucide-react'

const ToolBtn = ({ onClick, title, cls, children }) => (
  <button type="button" title={title}
    onMouseDown={e => { e.preventDefault(); onClick() }}
    className={cls}>
    {children}
  </button>
)

// 이벤트(/admin)·게시판 글쓰기 공용 WYSIWYG 에디터. HTML 문자열을 onChange로 돌려줌.
const RichEditor = ({ value, onChange, light = false, bucket = 'event-assets', pathPrefix = 'event-images', minHeight = 360 }) => {
  const editorRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const t = light ? {
    wrap: 'border-gray-200',
    bar: 'border-b border-gray-200 bg-gray-50',
    select: 'h-8 rounded border border-gray-200 bg-white px-2 text-xs text-gray-700 outline-none',
    btn: 'flex h-8 w-8 items-center justify-center rounded text-slate-500 hover:bg-gray-100 hover:text-gray-900 transition-colors',
    divider: 'mx-1 h-5 w-px bg-gray-200',
    colorBtn: 'flex h-8 w-8 cursor-pointer items-center justify-center rounded text-sm font-bold text-slate-500 hover:bg-gray-100',
    imgBtn: 'flex h-8 w-8 cursor-pointer items-center justify-center rounded text-slate-500 hover:bg-gray-100',
    surface: 'bg-white text-gray-800',
    ph: '#9ca3af', link: '#03C75A',
  } : {
    wrap: 'border-white/12',
    bar: 'border-b border-white/10 bg-slate-800/80',
    select: 'h-8 rounded border border-white/10 bg-slate-700 px-2 text-xs text-slate-300 outline-none',
    btn: 'flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white transition-colors',
    divider: 'mx-1 h-5 w-px bg-white/10',
    colorBtn: 'flex h-8 w-8 cursor-pointer items-center justify-center rounded text-sm font-bold text-slate-400 hover:bg-white/10',
    imgBtn: 'flex h-8 w-8 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-white/10',
    surface: 'bg-[#0f172a] text-slate-200',
    ph: '#475569', link: '#60a5fa',
  }

  // 외부 value 동기화 — 입력 중(포커스)이 아니고 내용이 다를 때만 반영(비동기 로드/수정 대응, 커서 보존)
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (document.activeElement !== el && el.innerHTML !== (value || '')) {
      el.innerHTML = value || ''
    }
  }, [value])

  const exec = (cmd, val = null) => { editorRef.current?.focus(); document.execCommand(cmd, false, val) }
  const insertLink = () => { const u = prompt('URL:', 'https://'); if (u) exec('createLink', u) }

  const insertImageFromFile = async (file) => {
    if (!file?.type.startsWith('image/')) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
      editorRef.current?.focus()
      document.execCommand('insertImage', false, publicUrl)
      onChange(editorRef.current?.innerHTML || '')
    } catch {
      const reader = new FileReader()
      reader.onload = e => { editorRef.current?.focus(); document.execCommand('insertImage', false, e.target.result); onChange(editorRef.current?.innerHTML || '') }
      reader.readAsDataURL(file)
    } finally { setUploading(false) }
  }

  const handleDrop = async e => {
    e.preventDefault(); setDragging(false)
    for (const file of Array.from(e.dataTransfer.files)) await insertImageFromFile(file)
  }

  return (
    <div className={`overflow-hidden rounded-xl border transition-colors ${dragging ? 'border-blue-500/60' : t.wrap}`}>
      <div className={`flex flex-wrap items-center gap-0.5 px-3 py-2 ${t.bar}`}>
        <select onChange={e => exec('fontSize', e.target.value)} defaultValue="3" className={t.select}>
          <option value="1">작게</option><option value="3">보통</option>
          <option value="5">크게</option><option value="7">아주 크게</option>
        </select>
        <div className={t.divider} />
        <ToolBtn cls={t.btn} onClick={() => exec('bold')} title="굵게"><Bold size={14} /></ToolBtn>
        <ToolBtn cls={t.btn} onClick={() => exec('italic')} title="기울임"><Italic size={14} /></ToolBtn>
        <ToolBtn cls={t.btn} onClick={() => exec('underline')} title="밑줄"><Underline size={14} /></ToolBtn>
        <ToolBtn cls={t.btn} onClick={() => exec('strikeThrough')} title="취소선"><Strikethrough size={14} /></ToolBtn>
        <div className={t.divider} />
        <label className={t.colorBtn}>
          A<input type="color" className="sr-only" onChange={e => exec('foreColor', e.target.value)} />
        </label>
        <div className={t.divider} />
        <ToolBtn cls={t.btn} onClick={() => exec('justifyLeft')} title="왼쪽"><AlignLeft size={14} /></ToolBtn>
        <ToolBtn cls={t.btn} onClick={() => exec('justifyCenter')} title="가운데"><AlignCenter size={14} /></ToolBtn>
        <ToolBtn cls={t.btn} onClick={() => exec('justifyRight')} title="오른쪽"><AlignRight size={14} /></ToolBtn>
        <div className={t.divider} />
        <ToolBtn cls={t.btn} onClick={() => exec('insertUnorderedList')} title="목록"><List size={14} /></ToolBtn>
        <ToolBtn cls={t.btn} onClick={() => exec('insertOrderedList')} title="번호목록"><ListOrdered size={14} /></ToolBtn>
        <div className={t.divider} />
        <ToolBtn cls={t.btn} onClick={insertLink} title="링크"><Link size={14} /></ToolBtn>
        <label className={t.imgBtn} title="이미지">
          <Image size={14} />
          <input type="file" accept="image/*" className="sr-only" onChange={e => { insertImageFromFile(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        <ToolBtn cls={t.btn} onClick={() => exec('insertHorizontalRule')} title="구분선"><Minus size={14} /></ToolBtn>
        <div className={t.divider} />
        <ToolBtn cls={t.btn} onClick={() => exec('removeFormat')} title="서식 지우기"><span className="text-xs font-bold">Tx</span></ToolBtn>
      </div>
      <div className="relative">
        {uploading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-b-xl">
            <Loader size={18} className="animate-spin text-blue-400" />
          </div>
        )}
        {dragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-500/10 border-2 border-dashed border-blue-500/50 rounded-b-xl">
            <p className="text-sm font-bold text-blue-400">여기에 이미지를 놓으세요</p>
          </div>
        )}
        <div ref={editorRef} contentEditable suppressContentEditableWarning
          onInput={() => onChange(editorRef.current?.innerHTML || '')}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`p-5 outline-none ${t.surface}`}
          style={{ fontSize: '15px', lineHeight: '1.8', minHeight: `${minHeight}px` }}
          data-placeholder="내용을 입력하세요..."
        />
      </div>
      <style>{`
        [data-placeholder]:empty::before { content: attr(data-placeholder); color: ${t.ph}; pointer-events: none; }
        [contenteditable] img { max-width:100%; border-radius:8px; display:block; margin:4px 0; }
        [contenteditable] a { color:${t.link}; text-decoration:underline; }
        [contenteditable] ul { list-style:disc; padding-left:1.5em; }
        [contenteditable] ol { list-style:decimal; padding-left:1.5em; }
        [contenteditable] hr { border-color:rgba(0,0,0,0.1); margin:1em 0; }
      `}</style>
    </div>
  )
}

export default RichEditor

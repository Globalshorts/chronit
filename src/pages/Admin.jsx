import { useState, useEffect, useRef } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import { supabase } from '../lib/supabase'
import { Megaphone, Save, LogOut, ShieldCheck, Loader, Eye, EyeOff } from 'lucide-react'

const TOOLBAR_OPTIONS = [
  [{ font: [] }, { size: ['small', false, 'large', 'huge'] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ align: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote', 'code-block'],
  ['link', 'image'],
  ['clean'],
]

const Admin = () => {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState({ id: null, active: false, label: '', text: '', cta_text: '' })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [preview, setPreview] = useState(false)

  const containerRef = useRef(null)
  const quillRef = useRef(null)

  // Quill 마운트
  useEffect(() => {
    if (!containerRef.current || quillRef.current) return

    const quill = new Quill(containerRef.current, {
      theme: 'snow',
      modules: { toolbar: TOOLBAR_OPTIONS },
      placeholder: '이벤트 내용을 입력하세요 (폰트, 굵기, 색상, 이미지 모두 지원)',
    })

    quill.on('text-change', () => {
      setEvent(ev => ({ ...ev, text: quill.root.innerHTML }))
    })

    quillRef.current = quill
  }, [])

  // DB 데이터 로드 후 Quill에 내용 삽입
  useEffect(() => {
    if (quillRef.current && event.text && event.id) {
      if (quillRef.current.root.innerHTML !== event.text) {
        quillRef.current.root.innerHTML = event.text
      }
    }
  }, [event.id])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      setUser(session.user)

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('role')
        .eq('user_id', session.user.id)
        .single()

      if (sub?.role === 'super_admin') {
        setIsAdmin(true)
        const { data } = await supabase
          .from('site_events')
          .select('*')
          .limit(1)
          .single()
        if (data) setEvent(data)
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    const { error } = await supabase
      .from('site_events')
      .update({
        active: event.active,
        label: event.label,
        text: event.text,
        cta_text: event.cta_text,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', event.id)

    setSaving(false)
    setSaveMsg(error ? '저장 실패: ' + error.message : '저장 완료!')
    setTimeout(() => setSaveMsg(null), 3000)
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-400">
      <Loader size={24} className="animate-spin" />
    </div>
  )

  if (!user) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#020617] text-slate-100">
      <ShieldCheck size={48} className="text-slate-600" />
      <p className="text-lg font-bold text-slate-400">로그인이 필요합니다</p>
      <button
        onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
        className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-500"
      >
        Google로 로그인
      </button>
    </div>
  )

  if (!isAdmin) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#020617] text-slate-100">
      <ShieldCheck size={48} className="text-red-500/60" />
      <p className="text-lg font-bold text-slate-400">관리자 권한이 없습니다</p>
      <p className="text-sm text-slate-600">{user.email}</p>
      <button
        onClick={() => supabase.auth.signOut()}
        className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-slate-400 hover:text-white"
      >
        <LogOut size={15} /> 로그아웃
      </button>
    </div>
  )

  return (
    <>
      <style>{`
        /* Quill 다크모드 */
        .ql-toolbar.ql-snow {
          background: #1e293b;
          border: 1px solid rgba(255,255,255,0.12);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px 12px 0 0;
          padding: 10px 12px;
        }
        .ql-container.ql-snow {
          background: #0f172a;
          border: 1px solid rgba(255,255,255,0.12);
          border-top: none;
          border-radius: 0 0 12px 12px;
          min-height: 400px;
          font-size: 15px;
        }
        .ql-editor {
          color: #e2e8f0;
          min-height: 400px;
          line-height: 1.8;
          padding: 16px 20px;
        }
        .ql-editor.ql-blank::before {
          color: #475569;
          font-style: normal;
          left: 20px;
        }
        /* 툴바 아이콘 */
        .ql-snow .ql-stroke { stroke: #94a3b8; }
        .ql-snow .ql-fill { fill: #94a3b8; }
        .ql-snow .ql-picker-label { color: #94a3b8; border-color: rgba(255,255,255,0.1); background: transparent; }
        .ql-snow .ql-picker-label:hover { color: #e2e8f0; }
        .ql-snow .ql-picker-options {
          background: #1e293b;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .ql-snow .ql-picker-item { color: #cbd5e1; }
        .ql-snow .ql-picker-item:hover { color: #fff; background: rgba(255,255,255,0.06); }
        .ql-toolbar.ql-snow button:hover,
        .ql-toolbar.ql-snow button.ql-active {
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
        }
        .ql-toolbar.ql-snow button:hover .ql-stroke,
        .ql-toolbar.ql-snow button.ql-active .ql-stroke { stroke: #60a5fa; }
        .ql-toolbar.ql-snow button:hover .ql-fill,
        .ql-toolbar.ql-snow button.ql-active .ql-fill { fill: #60a5fa; }
        /* 컬러 피커 */
        .ql-color-picker .ql-picker-options { width: 164px; padding: 8px; }
        /* 미리보기 */
        .event-preview img { max-width: 100%; border-radius: 8px; }
        .event-preview p { margin: 0.5em 0; }
        .event-preview h1,.event-preview h2,.event-preview h3 { font-weight: 800; margin: 0.8em 0 0.4em; }
        .event-preview ul,.event-preview ol { padding-left: 1.5em; margin: 0.5em 0; }
        .event-preview blockquote { border-left: 3px solid #3b82f6; padding-left: 1em; color: #94a3b8; margin: 0.5em 0; }
        .event-preview a { color: #60a5fa; text-decoration: underline; }
      `}</style>

      <div className="min-h-screen bg-[#020617] px-4 py-16 text-slate-100">
        <div className="mx-auto max-w-3xl">

          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck size={22} className="text-blue-400" />
              <h1 className="text-xl font-black tracking-tight">Chronit 관리자</h1>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400 transition-colors hover:text-white"
            >
              <LogOut size={14} /> 로그아웃
            </button>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8">
            <div className="mb-6 flex items-center gap-2">
              <Megaphone size={18} className="text-violet-400" />
              <h2 className="text-base font-bold">홈페이지 이벤트 공지</h2>
            </div>

            {/* ON/OFF 토글 */}
            <div className="mb-6 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-5 py-4">
              <div>
                <p className="font-bold text-slate-200">이벤트 활성화</p>
                <p className="mt-0.5 text-sm text-slate-500">켜면 홈페이지에 이벤트 배너가 표시됩니다</p>
              </div>
              <button
                onClick={() => setEvent(e => ({ ...e, active: !e.active }))}
                className={`relative h-7 w-12 rounded-full transition-colors ${event.active ? 'bg-blue-600' : 'bg-white/10'}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${event.active ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            {/* 배지 라벨 + CTA */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-400">배지 라벨</label>
                <input
                  type="text"
                  value={event.label}
                  onChange={e => setEvent(ev => ({ ...ev, label: e.target.value }))}
                  placeholder="이벤트 진행중"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-400">버튼 텍스트</label>
                <input
                  type="text"
                  value={event.cta_text}
                  onChange={e => setEvent(ev => ({ ...ev, cta_text: e.target.value }))}
                  placeholder="지금 참여"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50"
                />
              </div>
            </div>

            {/* 에디터 */}
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-bold text-slate-400">이벤트 본문</label>
                <button
                  onClick={() => setPreview(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {preview ? <EyeOff size={13} /> : <Eye size={13} />}
                  {preview ? '편집으로 돌아가기' : '미리보기'}
                </button>
              </div>

              {/* Quill 에디터는 항상 DOM에 존재, preview일 때만 숨김 */}
              <div style={{ display: preview ? 'none' : 'block' }}>
                <div ref={containerRef} />
              </div>

              {preview && (
                <div
                  className="event-preview min-h-[400px] rounded-xl border border-white/10 bg-white/[0.03] p-6 text-slate-200"
                  dangerouslySetInnerHTML={{ __html: event.text || '<p style="color:#475569">본문 없음</p>' }}
                />
              )}
            </div>

            {/* 저장 버튼 */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-50"
              >
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
    </>
  )
}

export default Admin

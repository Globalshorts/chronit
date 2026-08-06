import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import CommunityHeader from '../components/CommunityHeader'
import RichEditor from '../components/RichEditor'
import { supabase } from '../lib/supabase'

// 공지처럼 /admin 밖(커뮤니티 페이지)에서 이벤트를 쓰고 수정하는 페이지. super_admin 전용.
const STATUS = [
  { key: 'active', label: '진행중' },
  { key: 'ended', label: '종료됨' },
  { key: 'winner', label: '당첨자 발표' },
]

const EventWrite = () => {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get('edit')
  const [role, setRole] = useState(undefined) // undefined=확인중
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('active')
  const [ctaText, setCtaText] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [thumb, setThumb] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user
      if (!u) { setRole(null); return }
      const { data: sub } = await supabase.from('subscriptions').select('role').eq('user_id', u.id).maybeSingle()
      setRole(sub?.role || 'user')
    })
  }, [])

  useEffect(() => {
    if (!editId) return
    supabase.from('events').select('*').eq('id', editId).maybeSingle().then(({ data }) => {
      if (!data) return
      setTitle(data.title || ''); setContent(data.content || ''); setStatus(data.status || 'active')
      setCtaText(data.cta_text || ''); setCtaUrl(data.cta_url || ''); setThumb(data.thumbnail_url || '')
    })
  }, [editId])

  const onPickImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setErr('이미지 파일만 첨부할 수 있어요.'); return }
    if (file.size > 5 * 1024 * 1024) { setErr('5MB 이하 이미지만 가능해요.'); return }
    setErr(''); setUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const path = `thumbnails/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabase.storage.from('event-assets').upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('event-assets').getPublicUrl(path)
      setThumb(data.publicUrl)
    } catch { setErr('업로드 실패. 잠시 후 다시 시도해주세요.') }
    finally { setUploading(false); e.target.value = '' }
  }

  const submit = async () => {
    if (!title.trim()) { setErr('제목을 입력해주세요.'); return }
    setErr(''); setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const payload = {
      title, content, status,
      label: STATUS.find(s => s.key === status)?.label || '진행중',
      cta_text: ctaText, cta_url: ctaUrl, thumbnail_url: thumb || '',
      updated_at: new Date().toISOString(),
    }
    let error
    if (editId) ({ error } = await supabase.from('events').update(payload).eq('id', editId))
    else ({ error } = await supabase.from('events').insert({ ...payload, created_by: session?.user?.id }))
    setSaving(false)
    if (error) { setErr('저장할 수 없어요: ' + (error.message || '권한을 확인해주세요')); return }
    nav('/events')
  }

  const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#0064FF]/50'

  if (role === undefined) return <div className="min-h-screen bg-[#FAFAF8]" />
  if (role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-[#FAFAF8] font-sans text-gray-900">
        <CommunityHeader active="events" />
        <div className="mx-auto max-w-2xl px-5 pt-40 text-center">
          <p className="text-base font-bold text-gray-700">이 페이지는 관리자만 사용할 수 있어요.</p>
          <button onClick={() => nav('/events')} className="mt-4 rounded-xl bg-[#0064FF] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0052D6]">이벤트 목록으로</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] font-sans break-keep text-gray-900">
      <CommunityHeader active="events" />
      <section className="mx-auto max-w-2xl px-5 pt-28 pb-24 md:pt-36">
        <button onClick={() => nav('/events')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-[#0064FF]">
          <ArrowLeft size={16} /> 목록으로
        </button>
        <h1 className="mb-6 text-2xl font-bold tracking-tight">{editId ? '이벤트 수정' : '이벤트 글쓰기'}</h1>

        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-600">제목</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="이벤트 제목" className={inputCls} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-600">상태</label>
            <div className="flex gap-2">
              {STATUS.map(s => (
                <button key={s.key} type="button" onClick={() => setStatus(s.key)}
                  className={`rounded-xl border px-4 py-2 text-sm font-bold transition-all ${status === s.key ? 'border-[#0064FF] bg-[#0064FF]/10 text-[#0064FF]' : 'border-gray-200 text-slate-500 hover:text-slate-700'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-600">버튼 문구 (선택)</label>
              <input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="추천 코드 받기" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-600">버튼 링크 (선택)</label>
              <input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="https://chronit.kr/generate" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-600">대표 이미지 (썸네일)</label>
            <div className="flex items-center gap-3">
              {thumb ? (
                <img src={thumb} alt="" className="h-20 w-32 rounded-lg border border-gray-200 object-cover" />
              ) : (
                <div className="flex h-20 w-32 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-slate-400">없음</div>
              )}
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-[#0064FF]/40 hover:text-[#0064FF]">
                  {uploading ? '업로드 중…' : '이미지 업로드'}
                  <input type="file" accept="image/*" className="hidden" onChange={onPickImage} disabled={uploading} />
                </label>
                {thumb && <button type="button" onClick={() => setThumb('')} className="text-left text-xs text-slate-400 hover:text-red-500">이미지 제거</button>}
              </div>
            </div>
            <p className="mt-1.5 text-xs text-slate-400">목록 카드에 표시돼요. 가로형(예: 1200×630) 권장.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-600">내용</label>
            <RichEditor value={content} onChange={setContent} />
          </div>

          {err && <p className="text-sm font-medium text-red-500">{err}</p>}

          <button onClick={submit} disabled={saving}
            className="w-full rounded-xl bg-[#0064FF] py-3.5 text-base font-bold text-white transition-all hover:bg-[#0052D6] active:scale-95 disabled:opacity-50">
            {saving ? (editId ? '수정 중…' : '등록 중…') : (editId ? '수정 완료' : '등록하기')}
          </button>
        </div>
      </section>
    </div>
  )
}

export default EventWrite

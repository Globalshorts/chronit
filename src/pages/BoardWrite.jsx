import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus, X } from 'lucide-react'
import CommunityHeader from '../components/CommunityHeader'
import NicknameModal from '../components/NicknameModal'
import { supabase } from '../lib/supabase'

const WRITE_CATS = [
  { key: 'free', label: '자유' },
  { key: 'show', label: '수익인증' },
  { key: 'qna',  label: '질문' },
]

const BoardWrite = () => {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get('edit')
  const [user, setUser] = useState(undefined) // undefined=확인중
  const [cat, setCat] = useState('free')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [nickOpen, setNickOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [imgErr, setImgErr] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
  }, [])

  useEffect(() => {
    if (!editId) return
    supabase.from('board_posts').select('category, title, body, is_deleted, image_url').eq('id', editId).maybeSingle()
      .then(({ data }) => {
        if (!data || data.is_deleted) { nav('/board'); return }
        setCat(data.category || 'free'); setTitle(data.title || ''); setBody(data.body || ''); setImageUrl(data.image_url || '')
      })
  }, [editId]) // eslint-disable-line react-hooks/exhaustive-deps

  const onPickImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setImgErr('이미지 파일만 첨부할 수 있어요.'); return }
    if (file.size > 5 * 1024 * 1024) { setImgErr('5MB 이하 이미지만 가능해요.'); return }
    setImgErr(''); setUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const path = `board/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabase.storage.from('assets').upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('assets').getPublicUrl(path)
      setImageUrl(data.publicUrl)
    } catch {
      setImgErr('업로드 실패. 잠시 후 다시 시도해주세요.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const submit = async () => {
    setErr(''); setSaving(true)
    if (editId) {
      const { error } = await supabase.from('board_posts').update({ category: cat, title, body, image_url: imageUrl || null }).eq('id', editId)
      setSaving(false)
      if (error) { setErr('수정할 수 없어요 (본인 글만 가능).'); return }
      nav(`/board/${editId}`); return
    }
    const { data, error } = await supabase.functions.invoke('board-submit', { body: { kind: 'post', category: cat, title, body } })
    setSaving(false)
    if (error) { setErr('오류가 발생했어요. 잠시 후 다시 시도해주세요.'); return }
    if (!data?.ok) {
      if (data?.need_nickname) { setNickOpen(true); return }
      setErr(data?.error || '글을 등록할 수 없어요'); return
    }
    if (imageUrl && data.id) {
      await supabase.from('board_posts').update({ image_url: imageUrl }).eq('id', data.id)
    }
    nav(`/board/${data.id}`)
  }

  if (user === null) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] font-sans text-gray-900">
        <CommunityHeader active="board" />
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
          <p className="text-lg font-bold">로그인이 필요해요</p>
          <button onClick={() => nav('/generate')} className="rounded-full bg-[#03C75A] px-6 py-2.5 font-bold text-white">로그인하러 가기</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAF8] font-sans break-keep text-gray-900">
      <CommunityHeader active="board" />
      <section className="mx-auto max-w-2xl px-5 pt-28 pb-24 md:pt-36">
        <button onClick={() => nav('/board')} className="mb-5 flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-gray-900">
          <ArrowLeft size={16} /> 목록으로
        </button>
        <h1 className="mb-6 text-2xl font-black md:text-3xl">{editId ? '글 수정' : '글쓰기'}</h1>

        <div className="mb-4 flex gap-2">
          {WRITE_CATS.map(c => (
            <button key={c.key} onClick={() => setCat(c.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-all ${cat === c.key ? 'bg-[#03C75A] text-white' : 'bg-white text-slate-500 ring-1 ring-gray-200 hover:ring-[#03C75A]/40'}`}>
              {c.label}
            </button>
          ))}
        </div>

        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="제목"
          className="mb-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-bold outline-none focus:border-[#03C75A]" />
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={12} placeholder="내용을 입력하세요"
          className="w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-base leading-relaxed outline-none focus:border-[#03C75A]" />

        <div className="mt-3">
          {imageUrl ? (
            <div className="relative inline-block">
              <img src={imageUrl} alt="" className="max-h-52 rounded-xl border border-gray-200" />
              <button type="button" onClick={() => setImageUrl('')}
                className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg">
                <X size={15} />
              </button>
            </div>
          ) : (
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white py-3.5 text-sm font-bold text-slate-500 transition-colors hover:border-[#03C75A]/50 hover:text-[#03C75A]">
              <ImagePlus size={18} /> {uploading ? '업로드 중…' : '이미지 첨부 (선택)'}
              <input type="file" accept="image/*" className="hidden" onChange={onPickImage} disabled={uploading} />
            </label>
          )}
          {imgErr && <p className="mt-2 text-sm font-medium text-red-500">{imgErr}</p>}
        </div>

        {err && <p className="mt-3 text-sm font-medium text-red-500">{err}</p>}
        {!editId && <p className="mt-3 text-xs text-slate-400">글을 등록하면 20P가 적립돼요 (하루 1회까지).</p>}

        <button onClick={submit} disabled={saving}
          className="mt-5 w-full rounded-xl bg-[#03C75A] py-3.5 text-base font-bold text-white transition-all hover:bg-[#02b350] active:scale-95 disabled:opacity-50">
          {saving ? (editId ? '수정 중…' : '등록 중…') : (editId ? '수정 완료' : '등록하기')}
        </button>
      </section>

      <NicknameModal open={nickOpen} onClose={() => setNickOpen(false)} onDone={() => { setNickOpen(false); submit() }} />
    </div>
  )
}

export default BoardWrite

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const sanitize = (s) =>
  (s || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'user'

// ── 재사용 가능한 관리 UI (로그인된 session 필요) ──
export function LinkPageManager({ session }) {
  const [page, setPage] = useState(null)
  const [jobs, setJobs] = useState([])
  const [items, setItems] = useState([]) // link_items
  const [loading, setLoading] = useState(true)
  const [savedMsg, setSavedMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const loadedUidRef = useRef(null)

  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) return
    if (loadedUidRef.current === uid) return // 같은 유저 중복 실행 방지
    loadedUidRef.current = uid
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        let pg = (await supabase.from('link_pages').select('*').eq('user_id', uid).maybeSingle()).data
        if (!pg) {
          const base = sanitize(session.user.email?.split('@')[0])
          let handle = base
          for (let i = 0; i < 5 && !pg; i++) {
            const ins = await supabase.from('link_pages')
              .insert({ user_id: uid, handle, title: '', bio: '', theme: 'light' })
              .select('*').single()
            if (ins.data) { pg = ins.data; break }
            const re = (await supabase.from('link_pages').select('*').eq('user_id', uid).maybeSingle()).data
            if (re) { pg = re; break }
            handle = base + Math.floor(100 + Math.random() * 900)
          }
        }
        const [jb, it] = await Promise.all([
          supabase.from('video_jobs').select('id, product_name, seo_title, video_url, created_at')
            .eq('user_id', uid).eq('status', 'done').neq('video_url', '').order('created_at', { ascending: false }),
          supabase.from('link_items').select('*').eq('user_id', uid),
        ])
        if (!alive) return
        setPage(pg || null); setJobs(jb.data || []); setItems(it.data || [])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [session?.user?.id])

  const itemFor = (jobId) => items.find((i) => i.video_job_id === jobId)
  const flash = (m) => { setSavedMsg(m); setTimeout(() => setSavedMsg(''), 1800) }

  const savePage = async (patch) => {
    setPage((p) => ({ ...p, ...patch }))
    await supabase.from('link_pages').update({ ...patch, updated_at: new Date().toISOString() }).eq('user_id', session.user.id)
    flash('저장됨')
  }

  const uploadAvatar = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const path = `${session.user.id}/avatar_${Date.now()}.${ext}`
      const up = await supabase.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' })
      if (up.error) { flash('업로드 실패'); return }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      await savePage({ avatar_url: data.publicUrl })
    } finally { setUploading(false) }
  }

  const upsertItem = async (job, { title, target_url, active }) => {
    const uid = session.user.id
    const existing = itemFor(job.id)
    if (existing) {
      const { data } = await supabase.from('link_items')
        .update({ title, target_url, active }).eq('id', existing.id).select('*').single()
      if (data) setItems((p) => p.map((i) => (i.id === data.id ? data : i)))
    } else {
      const maxSort = items.reduce((m, i) => Math.max(m, i.sort_order || 0), 0)
      const { data } = await supabase.from('link_items')
        .insert({ user_id: uid, video_job_id: job.id, title, target_url, active, video_url: job.video_url, sort_order: maxSort + 1 })
        .select('*').single()
      if (data) setItems((p) => [...p, data])
    }
    flash('저장됨')
  }

  const move = async (item, dir) => {
    const actives = items.filter((i) => i.active).sort((a, b) => a.sort_order - b.sort_order)
    const idx = actives.findIndex((i) => i.id === item.id)
    const swap = actives[idx + dir]
    if (!swap) return
    const a = { ...item, sort_order: swap.sort_order }
    const b = { ...swap, sort_order: item.sort_order }
    setItems((p) => p.map((i) => (i.id === a.id ? a : i.id === b.id ? b : i)))
    await Promise.all([
      supabase.from('link_items').update({ sort_order: a.sort_order }).eq('id', a.id),
      supabase.from('link_items').update({ sort_order: b.sort_order }).eq('id', b.id),
    ])
  }

  if (loading)
    return <div className="py-20 text-center"><div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#03C75A] border-t-transparent" /></div>
  if (!page)
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">페이지를 불러오지 못했어요.</p>
        <button onClick={() => window.location.reload()} className="mt-3 rounded-xl bg-[#03C75A] px-5 py-2 text-sm font-bold text-white">다시 시도</button>
      </div>
    )

  const pageUrl = `https://chronit.kr/u/${page.handle}`

  return (
    <div>
      {/* 내 주소 */}
      <div className="mb-5 rounded-3xl border border-[#03C75A]/30 bg-[#03C75A]/5 p-5">
        <p className="text-xs font-bold text-gray-500">내 페이지 주소 (인스타 프로필에 이걸 넣으세요)</p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#03C75A]">{pageUrl}</code>
          <button onClick={() => { navigator.clipboard?.writeText(pageUrl); flash('복사됨') }}
            className="shrink-0 rounded-lg bg-[#03C75A] px-3 py-2 text-sm font-bold text-white">복사</button>
          <a href={`/u/${page.handle}`} target="_blank" rel="noreferrer"
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700">보기</a>
        </div>
      </div>

      {/* 페이지 설정 */}
      <div className="mb-5 space-y-3 rounded-3xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-black text-gray-900">페이지 설정</p>
        <div className="flex items-center gap-3">
          {page.avatar_url
            ? <img src={page.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover ring-1 ring-gray-200" />
            : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#03C75A]/10 text-2xl">🛍️</div>}
          <div className="flex flex-col items-start gap-1">
            <label className="cursor-pointer rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200">
              {uploading ? '업로드 중…' : '프로필 이미지 변경'}
              <input type="file" accept="image/*" className="hidden" disabled={uploading}
                onChange={(e) => uploadAvatar(e.target.files?.[0])} />
            </label>
            {page.avatar_url && (
              <button onClick={() => savePage({ avatar_url: null })} className="text-[11px] text-gray-400 hover:text-gray-600">기본 이미지로</button>
            )}
          </div>
        </div>
        <input defaultValue={page.title} placeholder="페이지 제목 (예: 민수의 추천템)"
          onBlur={(e) => savePage({ title: e.target.value })}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
        <textarea defaultValue={page.bio} placeholder="한 줄 소개 (선택)" rows={2}
          onBlur={(e) => savePage({ bio: e.target.value })}
          className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm" />
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-600">테마</span>
          {['light', 'dark'].map((t) => (
            <button key={t} onClick={() => savePage({ theme: t })}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold ${page.theme === t ? 'bg-[#03C75A] text-white' : 'bg-gray-100 text-gray-600'}`}>
              {t === 'light' ? '라이트' : '다크'}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-sm font-bold text-gray-600">
            <input type="checkbox" checked={page.active} onChange={(e) => savePage({ active: e.target.checked })} />
            공개
          </label>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-600">카드 크기</span>
          {[['large','크게'],['medium','보통'],['small','작게']].map(([v, l]) => (
            <button key={v} onClick={() => savePage({ card_size: v })}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold ${(page.card_size || 'large') === v ? 'bg-[#03C75A] text-white' : 'bg-gray-100 text-gray-600'}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* 영상 목록 */}
      <p className="mb-3 text-sm font-black text-gray-900">영상 → 카드로 추가</p>
      {jobs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white py-10 text-center text-sm text-gray-400">
          완성된 영상이 아직 없어요. 먼저 영상을 만들어 주세요.
        </p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const it = itemFor(job.id)
            return (
              <JobRow key={job.id} job={job} item={it}
                onSave={(vals) => upsertItem(job, vals)}
                onMove={it && it.active ? (dir) => move(it, dir) : null} />
            )
          })}
        </div>
      )}

      {savedMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white shadow-lg">{savedMsg}</div>
      )}
    </div>
  )
}

// ── /links 라우트 (로그인 + 페이지 크롬) ──
export default function LinksManager() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!authReady)
    return <div className="flex min-h-screen items-center justify-center bg-[#ECEAE3]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#03C75A] border-t-transparent" /></div>

  if (!session)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#ECEAE3] px-6 text-center">
        <h1 className="text-2xl font-black text-gray-900">로그인이 필요해요</h1>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } })}
          className="rounded-xl bg-[#03C75A] px-8 py-3 font-bold text-white hover:bg-[#02b350]">구글로 로그인</button>
      </div>
    )

  return (
    <div className="min-h-screen bg-[#ECEAE3] px-5 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900">내 링크 페이지</h1>
          <a href="/generate" className="text-sm font-bold text-gray-500 hover:text-[#03C75A]">← 영상 만들기</a>
        </div>
        <LinkPageManager session={session} />
      </div>
    </div>
  )
}

function JobRow({ job, item, onSave, onMove }) {
  const [title, setTitle] = useState(item?.title ?? job.seo_title ?? job.product_name ?? '')
  const [url, setUrl] = useState(item?.target_url ?? '')
  const active = !!item?.active
  const canShow = url.trim().length > 0

  return (
    <div className={`rounded-2xl border bg-white p-4 ${active ? 'border-[#03C75A]' : 'border-gray-200'}`}>
      <div className="flex gap-3">
        <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-black">
          {job.video_url && <video src={job.video_url} muted loop autoPlay playsInline preload="metadata" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="카드 제목"
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm" />
          <div className="flex gap-1.5">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="쿠팡 파트너스 링크 붙여넣기"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm" />
            <a href={`https://partners.coupang.com/#affiliate/ws/link/0/${encodeURIComponent((title || '').trim())}`}
              target="_blank" rel="noreferrer"
              className="shrink-0 whitespace-nowrap rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200">🔍 쿠팡에서 찾기</a>
          </div>
          <div className="flex items-center gap-2">
            {active ? (
              <>
                <button onClick={() => onSave({ title, target_url: url, active: true })}
                  className="rounded-lg bg-[#03C75A] px-3 py-1.5 text-xs font-bold text-white">저장</button>
                <button onClick={() => onSave({ title, target_url: url, active: false })}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-600">숨기기</button>
                {onMove && (
                  <span className="ml-auto flex gap-1">
                    <button onClick={() => onMove(-1)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs font-bold text-gray-600">↑</button>
                    <button onClick={() => onMove(1)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs font-bold text-gray-600">↓</button>
                  </span>
                )}
              </>
            ) : (
              <button onClick={() => onSave({ title, target_url: url, active: true })} disabled={!canShow}
                className="rounded-lg bg-[#03C75A] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">＋ 페이지에 표시</button>
            )}
            {!canShow && !active && <span className="text-[11px] text-gray-400">쿠팡 링크를 넣어야 표시할 수 있어요</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

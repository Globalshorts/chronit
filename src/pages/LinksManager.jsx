import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ColorPalette from '../components/ColorPalette'

// 생성 영상에서 한 프레임을 캡처해 작은 JPG Blob으로 반환 (카드용 이미지 = 영상 대신 용량 절감)
export async function captureVideoFrame(videoUrl, fraction = 0.45) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.crossOrigin = 'anonymous'; v.muted = true; v.playsInline = true; v.preload = 'auto'
    let done = false
    const finish = (err, blob) => { if (done) return; done = true; try { v.removeAttribute('src'); v.load() } catch {} ; err ? reject(err) : resolve(blob) }
    v.onerror = () => finish(new Error('video load error'))
    v.onloadeddata = () => { try { const d = v.duration || 2; v.currentTime = Math.min(Math.max(0.1, d * fraction), Math.max(0.1, d - 0.1)) } catch (e) { finish(e) } }
    v.onseeked = () => {
      try {
        const maxH = 960
        const scale = Math.min(1, maxH / (v.videoHeight || maxH))
        const w = Math.max(1, Math.round((v.videoWidth || 720) * scale))
        const h = Math.max(1, Math.round((v.videoHeight || 1280) * scale))
        const c = document.createElement('canvas'); c.width = w; c.height = h
        c.getContext('2d').drawImage(v, 0, 0, w, h)
        c.toBlob((b) => b ? finish(null, b) : finish(new Error('toBlob null')), 'image/jpeg', 0.82)
      } catch (e) { finish(e) }
    }
    setTimeout(() => finish(new Error('capture timeout')), 15000)
    v.src = videoUrl
  })
}

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
  const [customOpen, setCustomOpen] = useState(false)
  const [jobQuery, setJobQuery] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)
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
          supabase.from('video_jobs').select('id, product_name, seo_title, search_keyword, poster_url, video_url, created_at').eq('card_hidden', false)
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
  // 영상(video_jobs)이 3일 보관 후 정리돼도, 저장해 둔 링크(link_items)는 카드로 계속 보여준다
  const jobIdSet = new Set(jobs.map((j) => j.id))
  // 영상(video_jobs)이 없거나(FK가 NULL) 3일 정리로 사라져도, 저장한 링크(link_items)는 카드로 유지
  const savedOnlyJobs = items
    .filter((i) => !i.video_job_id || !jobIdSet.has(i.video_job_id))
    .map((i) => ({
      id: i.video_job_id || `saved-${i.id}`,
      product_name: i.title || '',
      seo_title: i.title || '',
      search_keyword: '',
      poster_url: i.image_url || '',
      video_url: i.video_url || '',
      created_at: i.created_at,
      _item: i,
      _savedOnly: true,
    }))
  const allJobs = [...jobs, ...savedOnlyJobs]
  const theItem = (job) => job._item || itemFor(job.id)
  const jobTitle = (job) => (theItem(job)?.title || job.seo_title || job.product_name || '')
  const activeCount = items.filter((i) => i.active).length
  const visibleJobs = allJobs.filter((j) => {
    if (activeOnly && !theItem(j)?.active) return false
    const q = jobQuery.trim().toLowerCase()
    if (q && !jobTitle(j).toLowerCase().includes(q)) return false
    return true
  })
  const sortedJobs = [...visibleJobs].sort((j1, j2) => {
    const i1 = theItem(j1), i2 = theItem(j2)
    if (i1?.active && i2?.active) return (i2.sort_order || 0) - (i1.sort_order || 0)
    if (i1?.active) return -1
    if (i2?.active) return 1
    return 0
  })
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

  const upsertItem = async (job, { title, target_url, active, image_url, badge, badge_color }, existingArg) => {
    const uid = session.user.id
    const existing = existingArg || itemFor(job.id)
    let img = image_url || null
    if (!img && !existing?.image_url) {
      try {
        const blob = await captureVideoFrame(job.video_url)
        const path = `${uid}/${job.id}.jpg`
        const up = await supabase.storage.from('card-images').upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' })
        if (!up.error) img = supabase.storage.from('card-images').getPublicUrl(path).data.publicUrl + '?v=' + Date.now()
      } catch (e) { /* 캡처 실패 → 영상 폴백 */ }
    }
    if (existing) {
      const patch = { title, target_url, active, badge: badge ?? null, badge_color: badge_color ?? null }
      if (img) patch.image_url = img
      const { data } = await supabase.from('link_items')
        .update(patch).eq('id', existing.id).select('*').single()
      if (data) setItems((p) => p.map((i) => (i.id === data.id ? data : i)))
    } else {
      let videoUrl = job.video_url
      if (!img) {
        try { const { data: kv } = await supabase.functions.invoke('keep-video', { body: { job_id: job.id } }); if (kv?.ok && kv.video_url) videoUrl = kv.video_url } catch (e) {}
      }
      const maxSort = items.reduce((m, i) => Math.max(m, i.sort_order || 0), 0)
      const { data } = await supabase.from('link_items')
        .insert({ user_id: uid, video_job_id: job.id, title, target_url, active, image_url: img, video_url: videoUrl, sort_order: maxSort + 1, badge: badge ?? null, badge_color: badge_color ?? null })
        .select('*').single()
      if (data) setItems((p) => [...p, data])
    }
    flash('저장됨')
  }

  const removeCard = async (job, item) => {
    if (!window.confirm('이 카드를 내 링크에서 삭제할까요?\n(영상은 생성 내역에 그대로 남아요)')) return
    try {
      if (item?.id) await supabase.from('link_items').delete().eq('id', item.id)
      await supabase.from('video_jobs').update({ card_hidden: true }).eq('id', job.id)
      setItems((p) => p.filter((x) => x.id !== item?.id))
      setJobs((p) => p.filter((j) => j.id !== job.id))
      flash('삭제됨')
    } catch (e) {
      alert('삭제 실패: ' + (e?.message || e))
    }
  }

  const move = async (item, dir) => {
    const actives = items.filter((i) => i.active).sort((a, b) => b.sort_order - a.sort_order)
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

      {/* 페이지 커스텀 (접기) */}
      <div className="mb-5 overflow-hidden rounded-3xl border border-gray-200 bg-white">
        <button onClick={() => setCustomOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-4 text-left">
          <span className="text-sm font-black text-gray-900">🎨 페이지 커스텀</span>
          <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-500">{customOpen ? '접기 ▲' : '펼치기 ▼'}</span>
        </button>
        {customOpen && (
        <div className="space-y-3 px-5 pb-5">
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
        <div className="flex items-center justify-end">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
            <input type="checkbox" checked={page.active} onChange={(e) => savePage({ active: e.target.checked })} />
            공개
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-20 text-sm font-bold text-gray-600">배경 색상</span>
          <ColorPalette value={page.bg_color || '#ECEAE3'} onChange={(c) => savePage({ bg_color: c })} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-20 text-sm font-bold text-gray-600">카드 색상</span>
          <ColorPalette value={page.accent_color || '#03C75A'} onChange={(c) => savePage({ accent_color: c })} />
        </div>
        </div>
        )}
      </div>

      {/* 영상 목록 */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-black text-gray-900">영상 → 카드로 추가</p>
        <div className="flex items-center gap-2.5">
          <label className="flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-gray-600">
            <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
            표시중만 ({activeCount})
          </label>
          {allJobs.length >= 2 && (
            <input value={jobQuery} onChange={(e) => setJobQuery(e.target.value)} placeholder="🔍 검색"
              className="w-28 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs sm:w-36" />
          )}
        </div>
      </div>
      {allJobs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white py-10 text-center text-sm text-gray-400">
          완성된 영상이 아직 없어요. 먼저 영상을 만들어 주세요.
        </p>
      ) : visibleJobs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white py-8 text-center text-sm text-gray-400">조건에 맞는 카드가 없어요.</p>
      ) : (
        <div className="space-y-3">
          {sortedJobs.map((job) => {
            const it = theItem(job)
            return (
              <JobRow key={job.id} job={job} item={it} uid={session.user.id}
                onSave={(vals) => upsertItem(job, vals, it)}
                onDelete={() => removeCard(job, it)}
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

function JobRow({ job, item, uid, onSave, onDelete, onMove }) {
  const [title, setTitle] = useState(item?.title ?? (job.seo_title || job.product_name || ''))
  const [url, setUrl] = useState(item?.target_url ?? '')
  const [badge, setBadge] = useState(item?.badge ?? '')
  const [badgeColor, setBadgeColor] = useState(item?.badge_color || '#ff4d4f')
  const [img, setImg] = useState(item?.image_url || job.poster_url || '')
  const [imgBusy, setImgBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const fracs = useRef([0.45, 0.65, 0.25, 0.8, 0.1, 0.55])
  const fracIdx = useRef(0)
  const active = !!item?.active
  const canShow = url.trim().length > 0

  const pickFrame = async () => {
    if (!job.video_url || imgBusy) return
    setImgBusy(true)
    try {
      const f = fracs.current[fracIdx.current % fracs.current.length]; fracIdx.current++
      const blob = await captureVideoFrame(job.video_url, f)
      const path = `${uid}/${job.id}.jpg`
      const up = await supabase.storage.from('card-images').upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' })
      if (up.error) throw up.error
      setImg(supabase.storage.from('card-images').getPublicUrl(path).data.publicUrl + '?v=' + Date.now())
    } catch (e) { alert('이미지 추출 실패 (영상이 만료됐을 수 있어요). 직접 업로드해 주세요.') }
    finally { setImgBusy(false) }
  }
  const uploadImg = async (file) => {
    if (!file || imgBusy) return
    setImgBusy(true)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const path = `${uid}/${job.id}.${ext}`
      const up = await supabase.storage.from('card-images').upload(path, file, { upsert: true, cacheControl: '3600' })
      if (up.error) throw up.error
      setImg(supabase.storage.from('card-images').getPublicUrl(path).data.publicUrl + '?v=' + Date.now())
    } catch (e) { alert('업로드 실패') }
    finally { setImgBusy(false) }
  }

  return (
    <div className={`flex overflow-hidden rounded-2xl border bg-white ${active ? 'border-[#03C75A]' : 'border-gray-200'}`}>
      {/* 좌측 정렬 레일 (표시중 카드만) */}
      {active && onMove && (
        <div className="flex shrink-0 flex-col items-center justify-center gap-3 border-r border-gray-100 bg-gray-50 px-2 text-gray-400">
          <button onClick={() => onMove(-1)} title="위로" className="leading-none transition hover:text-[#03C75A]">▲</button>
          <button onClick={() => onMove(1)} title="아래로" className="leading-none transition hover:text-[#03C75A]">▼</button>
        </div>
      )}

      <div className="min-w-0 flex-1 p-3">
        <div className="flex gap-3">
          <button type="button" onClick={() => setOpen((o) => !o)} title="설정 열기"
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black">
            {img
              ? <img src={img} alt="" className="h-full w-full object-cover" />
              : job.video_url ? <video src={`${job.video_url}#t=0.6`} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : null}
          </button>
          <div className="min-w-0 flex-1 space-y-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="카드 제목"
              className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm" />
            <div className="flex gap-1.5">
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="쿠팡 파트너스 링크 붙여넣기"
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm" />
              <a href={`https://partners.coupang.com/#affiliate/ws/link/0/${encodeURIComponent((job.search_keyword || job.product_name || title || '').trim())}`}
                target="_blank" rel="noreferrer"
                className="shrink-0 whitespace-nowrap rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200">🔍 쿠팡에서 찾기</a>
            </div>
            <div className="flex items-center gap-2">
              {active ? (
                <button onClick={() => onSave({ title, target_url: url, active: true, image_url: img, badge, badge_color: badgeColor })}
                  className="rounded-lg bg-[#03C75A] px-3 py-1.5 text-xs font-bold text-white">저장</button>
              ) : (
                <button onClick={() => onSave({ title, target_url: url, active: true, image_url: img, badge, badge_color: badgeColor })} disabled={!canShow}
                  className="rounded-lg bg-[#03C75A] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">＋ 페이지에 표시</button>
              )}
              {!canShow && !active && <span className="text-[11px] text-gray-400">쿠팡 링크 필요</span>}
              <button type="button" onClick={() => setOpen((o) => !o)}
                className="ml-auto rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-50">⚙ 설정 {open ? '▲' : '▾'}</button>
            </div>
          </div>
        </div>

        {/* 펼침: 이미지 · 배지 · 숨기기 · 삭제 */}
        {open && (
          <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-10 text-xs font-bold text-gray-500">이미지</span>
              <button onClick={pickFrame} disabled={imgBusy} title="다른 장면으로 바꾸기"
                className="rounded-md bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-40">{imgBusy ? '…' : '🔄 다른 컷'}</button>
              <label className="cursor-pointer rounded-md bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600 hover:bg-gray-200" title="직접 업로드">📷 업로드
                <input type="file" accept="image/*" className="hidden" disabled={imgBusy} onChange={(e) => uploadImg(e.target.files?.[0])} />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-10 text-xs font-bold text-gray-500">배지</span>
              <input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="없음" maxLength={12}
                className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-xs" />
              {['Hot🔥', 'New⭐', '인기', '추천', '마감임박'].map((b) => (
                <button key={b} type="button" onClick={() => setBadge(b)}
                  className="rounded-md bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600 hover:bg-gray-200">{b}</button>
              ))}
              {badge && (
                <select value={badgeColor} onChange={(e) => setBadgeColor(e.target.value)}
                  className="rounded-md border border-gray-300 px-1.5 py-1 text-[11px] font-bold text-gray-700">
                  <option value="#ff4d4f">🔴 빨강</option>
                  <option value="#facc15">🟡 노랑</option>
                  <option value="#03c75a">🟢 초록</option>
                </select>
              )}
              {badge && (
                <button type="button" onClick={() => setBadge('')}
                  className="rounded-md px-2 py-1 text-[11px] font-bold text-gray-400 hover:text-gray-600">지우기</button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {active && (
                <button onClick={() => onSave({ title, target_url: url, active: false, image_url: img, badge, badge_color: badgeColor })}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-600">숨기기</button>
              )}
              <button onClick={onDelete}
                className="ml-auto rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-500 hover:bg-red-100">🗑️ 삭제</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

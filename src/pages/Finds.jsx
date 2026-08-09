import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Search, Loader2, AlertTriangle, Flame, Eye, Heart, MessageCircle, Sparkles, X, Copy, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { FEATURES } from '../config/features'

// ⚠️ Finds = 기존 영상분석 뷰(클립 그리드 + 재생)를 복제한 독립 페이지.
//    VideoGenerator는 건드리지 않음(회귀 위험 0). '담기' 대신 '분석하기' 모달로 대체.
const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const FN = (n) => `${SB}/functions/v1/${n}`
const THUMB_PROXY = `${SB}/functions/v1/thumbnail-proxy`
const proxyThumb = (url) => (url ? `${THUMB_PROXY}?url=${encodeURIComponent(url)}` : '')
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('ko-KR') : null)

const isValidUrl = (u) =>
  ['youtube.com', 'youtu.be', 'tiktok.com', 'instagram.com'].some((p) => u.toLowerCase().includes(p))

// ── 클립 카드 (기존 ClipCard의 재생 로직 복제, 담기→분석하기) ──
function FindCard({ clip, onAnalyze }) {
  const [imgError, setImgError] = useState(false)
  const [playing, setPlaying] = useState(false)
  const rawUrl = (clip.download_url || clip.video_url || '').replace(/^http:\/\//, 'https://')
  const isOwnStorage = rawUrl.includes('supabase.co/storage/v1/object/public/')
  const playUrl = !rawUrl ? '' : (isOwnStorage ? rawUrl : `${FN('video-proxy')}?url=${encodeURIComponent(rawUrl)}`)
  const thumbSrc = !imgError && clip.thumbnail_url ? proxyThumb(clip.thumbnail_url) : ''

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-gray-200 transition-all hover:border-gray-400">
      <div className="relative aspect-[9/16] cursor-pointer bg-gray-100" onClick={() => (playing ? setPlaying(false) : (playUrl && setPlaying(true)))}>
        {playing && playUrl ? (
          <video src={playUrl} autoPlay muted playsInline controls={false}
            className="h-full w-full object-cover"
            onClick={(e) => { e.stopPropagation(); setPlaying(false) }}
            onError={() => setPlaying(false)} />
        ) : (
          <>
            {thumbSrc ? (
              <img src={thumbSrc} alt={clip.title} referrerPolicy="no-referrer" onError={() => setImgError(true)} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl text-gray-400">🎬</div>
            )}
            {playUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition hover:bg-black/40">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-lg transition hover:opacity-100">
                  <span className="ml-1 text-xl text-black">▶</span>
                </div>
              </div>
            )}
            {clip.duration > 0 && (
              <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-xs font-bold text-white">{clip.duration}s</div>
            )}
          </>
        )}
      </div>
      <div className="bg-white p-1.5">
        {/* 제목·아이디는 무료 카드에서 숨김 → 분석하기(유료) 팝업에서만 공개 (우회 방지) */}
        <button onClick={(e) => { e.stopPropagation(); onAnalyze(clip) }}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-95">
          <Sparkles size={14} />분석하기
        </button>
      </div>
    </div>
  )
}

// ── 분석 팝업(모달) ──
function AnalyzeModal({ clip, onClose }) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')

  // 모달 오픈 시 analyze-clip 호출 → 훅/셀링포인트/구도 생성
  // TODO(과금): 최초 분석 시 이용권 -1 (나중 별도 적용)
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true); setErr(''); setResult(null)
      try {
        const { data: { session: s } } = await supabase.auth.getSession()
        if (!s) { if (alive) { setErr('로그인이 필요합니다'); setLoading(false) } return }
        const r = await fetch(FN('analyze-clip'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: clip.title, source: clip.source, thumbnail_url: clip.thumbnail_url }),
        })
        const d = await r.json()
        if (!alive) return
        if (d.ok) setResult(d); else setErr(d.error || '분석에 실패했어요.')
      } catch { if (alive) setErr('분석 중 오류가 발생했어요.') }
      finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [clip])

  const copy = async () => {
    try { await navigator.clipboard.writeText(clip.page_url || ''); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* noop */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-base font-extrabold text-slate-900">벤치마크 분석</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>

        <p className="line-clamp-2 text-sm text-slate-600">{clip.title || '(제목 없음)'}</p>
        <p className="mt-0.5 text-xs text-slate-400">@{clip.author || '?'} · {clip.source}</p>

        <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
          {clip.views != null && <span className="flex items-center gap-1"><Eye size={14} />{fmt(clip.views)}</span>}
          <span className="flex items-center gap-1"><Heart size={14} />{fmt(clip.likes) ?? '—'}</span>
          <span className="flex items-center gap-1"><MessageCircle size={14} />{fmt(clip.comments) ?? '—'}</span>
        </div>

        {clip.page_url && (
          <div className="mt-4">
            <div className="mb-1 text-xs font-bold text-slate-500">출처</div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <span className="flex-1 truncate text-xs text-slate-500">{clip.page_url}</span>
              <button onClick={copy} className="flex shrink-0 items-center gap-1 rounded-md bg-[#0064FF] px-2.5 py-1 text-xs font-bold text-white">
                {copied ? <><Check size={12} />복사됨</> : <><Copy size={12} />복사</>}
              </button>
            </div>
          </div>
        )}

        {/* AI 벤치마크 — analyze-clip 결과 */}
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
          <div className="mb-2 flex items-center gap-1 font-bold text-slate-700"><Sparkles size={14} />AI 벤치마크 분석</div>
          {loading ? (
            <div className="flex items-center gap-2 py-2 text-slate-400"><Loader2 size={15} className="animate-spin" />분석 중…</div>
          ) : err ? (
            <div className="flex items-center gap-1.5 text-red-500"><AlertTriangle size={14} />{err}</div>
          ) : result ? (
            <div className="space-y-2 text-slate-600">
              <div><span className="font-bold text-slate-700">훅</span> · {result.hook || '—'}</div>
              <div>
                <span className="font-bold text-slate-700">셀링포인트</span>
                <ul className="mt-0.5 list-disc space-y-0.5 pl-5">
                  {(result.selling_points || []).length ? result.selling_points.map((sp, i) => <li key={i}>{sp}</li>) : <li className="text-slate-400">—</li>}
                </ul>
              </div>
              <div><span className="font-bold text-slate-700">구도·편집</span> · {result.composition || '—'}</div>
              {!result.used_image && <div className="text-[10px] text-slate-300">※ 썸네일 미확보 — 제목 기반 분석</div>}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function Finds() {
  const [session, setSession] = useState(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [clips, setClips] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [modalClip, setModalClip] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => { try { sub.subscription.unsubscribe() } catch { /* noop */ } }
  }, [])

  // 스텔스 게이트 (모든 훅 이후)
  if (!FEATURES.finds) return <Navigate to="/" replace />

  // ── 검색/분석: submit → poll → (틱톡+샤오홍슈 병렬) → clip-filter ──
  // (이용권/과금 로직은 이 페이지에 아직 적용하지 않음 — 추후 별도 반영)
  const analyze = async () => {
    const su = sourceUrl.trim()
    if (!su) { setError('URL을 입력해주세요'); return }
    if (!isValidUrl(su)) { setError('틱톡·유튜브·인스타 링크를 입력해 주세요.'); return }
    setError(''); setSearching(true); setClips([])
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) { setError('로그인이 필요합니다'); setSearching(false); return }
      const headers = { Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' }

      const subResp = await fetch(FN('search-clips'), { method: 'POST', headers, body: JSON.stringify({ action: 'submit', source_url: su }) })
      const sub = await subResp.json()
      if (!sub.ok || !sub.prediction_id) { setError(sub.error || '분석에 실패했어요. 잠시 후 다시 시도해 주세요.'); setSearching(false); return }

      let data1 = null
      const t0 = Date.now()
      while (Date.now() - t0 < 600000) {
        await new Promise((r) => setTimeout(r, 2500))
        let pr
        try {
          const presp = await fetch(FN('search-clips'), { method: 'POST', headers, body: JSON.stringify({ action: 'poll', prediction_id: sub.prediction_id, no_search: true }) })
          pr = await presp.json()
        } catch { continue }
        if (pr?.status === 'processing') continue
        if (pr?.ok && pr?.status === 'done') { data1 = pr; break }
        if (pr && pr.ok === false) { setError(pr.error || '분석에 실패했어요.'); setSearching(false); return }
      }
      if (!data1) { setError('분석이 지연되고 있어요. 잠시 후 다시 시도해 주세요.'); setSearching(false); return }

      const refFrames = data1.reference_frames || []
      const queries = data1.tiktok_queries || []
      let rawClips = data1.clips || []
      let xhsClips = []

      await Promise.all([
        (async () => { try { const r = await fetch(FN('search-clips'), { method: 'POST', headers, body: JSON.stringify({ action: 'search_tiktok', queries }) }); const d = await r.json(); if (d?.ok && Array.isArray(d.clips)) rawClips = d.clips } catch { /* noop */ } })(),
        (async () => { try { const r = await fetch(FN('search-xhs'), { method: 'POST', headers, body: JSON.stringify({ product_name: data1.product_name || '', keyword: data1.keyword || '', keywords: data1.keywords || [], tiktok_queries: queries }) }); const d = await r.json(); if (d?.ok && Array.isArray(d.clips)) xhsClips = d.clips } catch { /* noop */ } })(),
      ])

      const allCand = [...xhsClips, ...rawClips]
      if (!allCand.length) { setError('검색 결과가 없습니다. 다른 URL을 시도해보세요.'); setSearching(false); return }

      let finalClips = allCand
      if (refFrames.length) {
        try {
          const r2 = await fetch(FN('clip-filter'), { method: 'POST', headers, body: JSON.stringify({ reference_frames: refFrames, candidates: allCand, clip_count: 80 }) })
          const d2 = await r2.json()
          finalClips = d2.ok ? (d2.clips || allCand) : allCand.slice(0, 20)
          const dlMap = new Map(allCand.map((c) => [c.video_id, c.download_url]))
          finalClips = finalClips.map((c) => ({ ...c, download_url: c.download_url || dlMap.get(c.video_id) || '' }))
        } catch { finalClips = allCand }
      }
      // 지표 필드 정규화(있으면 사용)
      setClips(finalClips.map((c) => ({ ...c, views: c.views ?? c.view_count ?? c.play_count, likes: c.likes ?? c.like_count ?? c.digg_count, comments: c.comments ?? c.comment_count ?? c.comments_count })))
    } catch {
      setError('분석 중 일시적인 오류가 있었어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6">
          <div className="flex items-center gap-2 text-[#0064FF]">
            <Flame size={22} />
            <h1 className="text-2xl font-extrabold text-slate-900">Finds — 트렌드·벤치마크 리서치</h1>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            잘 나가는 쇼핑 숏폼을 분석해 유사·벤치마크 소스를 찾아줍니다. <b>리서치·벤치마킹 목적</b>이며,
            원본 콘텐츠의 저작권은 원저작자에게 있습니다. 사용 권한이 있는 콘텐츠만 활용해 주세요.
          </p>
        </header>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') analyze() }}
            placeholder="틱톡·유튜브·인스타 링크를 붙여넣으세요"
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0064FF]" />
          <button onClick={analyze} disabled={searching}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#0064FF] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}{searching ? '분석 중…' : '분석'}
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            <AlertTriangle size={15} />{error}
          </div>
        )}

        {/* 클립 그리드 — 한 줄 4개 */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {clips.map((c) => <FindCard key={c.video_id} clip={c} onAnalyze={setModalClip} />)}
        </div>

        {!searching && clips.length === 0 && !error && (
          <div className="mt-16 text-center text-sm text-slate-400">링크를 넣고 분석을 눌러보세요.</div>
        )}
      </div>

      {modalClip && <AnalyzeModal clip={modalClip} onClose={() => setModalClip(null)} />}
    </div>
  )
}

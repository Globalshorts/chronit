import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Search, ExternalLink, Loader2, AlertTriangle, Flame } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { FEATURES } from '../config/features'

// ⚠️ 이 파일은 VideoGenerator.tsx의 분석 흐름을 "복제(추출 아님)"한 독립 페이지입니다.
//    VideoGenerator는 전혀 건드리지 않으므로 생성기 회귀 위험 0.
const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const FN = (n) => `${SB}/functions/v1/${n}`

const isValidUrl = (u) =>
  ['youtube.com', 'youtu.be', 'tiktok.com', 'instagram.com'].some((p) => u.toLowerCase().includes(p))

// 링크 전용(합법안): 원본 링크만 노출. download_url/video_url은 저장·표시하지 않음.
const toLinkOnly = (c) => ({
  video_id: c.video_id,
  title: c.title || '',
  author: c.author || '',
  thumbnail_url: c.thumbnail_url || '',
  page_url: c.page_url || '',
  source: c.source || '',
})

export default function Finds() {
  const [session, setSession] = useState(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [clips, setClips] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => {
      try { sub.subscription.unsubscribe() } catch { /* noop */ }
    }
  }, [])

  // 스텔스 게이트: 플래그 off면 접근 불가(홈으로). 개발 시 features.ts에서 finds:true.
  // (모든 훅 호출 이후에 위치 — React 훅 규칙 준수)
  if (!FEATURES.finds) return <Navigate to="/" replace />

  // ── 분석: submit → poll → (틱톡+샤오홍슈 병렬) → clip-filter ──
  // ⚠️ 크레딧 정책 미정: search-clips는 이용권을 차감함. Finds 발견을 무료/저가로 둘지 제품 결정 필요.
  const analyze = async () => {
    const su = sourceUrl.trim()
    if (!su) { setError('URL을 입력해주세요'); return }
    if (!isValidUrl(su)) { setError('틱톡·유튜브·인스타 링크를 입력해 주세요.'); return }
    setError(''); setSearching(true); setClips([])
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) { setError('로그인이 필요합니다'); setSearching(false); return }
      const headers = { Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' }

      // 1) 제출
      const subResp = await fetch(FN('search-clips'), {
        method: 'POST', headers, body: JSON.stringify({ action: 'submit', source_url: su }),
      })
      const sub = await subResp.json()
      if (!sub.ok || !sub.prediction_id) {
        setError(subResp.status === 402 ? (sub.error || '이용권이 부족해요.') : (sub.error || '분석에 실패했어요. 잠시 후 다시 시도해 주세요.'))
        setSearching(false); return
      }

      // 2) 폴링 (콜드부팅 포함 최대 10분)
      let data1 = null
      const t0 = Date.now()
      while (Date.now() - t0 < 600000) {
        await new Promise((r) => setTimeout(r, 2500))
        let pr
        try {
          const presp = await fetch(FN('search-clips'), {
            method: 'POST', headers, body: JSON.stringify({ action: 'poll', prediction_id: sub.prediction_id, no_search: true }),
          })
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

      // 3) 틱톡 + 샤오홍슈 병렬
      await Promise.all([
        (async () => {
          try {
            const r = await fetch(FN('search-clips'), { method: 'POST', headers, body: JSON.stringify({ action: 'search_tiktok', queries }) })
            const d = await r.json()
            if (d?.ok && Array.isArray(d.clips)) rawClips = d.clips
          } catch { /* 틱톡 실패 무시 */ }
        })(),
        (async () => {
          try {
            const r = await fetch(FN('search-xhs'), { method: 'POST', headers, body: JSON.stringify({ product_name: data1.product_name || '', keyword: data1.keyword || '', keywords: data1.keywords || [], tiktok_queries: queries }) })
            const d = await r.json()
            if (d?.ok && Array.isArray(d.clips)) xhsClips = d.clips
          } catch { /* XHS 실패 무시 */ }
        })(),
      ])

      const allCand = [...xhsClips, ...rawClips]
      if (!allCand.length) { setError('검색 결과가 없습니다. 다른 URL을 시도해보세요.'); setSearching(false); return }

      // 4) 관련도 필터/재정렬 (실패 시 폴백)
      let finalClips = allCand
      if (refFrames.length) {
        try {
          const r2 = await fetch(FN('clip-filter'), { method: 'POST', headers, body: JSON.stringify({ reference_frames: refFrames, candidates: allCand, clip_count: 80 }) })
          const d2 = await r2.json()
          finalClips = d2.ok ? (d2.clips || allCand) : allCand.slice(0, 20)
        } catch { finalClips = allCand }
      }

      setClips(finalClips.map(toLinkOnly)) // 링크 전용 변환(다운로드 URL 제거)
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
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') analyze() }}
            placeholder="틱톡·유튜브·인스타 링크를 붙여넣으세요"
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0064FF]"
          />
          <button
            onClick={analyze}
            disabled={searching}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#0064FF] px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {searching ? '분석 중…' : '분석'}
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            <AlertTriangle size={15} />{error}
          </div>
        )}

        {clips.length > 0 && (
          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
            📊 벤치마크 분석 (예정): 인기 컷 구도 · 훅 · 셀링포인트 요약이 여기 들어갑니다.
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {clips.map((c) => (
            <div key={c.video_id} className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
              <div className="aspect-[9/16] bg-slate-100">
                {c.thumbnail_url ? (
                  <img src={c.thumbnail_url} alt={c.title} loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                ) : null}
              </div>
              <div className="p-2">
                <div className="line-clamp-2 text-xs font-medium text-slate-700">{c.title || '(제목 없음)'}</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-400">{c.source}</span>
                  {c.page_url && (
                    <a href={c.page_url} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1 text-[11px] font-semibold text-[#0064FF]">
                      원본 보기<ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {!searching && clips.length === 0 && !error && (
          <div className="mt-16 text-center text-sm text-slate-400">링크를 넣고 분석을 눌러보세요.</div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Flame, Eye, Heart, MessageCircle, ExternalLink, Loader2, Sparkles, HelpCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { FEATURES } from '../config/features'
import SiteNav from '../components/SiteNav'
import FindsBottomNav from '../components/FindsBottomNav'
import { AnalyzeModal, ackAnalyzeCost } from './Finds'
import AuthModal from '../components/AuthModal'
import FindsPricing from '../components/FindsPricing'

// 기존 "오늘의 트렌드"(VideoGenerator) 데이터 로딩을 재사용한 독립 페이지 + pint 스타일 대시보드.
const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const FN = (n) => `${SB}/functions/v1/${n}`

function TrendThumb({ url }) {
  const [err, setErr] = useState(false)
  const src = url ? `${SB}/functions/v1/thumbnail-proxy?url=${encodeURIComponent(url)}` : ''
  if (!src || err) return <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-300"><Flame size={26} /></div>
  return <img src={src} referrerPolicy="no-referrer" loading="lazy" className="h-full w-full object-cover" onError={() => setErr(true)} />
}
const fmt = (n) => { n = Math.max(0, Math.trunc(Number(n) || 0)); return n >= 10000 ? (n / 10000).toFixed(1) + '만' : n >= 1000 ? (n / 1000).toFixed(1) + '천' : String(n) }

const SORTS = [['view', '조회수'], ['recent', '최신'], ['like', '좋아요'], ['comment', '댓글']]
const RANGES = [['24h', '24시간', 1], ['7d', '7일', 7], ['all', '전체', 0]]
const TREND_TTL = 10 * 60 * 1000 // 10분: 이 안이면 재요청 안 함(서버는 최대 24h마다 갱신)
const readTrendCache = () => { try { const c = JSON.parse(sessionStorage.getItem('chronit_trend_cache') || 'null'); return (c && Array.isArray(c.items)) ? c : null } catch { return null } }
const writeTrendCache = (items) => { try { sessionStorage.setItem('chronit_trend_cache', JSON.stringify({ items, at: Date.now() })) } catch { /* noop */ } }

export default function Trend() {
  const [session, setSession] = useState(null)
  const [items, setItems] = useState(() => readTrendCache()?.items || [])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [sort, setSort] = useState('view')
  const [showHelp, setShowHelp] = useState(false)
  const [range, setRange] = useState(7)
  const [modalClip, setModalClip] = useState(null)
  const [payWall, setPayWall] = useState(false)
  const [analyzedIds, setAnalyzedIds] = useState([])
  const [showAuth, setShowAuth] = useState(false)
  const isReal = !!session && session.user?.is_anonymous !== true

  const handleAnalyze = async (clip) => {
    const key = clip.page_url || clip.title
    if (analyzedIds.includes(key)) { setModalClip(clip); return }
    if (!ackAnalyzeCost(null)) return
    const { data } = await supabase.rpc('use_finds_credit_rpc')
    if (!data?.ok) { setPayWall(true); return }
    setAnalyzedIds((prev) => [...prev, key])
    setModalClip(clip)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => { try { sub.subscription.unsubscribe() } catch { /* noop */ } }
  }, [])

  useEffect(() => {
    if (!isReal) return
    const cached = readTrendCache()
    if (cached) setItems(cached.items)                       // 캐시 있으면 즉시 표시(스피너 없음)
    if (cached && Date.now() - cached.at < TREND_TTL) return  // 신선하면 재요청 스킵
    let alive = true
    if (!cached) setLoading(true)                            // 보여줄 캐시 없을 때만 스피너
    ;(async () => {
      setErr('')
      try {
        const { data: { session: s } } = await supabase.auth.getSession()
        const r = await fetch(FN('trend-feed'), { method: 'POST', headers: { Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        const d = await r.json()
        if (alive) { setItems(d.items || []); writeTrendCache(d.items || []) }  // 백그라운드 갱신 + 캐시 저장
      } catch { if (alive && !cached) setErr('트렌드를 불러오지 못했어요.') }
      finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [session])

  if (!FEATURES.trendFeed) return <Navigate to="/" replace />

  const now = Date.now()
  const list = items
    .filter((it) => range === 0 ? true : (it.taken_at && now - new Date(it.taken_at).getTime() <= range * 86400000))
    .sort((a, b) => {
      if (sort === 'recent') return new Date(b.taken_at || 0) - new Date(a.taken_at || 0)
      const mk = sort === 'view' ? 'view_count' : sort === 'like' ? 'like_count' : 'comment_count'
      return (Number(b[mk]) || 0) - (Number(a[mk]) || 0)
    })

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={`${SB}/storage/v1/object/public/assets/icon.png`} alt="Chronit" className="h-8 w-8" />
            <span className="text-lg font-extrabold text-slate-900">Chronit</span>
          </Link>
          <SiteNav />
          <div className="flex items-center gap-2">
            <Link to="/" className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-600 transition-colors hover:border-slate-400">홈</Link>
            {isReal && <Link to="/me" className="rounded-full bg-slate-900 px-3 py-1.5 text-sm font-bold text-white">마이</Link>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-5">
          <div className="flex items-center gap-2 text-[#0064FF]">
            <Flame size={22} />
            <h1 className="text-2xl font-extrabold text-slate-900">실시간 트렌드</h1>
            <div className="relative">
              <button onClick={() => setShowHelp((v) => !v)} className="flex text-slate-300 transition-colors hover:text-slate-500" aria-label="선정 기준"><HelpCircle size={18} /></button>
              {showHelp && (
                <div className="absolute left-0 top-7 z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium leading-relaxed text-slate-600 shadow-xl" onClick={() => setShowHelp(false)}>
                  <div className="mb-0.5 font-bold text-slate-800">선정 기준</div>
                  팔로워 <b className="text-slate-800">2만 미만</b> 계정 중, 최근 <b className="text-slate-800">반응이 잘 터진</b>(댓글·조회수 높은) 쇼핑 숏폼만 골라 모아드려요.
                </div>
              )}
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-500">지금 뜨는 쇼핑 숏폼을 한눈에. 조회수·좋아요 순으로 정렬해 확인하세요.</p>
          <p className="mt-0.5 text-[11px] text-slate-400">[분석]은 이용권 1개가 차감돼요 · 이미 분석한 소스는 다시 열어도 무료예요</p>
        </header>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          {SORTS.map(([k, l]) => (
            <button key={k} onClick={() => setSort(k)} className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition ${sort === k ? 'bg-[#0064FF] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{l}</button>
          ))}
          <span className="mx-1 h-4 w-px bg-slate-200" />
          {RANGES.map(([k, l, d]) => (
            <button key={k} onClick={() => setRange(d)} className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition ${range === d ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{l}</button>
          ))}
        </div>

        {!isReal ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-10 text-center">
            <p className="font-bold text-slate-600">로그인하면 실시간 트렌드를 볼 수 있어요.</p>
            <button onClick={() => setShowAuth(true)} className="mt-3 inline-block rounded-full bg-[#0064FF] px-5 py-2 text-sm font-bold text-white">로그인하러 가기</button>
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 py-10 text-slate-400"><Loader2 size={16} className="animate-spin" />트렌드 불러오는 중…</div>
        ) : err ? (
          <div className="py-10 text-red-500">{err}</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((it, i) => {
              const clip = { title: it.caption, source: 'instagram', thumbnail_url: it.thumbnail_url, author: it.owner, views: it.view_count, likes: it.like_count, comments: it.comment_count, page_url: it.url, video_url: it.video_url, video_id: it.shortcode }
              return (
                <div key={it.shortcode || i} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <a href={it.url} target="_blank" rel="noreferrer noopener" className="relative block aspect-[9/16] bg-slate-100">
                    <TrendThumb url={it.thumbnail_url} />
                    <div className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">#{i + 1}</div>
                  </a>
                  <div className="p-2">
                    <div className="mb-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-0.5"><Eye size={11} />{fmt(it.view_count)}</span>
                      <span className="flex items-center gap-0.5"><Heart size={11} />{fmt(it.like_count)}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle size={11} />{fmt(it.comment_count)}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => handleAnalyze(clip)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#0064FF] py-1.5 text-xs font-bold text-white transition hover:brightness-95"><Sparkles size={12} />분석</button>
                      <button onClick={() => { window.location.href = '/finds?url=' + encodeURIComponent(it.url) }} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs font-bold text-slate-600 transition hover:border-[#0064FF] hover:text-[#0064FF]">비슷한 소스</button>
                    </div>
                  </div>
                </div>
              )
            })}
            {!list.length && <div className="col-span-full p-10 text-center text-sm text-slate-400">해당 기간에 트렌드가 없어요.</div>}
          </div>
        )}
      </div>
      {modalClip && <AnalyzeModal clip={modalClip} onClose={() => setModalClip(null)} />}
      <FindsPricing open={payWall} onClose={() => setPayWall(false)} />
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      <div className="h-16 md:hidden" />
      <FindsBottomNav />
    </div>
  )
}

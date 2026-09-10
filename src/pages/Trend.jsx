import { useState, useEffect } from 'react'
import HeaderInstallBtn from '../components/HeaderInstallBtn'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { Flame, Eye, Heart, MessageCircle, ExternalLink, Loader2, Sparkles, HelpCircle, Zap, Lock, Crown, X, Play, Bookmark } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { phCapture } from '../lib/posthog'

const CATS = ['전체','리빙','육아','푸드','잡화','패션','디지털','뷰티']
const NICHE_TO_CAT = { '뷰티·화장품':'뷰티','패션·의류':'패션','리빙·홈·주방':'리빙','잡화·소품':'잡화','푸드·식품':'푸드','육아·키즈':'육아','헬스·건강':'헬스','반려동물':'반려','디지털·가전':'디지털' }

const NICHE_KW = {
  '뷰티·화장품': ['뷰티','화장','메이크업','스킨','코스메','립','파운데','세럼','선크림','쿠션','클렌징'],
  '패션·의류': ['패션','옷','코디','스타일','원피스','니트','자켓','데일리룩','아우터','청바지'],
  '리빙·홈·주방': ['리빙','주방','살림','정리','수납','인테리어','키친','청소','생활','주방템'],
  '잡화·소품': ['잡화','소품','악세','파우치','가방','키링','문구','다이어리'],
  '푸드·식품': ['푸드','음식','간식','맛집','레시피','다이어트식','건강식','요리'],
  '육아·키즈': ['육아','아기','키즈','유아','베이비','신생아','장난감','이유식'],
  '헬스·건강': ['헬스','운동','다이어트','건강','영양','홈트','단백질','스트레칭'],
  '반려동물': ['강아지','고양이','반려','펫','냥','댕','사료'],
  '디지털·가전': ['가전','전자','디지털','충전','이어폰','usb','조명','가젯','스마트'],
}
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
const timeAgo = (ts) => { if (!ts) return ''; const h = Math.floor((Date.now() - new Date(ts).getTime()) / 3600000); if (h < 1) return '방금'; if (h < 24) return `${h}시간 전`; return `${Math.floor(h / 24)}일 전` }

const SORTS = [['view', '조회수'], ['recent', '최신'], ['like', '좋아요'], ['comment', '댓글']]
const REGIONS = [['전체', ''], ['한국', 'kr'], ['일본', 'jp'], ['미국', 'us']]
const regionOf = (it) => { const c = `${it.caption || ''} ${it.owner || ''}`; if (/[가-힣]/.test(c)) return 'kr'; if (/[ぁ-ゖァ-ヺ]/.test(c)) return 'jp'; return 'us' }
const RANGES = [['24h', '24시간', 1], ['7d', '7일', 7]]
const FOLLOWERS = [['전체', '', ''], ['~1만', '', '10000'], ['1~2만', '10000', '20000'], ['2~3만', '20000', '30000'], ['3~5만', '30000', '50000'], ['5만+', '50000', '']]
const TREND_TTL = 10 * 60 * 1000 // 10분: 이 안이면 재요청 안 함(서버는 최대 24h마다 갱신)
const readTrendCache = () => { try { const c = JSON.parse(localStorage.getItem('chronit_trend_cache') || 'null'); return (c && Array.isArray(c.items)) ? c : null } catch { return null } }
const writeTrendCache = (items, fb, fbCount) => { try { localStorage.setItem('chronit_trend_cache', JSON.stringify({ items, fb: fb || [], fbCount: (typeof fbCount === 'number' ? fbCount : null), at: Date.now() })) } catch { /* noop */ } }

function VideoModal({ clip, onClose, onSource, onAnalyze }) {
  const [src, setSrc] = useState(clip?.video_url || '')
  const [mode, setMode] = useState(clip?.video_url ? 'video' : 'embed')
  const [tried, setTried] = useState(false)
  const onVidError = async () => {
    if (!tried) {
      setTried(true)
      try { const { data } = await supabase.functions.invoke('trend-reel', { body: { shortcode: clip?.video_id } }); if (data?.video_url) { setSrc(data.video_url); return } } catch { /* noop */ }
    }
    setMode('embed')
  }
  if (!clip) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-black" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"><X size={18} /></button>
        {mode === 'video' && src ? (
          <video key={src} src={src} poster={clip.thumbnail_url} controls autoPlay loop muted playsInline onError={onVidError} className="aspect-[9/16] w-full bg-black object-contain" />
        ) : (
          <iframe key="emb" src={`https://www.instagram.com/reel/${clip.video_id}/embed`} title="reel" loading="lazy" allow="autoplay; encrypted-media; clipboard-write" className="aspect-[9/16] w-full border-0 bg-black" />
        )}
        <div className="bg-white p-3">
          <div className="mb-2 flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-0.5"><Eye size={12} />{fmt(clip.views)}</span>
            <span className="flex items-center gap-0.5"><Heart size={12} />{fmt(clip.likes)}</span>
            <span className="flex items-center gap-0.5"><MessageCircle size={12} />{fmt(clip.comments)}</span>
          </div>
          <button onClick={onSource} className="mb-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0064FF] py-3 text-sm font-extrabold text-white transition hover:brightness-95"><Sparkles size={16} />이 영상 소스 찾기</button>
          <button onClick={onAnalyze} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition hover:border-[#0064FF] hover:text-[#0064FF]">벤치마크 분석</button>
        </div>
      </div>
    </div>
  )
}

export default function Trend() {
  const nav = useNavigate()
  const [session, setSession] = useState(null)
  const [items, setItems] = useState(() => readTrendCache()?.items || [])
  const [savedPicks, setSavedPicks] = useState([])
  const [preview, setPreview] = useState([])
  const [previewCount, setPreviewCount] = useState(0)
  const [myNiche, setMyNiche] = useState(() => { try { return localStorage.getItem('chr_niche') || '' } catch { return '' } })
  const [selCat, setSelCat] = useState(() => { try { return NICHE_TO_CAT[localStorage.getItem('chr_niche') || ''] || '전체' } catch { return '전체' } })
  const [showAdv, setShowAdv] = useState(false)
  const toggleSave = async (it) => {
    const sc = it.shortcode; const has = savedPicks.includes(sc)
    if (!has) { try { phCapture('trend_saved', { shortcode: sc }) } catch { /* noop */ } }
    setSavedPicks((prev) => has ? prev.filter((x) => x !== sc) : [...prev, sc])
    try {
      if (has) await supabase.from('saved_trends').delete().eq('shortcode', sc)
      else await supabase.from('saved_trends').insert({ shortcode: sc, caption: it.caption, thumbnail_url: it.thumbnail_url, url: it.url, owner: it.owner, view_count: it.view_count, like_count: it.like_count, comment_count: it.comment_count, velocity: it.velocity, taken_at: it.taken_at })
    } catch { /* noop */ }
  }
  const [fbItems, setFbItems] = useState(() => readTrendCache()?.fb || [])
  const [fbCountSrv, setFbCountSrv] = useState(() => { const c = readTrendCache(); return c && typeof c.fbCount === 'number' ? c.fbCount : null })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [sort, setSort] = useState('view')
  const [showHelp, setShowHelp] = useState(false)
  const [range, setRange] = useState(7)
  const [fMin, setFMin] = useState('')
  const [fMax, setFMax] = useState('')
  const [region, setRegion] = useState('')
  const [fastBench, setFastBench] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [previewLock, setPreviewLock] = useState(false)
  const [modalClip, setModalClip] = useState(null)
  const [payWall, setPayWall] = useState(false)
  const [analyzedIds, setAnalyzedIds] = useState([])
  const [showAuth, setShowAuth] = useState(false)
  const [playClip, setPlayClip] = useState(null)
  const isReal = !!session && session.user?.is_anonymous !== true

  const handleAnalyze = async (clip) => {
    const key = clip.page_url || clip.title
    try { phCapture('trend_item_opened', { source: 'trend' }); phCapture('analysis_clicked', { source: 'trend' }) } catch { /* noop */ }
    if (analyzedIds.includes(key)) { setModalClip(clip); return }
    if (!ackAnalyzeCost(null)) return
    const { data } = await supabase.rpc('use_finds_credit_rpc')
    if (!data?.ok) { nav('/pricing'); return }
    setAnalyzedIds((prev) => [...prev, key])
    setModalClip(clip)
    supabase.rpc('grant_first_analysis_bonus_rpc').catch(() => {})
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => { try { sub.subscription.unsubscribe() } catch { /* noop */ } }
  }, [])

  useEffect(() => {
    const u = session?.user
    if (!u || u.is_anonymous) { setIsAdmin(false); return }
    supabase.from('subscriptions').select('role, plan, expires_at').eq('user_id', u.id).maybeSingle().then(({ data }) => {
      setIsAdmin(data?.role === 'super_admin')
      setIsPaid(['finds30', 'finds100', 'finds300'].includes(data?.plan) && !!data?.expires_at && new Date(data.expires_at) > new Date())
    })
  }, [session])

  useEffect(() => {
    if (!isReal) return
    const cached = readTrendCache()
    if (cached) { setItems(cached.items); setFbItems(cached.fb || []); if (typeof cached.fbCount === 'number') setFbCountSrv(cached.fbCount) }                       // 캐시 있으면 즉시 표시(스피너 없음)
    if (cached && Date.now() - cached.at < TREND_TTL) return  // 신선하면 재요청 스킵
    let alive = true
    if (!cached) setLoading(true)                            // 보여줄 캐시 없을 때만 스피너
    ;(async () => {
      setErr('')
      try {
        const { data: { session: s } } = await supabase.auth.getSession()
        const r = await fetch(FN('trend-feed'), { method: 'POST', headers: { Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        const d = await r.json()
        if (alive) { setItems(d.items || []); setFbItems(d.fastbench_items || []); setFbCountSrv(typeof d.fastbench_count === 'number' ? d.fastbench_count : null); writeTrendCache(d.items || [], d.fastbench_items || [], d.fastbench_count) }  // 백그라운드 갱신 + 캐시 저장
      } catch { if (alive && !cached) setErr('트렌드를 불러오지 못했어요.') }
      finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [session])

  useEffect(() => { if (!isReal) return; try { phCapture('trend_feed_viewed') } catch { /* noop */ }; supabase.from('saved_trends').select('shortcode').then(({ data }) => { if (Array.isArray(data)) setSavedPicks(data.map((r) => r.shortcode)) }); supabase.from('profiles').select('niche').maybeSingle().then(({ data }) => { const n = data && data.niche; if (n && NICHE_TO_CAT[n]) { setMyNiche(n); setSelCat((c) => c === '전체' ? NICHE_TO_CAT[n] : c); try { localStorage.setItem('chr_niche', n) } catch { /* noop */ } } }) }, [isReal])
  useEffect(() => { if (isReal) return; supabase.rpc('public_trend_preview_rpc', { p_limit: 12 }).then(({ data }) => { if (Array.isArray(data)) setPreview(data) }).catch(() => {}); supabase.rpc('public_trend_count_rpc').then(({ data }) => { if (typeof data === 'number') setPreviewCount(data) }).catch(() => {}) }, [isReal])

  if (!FEATURES.trendFeed) return <Navigate to="/" replace />

  const now = Date.now()
  const FB_SCORE = 12
  const fbScore = (it) => ((Number(it.comment_count) || 0) * 1000 + (Number(it.like_count) || 0) * 50 + (Number(it.view_count) || 0)) / Math.max(Number(it.follower_count) || 0, 1000)
  const fbCount = fbCountSrv != null ? fbCountSrv : items.filter((it) => it.taken_at && (now - new Date(it.taken_at).getTime() <= 2 * 86400000) && fbScore(it) >= FB_SCORE).length
  const matchNiche = (it) => { const kws = NICHE_KW[myNiche]; if (!kws) return false; const t = ((it.caption || '') + ' ' + (it.hashtag || '')).toLowerCase(); return kws.some((k) => t.includes(k)) }
  const _listBase = (fastBench && Array.isArray(fbItems) && fbItems.length ? fbItems : items)
    .filter((it) => {
      const win = fastBench ? 2 * 86400000 : (range === 0 ? Infinity : range * 86400000)
      return win === Infinity ? true : (it.taken_at && now - new Date(it.taken_at).getTime() <= win)
    })
    .filter((it) => {
      if (!fastBench) return true
      return fbScore(it) >= FB_SCORE
    })
    .filter((it) => {
      const lo = Number(fMin) || 0, hi = Number(fMax) || 0
      if (!lo && !hi) return true
      const fc = Number(it.follower_count)
      if (!fc) return false
      if (lo && fc < lo) return false
      if (hi && fc > hi) return false
      return true
    })
    .filter((it) => !region || regionOf(it) === region)
    .filter((it) => selCat === '전체' || it.category === selCat)
    .filter((it) => String(it.video_url || '') !== '')
    .sort((a, b) => {
      if (fastBench) return fbScore(b) - fbScore(a)
      if (sort === 'recent') return new Date(b.taken_at || 0) - new Date(a.taken_at || 0)
      const mk = sort === 'view' ? 'view_count' : sort === 'like' ? 'like_count' : 'comment_count'
      return (Number(b[mk]) || 0) - (Number(a[mk]) || 0)
    })
  const list = _listBase

  const fbQual = (it) => !!it.taken_at && (now - new Date(it.taken_at).getTime() <= 2 * 86400000) && fbScore(it) >= FB_SCORE
  const gateOn = previewLock || (!isPaid && !isAdmin)
  const lockedCount = gateOn ? (fbCountSrv != null ? fbCountSrv : list.filter(fbQual).length) : 0
  const pickScore = (it) => {
    const vel = Number(it.velocity) || 0
    const ageDays = it.taken_at ? (now - new Date(it.taken_at).getTime()) / 86400000 : 999
    const fresh = Math.max(0, 1 - ageDays / 14)                         // 신선도(최근 14일)
    const views = Number(it.view_count) || 0
    const engage = views > 0 ? Math.min(1, (Number(it.comment_count) || 0) / views * 400) : 0  // 수요 신호(댓글/조회)
    const lowSat = views > 0 ? Math.max(0, 1 - Math.min(1, views / 500000)) : 0.5              // 저포화(아직 덜 퍼짐)
    return vel * 0.5 + fresh * 30 * 0.25 + engage * 30 * 0.15 + lowSat * 30 * 0.1
  }
  const todayPicks = [...list].filter((it) => it && it.taken_at && (now - new Date(it.taken_at).getTime() <= 14 * 86400000)).sort((a, b) => pickScore(b) - pickScore(a)).slice(0, 3)

  return (
    <div>

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
                  최근 <b className="text-slate-800">반응이 터진</b>(댓글·조회수 높은) 쇼핑 릴스를 모읍니다. 위 <b className="text-slate-800">팔로워</b> 범위로 원하는 계정 규모만 골라 볼 수 있습니다.
                </div>
              )}
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-500">지금 뜨는 쇼핑 숏폼을 한눈에. 조회수·좋아요 순으로 정렬해 확인하세요.</p>
          <p className="mt-0.5 text-[11px] text-slate-400">[분석]은 이용권 1개가 차감돼요 · 이미 분석한 소스는 다시 열어도 무료예요</p>
        </header>

        {isReal && !fastBench && fbCount > 0 && (
          <button onClick={() => setFastBench(true)} className="mb-4 flex w-full items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-left ring-1 ring-amber-400/30 transition hover:brightness-125 active:scale-[0.99]">
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-[11px] font-extrabold tracking-wide text-amber-400"><Crown size={13} /> 패스트벤치 · 구독 전용</span>
              <span className="mt-0.5 block text-sm font-bold text-white">터진 뒤 따라하면 늦어요. 상위 크리에이터처럼 <span className="text-amber-300">터지는 순간</span> 먼저 잡으세요</span>
            </span>
            <span className="shrink-0 whitespace-nowrap rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-extrabold text-slate-900">{fbCount}개 열기 →</span>
          </button>
        )}

        {isReal && (
        <div className="relative mb-5 flex max-w-xs rounded-xl bg-slate-100 p-1 text-sm font-bold">
          <span aria-hidden className="absolute left-1 top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-lg bg-white shadow-sm transition-transform duration-300 ease-out" style={{ transform: fastBench ? 'translateX(100%)' : 'translateX(0)' }} />
          <button onClick={() => setFastBench(false)} className={`relative z-10 flex-1 rounded-lg py-2 transition-colors ${!fastBench ? 'text-[#0064FF]' : 'text-slate-500'}`}>트렌드</button>
          <button onClick={() => setFastBench(true)} className={`relative z-10 flex-1 rounded-lg py-2 transition-colors ${fastBench ? 'text-[#0064FF]' : 'text-slate-500'}`}>패스트벤치{fbCount > 0 ? ` ${fbCount}` : ''}</button>
        </div>
        )}
        {isAdmin && <button onClick={() => setPreviewLock((v) => !v)} className={`mb-4 rounded-full px-3 py-1 text-xs font-bold transition ${previewLock ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>블러 미리보기(관리자) {previewLock ? 'ON' : 'OFF'}</button>}

        {isReal && !fastBench && (
        <div className="mb-5">
          <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATS.map((c) => (
              <button key={c} onClick={() => setSelCat(c)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold transition ${selCat === c ? 'bg-[#0064FF] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-[#0064FF] hover:text-[#0064FF]'}`}>{c}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700">
              {SORTS.map(([k, l]) => <option key={k} value={k}>{l}순</option>)}
            </select>
            <select value={range} onChange={(e) => setRange(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700">
              <option value={0}>전체 기간</option>
              {RANGES.map(([k, l, d]) => <option key={k} value={d}>{l}</option>)}
            </select>
            <button onClick={() => setShowAdv((v) => !v)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-500 hover:border-[#0064FF] hover:text-[#0064FF]">상세 필터 {showAdv ? '▴' : '▾'}</button>
          </div>
        </div>
        )}
        {fastBench && <p className="mb-3 -mt-2 flex items-center gap-1 text-xs font-semibold text-amber-600"><Crown size={12} /> 먼저 움직이는 크리에이터의 선점 리스트 — 최근 48시간 · 터짐 점수순</p>}

        {isReal && !fastBench && showAdv && (<div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
          <span className="text-sm font-bold text-slate-500">지역</span>
          {REGIONS.map(([l, v]) => (
            <button key={l} onClick={() => setRegion(v)} className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${region === v ? 'bg-[#0064FF] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-[#0064FF] hover:text-[#0064FF]'}`}>{l}</button>
          ))}
          <span className="mx-1 h-4 w-px bg-slate-200" />
          <span className="text-sm font-bold text-slate-500">팔로워</span>
          {FOLLOWERS.map(([l, lo, hi]) => {
            const active = String(fMin) === String(lo) && String(fMax) === String(hi)
            return <button key={l} onClick={() => { setFMin(lo); setFMax(hi) }} className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${active ? 'bg-[#0064FF] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-[#0064FF] hover:text-[#0064FF]'}`}>{l}</button>
          })}
          <span className="mx-1 h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-1 text-sm text-slate-500">
            <input type="number" inputMode="numeric" value={fMin} onChange={(e) => setFMin(e.target.value)} placeholder="최소" className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm" />
            <span className="text-slate-400">~</span>
            <input type="number" inputMode="numeric" value={fMax} onChange={(e) => setFMax(e.target.value)} placeholder="최대" className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm" />
          </div>
        </div>)}

        {!isReal ? (
          (() => {
            const previewPicks = [...preview].sort((a, b) => pickScore(b) - pickScore(a)).slice(0, 3)
            const rest = preview.slice(3)
            return (
            <div>
              {/* 오늘 먼저 볼 3개 — 선명하게(훅) */}
              {previewPicks.length > 0 && (
                <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-sm font-extrabold text-white">🔥 오늘 먼저 볼 트렌드 3개</div>
                  <p className="mb-3 mt-0.5 text-xs text-white/50">지금 반응이 빠르게 올라오는 소재{previewCount ? ` ${previewCount}개` : ''}. 로그인하면 전체 + 분석까지.</p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {previewPicks.map((it, i) => (
                      <div key={it.shortcode || i} role="button" onClick={() => setShowAuth(true)} className="cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                        <div className="relative aspect-[9/16] bg-white/5">
                          {it.thumbnail_url && <TrendThumb url={it.thumbnail_url} />}
                          {it.velocity != null && <div className="absolute left-1 top-1 rounded bg-[#0064FF] px-1.5 py-0.5 text-[10px] font-bold text-white">↑{Math.round(it.velocity)}</div>}
                        </div>
                        <div className="p-2">
                          <div className="mb-1 flex gap-1.5 text-[10px] text-white/45"><span>👁 {fmt(it.view_count)}</span><span>💬 {fmt(it.comment_count)}</span></div>
                          <div className="line-clamp-2 text-[11px] text-white/70">{it.caption || '(설명 없음)'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 로그인 CTA — 크게 */}
              <button onClick={() => setShowAuth(true)} className="mb-5 w-full rounded-xl bg-[#0064FF] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#0064FF]/20 transition hover:brightness-95 active:scale-[0.99]">{previewCount ? `무료로 가입하고 트렌드 ${previewCount}개 전체 보기 →` : '무료로 가입하고 전체 트렌드 + 분석 보기 →'}</button>

              {/* 나머지 블러 — 자연스럽게 페이드아웃 */}
              <div className="relative">
                <div className="pointer-events-none grid grid-cols-3 gap-3 blur-[6px] sm:grid-cols-4"
                  style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent)', maskImage: 'linear-gradient(to bottom, black 50%, transparent)' }}>
                  {(rest.length ? rest.slice(0, 8) : Array.from({ length: 8 })).map((it, i) => (
                    <div key={(it && it.shortcode) || i} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                      <div className="relative aspect-[9/16] bg-white/5">{it && it.thumbnail_url && <TrendThumb url={it.thumbnail_url} />}</div>
                      <div className="p-2"><div className="h-3 w-3/4 rounded bg-white/10" /></div>
                    </div>
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
                  <button onClick={() => setShowAuth(true)} className="pointer-events-auto rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/85 backdrop-blur transition hover:bg-white/15">{previewCount ? `+${Math.max(0, previewCount - 3)}개 더 · 가입하고 전체 보기 →` : '가입하고 전체 보기 →'}</button>
                </div>
              </div>
            </div>
            )
          })()
        ) : loading ? (
          <div className="flex items-center gap-2 py-10 text-slate-400"><Loader2 size={16} className="animate-spin" />트렌드 불러오는 중…</div>
        ) : err ? (
          <div className="py-10 text-red-500">{err}</div>
        ) : (
          <>
          {todayPicks.length > 0 && (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-extrabold text-slate-900">🔥 오늘 먼저 볼 트렌드 3개</div>
              <p className="mb-3 mt-0.5 text-xs text-slate-500">지금 반응이 빠르게 올라오는 소재만 골랐어요. 포화 전에 먼저 선점하세요.</p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {todayPicks.map((it, i) => {
                  const clip = { title: it.caption, source: 'instagram', thumbnail_url: it.thumbnail_url, author: it.owner, views: it.view_count, likes: it.like_count, comments: it.comment_count, page_url: it.url, video_url: it.video_url, video_id: it.shortcode, taken_at: it.taken_at, velocity: it.velocity }
                  const vel = Number(it.velocity) || 0
                  const fresh = it.taken_at && (now - new Date(it.taken_at).getTime() <= 3 * 86400000)
                  const saved = savedPicks.includes(it.shortcode)
                  return (
                    <div key={it.shortcode || i} className="flex gap-2.5 rounded-xl border border-slate-100 bg-slate-50 p-2.5 sm:flex-col">
                      <div role="button" onClick={() => setPlayClip(clip)} className="relative aspect-[9/16] w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-slate-200 sm:w-full">
                        <TrendThumb url={it.thumbnail_url} />
                        <div className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] font-bold text-white">#{i + 1}</div>
                        <button onClick={(e) => { e.stopPropagation(); toggleSave(it) }} aria-label="이번 주 소재로 저장" className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75">
                          <Bookmark size={12} className={saved ? 'fill-emerald-400 text-emerald-400' : ''} />
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap gap-1">
                          {vel > 0 && <span className="rounded-full bg-[#0064FF]/10 px-2 py-0.5 text-[10px] font-bold text-[#0064FF]">지금 퍼지는 중 · ↑{Math.round(vel)}</span>}
                          {(Number(it.view_count) || 0) < 300000 ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">아직 덜 퍼짐 · 선점 기회</span> : fresh ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">최근 등장</span> : null}
                        </div>
                        <div className="mb-2 line-clamp-2 text-[12px] font-medium text-slate-700">{it.caption || '(설명 없음)'}</div>
                        <div className="flex gap-1.5">
                          <button onClick={() => handleAnalyze(clip)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#0064FF] py-1.5 text-[11px] font-bold text-white transition hover:brightness-95"><Sparkles size={11} />분석</button>
                          <button onClick={() => { window.location.href = '/research?url=' + encodeURIComponent(it.url) }} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-[#0064FF] hover:text-[#0064FF]">소스 찾기</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {lockedCount > 0 && <p className="mb-3 flex items-start gap-1.5 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-bold text-white"><Crown size={15} className="mt-0.5 shrink-0 text-amber-400" /><span>지금 막 터진 소재 {lockedCount}개 · <span className="text-amber-300">상위 크리에이터는 지금 보고 있어요.</span> 며칠 뒤 무료로 풀리지만, 그땐 남들이 다 따라한 뒤예요.</span></p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((it, i) => {
              const clip = { title: it.caption, source: 'instagram', thumbnail_url: it.thumbnail_url, author: it.owner, views: it.view_count, likes: it.like_count, comments: it.comment_count, page_url: it.url, video_url: it.video_url, video_id: it.shortcode, taken_at: it.taken_at, velocity: it.velocity }
              const locked = gateOn && fbQual(it)
              return (
                <div key={it.shortcode || i} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {locked ? (
                    <div role="button" onClick={() => nav('/pricing')} className="relative block aspect-[9/16] cursor-pointer bg-slate-100">
                      <div className="h-full w-full overflow-hidden blur-[12px]"><TrendThumb url={it.thumbnail_url} /></div>
                      <div className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">#{i + 1}</div>
                      {it.taken_at && <div className="absolute right-1.5 top-1.5 rounded bg-[#0064FF] px-1.5 py-0.5 text-[10px] font-bold text-white">{timeAgo(it.taken_at)}</div>}
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/30 text-white">
                        <Lock size={20} />
                        <span className="text-xs font-bold">구독 유저 전용</span>
                      </div>
                    </div>
                  ) : (
                    <div role="button" onClick={() => setPlayClip(clip)} className="relative block aspect-[9/16] cursor-pointer bg-slate-100">
                      <TrendThumb url={it.thumbnail_url} />
                      <div className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">#{i + 1}</div>
                      {it.taken_at && <div className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">{timeAgo(it.taken_at)}</div>}
                      <div className="absolute inset-0 flex items-center justify-center opacity-90"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white"><Play size={16} className="ml-0.5" /></div></div>
                      <button onClick={(e) => { e.stopPropagation(); toggleSave(it) }} aria-label="이번 주 소재로 저장" className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75">
                        <Bookmark size={14} className={savedPicks.includes(it.shortcode) ? 'fill-emerald-400 text-emerald-400' : ''} />
                      </button>
                    </div>
                  )}
                  <div className="p-2">
                    <div className="mb-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-0.5"><Eye size={11} />{fmt(it.view_count)}</span>
                      <span className="flex items-center gap-0.5"><Heart size={11} />{fmt(it.like_count)}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle size={11} />{fmt(it.comment_count)}</span>
                    </div>
                    <div className="mb-1.5 truncate text-[11px] text-slate-400">{locked ? '구독 유저 전용' : `@${it.owner}${it.follower_count ? ` · 팔로워 ${fmt(it.follower_count)}` : ''}`}</div>
                    {locked ? (
                      <button onClick={() => nav('/pricing')} className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#0064FF] py-1.5 text-xs font-bold text-white transition hover:brightness-95"><Lock size={12} />잠금 해제하고 보기</button>
                    ) : (
                      <div className="flex gap-1.5">
                        <button onClick={() => handleAnalyze(clip)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#0064FF] py-1.5 text-xs font-bold text-white transition hover:brightness-95"><Sparkles size={12} />분석</button>
                        <button onClick={() => { window.location.href = '/research?url=' + encodeURIComponent(it.url) }} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs font-bold text-slate-600 transition hover:border-[#0064FF] hover:text-[#0064FF]">소스 찾기</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {!list.length && <div className="col-span-full p-10 text-center text-sm text-slate-400">{(fMin || fMax) ? '이 팔로워 구간은 아직 준비 중이에요. 곧 더 많은 계정을 추가할 예정이에요.' : '해당 기간에 트렌드가 없어요.'}</div>}
          </div>
          </>
        )}
      </div>
      {modalClip && <AnalyzeModal clip={modalClip} onClose={() => setModalClip(null)} />}
      {playClip && <VideoModal clip={playClip} onClose={() => setPlayClip(null)} onSource={() => { window.location.href = '/research?url=' + encodeURIComponent(playClip.page_url) }} onAnalyze={() => { setPlayClip(null); handleAnalyze(playClip) }} />}
      <FindsPricing open={payWall} onClose={() => setPayWall(false)} />
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      <div className="h-16 md:hidden" />
      <FindsBottomNav />
    </div>
  )
}

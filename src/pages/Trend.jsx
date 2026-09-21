import { useState, useEffect, useRef } from 'react'
import HeaderInstallBtn from '../components/HeaderInstallBtn'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { Flame, Eye, Heart, MessageCircle, ExternalLink, Loader2, Sparkles, HelpCircle, Zap, Crown, X, Bookmark } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { phCapture } from '../lib/posthog'
import { fbTrack } from '../lib/fbq'
import { useWatchToggle } from '../lib/useWatchToggle'
import { useProPlus } from '../lib/useProPlus'
import RangeFilter from '../components/RangeFilter'
import {
  DAY_MAX, DAY_MARKS, FB_DAY_MAX, FB_DAY_MARKS, dayWindowMs,
  COMMENT_MAX, COMMENT_MARKS, FOLLOWER_MAX, FOLLOWER_MARKS, manFmt,
  isCarousel, matchPostType, coverOf, viewRankOf, feedClip, openPost,
} from '../lib/filterConfig'
import PostTypeToggle from '../components/PostTypeToggle'
import VideoModal from '../components/ReelModal'
import TrendCard, { TrendThumb } from '../components/TrendCard'
import { memList, memFb, readSkeleton, loadTrendList, loadFastbench, loadDetail } from '../lib/trendStore'
import QuestStrip from '../components/QuestStrip'
import NewSinceBadges from '../components/NewSinceBadges'
import { fmtCount as fmt } from '../lib/format'

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


const SORTS = [['view', '조회수'], ['recent', '최신'], ['like', '좋아요'], ['comment', '댓글']]
const FB_SORTS = [['score', '터짐 점수'], ...SORTS]
const REGIONS = [['전체', ''], ['한국', 'kr'], ['일본', 'jp'], ['미국', 'us']]
const regionOf = (it) => { const c = `${it.caption || ''} ${it.owner || ''}`; if (/[가-힣]/.test(c)) return 'kr'; if (/[ぁ-ゖァ-ヺ]/.test(c)) return 'jp'; return 'us' }

// 트렌드 목록은 trend_feed 를 직접 읽는다. 예전엔 trend-feed 엣지 함수를 기다렸는데,
// 그 함수는 매 호출마다 테이블을 두 번 훑고 팔로워를 조인하며, 데이터가 24시간 넘게 묵으면
// 사용자 요청 안에서 Apify 스크래핑(최대 110초)까지 돌린다. 표시에 필요한 값은 이미 테이블에 있다.
const FEED_DAYS = 8

// 마지막으로 고른 카테고리만 기억한다(니치로 자동 선택하면 새로고침 때마다 바뀐 것처럼 보인다)
const CAT_KEY = 'chr_trend_cat'
const readCat = () => { try { const c = localStorage.getItem(CAT_KEY); return CATS.includes(c) ? c : '전체' } catch { return '전체' } }

export default function Trend() {
  const nav = useNavigate()
  const [session, setSession] = useState(null)
  // 메모리에 있으면 그대로(로딩 0), 없으면 지난 방문의 골격만 먼저 그린다(수치는 비워둠)
  const [items, setItems] = useState(() => memList() || readSkeleton() || [])
  const [preview, setPreview] = useState([])
  const [previewCount, setPreviewCount] = useState(0)
  const [myNiche, setMyNiche] = useState(() => { try { return localStorage.getItem('chr_niche') || '' } catch { return '' } })
  const [selCat, setSelCat] = useState(readCat)
  const [showAdv, setShowAdv] = useState(true)   // 슬라이더를 못 찾는다는 피드백 → 기본 펼침
  const [limitModal, setLimitModal] = useState(null)
  const [loading, setLoading] = useState(() => !(memList() || readSkeleton()))
  const [err, setErr] = useState('')
  const [sort, setSort] = useState('view')
  const [fbSort, setFbSort] = useState('score')   // 팔로워 대비 댓글(comment_per_follower) 순
  const [fbRpc, setFbRpc] = useState(memFb)       // fastbench_feed_rpc 결과 (null = 아직 안 받음)
  const [fbRange, setFbRange] = useState(FB_DAY_MAX)   // 패스트벤치 전용 기간(서버 파라미터)
  const [showHelp, setShowHelp] = useState(false)
  const [range, setRange] = useState(DAY_MAX)
  const [fMin, setFMin] = useState('')
  const [fMax, setFMax] = useState('')
  const [region, setRegion] = useState('')
  const [minComments, setMinComments] = useState(0)
  const [postType, setPostType] = useState('all')   // all | reel | carousel — 트렌드·패스트벤치 공용
  const [fastBench, setFastBench] = useState(false)
  const [previewLock, setPreviewLock] = useState(false)
  const [modalClip, setModalClip] = useState(null)
  const [payWall, setPayWall] = useState(false)
  const [analyzedIds, setAnalyzedIds] = useState([])
  const [showAuth, setShowAuth] = useState(false)
  const [playClip, setPlayClip] = useState(null)
  const isReal = !!session && session.user?.is_anonymous !== true
  // 패스트벤치는 프로(finds100)·비즈니스(finds300) 전용 — 스탠다드/무료는 블러 (샤오홍슈 참고검색과 같은 기준)
  const { isProPlus, isAdmin } = useProPlus(session)
  // 카드의 북마크 = 그 계정을 워치리스트에 담기/빼기
  const { isWatched, toggle: toggleWatch } = useWatchToggle({
    enabled: isReal, source: 'trend',
    onNeedLogin: () => setShowAuth(true),
    onLimit: (limit) => setLimitModal({ limit }),
  })

  // 목록엔 video_url·images·전체 캡션이 없다(가볍게 유지) → 누를 때만 받아온다
  const openItem = async (it) => {
    const d = await loadDetail(it.shortcode)
    const merged = { ...it, ...(d || {}) }
    if (merged.video_url) setPlayClip(feedClip(merged))
    else openPost(merged.url || it.url)
  }

  const handleAnalyze = async (clip) => {
    const key = clip.page_url || clip.title
    try { phCapture('trend_item_opened', { source: 'trend' }); phCapture('analysis_clicked', { source: 'trend' }) } catch { /* noop */ }
    if (analyzedIds.includes(key)) { setModalClip(clip); return }
    if (!ackAnalyzeCost(null)) return
    const { data } = await supabase.rpc('use_finds_credit_rpc')
    if (!data?.ok) { nav('/pricing'); return }
    setAnalyzedIds((prev) => [...prev, key])
    setModalClip(clip)
    supabase.rpc('grant_first_analysis_bonus_rpc').then(null, () => {})
  }

  // 메타 픽셀 전환: /trend 도달 1회 (로그인 여부 무관)
  const vcSent = useRef(false)
  useEffect(() => {
    if (vcSent.current) return
    vcSent.current = true
    fbTrack('ViewContent', { content_name: 'trend_feed', content_category: 'trend' })
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => { try { sub.subscription.unsubscribe() } catch { /* noop */ } }
  }, [])

  useEffect(() => {
    if (!isReal) return
    let alive = true

    const load = async () => {
      try {
        const rows = await loadTrendList({ limit: 200, days: FEED_DAYS, includeCarousel: postType !== 'reel' })
        if (!alive) return
        setErr(''); setItems(rows); setLoading(false)
      } catch {
        if (alive) { setErr('트렌드를 불러오지 못했어요.'); setLoading(false) }
      }
    }

    const run = async () => {
      await load()
      // 수집 갱신은 서버 몫 — 화면을 막지 않게 던져만 두고, 끝나면 조용히 다시 읽는다
      try {
        const { data: { session: s } } = await supabase.auth.getSession()
        if (s?.access_token) {
          fetch(FN('trend-feed'), { method: 'POST', headers: { Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
            .then(() => { if (alive) load() }, () => {})
        }
      } catch { /* noop */ }
    }
    run()
    return () => { alive = false }
  }, [isReal, postType])

  // 패스트벤치는 서버가 걸러 준다(댓글 수·기간·캐러셀·팔로워 상한).
  // 트렌드 탭에서도 미리 받아둔다 — 안내 배너의 개수를 옛 캐시가 아니라 최신값으로 보여주려고.
  useEffect(() => {
    if (!isReal) return
    let dead = false
    const run = async () => {
      let rows = []
      try {
        rows = await loadFastbench({
          limit: 60,
          minComments: minComments > 0 ? minComments : 200,
          days: fbRange,
          includeCarousel: postType !== 'reel',
          // 팔로워 상한은 서버에서 거른다(하한은 응답의 follower_count 로 아래에서)
          maxFollowers: fMax ? Number(fMax) : null,
        })
      } catch { /* noop */ }
      if (dead) return
      setFbRpc(rows)
    }
    run()
    return () => { dead = true }
  }, [isReal, fastBench, minComments, fbRange, postType, fMax])

  useEffect(() => { if (!isReal) return; try { phCapture('trend_feed_viewed') } catch { /* noop */ }; supabase.from('profiles').select('niche').maybeSingle().then(({ data }) => { const n = data && data.niche; if (n && NICHE_TO_CAT[n]) { setMyNiche(n); setSelCat((c) => c === '전체' ? NICHE_TO_CAT[n] : c); try { localStorage.setItem('chr_niche', n) } catch { /* noop */ } } }) }, [isReal])
  useEffect(() => { if (isReal) return; supabase.rpc('public_trend_preview_rpc', { p_limit: 12 }).then(({ data }) => { if (Array.isArray(data)) setPreview(data) }).catch(() => {}); supabase.rpc('public_trend_count_rpc').then(({ data }) => { if (typeof data === 'number') setPreviewCount(data) }).catch(() => {}) }, [isReal])

  if (!FEATURES.trendFeed) return <Navigate to="/" replace />

  const now = Date.now()
  const FB_SCORE = 12
  const fbScore = (it) => ((Number(it.comment_count) || 0) * 1000 + (Number(it.like_count) || 0) * 50 + (Number(it.view_count) || 0)) / Math.max(Number(it.follower_count) || 0, 1000)
  // 아직 패스트벤치를 안 눌렀으면 개수를 모른다 — 옛 캐시 값을 보여주지 않는다
  const fbCount = Array.isArray(fbRpc) ? fbRpc.length : null
  const matchNiche = (it) => { const kws = NICHE_KW[myNiche]; if (!kws) return false; const t = ((it.caption || '') + ' ' + (it.hashtag || '')).toLowerCase(); return kws.some((k) => t.includes(k)) }
  // 캐러셀만 볼 때 조회수순은 의미가 없어(전부 0) 좋아요순으로 바꿔 적용한다
  const rawSort = fastBench ? fbSort : sort
  const effSort = postType === 'carousel' && rawSort === 'view' ? 'like' : rawSort
  const sortOptions = (fastBench ? FB_SORTS : SORTS)
    .filter(([k]) => !(postType === 'carousel' && k === 'view'))
  // 개인화: 카테고리 칩이 '전체'일 때만 내 니치 소재를 앞으로 올린다.
  // (칩을 직접 고르면 그 선택을 존중해야 하므로 건드리지 않는다)
  const nicheCat = NICHE_TO_CAT[myNiche] || ''
  const nicheFirst = !!nicheCat && selCat === '전체'
  // 패스트벤치: 기간·댓글수·캐러셀은 서버가 이미 걸렀고, 팔로워·영상주소는 응답에 없다 → 그 필터들을 건너뛴다
  const fbMode = fastBench && Array.isArray(fbRpc)
  const _listBase = (fbMode ? fbRpc : items)
    .filter((it) => {
      if (fbMode) return true
      return it.taken_at && now - new Date(it.taken_at).getTime() <= dayWindowMs(range, DAY_MAX)
    })
    .filter((it) => {
      const lo = Number(fMin) || 0, hi = Number(fMax) || 0
      if (!lo && !hi) return true
      const fc = Number(it.follower_count)
      if (!fc) return false
      if (lo && fc < lo) return false
      // 패스트벤치는 상한을 서버(p_max_followers)가 이미 걸렀다
      if (!fbMode && hi && fc > hi) return false
      return true
    })
    .filter((it) => fbMode || !minComments || (Number(it.comment_count) || 0) >= minComments)
    .filter((it) => !region || regionOf(it) === region)
    .filter((it) => selCat === '전체' || it.category === selCat)
    .filter((it) => matchPostType(it, postType))
    .sort((a, b) => {
      // 내 니치를 먼저, 그 안에서 선택한 정렬 기준대로
      if (nicheFirst) {
        const d = (b.category === nicheCat ? 1 : 0) - (a.category === nicheCat ? 1 : 0)
        if (d) return d
      }
      const s = effSort
      // 터짐 점수 = 팔로워 대비 댓글(서버 계산). 없으면 기존 방식으로 떨어진다.
      if (s === 'score') {
        const ca = Number(a.comment_per_follower), cb = Number(b.comment_per_follower)
        if (Number.isFinite(ca) || Number.isFinite(cb)) return (cb || 0) - (ca || 0)
        return fbScore(b) - fbScore(a)
      }
      if (s === 'recent') return new Date(b.taken_at || 0) - new Date(a.taken_at || 0)
      // 조회수순: 캐러셀은 조회수가 0이라 좋아요 수로 비교 (동률이면 댓글수)
      if (s === 'view') return (viewRankOf(b) - viewRankOf(a)) || ((Number(b.comment_count) || 0) - (Number(a.comment_count) || 0))
      const mk = s === 'like' ? 'like_count' : 'comment_count'
      return (Number(b[mk]) || 0) - (Number(a[mk]) || 0)
    })
  const list = _listBase

  const fbQual = (it) => !!it.taken_at && (now - new Date(it.taken_at).getTime() <= 2 * 86400000) && fbScore(it) >= FB_SCORE
  const gateOn = previewLock || (!isProPlus && !isAdmin)
  // 잠긴 개수 = 패스트벤치 대상 수(서버 기준). 아직 못 받았으면 화면에 있는 것으로 어림잡는다.
  const lockedCount = gateOn ? (fbCount != null ? fbCount : list.filter(fbQual).length) : 0
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

        <QuestStrip enabled={isReal} />
        <NewSinceBadges enabled={isReal} items={items} />

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

        {isReal && (
        <div className="mb-5">
          <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATS.map((c) => (
              <button key={c} onClick={() => { setSelCat(c); try { localStorage.setItem(CAT_KEY, c) } catch { /* noop */ } }} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold transition ${selCat === c ? 'bg-[#0064FF] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-[#0064FF] hover:text-[#0064FF]'}`}>{c}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={effSort} onChange={(e) => (fastBench ? setFbSort : setSort)(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700">
              {sortOptions.map(([k, l]) => <option key={k} value={k}>{k === 'score' ? l : `${l}순`}</option>)}
            </select>
            {/* 패널을 접어도 유형 필터가 걸려 있다는 걸 버튼에 남긴다 */}
            <button onClick={() => setShowAdv((v) => !v)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-500 hover:border-[#0064FF] hover:text-[#0064FF]">상세 필터{!showAdv && postType !== 'all' ? ` · ${postType === 'carousel' ? '캐러셀' : '릴스'}` : ''} {showAdv ? '▴' : '▾'}</button>
          </div>
        </div>
        )}
        {fastBench && <p className="mb-3 -mt-2 flex items-center gap-1 text-xs font-semibold text-amber-600"><Crown size={12} /> 먼저 움직이는 크리에이터의 선점 리스트 — 최근 {fbRange}일 · 댓글 {(minComments > 0 ? minComments : 200).toLocaleString('ko-KR')}개 이상</p>}

        {isReal && showAdv && (<div className="mb-5 rounded-xl bg-slate-900 p-4">
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-white/60">지역</span>
              {REGIONS.map(([l, v]) => (
                <button key={l} onClick={() => setRegion(v)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${region === v ? 'bg-[#0064FF] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}>{l}</button>
              ))}
            </div>
            <PostTypeToggle value={postType} onChange={setPostType} />
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
            <RangeFilter
              label="게시일" min={1} step={1} unit="일" infinitySuffix="이하" allAtMax={false}
              max={fastBench ? FB_DAY_MAX : DAY_MAX}
              marks={fastBench ? FB_DAY_MARKS : DAY_MARKS}
              value={fastBench ? fbRange : range}
              onChange={fastBench ? setFbRange : setRange}
            />
            <RangeFilter
              label="댓글수" min={0} max={COMMENT_MAX} step={50} unit="개" infinitySuffix="이상" marks={COMMENT_MARKS}
              value={minComments}
              onChange={setMinComments}
            />
            <RangeFilter
              label="팔로워" min={0} max={FOLLOWER_MAX} step={1000} infinitySuffix="∞" marks={FOLLOWER_MARKS} formatValue={manFmt}
              value={[Number(fMin) || 0, fMax ? Number(fMax) : FOLLOWER_MAX]}
              onChange={([lo, hi]) => { setFMin(lo > 0 ? String(lo) : ''); setFMax(hi < FOLLOWER_MAX ? String(hi) : '') }}
            />
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
                  <div className="flex items-center gap-1.5 text-sm font-extrabold text-white"><Flame size={15} className="text-[#0064FF]" />오늘 먼저 볼 트렌드 3개</div>
                  <p className="mb-3 mt-0.5 text-xs text-white/50">지금 반응이 빠르게 올라오는 소재{previewCount ? ` ${previewCount}개` : ''}. 로그인하면 전체 + 분석까지.</p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {previewPicks.map((it, i) => (
                      <div key={it.shortcode || i} role="button" onClick={() => setShowAuth(true)} className="cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                        <div className="relative aspect-[9/16] bg-white/5">
                          {coverOf(it) && <TrendThumb url={coverOf(it)} sc={it.shortcode} />}
                          {it.velocity != null && <div className="absolute left-1 top-1 rounded bg-[#0064FF] px-1.5 py-0.5 text-[10px] font-bold text-white">↑{Math.round(it.velocity)}</div>}
                        </div>
                        <div className="p-2">
                          <div className="mb-1 flex gap-1.5 text-[10px] text-white/45"><span className="flex items-center gap-0.5"><Eye size={10} />{fmt(it.view_count)}</span><span className="flex items-center gap-0.5"><MessageCircle size={10} />{fmt(it.comment_count)}</span></div>
                          <div className="mb-2 line-clamp-2 text-[11px] text-white/70">{it.caption || '(설명 없음)'}</div>
                          <div className="flex flex-col gap-1">
                            <button onClick={(e) => { e.stopPropagation(); setShowAuth(true) }} className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#0064FF] py-2 text-[11px] font-bold text-white transition hover:brightness-95"><Sparkles size={11} />분석</button>
                            <button onClick={(e) => { e.stopPropagation(); setShowAuth(true) }} className="flex w-full items-center justify-center rounded-lg border border-white/15 py-2 text-[11px] font-bold text-white/70 transition hover:border-[#0064FF] hover:text-white">소스 찾기</button>
                          </div>
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
                      <div className="relative aspect-[9/16] bg-white/5">{it && coverOf(it) && <TrendThumb url={coverOf(it)} sc={it.shortcode} />}</div>
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
        ) : (err && !fbMode) ? (
          // 패스트벤치는 제 소스(fastbench_feed_rpc)를 쓰므로 트렌드 로딩 실패에 가려지면 안 된다
          <div className="py-10 text-red-500">{err}</div>
        ) : (
          <>
          {todayPicks.length > 0 && (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900"><Flame size={15} className="text-[#0064FF]" />오늘 먼저 볼 트렌드 3개</div>
              <p className="mb-3 mt-0.5 text-xs text-slate-500">지금 반응이 빠르게 올라오는 소재만 골랐어요. 포화 전에 먼저 선점하세요.</p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {todayPicks.map((it, i) => {
                  const clip = feedClip(it)
                  const carousel = isCarousel(it)
                  const vel = Number(it.velocity) || 0
                  const fresh = it.taken_at && (now - new Date(it.taken_at).getTime() <= 3 * 86400000)
                  const watching = isWatched(it.owner)
                  return (
                    <div key={it.shortcode || i} className="flex gap-2.5 rounded-xl border border-slate-100 bg-slate-50 p-2.5 sm:flex-col">
                      <div role="button" onClick={() => (carousel ? openPost(it.url) : openItem(it))} className="relative aspect-[9/16] w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-slate-200 sm:w-full">
                        <TrendThumb url={coverOf(it)} sc={it.shortcode} />
                        <div className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] font-bold text-white">#{i + 1}</div>
                        {/* 피드 카드와 눈에 띄는 정도를 맞춤 (모바일은 썸네일이 64px라 과하지 않게) */}
                        <button onClick={(e) => { e.stopPropagation(); toggleWatch(it.owner) }} title={watching ? `@${it.owner} 감시 해제` : `@${it.owner} 워치리스트에 추가`} aria-label={watching ? `@${it.owner} 감시 해제` : `@${it.owner} 워치리스트에 추가`} aria-pressed={watching} className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white shadow-lg ring-1 ring-white/20 backdrop-blur transition hover:bg-black/85 active:scale-95 sm:bottom-2 sm:right-2 sm:h-12 sm:w-12">
                          <Bookmark size={20} strokeWidth={2.25} className={watching ? 'fill-emerald-400 text-emerald-400' : ''} />
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap gap-1">
                          {vel > 0 && <span className="rounded-full bg-[#0064FF]/10 px-2 py-0.5 text-[10px] font-bold text-[#0064FF]">지금 퍼지는 중 · ↑{Math.round(vel)}</span>}
                          {!carousel && (Number(it.view_count) || 0) < 300000 ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">아직 덜 퍼짐 · 선점 기회</span> : fresh ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">최근 등장</span> : null}
                        </div>
                        <div className="mb-2 line-clamp-2 text-[12px] font-medium text-slate-700">{it.caption || '(설명 없음)'}</div>
                        <div className="flex gap-1.5">
                          <button onClick={async () => { const d = await loadDetail(it.shortcode); handleAnalyze({ ...clip, ...(d ? { video_url: d.video_url, title: d.caption || clip.title } : {}) }) }} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#0064FF] py-1.5 text-[11px] font-bold text-white transition hover:brightness-95"><Sparkles size={11} />분석</button>
                          <button onClick={() => { window.location.href = '/research?url=' + encodeURIComponent(it.url) }} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-[#0064FF] hover:text-[#0064FF]">소스 찾기</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {lockedCount > 0 && <p className="mb-3 flex items-start gap-1.5 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-bold text-white"><Crown size={15} className="mt-0.5 shrink-0 text-amber-400" /><span>지금 막 터진 소재 {lockedCount}개 · <span className="text-amber-300">패스트벤치는 프로 이상 전용이에요.</span> 며칠 뒤 무료로 풀리지만, 그땐 남들이 다 따라한 뒤예요.</span></p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((it, i) => {
              const clip = feedClip(it)
              const locked = gateOn && fbQual(it)
              return (
                <TrendCard
                  key={it.shortcode || i}
                  it={it} rank={i + 1} locked={locked}
                  watching={isWatched(it.owner)}
                  lazyDetail
                  onPlay={() => openItem(it)}
                  onAnalyze={async () => { const d = await loadDetail(it.shortcode); handleAnalyze({ ...clip, ...(d ? { video_url: d.video_url, title: d.caption || clip.title } : {}) }) }}
                  onSource={() => { window.location.href = '/research?url=' + encodeURIComponent(it.url) }}
                  onToggleWatch={() => toggleWatch(it.owner)}
                  onUnlock={() => nav('/pricing')}
                />
              )
            })}
            {!list.length && <div className="col-span-full p-10 text-center text-sm text-slate-400">{postType === 'carousel' ? '조건에 맞는 캐러셀이 아직 없어요.' : minComments ? `댓글 ${minComments.toLocaleString('ko-KR')}개 이상인 소재가 아직 없어요. 조건을 낮춰보세요.` : (fMin || fMax) ? '이 팔로워 구간은 아직 준비 중이에요. 곧 더 많은 계정을 추가할 예정이에요.' : '해당 기간에 트렌드가 없어요.'}</div>}
          </div>
          </>
        )}
      </div>
      {modalClip && <AnalyzeModal clip={modalClip} onClose={() => setModalClip(null)} />}
      {playClip && <VideoModal clip={playClip} onClose={() => setPlayClip(null)} onSource={() => { window.location.href = '/research?url=' + encodeURIComponent(playClip.page_url) }} onAnalyze={() => { setPlayClip(null); handleAnalyze(playClip) }} />}
      <FindsPricing open={payWall} onClose={() => setPayWall(false)} />
      {limitModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={() => setLimitModal(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-base font-bold">감시 계정 한도 초과</h3>
            <p className="text-sm leading-relaxed text-slate-600">현재 요금제 감시 한도({limitModal.limit ?? ''}개)를 다 쓰셨어요. 업그레이드하시겠어요?</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setLimitModal(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50">나중에</button>
              <button onClick={() => nav('/pricing')} className="flex-1 rounded-xl bg-[#0064FF] py-2.5 text-sm font-bold text-white hover:brightness-95">업그레이드</button>
            </div>
          </div>
        </div>
      )}
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  )
}

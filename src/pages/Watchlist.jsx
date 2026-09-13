import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, Plus, RefreshCw, Loader2, Sparkles, X, AlertTriangle, Settings2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { phCapture } from '../lib/posthog'
import RangeFilter from '../components/RangeFilter'
import VideoModal from '../components/ReelModal'
import TrendCard from '../components/TrendCard'
import WatchAccountsManager from '../components/WatchAccountsManager'
import ScanProgress from '../components/ScanProgress'
import {
  DAY_MAX, DAY_MARKS, dayWindowMs,
  COMMENT_MAX, COMMENT_MARKS, VIEW_MAX, VIEW_MARKS, manFmt,
} from '../lib/filterConfig'
import {
  parseUsernames, statusOf, scanTargets, creditsFor, fmtWhen, ACCOUNTS_PER_CREDIT,
} from '../lib/watchAccounts'
import { AnalyzeModal, ackAnalyzeCost } from './Finds'
import AuthModal from '../components/AuthModal'

const SB_URL = import.meta.env.VITE_SUPABASE_URL || 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'

const SORTS = [['comment', '댓글수'], ['view', '조회수'], ['like', '좋아요'], ['recent', '최신']]
const SORT_COL = { comment: 'comment_count', view: 'view_count', like: 'like_count', recent: 'taken_at' }
// 1000계정이면 watch_feed 가 수천 행이라 전부 받으면 수십MB — 서버에서 정렬·상한을 걸고 받는다.
const FEED_LIMIT = 600
const SCAN_CHUNK = 20      // watch-scan CHUNK — 진행바 보간 구간 계산에 쓴다
const WARN_OVER = 300      // 이 이상이면 탭 이탈 경고(동시 10개 병렬이라 그 아래는 금방 끝남)

export default function Watchlist() {
  const nav = useNavigate()
  const [session, setSession] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [feed, setFeed] = useState([])
  const [feedCounts, setFeedCounts] = useState({})
  const [wallet, setWallet] = useState(null)
  const [watchLimit, setWatchLimit] = useState(null)
  const [loading, setLoading] = useState(true)

  const [bulk, setBulk] = useState('')
  const [adding, setAdding] = useState(false)
  const [accMsg, setAccMsg] = useState(null)
  const [limitModal, setLimitModal] = useState(null)
  const [manageOpen, setManageOpen] = useState(false)

  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(null)
  const [scanMsg, setScanMsg] = useState(null)
  const [includeDead, setIncludeDead] = useState(false)

  const [sort, setSort] = useState('comment')
  const [days, setDays] = useState(DAY_MAX)
  const [minComments, setMinComments] = useState(0)
  const [minViews, setMinViews] = useState(0)

  const [playClip, setPlayClip] = useState(null)
  const [modalClip, setModalClip] = useState(null)
  const [analyzedIds, setAnalyzedIds] = useState([])
  const [showAuth, setShowAuth] = useState(false)
  const [savedPicks, setSavedPicks] = useState([])

  const isReal = !!session && session.user?.is_anonymous !== true
  const uid = session?.user?.id

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => { try { sub.subscription.unsubscribe() } catch { /* noop */ } }
  }, [])

  const loadWallet = useCallback(async () => {
    const { data } = await supabase.rpc('get_my_wallet_rpc')
    setWallet(data || null)
    const plan = data?.plan || 'free'
    const { data: p } = await supabase.from('plans').select('watch_limit').eq('id', plan).maybeSingle()
    setWatchLimit(p?.watch_limit ?? null)
  }, [])

  // 계정 목록 + 계정별 수집 건수(owner 컬럼만 받아 가볍게 집계)
  const loadAccounts = useCallback(async () => {
    if (!uid) return
    const [a, c] = await Promise.all([
      supabase.from('watch_accounts').select('*').eq('user_id', uid).order('added_at', { ascending: true }),
      supabase.from('watch_feed').select('owner').eq('user_id', uid),
    ])
    setAccounts(a.data || [])
    const m = {}
    ;(c.data || []).forEach((r) => { m[r.owner] = (m[r.owner] || 0) + 1 })
    setFeedCounts(m)
  }, [uid])

  const loadFeed = useCallback(async () => {
    if (!uid) return
    const { data } = await supabase.from('watch_feed').select('*').eq('user_id', uid)
      .order(SORT_COL[sort], { ascending: false }).limit(FEED_LIMIT)
    setFeed(data || [])
  }, [uid, sort])

  useEffect(() => {
    if (!isReal) { setLoading(false); return }
    let alive = true
    ;(async () => {
      setLoading(true)
      await Promise.all([loadAccounts(), loadWallet()])
      if (alive) setLoading(false)
    })()
    supabase.from('saved_trends').select('shortcode').then(({ data }) => { if (Array.isArray(data)) setSavedPicks(data.map((r) => r.shortcode)) })
    try { phCapture('watchlist_viewed') } catch { /* noop */ }
    return () => { alive = false }
  }, [isReal, loadAccounts, loadWallet])

  // 피드는 따로 — 정렬을 바꾸면 서버에서 다시 받되(상한 600 안에서 정확한 순서 보장)
  // 전체 로딩 스피너는 띄우지 않는다.
  useEffect(() => { if (isReal) loadFeed() }, [isReal, loadFeed])

  // ── 벌크 추가 ──
  const addBulk = async () => {
    const { valid, invalid } = parseUsernames(bulk)
    if (!valid.length && !invalid.length) { setAccMsg({ ok: false, text: '추가할 계정을 입력해주세요' }); return }

    const existing = new Set(accounts.map((a) => a.username.toLowerCase()))
    const dupes = valid.filter((u) => existing.has(u.toLowerCase()))
    let fresh = valid.filter((u) => !existing.has(u.toLowerCase()))

    // 한도를 미리 계산해 넘치는 만큼 잘라낸다 (트리거는 한 행만 걸려도 INSERT 전체를 되돌린다)
    let overflow = 0
    if (watchLimit != null) {
      const room = Math.max(0, watchLimit - accounts.length)
      if (fresh.length > room) { overflow = fresh.length - room; fresh = fresh.slice(0, room) }
    }
    if (!fresh.length) {
      if (overflow > 0) { setLimitModal({ limit: watchLimit }); return }
      const extra = invalid.length ? ' · 형식오류 ' + invalid.length + '개' : ''
      setAccMsg({ ok: false, text: '추가할 새 계정이 없어요 · 중복 ' + dupes.length + '개' + extra })
      return
    }

    setAdding(true); setAccMsg(null)
    let added = 0
    let hitLimit = false
    for (let i = 0; i < fresh.length; i += 100) {
      const batch = fresh.slice(i, i + 100).map((username) => ({ user_id: uid, username }))
      const { error } = await supabase.from('watch_accounts')
        .upsert(batch, { onConflict: 'user_id,username', ignoreDuplicates: true })
      if (error) {
        if (/watch_limit_reached/.test(error.message || '')) { hitLimit = true; break }
        setAdding(false)
        setAccMsg({ ok: false, text: '추가에 실패했어요: ' + error.message })
        await loadAccounts()
        return
      }
      added += batch.length
    }
    setAdding(false)
    setBulk('')
    await loadAccounts()

    if (hitLimit || overflow > 0) { setLimitModal({ limit: watchLimit }); return }
    const parts = [added + '개 추가']
    if (dupes.length) parts.push(dupes.length + '개 중복')
    if (invalid.length) parts.push(invalid.length + '개 형식오류')
    setAccMsg({ ok: true, text: parts.join(' · ') + ' — 지금 갱신을 눌러 게시물을 불러오세요' })
    try { phCapture('watchlist_accounts_added', { added }) } catch { /* noop */ }
  }

  // ── 갱신 (커서 루프) ──
  const targets = scanTargets(accounts, includeDead)
  const deadCount = accounts.filter((a) => a.active !== false && statusOf(a) === 'dead').length
  const estCredits = creditsFor(targets.length)
  const lastScan = accounts.reduce((m, a) => (a.last_checked_at && (!m || a.last_checked_at > m) ? a.last_checked_at : m), null)

  const scan = async () => {
    if (scanning || !targets.length) return
    setScanning(true); setScanMsg(null)
    setProgress({ cursor: 0, total: targets.length, avgMs: null, recent: [], hits: 0 })
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      const accessToken = s?.access_token
      let cursor = 0
      let totalHits = 0
      let totalFailed = 0
      const durations = []
      let r
      do {
        const t0 = performance.now()
        const from = cursor
        r = await fetch(SB_URL + '/functions/v1/watch-scan', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ cursor, include_dead: includeDead }),
        }).then((x) => x.json())

        if (r.ok === false) {
          setScanMsg(r.error === 'insufficient'
            ? { ok: false, text: '크레딧이 부족해요 · 필요 ' + r.need + '개, 보유 ' + r.balance + '개' }
            : { ok: false, text: '갱신에 실패했어요: ' + (r.error || '알 수 없는 오류') })
          break
        }

        // 청크 소요를 평균내 남은 시간 추정 + 보간 속도에 사용
        durations.push(performance.now() - t0)
        const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length
        totalHits += r.hits ?? 0
        totalFailed += r.failed ?? 0
        // 서버 스캔 순서(active + fail 필터 + added_at 오름차순)는 targets 와 같다
        const recent = targets.slice(from, r.cursor).map((a) => a.username)
        setProgress({ cursor: r.cursor, total: r.total, avgMs, recent, hits: totalHits })
        cursor = r.cursor
      } while (!r.done)

      if (r?.ok !== false) {
        const fail = totalFailed ? ' · 응답없음 ' + totalFailed + '개' : ''
        setScanMsg({ ok: true, text: '완료 — 계정 ' + r.total + '개 · 새 소재 ' + totalHits + '건' + fail })
        try { phCapture('watchlist_scanned', { accounts: r.total, hits: totalHits }) } catch { /* noop */ }
      }
    } catch (e) {
      setScanMsg({ ok: false, text: '갱신에 실패했어요: ' + String(e?.message || e) })
    }
    setScanning(false); setProgress(null)
    await Promise.all([loadAccounts(), loadFeed(), loadWallet()])
  }

  const toggleSave = async (it) => {
    const sc = it.shortcode; const has = savedPicks.includes(sc)
    if (!has) { try { phCapture('trend_saved', { shortcode: sc, source: 'watchlist' }) } catch { /* noop */ } }
    setSavedPicks((prev) => has ? prev.filter((x) => x !== sc) : [...prev, sc])
    try {
      if (has) await supabase.from('saved_trends').delete().eq('shortcode', sc)
      else await supabase.from('saved_trends').insert({ shortcode: sc, caption: it.caption, thumbnail_url: it.thumbnail_url, url: it.url, owner: it.owner, view_count: it.view_count, like_count: it.like_count, comment_count: it.comment_count, velocity: it.velocity, taken_at: it.taken_at })
    } catch { /* noop */ }
  }

  const handleAnalyze = async (clip) => {
    const key = clip.page_url || clip.title
    try { phCapture('analysis_clicked', { source: 'watchlist' }) } catch { /* noop */ }
    if (analyzedIds.includes(key)) { setModalClip(clip); return }
    if (!ackAnalyzeCost(null)) return
    const { data } = await supabase.rpc('use_finds_credit_rpc')
    if (!data?.ok) { nav('/pricing'); return }
    setAnalyzedIds((prev) => [...prev, key])
    setModalClip(clip)
    supabase.rpc('grant_first_analysis_bonus_rpc').catch(() => {})
  }

  const now = Date.now()
  // 서버에서 이미 정렬돼 오므로 여기선 슬라이더 조건만 거른다
  const list = feed
    .filter((it) => it.taken_at && now - new Date(it.taken_at).getTime() <= dayWindowMs(days))
    .filter((it) => !minComments || (Number(it.comment_count) || 0) >= minComments)
    .filter((it) => !minViews || (Number(it.view_count) || 0) >= minViews)

  if (!isReal) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <Eye size={28} className="mx-auto mb-3 text-[#0064FF]" />
        <p className="text-lg font-bold text-white">워치리스트는 로그인 후 이용할 수 있어요</p>
        <p className="mt-1 text-sm text-white/50">경쟁 계정을 등록해두면 새 게시물을 한 화면에서 볼 수 있어요.</p>
        <button onClick={() => setShowAuth(true)} className="mt-5 rounded-full bg-[#0064FF] px-6 py-2.5 text-sm font-bold text-white">무료로 로그인 / 가입</button>
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#0064FF]">
            <Eye size={22} />
            <h1 className="text-2xl font-extrabold text-white">워치리스트</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/5 px-3.5 py-1.5 text-xs">
            <Sparkles size={13} className="text-[#0064FF]" />
            <span className="text-white/50">보유 크레딧</span>
            <b className="text-white">{wallet ? Number(wallet.finds_balance || 0).toLocaleString('ko-KR') : '…'}</b>
          </div>
        </div>
        <p className="mt-1 text-sm text-white/50">경쟁 계정을 등록해두고, 새로 올라온 게시물만 모아서 보세요.</p>
        <Link to="/saved" className="mt-1 inline-block text-xs font-bold text-white/40 underline-offset-2 hover:text-white/70 hover:underline">저장한 소재 보드 →</Link>
      </header>

      {/* 요약 한 줄 + 관리 */}
      <section className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/60">
            감시 <b className="text-white">{accounts.length.toLocaleString('ko-KR')}</b>
            {watchLimit != null && <span className="text-white/35">/{watchLimit.toLocaleString('ko-KR')}</span>}
            <span className="mx-2 text-white/20">·</span>
            최근 갱신 <b className="text-white/80">{lastScan ? fmtWhen(lastScan) : '없음'}</b>
            {deadCount > 0 && (<><span className="mx-2 text-white/20">·</span><b className="text-red-400">응답없음 {deadCount}</b></>)}
          </p>
          <button onClick={() => setManageOpen(true)} disabled={!accounts.length}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-40">
            <Settings2 size={15} /> 관리
          </button>
        </div>

        {/* 벌크 추가 */}
        <div className="mt-4 border-t border-white/10 pt-4">
          <label className="mb-2 block text-xs font-bold text-white/60">계정 추가 <span className="font-medium text-white/30">— 한 줄에 하나씩, @·URL·아이디 모두 인식</span></label>
          <textarea value={bulk} onChange={(e) => { setBulk(e.target.value); setAccMsg(null) }} rows={3}
            placeholder={'dally._home\n@home.sential\nhttps://www.instagram.com/loden.studios/'}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-[#0064FF]" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button onClick={addBulk} disabled={adding || !bulk.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-[#0064FF] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-40">
              {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} {adding ? '추가 중…' : '추가'}
            </button>
            {accMsg && <span className={`text-xs font-bold ${accMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{accMsg.text}</span>}
          </div>
        </div>

        {/* 갱신 */}
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={scan} disabled={scanning || !targets.length}
              className="flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-40">
              {scanning ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              {scanning ? '갱신 중…' : '지금 갱신'}
            </button>
            {scanning && progress ? (
              <ScanProgress
                cursor={progress.cursor} total={progress.total} chunk={SCAN_CHUNK}
                avgMs={progress.avgMs} recent={progress.recent} hits={progress.hits}
              />
            ) : (
              <span className="text-[11px] text-white/45">
                {deadCount > 0 && !includeDead && <span className="text-white/35">응답없음 {deadCount}개 제외 → </span>}
                실제 <b className="text-white/70">{targets.length.toLocaleString('ko-KR')}개</b> 갱신 (<b className="text-white/70">{estCredits}크레딧</b>)
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {deadCount > 0 && (
              <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-white/45">
                <input type="checkbox" checked={includeDead} onChange={(e) => setIncludeDead(e.target.checked)} disabled={scanning} />
                응답없음 {deadCount}개도 포함해서 갱신
              </label>
            )}
            <span className="text-[11px] text-white/30">{ACCOUNTS_PER_CREDIT}계정당 1크레딧 · 갱신 시작할 때 한 번만 차감</span>
          </div>
          {targets.length >= WARN_OVER && !scanning && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-400/80">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              계정이 많아 몇 분 이상 걸려요. 끝날 때까지 이 탭을 닫지 마세요 — 중간에 닫으면 크레딧은 차감된 채 일부만 갱신됩니다.
            </p>
          )}
          {scanMsg && <p className={`mt-2 text-xs font-bold ${scanMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{scanMsg.text}</p>}
        </div>
      </section>

      {/* 필터 */}
      <section className="mb-4 rounded-2xl bg-slate-900 p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-white/60">정렬</span>
          {SORTS.map(([k, l]) => (
            <button key={k} onClick={() => setSort(k)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${sort === k ? 'bg-[#0064FF] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}>{l}순</button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
          <RangeFilter label="게시일" min={1} max={DAY_MAX} step={1} unit="일" infinitySuffix="이하" allAtMax={false} marks={DAY_MARKS} value={days} onChange={setDays} />
          <RangeFilter label="댓글수" min={0} max={COMMENT_MAX} step={50} unit="개" infinitySuffix="이상" marks={COMMENT_MARKS} value={minComments} onChange={setMinComments} />
          <RangeFilter label="조회수" min={0} max={VIEW_MAX} step={10000} infinitySuffix="이상" marks={VIEW_MARKS} formatValue={manFmt} value={minViews} onChange={setMinViews} />
        </div>
      </section>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-white/40"><Loader2 size={16} className="animate-spin" />불러오는 중…</div>
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <div className="mb-2 text-3xl">👀</div>
          <p className="font-bold text-white/80">감시할 계정을 먼저 추가해주세요.</p>
          <p className="mt-1 text-sm text-white/45">경쟁 계정·벤치마크 계정을 등록하면 새 게시물을 모아서 보여드려요.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((it, i) => {
              const clip = { title: it.caption, source: 'instagram', thumbnail_url: it.thumbnail_url, author: it.owner, views: it.view_count, likes: it.like_count, comments: it.comment_count, page_url: it.url, video_url: it.video_url, video_id: it.shortcode, taken_at: it.taken_at, velocity: it.velocity }
              return (
                <TrendCard
                  key={it.shortcode || i}
                  it={it} rank={i + 1}
                  onPlay={() => setPlayClip(clip)}
                  onAnalyze={() => handleAnalyze(clip)}
                  onSource={() => { window.location.href = '/research?url=' + encodeURIComponent(it.url) }}
                  saved={savedPicks.includes(it.shortcode)}
                  onToggleSave={() => toggleSave(it)}
                />
              )
            })}
            {!list.length && (
              <div className="col-span-full p-10 text-center text-sm text-white/40">
                {feed.length ? '조건에 맞는 게시물이 없어요. 필터를 낮춰보세요.' : '아직 불러온 게시물이 없어요. 지금 갱신을 눌러주세요.'}
              </div>
            )}
          </div>
          {feed.length >= FEED_LIMIT && (
            <p className="mt-4 text-center text-[11px] text-white/30">정렬 기준 상위 {FEED_LIMIT}건만 보여드려요 — 필터로 좁혀보세요.</p>
          )}
        </>
      )}

      <WatchAccountsManager
        open={manageOpen} onClose={() => setManageOpen(false)}
        accounts={accounts} feedCounts={feedCounts}
        onChanged={() => { loadAccounts(); loadFeed() }}
      />

      {limitModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={() => setLimitModal(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-base font-bold"><AlertTriangle size={17} className="text-amber-500" /> 계정 한도 초과</h3>
              <button onClick={() => setLimitModal(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">현재 요금제는 계정 {limitModal.limit ?? ''}개까지예요. 한도까지만 추가했어요. 업그레이드하시겠어요?</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setLimitModal(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50">나중에</button>
              <button onClick={() => nav('/pricing')} className="flex-1 rounded-xl bg-[#0064FF] py-2.5 text-sm font-bold text-white hover:brightness-95">업그레이드</button>
            </div>
          </div>
        </div>
      )}

      {modalClip && <AnalyzeModal clip={modalClip} onClose={() => setModalClip(null)} />}
      {playClip && <VideoModal clip={playClip} onClose={() => setPlayClip(null)} onSource={() => { window.location.href = '/research?url=' + encodeURIComponent(playClip.page_url) }} onAnalyze={() => { setPlayClip(null); handleAnalyze(playClip) }} />}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, Plus, Trash2, RefreshCw, Loader2, Sparkles, X, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { phCapture } from '../lib/posthog'
import RangeFilter from '../components/RangeFilter'
import VideoModal from '../components/ReelModal'
import TrendCard from '../components/TrendCard'
import { fmtCount } from '../lib/format'
import { AnalyzeModal, ackAnalyzeCost } from './Finds'
import AuthModal from '../components/AuthModal'

const SB_URL = import.meta.env.VITE_SUPABASE_URL || 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const ACCOUNTS_PER_CREDIT = 50                 // 50계정 갱신 = 1크레딧 (서버 CREDIT_PER 와 동일)

const SORTS = [['comment', '댓글수'], ['view', '조회수'], ['like', '좋아요'], ['recent', '최신']]
const DAY_MAX = 8                              // 서버가 최근 7일치만 저장 → 8 = 전체
const DAY_MARKS = [[1, '1일'], [3, '3일'], [7, '7일'], [DAY_MAX, '전체']]
const COMMENT_MAX = 2000
const COMMENT_MARKS = [[0, '전체'], [500, '500'], [1000, '1천'], [COMMENT_MAX, '2천+']]
const VIEW_MAX = 1000000
const VIEW_MARKS = [[0, '전체'], [100000, '10만'], [500000, '50만'], [VIEW_MAX, '100만+']]
const manFmt = (n) => (n >= 10000 ? `${Math.round((n / 10000) * 10) / 10}만` : n.toLocaleString('ko-KR'))

// '@handle' / 프로필 URL / 아이디 → username
const parseUsername = (raw) => {
  let s = String(raw || '').trim()
  const m = s.match(/instagram\.com\/([^/?#\s]+)/i)
  if (m) s = m[1]
  return s.replace(/^@/, '').replace(/\/+$/, '').trim()
}

export default function Watchlist() {
  const nav = useNavigate()
  const [session, setSession] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [feed, setFeed] = useState([])
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(true)

  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [accMsg, setAccMsg] = useState(null)
  const [limitModal, setLimitModal] = useState(null)   // 초과 시 { limit }

  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(null)       // { cursor, total }
  const [scanMsg, setScanMsg] = useState(null)

  const [sort, setSort] = useState('comment')
  const [days, setDays] = useState(DAY_MAX)
  const [minComments, setMinComments] = useState(0)
  const [minViews, setMinViews] = useState(0)

  const [playClip, setPlayClip] = useState(null)
  const [modalClip, setModalClip] = useState(null)
  const [analyzedIds, setAnalyzedIds] = useState([])
  const [showAuth, setShowAuth] = useState(false)

  const isReal = !!session && session.user?.is_anonymous !== true
  const uid = session?.user?.id

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => { try { sub.subscription.unsubscribe() } catch { /* noop */ } }
  }, [])

  const loadWallet = useCallback(() => {
    supabase.rpc('get_my_wallet_rpc').then(({ data }) => setWallet(data || null)).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    const [a, f] = await Promise.all([
      supabase.from('watch_accounts').select('*').eq('user_id', uid).order('added_at', { ascending: true }),
      supabase.from('watch_feed').select('*').eq('user_id', uid),
    ])
    setAccounts(a.data || [])
    setFeed(f.data || [])
    setLoading(false)
  }, [uid])

  useEffect(() => {
    if (!isReal) { setLoading(false); return }
    load(); loadWallet()
    try { phCapture('watchlist_viewed') } catch { /* noop */ }
  }, [isReal, load, loadWallet])

  // ── (a) 계정 추가/삭제 ──
  const addAccount = async () => {
    const username = parseUsername(input)
    if (!username) { setAccMsg({ ok: false, text: '인스타 계정 아이디를 입력해주세요' }); return }
    if (accounts.some((a) => a.username.toLowerCase() === username.toLowerCase())) {
      setAccMsg({ ok: false, text: `@${username} 은 이미 추가돼 있어요` }); return
    }
    setAdding(true); setAccMsg(null)
    // ig_user_id·팔로워는 갱신(watch-scan) 때 서버가 채운다
    const { error } = await supabase.from('watch_accounts').insert({ user_id: uid, username })
    setAdding(false)
    if (error) {
      const m = String(error.message || '').match(/watch_limit_reached:(\d+)/)
      if (m) { setLimitModal({ limit: Number(m[1]) }); return }
      setAccMsg({ ok: false, text: '추가에 실패했어요: ' + error.message })
      return
    }
    setInput(''); setAccMsg({ ok: true, text: `@${username} 추가됨 — '지금 갱신'을 눌러 게시물을 불러오세요` })
    load()
  }

  const removeAccount = async (row) => {
    setAccounts((prev) => prev.filter((a) => a.id !== row.id))
    try { await supabase.from('watch_accounts').delete().eq('id', row.id) } catch { /* noop */ }
  }

  // ── (b) 지금 갱신 — 커서 루프 ──
  const scan = async () => {
    if (scanning || !accounts.length) return
    setScanning(true); setScanMsg(null); setProgress({ cursor: 0, total: accounts.length })
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      const accessToken = s?.access_token
      let cursor = 0
      let r
      do {
        r = await fetch(`${SB_URL}/functions/v1/watch-scan`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ cursor }),
        }).then((x) => x.json())

        if (r.ok === false) {
          if (r.error === 'insufficient') {
            setScanMsg({ ok: false, text: `크레딧이 부족해요. ${r.need}개 필요, 보유 ${r.balance}개` })
          } else {
            setScanMsg({ ok: false, text: '갱신에 실패했어요: ' + (r.error || '알 수 없는 오류') })
          }
          break
        }
        setProgress({ cursor: r.cursor, total: r.total })
        cursor = r.cursor
      } while (!r.done)

      if (r?.ok !== false) {
        setScanMsg({ ok: true, text: `갱신 완료 — 계정 ${r.total}개 · 게시물 ${r.hits ?? 0}건` })
        try { phCapture('watchlist_scanned', { accounts: r.total }) } catch { /* noop */ }
      }
    } catch (e) {
      setScanMsg({ ok: false, text: '갱신에 실패했어요: ' + String(e?.message || e) })
    }
    setScanning(false); setProgress(null)
    load(); loadWallet()
  }

  // ── (c) 분석 ──
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
  const list = feed
    .filter((it) => days >= DAY_MAX ? true : (it.taken_at && now - new Date(it.taken_at).getTime() <= days * 86400000))
    .filter((it) => !minComments || (Number(it.comment_count) || 0) >= minComments)
    .filter((it) => !minViews || (Number(it.view_count) || 0) >= minViews)
    .sort((a, b) => {
      if (sort === 'recent') return new Date(b.taken_at || 0) - new Date(a.taken_at || 0)
      const mk = sort === 'view' ? 'view_count' : sort === 'like' ? 'like_count' : 'comment_count'
      return (Number(b[mk]) || 0) - (Number(a[mk]) || 0)
    })

  const estCredits = Math.ceil(accounts.length / ACCOUNTS_PER_CREDIT)

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
          {/* (d) 보유 크레딧 */}
          <div className="flex items-center gap-2 rounded-full bg-white/5 px-3.5 py-1.5 text-xs">
            <Sparkles size={13} className="text-[#0064FF]" />
            <span className="text-white/50">보유 크레딧</span>
            <b className="text-white">{wallet ? Number(wallet.finds_balance || 0).toLocaleString('ko-KR') : '…'}</b>
          </div>
        </div>
        <p className="mt-1 text-sm text-white/50">경쟁 계정을 등록해두고, 새로 올라온 게시물만 모아서 보세요.</p>
        <Link to="/saved" className="mt-1 inline-block text-xs font-bold text-white/40 underline-offset-2 hover:text-white/70 hover:underline">저장한 소재 보드 →</Link>
      </header>

      {/* (a) 계정 관리 */}
      <section className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-bold text-white">감시 계정 <span className="text-white/40">{accounts.length}</span></h2>
          {accounts.length > 0 && <span className="text-[11px] text-white/35">이번 갱신 예상 {estCredits}크레딧</span>}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); setAccMsg(null) }}
            onKeyDown={(e) => e.key === 'Enter' && addAccount()}
            placeholder="@아이디 · instagram.com/아이디 · 아이디"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-[#0064FF]"
          />
          <button onClick={addAccount} disabled={adding}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#0064FF] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-40">
            <Plus size={15} /> 추가
          </button>
        </div>
        {accMsg && <p className={`mt-2 text-xs font-bold ${accMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{accMsg.text}</p>}

        {accounts.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {accounts.map((a) => (
              <span key={a.id} className="group flex items-center gap-1.5 rounded-full bg-white/[0.06] py-1 pl-3 pr-1.5 text-xs font-bold text-white/75">
                @{a.username}
                {a.follower_count ? <span className="font-medium text-white/30">{fmtCount(a.follower_count)}</span> : null}
                <button onClick={() => removeAccount(a)} aria-label={`@${a.username} 삭제`}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-white/30 transition hover:bg-red-500/20 hover:text-red-400">
                  <Trash2 size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* (b) 갱신 */}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
          <button onClick={scan} disabled={scanning || !accounts.length}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-40">
            {scanning ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {scanning ? '갱신 중…' : '지금 갱신'}
          </button>
          {scanning && progress && (
            <div className="min-w-[180px] flex-1">
              <div className="mb-1 text-[11px] font-bold text-white/60">갱신 중 {progress.cursor}/{progress.total}</div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-black">
                <div className="h-full rounded-full bg-[#0064FF] transition-all" style={{ width: `${Math.round((progress.cursor / Math.max(1, progress.total)) * 100)}%` }} />
              </div>
            </div>
          )}
          {!scanning && <span className="text-[11px] text-white/35">{ACCOUNTS_PER_CREDIT}계정당 1크레딧 · 갱신 시작할 때 한 번만 차감돼요</span>}
        </div>
        {scanMsg && <p className={`mt-2 text-xs font-bold ${scanMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{scanMsg.text}</p>}
      </section>

      {/* (c) 필터 + 피드 */}
      <section className="mb-4 rounded-2xl bg-slate-900 p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-white/60">정렬</span>
          {SORTS.map(([k, l]) => (
            <button key={k} onClick={() => setSort(k)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${sort === k ? 'bg-[#0064FF] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}>{l}순</button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
          <RangeFilter label="게시일" min={1} max={DAY_MAX} step={1} unit="일" infinitySuffix="이하" marks={DAY_MARKS} value={days} onChange={setDays} />
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
              />
            )
          })}
          {!list.length && (
            <div className="col-span-full p-10 text-center text-sm text-white/40">
              {feed.length ? '조건에 맞는 게시물이 없어요. 필터를 낮춰보세요.' : '아직 불러온 게시물이 없어요. ‘지금 갱신’을 눌러주세요.'}
            </div>
          )}
        </div>
      )}

      {/* 저장 한도 초과 */}
      {limitModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={() => setLimitModal(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-base font-bold"><AlertTriangle size={17} className="text-amber-500" /> 계정 한도 초과</h3>
              <button onClick={() => setLimitModal(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">현재 요금제는 계정 {limitModal.limit}개까지예요. 업그레이드하시겠어요?</p>
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

import { useState, useEffect, useRef } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { Search, Loader2, AlertTriangle, Flame, Eye, Heart, MessageCircle, Sparkles, X, Copy, Check, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { FEATURES } from '../config/features'
import AuthModal from '../components/AuthModal'
import ReferralCTA from '../components/ReferralCTA'
import FindsPricing from '../components/FindsPricing'
import SiteNav from '../components/SiteNav'
import ChannelModal from '../components/ChannelModal'
import { useAnalysis } from '../context/analysis'
import FindsBottomNav from '../components/FindsBottomNav'

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
  const [expired, setExpired] = useState(false)
  const [freshUrl, setFreshUrl] = useState('')
  const [triedRefresh, setTriedRefresh] = useState(false)
  const rawUrl = (freshUrl || clip.download_url || clip.video_url || '').replace(/^http:\/\//, 'https://')

  // 재생 실패(원본 CDN 만료) 시 video_id로 새 URL만 즉석 갱신해 재시도. 실패하면 썸네일 + 만료 표시.
  const handleVidError = async () => {
    if (triedRefresh) { setPlaying(false); setExpired(true); return }
    setTriedRefresh(true)
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) { setPlaying(false); setExpired(true); return }
      const r = await fetch(FN('refresh-clip-url'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: clip.video_id, page_url: clip.page_url, source: clip.source }),
      })
      const d = await r.json()
      if (d?.ok && d.download_url) { setExpired(false); setFreshUrl(d.download_url) }  // src 재계산 → 자동 재시도
      else { setPlaying(false); setExpired(true) }
    } catch { setPlaying(false); setExpired(true) }
  }
  const isOwnStorage = rawUrl.includes('supabase.co/storage/v1/object/public/')
  const playUrl = !rawUrl ? '' : (isOwnStorage ? rawUrl : `${FN('video-proxy')}?url=${encodeURIComponent(rawUrl)}`)
  const thumbSrc = !imgError && clip.thumbnail_url ? proxyThumb(clip.thumbnail_url) : ''

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-gray-200 transition-all hover:border-gray-400">
      <div className="relative aspect-[9/16] cursor-pointer bg-gray-100" onClick={() => (playing ? setPlaying(false) : (playUrl && setPlaying(true)))}>
        {playing && playUrl ? (
          <video src={playUrl} autoPlay muted playsInline controls={false}
            poster={thumbSrc || undefined}
            className="h-full w-full object-cover"
            onClick={(e) => { e.stopPropagation(); setPlaying(false) }}
            onError={handleVidError} />
        ) : (
          <>
            {thumbSrc ? (
              <img src={thumbSrc} alt={clip.title} referrerPolicy="no-referrer" onError={() => setImgError(true)} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl text-gray-400">🎬</div>
            )}
            {expired && (
              <div className="absolute left-1.5 top-1.5 z-10 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">원본 링크 만료 · 다시 검색</div>
            )}
            {playUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition hover:bg-black/40">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-lg transition hover:opacity-100">
                  <span className="ml-1 text-xl text-black">▶</span>
                </div>
              </div>
            )}
            {(clip.duration > 0 || clip.src_height > 0) && (
              <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[10px] font-bold text-white">
                {clip.src_height > 0 ? `${clip.src_height}p` : ''}{clip.src_height > 0 && clip.duration > 0 ? ' · ' : ''}{clip.duration > 0 ? `${clip.duration}s` : ''}
              </div>
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
// 분석 차감 안내 — 세션당 최초 1회 확인
export function ackAnalyzeCost(balance) {
  try { if (sessionStorage.getItem('finds_analyze_ack')) return true } catch { /* noop */ }
  const bal = balance != null ? `\n남은 이용권: ${balance}개` : ''
  const ok = window.confirm(`분석 1회에 Finds 이용권 1개가 차감돼요.${bal}\n(이미 분석한 소스는 다시 열어도 무료예요)\n\n계속할까요?`)
  if (ok) { try { sessionStorage.setItem('finds_analyze_ack', '1') } catch { /* noop */ } }
  return ok
}

export function AnalyzeModal({ clip, onClose, onAnalyzed }) {
  const [copied, setCopied] = useState(false)
  const [dlErr, setDlErr] = useState('')
  const [dling, setDling] = useState(false)
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
        if (d.ok) { setResult(d); try { onAnalyzed && onAnalyzed() } catch { /* noop */ } } else setErr(d.error || '분석에 실패했어요.')
      } catch { if (alive) setErr('분석 중 오류가 발생했어요.') }
      finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [clip])

  const copy = async () => {
    try { await navigator.clipboard.writeText(clip.page_url || ''); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* noop */ }
  }
  const download = async () => {
    const src = (clip.download_url || clip.video_url || '').replace(/^http:\/\//, 'https://')
    if (!src) { alert('이 소스는 다운로드 URL이 없어요.'); return }
    const go = async () => {
      const name = ((clip.author || 'chronit') + '_' + (clip.video_id || '')).replace(/[^a-zA-Z0-9_.-]/g, '_')
      const proxied = FN('dl') + '?url=' + encodeURIComponent(src) + '&name=' + encodeURIComponent(name)
      setDlErr(''); setDling(true)
      try {
        const resp = await fetch(proxied)
        if (!resp.ok) throw new Error('expired')
        const blob = await resp.blob()
        if (!blob || blob.size < 1000) throw new Error('expired')
        const objUrl = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = objUrl; a.download = name + '.mp4'; document.body.appendChild(a); a.click(); a.remove()
        setTimeout(() => URL.revokeObjectURL(objUrl), 8000)
      } catch { setDlErr('이 소스는 캐시가 만료됐어요. Finds에서 다시 검색해 주세요.') }
      finally { setDling(false) }
    }
    // 계정 단위 1회 동의 (세션 아님) — 로컬 캐시 → DB 확인 순
    let consented = false
    try { consented = !!localStorage.getItem('dl_consent') } catch { /* noop */ }
    if (!consented) { try { const { data } = await supabase.rpc('has_dl_consent_rpc'); consented = !!data } catch { /* noop */ } }
    if (consented) { try { localStorage.setItem('dl_consent', '1') } catch { /* noop */ } ; go(); return }
    if (!window.confirm('다운로드 및 콘텐츠 활용 안내\n\n다운로드하는 콘텐츠의 저작권은 원저작자에게 있으며, 다운로드·활용에 대한 책임은 이용자 본인에게 있습니다. 권리가 있는 콘텐츠만 사용하는 것에 동의하십니까?')) return
    try { await supabase.rpc('record_dl_consent_rpc') } catch { /* noop */ }
    try { localStorage.setItem('dl_consent', '1') } catch { /* noop */ }
    go()
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

        {(clip.download_url || clip.video_url) && (
          <>
            <button onClick={download} disabled={dling} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60">
              {dling ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} {dling ? '내려받는 중…' : 'HD 다운로드'}
            </button>
            {dlErr && <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600"><AlertTriangle size={13} />{dlErr}</p>}
          </>
        )}

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
            <div className="space-y-2.5 text-slate-600">
              {(result.key_takeaways || []).length > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50/60 p-2.5">
                  <div className="mb-1.5 flex items-center gap-1 text-xs font-extrabold text-orange-700"><Sparkles size={12} />핵심 벤치마크 포인트</div>
                  <ul className="space-y-1.5">
                    {result.key_takeaways.map((k, i) => (
                      <li key={i} className="leading-relaxed">
                        <mark className="rounded-[3px] bg-orange-200/80 px-1 py-0.5 font-semibold text-slate-800 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">{k}</mark>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <span className="font-bold text-slate-700">훅 (첫 3초)</span> · {result.hook || '—'}
                {result.hook_why && <span className="mt-0.5 block text-xs text-slate-400">{result.hook_why}</span>}
              </div>
              <div>
                <span className="font-bold text-slate-700">셀링포인트</span>
                <ul className="mt-0.5 list-disc space-y-0.5 pl-5">
                  {(result.selling_points || []).length ? result.selling_points.map((sp, i) => <li key={i}>{sp}</li>) : <li className="text-slate-400">—</li>}
                </ul>
              </div>
              {result.structure && <div><span className="font-bold text-slate-700">구성·흐름</span> · {result.structure}</div>}
              <div><span className="font-bold text-slate-700">구도·편집</span> · {result.composition || '—'}</div>
              {result.target && <div><span className="font-bold text-slate-700">타깃</span> · {result.target}</div>}
              {result.apply_tip && (
                <div className="rounded-lg bg-amber-50 p-2 text-xs leading-relaxed"><span className="font-bold text-amber-700">💡 적용 팁</span> · {result.apply_tip}</div>
              )}
              {!result.used_image && <div className="text-[10px] text-slate-300">※ 썸네일 미확보 — 제목 기반 분석</div>}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function FindsFeedbackModal({ onClose }) {
  const [rating, setRating] = useState(0)
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(null)
  const REASONS = ['원하는 소재를 못 찾아요', '결과가 안 맞아요', '느려요', '이용권/가격', '만족해요', '기타']
  const submit = async () => {
    if (submitting || !rating) return
    setSubmitting(true)
    try {
      const { data } = await supabase.functions.invoke('submit-feedback', { body: { rating, reason, comment, job_id: null } })
      try { localStorage.setItem('chronit_finds_fb_done', '1') } catch { /* noop */ }
      setDone({ rewarded: !!(data && data.rewarded) })
      setTimeout(onClose, 2200)
    } catch { try { localStorage.setItem('chronit_finds_fb_done', '1') } catch { /* noop */ } setDone({ rewarded: false }); setTimeout(onClose, 1800) }
    finally { setSubmitting(false) }
  }
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="py-4 text-center">
            <p className="mb-1 text-lg font-bold text-slate-900">고마워요! 🙏</p>
            <p className="text-sm text-slate-500">{done.rewarded ? '이용권 2개를 드렸어요.' : '소중한 의견 잘 받았어요.'}</p>
          </div>
        ) : (
          <>
            <p className="text-lg font-bold text-slate-900">소재 찾기 어떠셨어요?</p>
            <p className="mb-4 mt-1 text-sm text-slate-500">의견 주시면 <b className="text-[#0064FF]">이용권 2개</b>를 드려요 · 최초 1회</p>
            <div className="mb-4 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} className={`text-3xl transition ${n <= rating ? '' : 'opacity-30 grayscale'}`}>⭐</button>
              ))}
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <button key={r} onClick={() => setReason(reason === r ? '' : r)} className={`rounded-full border px-3 py-1 text-xs font-bold transition ${reason === r ? 'border-[#0064FF] bg-[#0064FF]/10 text-[#0064FF]' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>{r}</button>
              ))}
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="한 줄 의견 (선택)" rows={2} className="mb-4 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0064FF]" />
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100">다음에</button>
              <button onClick={submit} disabled={submitting || !rating} className="flex-1 rounded-xl bg-[#0064FF] py-3 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-40">{submitting ? '보내는 중…' : '제출하고 +2 이용권 받기'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Finds() {
  const nav = useNavigate()
  const [session, setSession] = useState(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const searchInputRef = useRef(null)
  const [searchMode, setSearchMode] = useState('clip')
  const [chUrl, setChUrl] = useState('')
  const [progress, setProgress] = useState(0)
  const [srchStage, setSrchStage] = useState('')
  const srchTargetRef = useRef(8)
  const { startChannel, channelLoading, channelResult, reopenChannel } = useAnalysis()
  const [clips, setClips] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [modalClip, setModalClip] = useState(null)
  const [fbOpen, setFbOpen] = useState(false)
  const fbPending = useRef(false)
  const fbShown = useRef(false)
  const [relatedKw, setRelatedKw] = useState([])
  const [showAuth, setShowAuth] = useState(false)
  const [analyzedIds, setAnalyzedIds] = useState([])
  const [balance, setBalance] = useState(null)
  const [payWall, setPayWall] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSession(data.session)
      else supabase.auth.signInAnonymously().then(({ data: ad }) => setSession(ad?.session ?? null)).catch(() => {})
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => { try { sub.subscription.unsubscribe() } catch { /* noop */ } }
  }, [])

  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get('url')
    if (u) { setSourceUrl(u); setTimeout(() => analyze(u), 0) }
  }, [])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('finds_cache')
      if (raw) {
        const c = JSON.parse(raw)
        if (c && Array.isArray(c.clips) && c.clips.length && Date.now() - (c.ts || 0) < 1800000) {
          setClips(c.clips); if (c.q) setSourceUrl(c.q); if (Array.isArray(c.related)) setRelatedKw(c.related)
        }
      }
    } catch { /* noop */ }
  }, [])

  useEffect(() => {
    if (!session) { setBalance(null); return }
    supabase.rpc('get_my_balance_rpc').then(({ data }) => { if (data) setBalance(data.balance ?? 0) })
  }, [session])

  // 스텔스 게이트 (모든 훅 이후)
  if (!FEATURES.finds) return <Navigate to="/" replace />

  const isAnon = !session || session?.user?.is_anonymous === true

  const handleAnalyze = async (clip) => {
    // 익명은 분석(유료) 불가 — 진짜 로그인 필요. (검색은 익명 OK)
    if (!session || session.user?.is_anonymous) { setError('로그인하면 분석할 수 있어요'); return }
    if (analyzedIds.includes(clip.video_id)) { setModalClip(clip); return }
    if (!ackAnalyzeCost(balance)) return
    const { data } = await supabase.rpc('use_finds_credit_rpc')
    if (!data?.ok) { nav('/pricing'); return }
    setBalance(data.balance)
    setAnalyzedIds((prev) => [...prev, clip.video_id])
    setModalClip(clip)
  }

  // ── 검색/분석: submit → poll → (틱톡+샤오홍슈 병렬) → clip-filter ──
  // (이용권/과금 로직은 이 페이지에 아직 적용하지 않음 — 추후 별도 반영)
  const analyze = async (override) => {
    const su = (typeof override === 'string' ? override : sourceUrl).trim()
    if (!su) { setError('링크나 키워드를 입력해주세요'); return }
    const isUrl = isValidUrl(su)
    setError(''); setSearching(true); setClips([]); setRelatedKw([])
    srchTargetRef.current = 8; setProgress(4); setSrchStage('시작하는 중')
    try { if (/instagram\.com|^@/i.test(su)) supabase.auth.getSession().then(({ data }) => fetch(FN('trend-capture'), { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: su }) }).catch(() => {})) } catch { /* noop */ }
    try {
      let sess = (await supabase.auth.getSession()).data.session
      if (!sess) {
        const _r = await supabase.auth.signInAnonymously()
        sess = _r.data?.session ?? null
        if (!sess) { setError('세션 오류: ' + (_r.error?.message || '익명 로그인 실패')); setSearching(false); return }
      }
      const s = sess
      const headers = { Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' }

      let refFrames = []
      let queries = []
      let searchArgs = { product_name: '', keyword: '', keywords: [] }
      let rawClips = []

      if (isUrl) {
        // 링크 모드: 레퍼런스 영상 분석 → 키워드 추출 → 유사도 필터
        const subResp = await fetch(FN('search-clips'), { method: 'POST', headers, body: JSON.stringify({ action: 'submit', source_url: su }) })
        const sub = await subResp.json()
        if (!sub.ok || !sub.prediction_id) { setError(sub.error || '분석에 실패했어요. 잠시 후 다시 시도해 주세요.'); setSearching(false); return }
        setSrchStage('레퍼런스 영상 분석 중'); srchTargetRef.current = 40

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
        refFrames = data1.reference_frames || []
        queries = data1.tiktok_queries || []
        rawClips = data1.clips || []
        searchArgs = { product_name: data1.product_name || '', keyword: data1.keyword || '', keywords: data1.keywords || [] }
        setSrchStage('후보 소스 수집 중'); srchTargetRef.current = 58
      } else {
        // 키워드 모드: 바로 검색 (레퍼런스·유사도 필터 없음)
        queries = [su]
        searchArgs = { product_name: '', keyword: su, keywords: [su] }
        setSrchStage('소스 검색 중'); srchTargetRef.current = 48
      }

      let xhsClips = []
      setSrchStage('소스 수집 중'); srchTargetRef.current = Math.max(srchTargetRef.current, 66)
      await Promise.all([
        (async () => { try { const r = await fetch(FN('search-clips'), { method: 'POST', headers, body: JSON.stringify({ action: 'search_tiktok', queries }) }); const d = await r.json(); if (d?.ok && Array.isArray(d.clips)) rawClips = d.clips } catch { /* noop */ } })(),
        (async () => { try { const r = await fetch(FN('search-xhs'), { method: 'POST', headers, body: JSON.stringify({ ...searchArgs, tiktok_queries: queries }) }); const d = await r.json(); if (d?.ok && Array.isArray(d.clips)) xhsClips = d.clips } catch { /* noop */ } })(),
      ])

      srchTargetRef.current = 76
      const allCand = [...xhsClips, ...rawClips]
      if (!allCand.length) { setError(isUrl ? '검색 결과가 없습니다. 다른 URL을 시도해보세요.' : '검색 결과가 없어요. 다른 키워드를 시도해보세요.'); setSearching(false); return }

      let finalClips = allCand
      if (refFrames.length) {
        setSrchStage('관련도 필터 중'); srchTargetRef.current = 88
        try {
          const r2 = await fetch(FN('clip-filter'), { method: 'POST', headers, body: JSON.stringify({ reference_frames: refFrames, candidates: allCand, clip_count: 80 }) })
          const d2 = await r2.json()
          finalClips = d2.ok ? (d2.clips || allCand) : allCand.slice(0, 20)
          // clip-filter가 부가필드(src_height·지표·download_url)를 떨구므로 원본에서 재병합
          const _cm = new Map(allCand.map((x) => [x.video_id, x]))
          finalClips = finalClips.map((c) => { const o = _cm.get(c.video_id) || {}; return { ...o, ...c, download_url: c.download_url || o.download_url || '' } })
          const dlMap = new Map(allCand.map((c) => [c.video_id, c.download_url]))
          finalClips = finalClips.map((c) => ({ ...c, download_url: c.download_url || dlMap.get(c.video_id) || '' }))
        } catch { finalClips = allCand }
      }
      // 지표 필드 정규화(있으면 사용)
      setSrchStage('정리 중'); srchTargetRef.current = 95
      setClips(finalClips.map((c) => ({ ...c, views: c.views ?? c.view_count ?? c.play_count, likes: c.likes ?? c.like_count ?? c.digg_count, comments: c.comments ?? c.comment_count ?? c.comments_count })))
      try { sessionStorage.setItem('finds_cache', JSON.stringify({ q: su, clips: finalClips, ts: Date.now() })) } catch { /* noop */ }

      const kwForRelated = isUrl ? (searchArgs.keyword || '') : su
      if (kwForRelated) {
        try {
          const rr = await fetch(FN('related-keywords'), { method: 'POST', headers, body: JSON.stringify({ keyword: kwForRelated }) })
          const rd = await rr.json()
          if (rd?.ok && Array.isArray(rd.keywords)) setRelatedKw(rd.keywords.filter((k) => k && k !== kwForRelated))
        } catch { /* noop */ }
      }
    } catch {
      setError('분석 중 일시적인 오류가 있었어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSearching(false)
    }
  }

  const busyAny = searching
  useEffect(() => {
    if (!busyAny) return
    const iv = setInterval(() => setProgress((x) => {
      const t = srchTargetRef.current
      if (x >= t) return x
      return Math.min(t, x + Math.max(0.5, (t - x) * 0.18))
    }), 120)
    return () => { clearInterval(iv); setProgress(100); setTimeout(() => { setProgress(0); setSrchStage('') }, 500) }
  }, [busyAny])

  const analyzeChannel = async () => {
    const input = chUrl.trim()
    if (!input) return
    try { if (/instagram\.com|^@/i.test(input)) supabase.auth.getSession().then(({ data }) => fetch(FN('trend-capture'), { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: input }) }).catch(() => {})) } catch { /* noop */ }
    if (!session || session.user?.is_anonymous) { setShowAuth(true); return }
    if (!ackAnalyzeCost(balance)) return
    const { data: cr } = await supabase.rpc('use_finds_credit_rpc')
    if (!cr?.ok) { nav('/pricing'); return }
    setBalance(cr.balance)
    startChannel(input, () => setBalance((b) => (b == null ? b : b + 1)))
  }

  return (
    <div className="min-h-screen">
      <div className="fixed inset-x-0 top-0 z-[70] h-[3px]">
        {searching && <div className="h-full bg-gradient-to-r from-[#2A7BFF] via-[#0064FF] to-[#7C6BFF] transition-[width] duration-300 ease-out" style={{ width: progress + '%' }} />}
      </div>
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="https://oxygqtbdpnxxcgzwdlzi.supabase.co/storage/v1/object/public/assets/icon.png" alt="Chronit" className="h-8 w-8" />
            <span className="text-lg font-extrabold text-slate-900">Chronit</span>
          </Link>
          <SiteNav />
          <div className="flex items-center gap-2">
            <Link to="/" className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-600 transition-colors hover:border-slate-400">홈</Link>
            {session && <Link to="/me" className="rounded-full bg-slate-900 px-3 py-1.5 text-sm font-bold text-white">마이</Link>}
          </div>
        </div>
      </header>
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

        <div className="mb-3 flex items-center gap-2">
          {!isAnon && balance !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              <Sparkles size={12} /> 남은 이용권 {balance}
            </span>
          )}
          <ReferralCTA variant="button" />
          <button onClick={() => (isAnon ? setShowAuth(true) : nav('/pricing'))} className="inline-flex items-center gap-1 rounded-full bg-[#0064FF] px-3 py-1 text-xs font-bold text-white transition hover:brightness-95">이용권 구매</button>
        </div>
        <p className="-mt-1 mb-3 text-[11px] text-slate-400">{searchMode === 'channel'
          ? '‘채널 분석’ 실행 시 이용권 1개가 차감돼요 · 분석 실패 시 자동 환불돼요'
          : '검색은 무료예요 · 클립별 ‘분석하기’를 누르면 이용권 1개 차감 (같은 소스 다시 열기는 무료)'}</p>
        <div className="relative mb-2 flex w-full max-w-xs rounded-xl bg-slate-100 p-1 text-sm font-bold">
          <span aria-hidden className="absolute left-1 top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-lg bg-white shadow-sm transition-transform duration-300 ease-out" style={{ transform: searchMode === 'channel' ? 'translateX(100%)' : 'translateX(0)' }} />
          <button onClick={() => setSearchMode('clip')} className={`relative z-10 flex-1 rounded-lg py-2 transition-colors active:scale-[0.98] ${searchMode === 'clip' ? 'text-[#0064FF]' : 'text-slate-500'}`}>관련 클립 검색</button>
          <button onClick={() => setSearchMode('channel')} className={`relative z-10 flex-1 rounded-lg py-2 transition-colors active:scale-[0.98] ${searchMode === 'channel' ? 'text-[#0064FF]' : 'text-slate-500'}`}>채널 분석</button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input data-ph-search="1" ref={searchInputRef} value={searchMode === 'channel' ? chUrl : sourceUrl} onChange={(e) => (searchMode === 'channel' ? setChUrl(e.target.value) : setSourceUrl(e.target.value))}
            onKeyDown={(e) => { if (e.key === 'Enter') (searchMode === 'channel' ? analyzeChannel() : analyze()) }}
            placeholder={searchMode === 'channel' ? '채널 URL·@아이디 (유튜브·인스타) — 통째로 따라하기' : '쇼핑 릴스·틱톡 링크 붙여넣기 (또는 키워드)'}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0064FF]" />
          <button onClick={() => (searchMode === 'channel' ? analyzeChannel() : analyze())} disabled={searching || channelLoading}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#0064FF] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
            {(searchMode === 'channel' ? channelLoading : searching) ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {searchMode === 'channel' ? (channelLoading ? '분석 중…' : '채널 분석') : (searching ? '분석 중…' : '분석')}
          </button>
        </div>
        {searchMode === 'clip' && !searching && clips.length > 0 && (
          <p className="mt-2 text-xs text-slate-400">원하는 결과가 없나요? <button onClick={() => { try { const el = searchInputRef.current; if (el) { el.focus(); el.select(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }) } } catch { /* noop */ } }} className="font-bold text-[#0064FF] hover:underline">재검색</button></p>
        )}

        {searchMode === 'clip' && (relatedKw.length > 0 || (!searching && clips.length === 0)) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-bold text-slate-500">{relatedKw.length ? '연관 키워드' : '이렇게 시작해보세요'}</span>
            {(relatedKw.length ? relatedKw : ['살림템', '주방템', '자취템', '청소템', '수납템', '다이어트', '캠핑', '인테리어']).map((k) => (
              <button key={k} onClick={() => { setSourceUrl(k); analyze(k) }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-[#0064FF] hover:text-[#0064FF]">#{k}</button>
            ))}
          </div>
        )}
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            <AlertTriangle size={15} />{error}
          </div>
        )}

        {searchMode === 'clip' && searching && (
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-sm text-slate-500">
              <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin text-[#0064FF]" /> {srchStage || '관련 소스를 찾고 분석하고 있어요…'}</span>
              <span className="font-bold text-[#0064FF]">{Math.round(progress)}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-[#2A7BFF] via-[#0064FF] to-[#7C6BFF] transition-[width] duration-300 ease-out" style={{ width: progress + '%' }} />
            </div>
          </div>
        )}

        {searchMode === 'clip' && !searching && clips.length > 0 && (
          <p className="mt-5 -mb-1 text-xs leading-relaxed text-slate-400">찾은 소재는 원본과 비슷한 <b className="text-slate-500">레퍼런스</b>예요 — 100% 동일 상품이 아닐 수 있어요.{/화장품|뷰티|코스메틱|화장|스킨|립|틴트|파운데이션|쿠션|앰플|세럼|향수|마스카라|아이섀도/.test(sourceUrl) && ' 특히 화장품·뷰티는 동일 상품 매칭이 어려워 비슷한 느낌 위주로 나와요.'}</p>
        )}
        {searchMode === 'clip' && (
        <div className="relative">
          <div className={`mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 ${isAnon && clips.length ? 'pointer-events-none select-none blur-[6px]' : ''}`}>
            {clips.map((c) => <FindCard key={c.video_id} clip={c} onAnalyze={handleAnalyze} />)}
          </div>
          {isAnon && clips.length > 0 && (
            <div className="absolute inset-0 flex items-start justify-center pt-24">
              <div className="rounded-2xl border border-slate-100 bg-white/95 px-7 py-6 text-center shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] backdrop-blur">
                <p className="mb-1 text-lg font-bold text-slate-900">{clips.length}개의 소스를 찾았어요</p>
                <p className="mb-5 text-sm text-slate-500">로그인하면 바로 확인할 수 있어요</p>
                <button onClick={() => setShowAuth(true)} className="rounded-xl bg-[#0064FF] px-7 py-3 text-sm font-bold text-white transition hover:brightness-95">로그인하고 결과 보기</button>
              </div>
            </div>
          )}
        </div>
        )}

        {searchMode === 'channel' && (
          <div className="mt-8 text-center">
            {channelResult
              ? <button onClick={reopenChannel} className="rounded-xl border border-[#0064FF] px-5 py-2.5 text-sm font-bold text-[#0064FF] transition hover:bg-[#0064FF]/5">최근 채널 분석 결과 다시 보기 →</button>
              : (!channelLoading && <p className="mt-12 text-sm text-slate-400">채널 URL·@아이디를 넣고 분석하면 따라하기 플레이북이 나와요. (유튜브·인스타 지원)</p>)}
          </div>
        )}

        {searchMode === 'clip' && !searching && clips.length === 0 && !error && (
          <div className="mt-16 text-center text-sm text-slate-400">마음에 든 쇼핑 릴스 링크를 붙여넣거나, 위 키워드를 눌러 시작해보세요.</div>
        )}
      </div>

      {modalClip && <AnalyzeModal clip={modalClip} onAnalyzed={() => { fbPending.current = true }} onClose={() => { setModalClip(null); try { if (fbPending.current && !fbShown.current && !localStorage.getItem('chronit_finds_fb_done')) { fbPending.current = false; fbShown.current = true; setTimeout(() => setFbOpen(true), 500) } } catch { /* noop */ } }} />}
      {fbOpen && <FindsFeedbackModal onClose={() => setFbOpen(false)} />}
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      <FindsPricing open={payWall} onClose={() => setPayWall(false)} />
      <div className="h-16 md:hidden" />
      <FindsBottomNav />
    </div>
  )
}

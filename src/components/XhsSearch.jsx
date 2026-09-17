import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2, AlertTriangle, Bookmark, MessageCircle, ExternalLink, Layers, Lock, Crown, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { phCapture } from '../lib/posthog'
import { fmtCount } from '../lib/format'
import { useProPlus } from '../lib/useProPlus'

// 샤오홍슈 참고검색 — 리서치 하위 탭.
// 참고 전용: 다운로드·삽입 버튼을 두지 않는다. 원문은 샤오홍슈 링크로만 연다.
const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const FN = (n) => `${SB}/functions/v1/${n}`

// 샤오홍슈 지표는 숫자 또는 '1.2万' 같은 문자열로 온다 — 숫자면 우리 표기로, 아니면 그대로
const fmtStat = (v) => {
  if (v == null || v === '') return '-'
  const n = Number(v)
  return Number.isFinite(n) ? fmtCount(n) : String(v)
}

// 원본은 1440px(장당 ~300KB)이라 카드엔 과하다. imageView2 의 폭만 540 으로 낮추면 ~1/3 크기.
// (2열 카드 ~180px × 3배 화면 기준. sign 이 붙어 있어도 이 파라미터는 막히지 않는 것 확인)
const cardSrc = (src) => (src ? src.replace(/\/w\/\d+\//, '/w/540/') : '')

// xhscdn 은 Referer 를 보면 막는다 → no-referrer 로 핫링크.
// 줄인 주소가 실패하면 원본으로 한 번 더, 그래도 실패하면 빈 칸.
function XhsImg({ src, alt, eager }) {
  const [stage, setStage] = useState(0)   // 0: 줄인 주소, 1: 원본, 2: 실패
  const url = stage === 0 ? cardSrc(src) : stage === 1 ? src : ''
  if (!src || !url) {
    return <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300"><ImageOff size={22} /></div>
  }
  return (
    <img src={url} alt={alt} referrerPolicy="no-referrer" loading={eager ? 'eager' : 'lazy'} decoding="async"
      onError={() => setStage((s) => (s === 0 && cardSrc(src) !== src ? 1 : 2))} className="h-full w-full object-cover" />
  )
}

function XhsCard({ it }) {
  const imgs = (Array.isArray(it.images) && it.images.length ? it.images : [it.cover]).filter(Boolean)
  const [idx, setIdx] = useState(0)
  const scroller = useRef(null)
  const multi = imgs.length > 1

  const onScroll = (e) => {
    const el = e.currentTarget
    if (el.clientWidth) setIdx(Math.round(el.scrollLeft / el.clientWidth))
  }
  // 데스크톱은 스와이프가 없으니 화살표로 넘긴다
  const go = (dir) => {
    const el = scroller.current
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="group overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="relative aspect-[3/4] bg-slate-100">
        <div ref={scroller} onScroll={onScroll}
          className="flex h-full w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {imgs.length ? imgs.map((src, i) => (
            <div key={i} className="h-full w-full shrink-0 snap-center">
              {/* 첫 장만 바로 받고 나머지는 넘길 때 받는다 */}
              <XhsImg src={src} alt={i === 0 ? (it.title || '') : ''} eager={i === 0} />
            </div>
          )) : <XhsImg src="" alt="" />}
        </div>

        {multi && (
          <>
            <div className="pointer-events-none absolute right-1.5 top-1.5 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
              <Layers size={11} />{idx + 1}/{imgs.length}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1">
              {imgs.slice(0, 10).map((_, i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full shadow ${i === Math.min(idx, 9) ? 'bg-white' : 'bg-white/45'}`} />
              ))}
            </div>
            {idx > 0 && (
              <button onClick={() => go(-1)} aria-label="이전 이미지"
                className="absolute left-1 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 sm:flex">
                <ChevronLeft size={16} />
              </button>
            )}
            {idx < imgs.length - 1 && (
              <button onClick={() => go(1)} aria-label="다음 이미지"
                className="absolute right-1 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 sm:flex">
                <ChevronRight size={16} />
              </button>
            )}
          </>
        )}
      </div>

      <div className="p-2">
        <p className="mb-1.5 line-clamp-2 min-h-[2.6em] text-[12px] font-medium leading-snug text-slate-700">{it.title || '(제목 없음)'}</p>
        <div className="mb-2 flex items-center gap-2.5 text-[11px] text-slate-500">
          <span className="flex items-center gap-0.5" title="저장"><Bookmark size={11} />{fmtStat(it.collected)}</span>
          <span className="flex items-center gap-0.5" title="댓글"><MessageCircle size={11} />{fmtStat(it.comments)}</span>
        </div>
        {it.url && (
          <a href={it.url} target="_blank" rel="noopener noreferrer"
            onClick={() => { try { phCapture('xhs_note_opened') } catch { /* noop */ } }}
            className="flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs font-bold text-slate-600 transition hover:border-[#FF2442] hover:text-[#FF2442]">
            샤오홍슈에서 보기 <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  )
}

export default function XhsSearch({ session, onNeedAuth }) {
  const nav = useNavigate()
  const isAnon = !session || session.user?.is_anonymous === true
  const { ready, isProPlus, isAdmin } = useProPlus(session)
  const allowed = isProPlus || isAdmin

  const [kw, setKw] = useState('')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const reqId = useRef(0)   // 연타·키워드 변경 시 늦게 온 응답이 새 결과를 덮지 않게

  const run = async (keyword, pg = 1) => {
    const k = String(keyword || '').trim()
    if (!k) { setError('검색어를 입력해주세요'); return }
    if (isAnon) { onNeedAuth?.(); return }
    if (!allowed) return
    const id = ++reqId.current
    const more = pg > 1
    if (more) setLoadingMore(true)
    else { setLoading(true); setItems([]); setHasMore(false) }
    setError('')
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      const r = await fetch(FN('xhs-search'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${s?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: k, page: pg }),
      })
      const d = await r.json().catch(() => null)
      if (id !== reqId.current) return
      if (!r.ok || !d?.ok) {
        setError(d?.error ? `검색에 실패했어요: ${d.error}` : '검색에 실패했어요. 잠시 후 다시 시도해 주세요.')
        return
      }
      const got = Array.isArray(d.items) ? d.items : []
      setItems((prev) => {
        if (!more) return got
        const seen = new Set(prev.map((x) => x.note_id))
        return [...prev, ...got.filter((x) => !seen.has(x.note_id))]
      })
      setQuery(k); setPage(pg); setHasMore(got.length > 0)
      try { phCapture('xhs_searched', { page: pg, count: got.length, cached: !!d.cached }) } catch { /* noop */ }
    } catch {
      if (id === reqId.current) setError('검색 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      if (id === reqId.current) { setLoading(false); setLoadingMore(false) }
    }
  }

  if (!ready) {
    return <div className="mt-8 flex items-center gap-2 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" />확인 중…</div>
  }

  // 잠금 — 패스트벤치와 같은 기준(프로·비즈니스 구독 또는 관리자)
  if (!allowed) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-7 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-500"><Lock size={20} /></div>
        <p className="flex items-center justify-center gap-1 text-base font-bold text-slate-900"><Crown size={15} className="text-amber-500" />샤오홍슈 참고검색은 프로 이상 전용이에요</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">
          키워드로 샤오홍슈의 인기 노트를 찾아 이미지 구성·제목을 레퍼런스로 볼 수 있어요.
        </p>
        {isAnon ? (
          <button onClick={() => onNeedAuth?.()} className="mt-5 rounded-xl bg-[#0064FF] px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-95">로그인하고 시작하기</button>
        ) : (
          <button onClick={() => { try { phCapture('xhs_gate_clicked') } catch { /* noop */ } nav('/pricing') }}
            className="mt-5 rounded-xl bg-[#0064FF] px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-95">요금제 보기</button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={kw} onChange={(e) => setKw(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !loading) run(kw) }}
          placeholder="샤오홍슈에서 찾을 키워드"
          className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0064FF]" />
        <button onClick={() => run(kw)} disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#0064FF] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {loading ? '검색 중…' : '검색'}
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          <AlertTriangle size={15} />{error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-slate-400"><Loader2 size={14} className="animate-spin text-[#0064FF]" />샤오홍슈에서 찾는 중…</div>
      ) : items.length > 0 ? (
        <>
          <p className="mt-5 text-xs text-slate-400">‘{query}’ 참고 노트 {items.length}개 · 이미지를 옆으로 넘겨 볼 수 있어요</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((it, i) => <XhsCard key={it.note_id || i} it={it} />)}
          </div>
          {hasMore && (
            <div className="mt-5 text-center">
              <button onClick={() => run(query, page + 1)} disabled={loadingMore}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-[#0064FF] hover:text-[#0064FF] disabled:opacity-50">
                {loadingMore && <Loader2 size={14} className="animate-spin" />}{loadingMore ? '불러오는 중…' : '더 보기'}
              </button>
            </div>
          )}
        </>
      ) : query && !error ? (
        <div className="mt-16 text-center text-sm text-slate-400">‘{query}’ 검색 결과가 없어요. 다른 키워드로 찾아보세요.</div>
      ) : !error ? (
        <div className="mt-16 text-center text-sm text-slate-400">키워드를 넣으면 샤오홍슈 인기 노트를 레퍼런스로 보여드려요.</div>
      ) : null}
    </div>
  )
}

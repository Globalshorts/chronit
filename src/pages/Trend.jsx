import { useState, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Flame, Eye, Heart, MessageCircle, ExternalLink, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { FEATURES } from '../config/features'
import SiteNav from '../components/SiteNav'

// 기존 "오늘의 트렌드"(VideoGenerator) 데이터 로딩을 재사용한 독립 페이지 + pint 스타일 대시보드.
const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const FN = (n) => `${SB}/functions/v1/${n}`
const fmt = (n) => { n = Math.max(0, Math.trunc(Number(n) || 0)); return n >= 10000 ? (n / 10000).toFixed(1) + '만' : n >= 1000 ? (n / 1000).toFixed(1) + '천' : String(n) }

const SORTS = [['recent', '최신'], ['view', '조회수'], ['like', '좋아요'], ['comment', '댓글']]
const RANGES = [['24h', '24시간', 1], ['7d', '7일', 7], ['all', '전체', 0]]

export default function Trend() {
  const [session, setSession] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [sort, setSort] = useState('recent')
  const [range, setRange] = useState(7)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => { try { sub.subscription.unsubscribe() } catch { /* noop */ } }
  }, [])

  useEffect(() => {
    if (!session) return
    let alive = true
    ;(async () => {
      setLoading(true); setErr('')
      try {
        const { data: { session: s } } = await supabase.auth.getSession()
        const r = await fetch(FN('trend-feed'), { method: 'POST', headers: { Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        const d = await r.json()
        if (alive) setItems(d.items || [])
      } catch { if (alive) setErr('트렌드를 불러오지 못했어요.') }
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
            {session && <Link to="/me" className="rounded-full bg-slate-900 px-3 py-1.5 text-sm font-bold text-white">마이</Link>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-5">
          <div className="flex items-center gap-2 text-[#0064FF]"><Flame size={22} /><h1 className="text-2xl font-extrabold text-slate-900">실시간 트렌드</h1></div>
          <p className="mt-1 text-sm text-slate-500">지금 뜨는 쇼핑 숏폼을 한눈에. 조회수·좋아요 순으로 정렬해 확인하세요.</p>
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

        {!session ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-10 text-center">
            <p className="font-bold text-slate-600">로그인하면 실시간 트렌드를 볼 수 있어요.</p>
            <Link to="/" className="mt-3 inline-block rounded-full bg-[#0064FF] px-5 py-2 text-sm font-bold text-white">로그인하러 가기</Link>
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 py-10 text-slate-400"><Loader2 size={16} className="animate-spin" />트렌드 불러오는 중…</div>
        ) : err ? (
          <div className="py-10 text-red-500">{err}</div>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
            {list.map((it, i) => (
              <a key={it.shortcode || i} href={it.url} target="_blank" rel="noreferrer noopener" className="flex items-center gap-3 p-3 transition-colors hover:bg-slate-50">
                <span className="w-6 shrink-0 text-center text-sm font-extrabold text-slate-400">{i + 1}</span>
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {it.thumbnail_url ? <img src={it.thumbnail_url} referrerPolicy="no-referrer" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-slate-800">{it.caption || '(설명 없음)'}</p>
                  <p className="mt-0.5 text-xs text-slate-400">@{it.owner || '?'}{it.taken_at ? ` · ${Math.max(0, Math.floor((now - new Date(it.taken_at).getTime()) / 86400000))}일 전` : ''}</p>
                </div>
                <div className="hidden shrink-0 items-center gap-3 text-xs text-slate-500 sm:flex">
                  <span className="flex items-center gap-1"><Eye size={13} />{fmt(it.view_count)}</span>
                  <span className="flex items-center gap-1"><Heart size={13} />{fmt(it.like_count)}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={13} />{fmt(it.comment_count)}</span>
                </div>
                <ExternalLink size={14} className="shrink-0 text-slate-300" />
              </a>
            ))}
            {!list.length && <div className="p-10 text-center text-sm text-slate-400">해당 기간에 트렌드가 없어요.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

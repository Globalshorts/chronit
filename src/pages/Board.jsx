import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageSquare, ThumbsUp, Eye, PenLine, Users, Megaphone } from 'lucide-react'
import CommunityHeader from '../components/CommunityHeader'
import BoardEmptyState from '../components/BoardEmptyState'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabase'

export const CATEGORIES = [
  { key: 'all',  label: '전체' },
  { key: 'free', label: '자유' },
  { key: 'show', label: '수익인증' },
  { key: 'qna',  label: '질문' },
]
export const CAT_LABEL = { free: '자유', show: '수익인증', qna: '질문' }
export const CAT_CLS = {
  free: 'bg-gray-100 text-gray-500',
  show: 'bg-[#03C75A]/15 text-[#03C75A]',
  qna:  'bg-amber-100 text-amber-600',
}
export const fmtWhen = (s) => {
  const d = new Date(s), diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return '방금'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`
  return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')
}

const evStatus = {
  active: { label: '진행중', cls: 'bg-[#03C75A]/15 text-[#03C75A]' },
  ended:  { label: '종료', cls: 'bg-gray-100 text-slate-400' },
  winner: { label: '당첨자 발표', cls: 'bg-amber-100 text-amber-600' },
}
const evExcerpt = (src = '', n = 90) => {
  const t = src.replace(/<[^>]+>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#>*_`~|]/g, ' ').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}
const evFmtDate = (s) => new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')

const Board = () => {
  const nav = useNavigate()
  const [tab, setTab] = useState('all')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [uid, setUid] = useState(null)
  const [events, setEvents] = useState([])
  const [challenge, setChallenge] = useState('')

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setUid(data.session?.user?.id ?? null)) }, [])

  useEffect(() => {
    supabase.from('events').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setEvents(data || []))
    supabase.from('point_challenges').select('label, starts_at, ends_at')
      .eq('active', true).neq('label', '').order('id', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        if (!data) return setChallenge('')
        const now = Date.now()
        const okStart = !data.starts_at || new Date(data.starts_at).getTime() <= now
        const okEnd = !data.ends_at || new Date(data.ends_at).getTime() >= now
        setChallenge(okStart && okEnd ? (data.label || '') : '')
      })
  }, [])

  useEffect(() => {
    setLoading(true)
    let q = supabase.from('board_posts').select('*').eq('is_deleted', false).eq('is_hidden', false).order('created_at', { ascending: false }).limit(50)
    if (tab !== 'all') q = q.eq('category', tab)
    q.then(({ data }) => { setPosts(data || []); setLoading(false) })
  }, [tab])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAF8] font-sans break-keep text-gray-900">
      <CommunityHeader active="board" />

      <section className="relative px-5 pt-32 pb-8 md:px-8 md:pt-44 md:pb-10">
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#03C75A]/20 bg-[#03C75A]/10 px-4 py-1.5 text-sm font-bold text-[#03C75A]">
            <Users size={14} /> <span>크로닛 커뮤니티</span>
          </div>
          <h1 className="mb-3 text-4xl font-black tracking-tight md:text-5xl">커뮤니티</h1>
          <p className="text-base leading-[1.8] text-slate-500 md:text-lg">공지·이벤트를 확인하고, 글·댓글·추천으로 포인트를 모아보세요.</p>
        </div>
      </section>

      <section className="px-5 pb-28 md:px-8">
        <div className="mx-auto max-w-3xl">

          {/* 이번 주 챌린지 배너 (활성 시 항상 노출) */}
          {challenge && (
            <div className="mb-6 flex items-center gap-2 rounded-2xl border border-[#03C75A]/25 bg-[#03C75A]/10 px-5 py-3.5 text-sm font-bold text-[#03C75A] sm:text-base">
              <span>🎯</span><span>이번 주 챌린지 — {challenge}</span>
            </div>
          )}

          {/* 공지·이벤트 (게시판에 통합 — 컴팩트 리스트) */}
          {events.length > 0 && (
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone size={16} className="text-[#03C75A]" />
                  <h2 className="text-sm font-black text-gray-900">공지·이벤트</h2>
                </div>
                {events.length > 4 && (
                  <Link to="/events" className="text-xs font-bold text-slate-400 transition-colors hover:text-[#03C75A]">전체 보기 →</Link>
                )}
              </div>
              <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                {events.slice(0, 4).map(ev => {
                  const st = evStatus[ev.status] || evStatus.active
                  return (
                    <Link key={ev.id} to={`/events/${ev.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#FAFAF8]">
                      <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                      <span className="flex-1 truncate text-sm font-bold text-gray-900">{ev.title}</span>
                      <span className="hidden flex-none text-xs text-slate-400 sm:block">{evFmtDate(ev.created_at)}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* 게시판 */}
          <div className="mb-1 flex items-center justify-between border-b border-gray-200">
            <div className="flex">
              {CATEGORIES.map(c => (
                <button key={c.key} onClick={() => setTab(c.key)}
                  className={`-mb-px border-b-2 px-4 py-3 text-sm font-bold transition-colors md:px-5 ${tab === c.key ? 'border-[#03C75A] text-[#03C75A]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <Link to="/board/write" className="hidden items-center gap-1.5 rounded-full bg-[#03C75A] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-[#02b350] active:scale-95 sm:flex">
              <PenLine size={15} /> 글쓰기
            </Link>
          </div>

          {loading ? (
            <p className="py-16 text-center text-sm text-slate-500">불러오는 중…</p>
          ) : posts.length === 0 ? (
            <BoardEmptyState />
          ) : (
            <ul className="divide-y divide-gray-100 pt-2">
              {posts.map(p => (
                <li key={p.id}>
                  <Link to={`/board/${p.id}`} className="flex flex-col gap-1.5 px-1 py-4 transition-colors hover:bg-white/60">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${CAT_CLS[p.category] || CAT_CLS.free}`}>{CAT_LABEL[p.category] || '자유'}</span>
                      <h3 className="flex-1 truncate text-base font-bold text-gray-900">{p.title}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); nav(p.user_id === uid ? '/me' : `/board/u/${p.user_id}`) }}
                        className="font-medium text-slate-500 hover:text-[#03C75A] hover:underline">{p.author_nickname}</span>
                      <span>{fmtWhen(p.created_at)}</span>
                      <span className="ml-auto flex items-center gap-3">
                        <span className="flex items-center gap-1"><ThumbsUp size={13} />{p.like_count}</span>
                        <span className="flex items-center gap-1"><MessageSquare size={13} />{p.comment_count}</span>
                        <span className="flex items-center gap-1"><Eye size={13} />{p.view_count}</span>
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 모바일 글쓰기 FAB */}
      <button onClick={() => nav('/board/write')}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#03C75A] text-white shadow-xl shadow-[#03C75A]/30 transition-all active:scale-90 sm:hidden">
        <PenLine size={22} />
      </button>

      <Footer />
    </div>
  )
}

export default Board

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageSquare, ThumbsUp, Eye, PenLine, Users, Megaphone } from 'lucide-react'
import CommunityHeader from '../components/CommunityHeader'
import BoardEmptyState from '../components/BoardEmptyState'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabase'

// 게시판은 운영자 공지 전용. 아래 라벨은 기존 글(자유/수익인증/질문) 호환 + 신규 notice 표시용.
export const CAT_LABEL = { notice: '공지', free: '자유', show: '수익인증', qna: '질문' }
export const CAT_CLS = {
  notice: 'bg-[#03C75A]/15 text-[#03C75A]',
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

const TABS = [
  { key: 'notice', label: '공지' },
  { key: 'event',  label: '이벤트' },
]
const evStatus = {
  active: { label: '진행중', cls: 'bg-[#03C75A]/15 text-[#03C75A]' },
  ended:  { label: '종료', cls: 'bg-gray-100 text-slate-400' },
  winner: { label: '당첨자 발표', cls: 'bg-amber-100 text-amber-600' },
}
const evFmtDate = (s) => new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')

const Board = () => {
  const nav = useNavigate()
  const [tab, setTab] = useState('notice')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [uid, setUid] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [events, setEvents] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user?.id ?? null
      setUid(u)
      if (u) supabase.from('subscriptions').select('role').eq('user_id', u).maybeSingle()
        .then(({ data: sub }) => setIsAdmin(sub?.role === 'super_admin'))
    })
  }, [])

  useEffect(() => {
    supabase.from('events').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setEvents(data || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    supabase.from('board_posts').select('*').eq('is_deleted', false).eq('is_hidden', false)
      .order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { setPosts(data || []); setLoading(false) })
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAF8] font-sans break-keep text-gray-900">
      <CommunityHeader active="board" />

      <section className="relative px-5 pt-32 pb-8 md:px-8 md:pt-44 md:pb-10">
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#03C75A]/20 bg-[#03C75A]/10 px-4 py-1.5 text-sm font-bold text-[#03C75A]">
            <Users size={14} /> <span>크로닛 커뮤니티</span>
          </div>
          <h1 className="mb-3 text-4xl font-black tracking-tight md:text-5xl">공지·이벤트</h1>
          <p className="text-base leading-[1.8] text-slate-500 md:text-lg">크로닛 소식을 확인하고, 후기·질문·자랑은 공식 네이버 카페에서 만나요.</p>
        </div>
      </section>

      <section className="px-5 pb-28 md:px-8">
        <div className="mx-auto max-w-3xl">

          {/* 네이버 공식 카페 유도 */}
          <a href="https://cafe.naver.com/chronit" target="_blank" rel="noreferrer"
            className="mb-6 flex items-center gap-3 rounded-2xl border border-[#03C75A]/25 bg-gradient-to-r from-[#03C75A]/10 to-[#03C75A]/5 px-5 py-4 transition hover:from-[#03C75A]/15">
            <span className="text-2xl">💬</span>
            <div className="flex-1">
              <p className="text-sm font-black text-gray-900">크로닛 공식 네이버 카페</p>
              <p className="text-xs text-slate-500">후기·꿀팁·질문은 공식 카페에서 — 가입하고 이벤트 받기</p>
            </div>
            <span className="flex-none rounded-full bg-[#03C75A] px-3 py-1.5 text-xs font-bold text-white">가입하기 →</span>
          </a>

          {/* 탭 (공지 / 이벤트) */}
          <div className="mb-1 flex items-center justify-between border-b border-gray-200">
            <div className="flex">
              {TABS.map(c => (
                <button key={c.key} onClick={() => setTab(c.key)}
                  className={`-mb-px border-b-2 px-4 py-3 text-sm font-bold transition-colors md:px-5 ${tab === c.key ? 'border-[#03C75A] text-[#03C75A]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  {c.label}
                </button>
              ))}
            </div>
            {isAdmin && tab === 'notice' && (
              <Link to="/board/write" className="hidden items-center gap-1.5 rounded-full bg-[#03C75A] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-[#02b350] active:scale-95 sm:flex">
                <PenLine size={15} /> 공지 작성
              </Link>
            )}
          </div>

          {/* 공지 탭 */}
          {tab === 'notice' && (
            loading ? (
              <p className="py-16 text-center text-sm text-slate-500">불러오는 중…</p>
            ) : posts.length === 0 ? (
              <BoardEmptyState />
            ) : (
              <ul className="divide-y divide-gray-100 pt-2">
                {posts.map(p => (
                  <li key={p.id}>
                    <Link to={`/board/${p.id}`} className="flex items-start gap-3 px-1 py-4 transition-colors hover:bg-white/60">
                      {p.image_url && (
                        <img src={p.image_url} alt="" className="h-14 w-14 flex-none rounded-lg border border-gray-200 object-cover" />
                      )}
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-[#03C75A]/15 px-2 py-0.5 text-xs font-bold text-[#03C75A]">공지</span>
                          <h3 className="flex-1 truncate text-base font-bold text-gray-900">{p.title}</h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>{p.author_nickname}</span>
                          <span>{fmtWhen(p.created_at)}</span>
                          <span className="ml-auto flex items-center gap-3">
                            <span className="flex items-center gap-1"><ThumbsUp size={13} />{p.like_count}</span>
                            <span className="flex items-center gap-1"><MessageSquare size={13} />{p.comment_count}</span>
                            <span className="flex items-center gap-1"><Eye size={13} />{p.view_count}</span>
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )
          )}

          {/* 이벤트 탭 */}
          {tab === 'event' && (
            events.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">
                <Megaphone size={28} className="mx-auto mb-3 opacity-30" />
                진행 중인 이벤트가 없어요
              </div>
            ) : (
              <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white pt-0 shadow-sm">
                {events.map(ev => {
                  const st = evStatus[ev.status] || evStatus.active
                  return (
                    <Link key={ev.id} to={`/events/${ev.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#FAFAF8]">
                      <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                      <span className="flex-1 truncate text-sm font-bold text-gray-900">{ev.title}</span>
                      <span className="hidden flex-none text-xs text-slate-400 sm:block">{evFmtDate(ev.created_at)}</span>
                    </Link>
                  )
                })}
              </div>
            )
          )}
        </div>
      </section>

      {/* 모바일 공지 작성 FAB (운영자만) */}
      {isAdmin && tab === 'notice' && (
        <button onClick={() => nav('/board/write')}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#03C75A] text-white shadow-xl shadow-[#03C75A]/30 transition-all active:scale-90 sm:hidden">
          <PenLine size={22} />
        </button>
      )}

      <Footer />
    </div>
  )
}

export default Board

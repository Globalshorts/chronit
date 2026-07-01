import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, ThumbsUp, MessageSquare } from 'lucide-react'
import CommunityHeader from '../components/CommunityHeader'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabase'
import { CAT_LABEL, CAT_CLS, fmtWhen } from './Board'

const UserProfile = () => {
  const { id } = useParams()
  const nav = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id === id) nav('/me', { replace: true })
    })
  }, [id])

  useEffect(() => {
    setLoading(true)
    supabase.from('board_posts').select('*').eq('user_id', id).eq('is_deleted', false).eq('is_hidden', false)
      .order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { setPosts(data || []); setLoading(false) })
  }, [id])

  const nickname = posts[0]?.author_nickname || '사용자'

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAF8] font-sans break-keep text-gray-900">
      <CommunityHeader active="board" />
      <section className="mx-auto max-w-2xl px-5 pt-28 pb-24 md:pt-36">
        <button onClick={() => nav(-1)} className="mb-5 flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-gray-900">
          <ArrowLeft size={16} /> 뒤로
        </button>

        <div className="mb-6 flex items-center gap-4 rounded-3xl border border-gray-200 bg-white p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0064FF]/10 text-[#0064FF]"><User size={26} /></div>
          <div>
            <div className="text-xl font-black">{loading ? '…' : nickname}</div>
            <div className="text-sm text-slate-500">작성한 글 {posts.length}개</div>
          </div>
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-slate-500">불러오는 중…</p>
        ) : posts.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">아직 작성한 글이 없어요</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {posts.map(p => (
              <li key={p.id}>
                <Link to={`/board/${p.id}`} className="flex flex-col gap-1.5 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${CAT_CLS[p.category] || CAT_CLS.free}`}>{CAT_LABEL[p.category] || '자유'}</span>
                    <span className="flex-1 truncate text-base font-bold text-gray-900">{p.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{fmtWhen(p.created_at)}</span>
                    <span className="ml-auto flex items-center gap-3">
                      <span className="flex items-center gap-1"><ThumbsUp size={13} />{p.like_count}</span>
                      <span className="flex items-center gap-1"><MessageSquare size={13} />{p.comment_count}</span>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Footer />
    </div>
  )
}

export default UserProfile

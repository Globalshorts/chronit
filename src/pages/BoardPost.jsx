import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ThumbsUp, MessageSquare, Eye, Flag } from 'lucide-react'
import CommunityHeader from '../components/CommunityHeader'
import NicknameModal from '../components/NicknameModal'
import { supabase } from '../lib/supabase'
import DOMPurify from 'dompurify'
import { CAT_LABEL, CAT_CLS, fmtWhen } from './Board'

const BoardPost = () => {
  const { id } = useParams()
  const nav = useNavigate()
  const [user, setUser] = useState(null)
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [liked, setLiked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [nickOpen, setNickOpen] = useState(false)
  const [err, setErr] = useState('')
  const [reportTarget, setReportTarget] = useState(null) // {type,id}
  const [toast, setToast] = useState('')

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null)) }, [])

  const loadComments = () =>
    supabase.from('board_comments').select('*').eq('post_id', id).eq('is_deleted', false).eq('is_hidden', false)
      .order('created_at', { ascending: true }).then(({ data }) => setComments(data || []))

  const submitReport = async (reason) => {
    const t = reportTarget
    setReportTarget(null)
    if (!user) { nav('/generate'); return }
    const { data, error } = await supabase.rpc('report_content_rpc', { p_target_type: t.type, p_target_id: t.id, p_reason: reason })
    if (error || !data?.ok) { setToast(data?.error || '신고할 수 없어요'); }
    else if (data.already) { setToast('이미 신고한 게시물이에요'); }
    else if (data.hidden) { setToast('신고가 누적되어 숨김 처리되었어요'); if (t.type === 'post') nav('/board'); else loadComments(); }
    else { setToast('신고가 접수되었어요'); }
    setTimeout(() => setToast(''), 3000)
  }

  const delPost = async () => {
    if (!confirm('이 글을 삭제할까요? 되돌릴 수 없어요.')) return
    const { error } = await supabase.from('board_posts').update({ is_deleted: true }).eq('id', post.id)
    if (error) { setToast('삭제할 수 없어요'); setTimeout(() => setToast(''), 3000); return }
    nav('/board')
  }

  useEffect(() => {
    let alive = true
    supabase.from('board_posts').select('*').eq('id', id).eq('is_deleted', false).maybeSingle()
      .then(({ data }) => {
        if (!alive) return
        setPost(data); setLoading(false)
        if (data) {
          supabase.rpc('increment_post_view_rpc', { p_post_id: Number(id) })
            .then(() => { if (alive) setPost(p => (p ? { ...p, view_count: (p.view_count || 0) + 1 } : p)) })
        }
      })
    loadComments()
    return () => { alive = false }
  }, [id])

  useEffect(() => {
    if (!user || !post) return
    supabase.from('board_likes').select('post_id').eq('post_id', id).eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setLiked(!!data))
  }, [user, post, id])

  const toggleLike = async () => {
    if (!user) { nav('/generate'); return }
    const { data, error } = await supabase.rpc('board_toggle_like_rpc', { p_post_id: Number(id) })
    if (error || !data?.ok) return
    setLiked(data.liked)
    setPost(p => ({ ...p, like_count: data.like_count }))
  }

  const submitComment = async () => {
    if (!user) { nav('/generate'); return }
    setErr(''); setPosting(true)
    const { data, error } = await supabase.functions.invoke('board-submit', { body: { kind: 'comment', post_id: Number(id), body: text } })
    setPosting(false)
    if (error) { setErr('오류가 발생했어요'); return }
    if (!data?.ok) { if (data?.need_nickname) { setNickOpen(true); return } setErr(data?.error || '댓글을 등록할 수 없어요'); return }
    setText(''); loadComments()
    setPost(p => ({ ...p, comment_count: (p.comment_count || 0) + 1 }))
  }

  if (loading) return (<div className="min-h-screen bg-[#FAFAF8] font-sans"><CommunityHeader active="board" /><p className="pt-40 text-center text-sm text-slate-500">불러오는 중…</p></div>)
  if (!post) return (
    <div className="min-h-screen bg-[#FAFAF8] font-sans"><CommunityHeader active="board" />
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-5 pt-24 text-center">
        <p className="text-lg font-bold">게시글을 찾을 수 없어요</p>
        <button onClick={() => nav('/board')} className="rounded-full bg-[#03C75A] px-6 py-2.5 font-bold text-white">목록으로</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAF8] font-sans break-keep text-gray-900">
      <CommunityHeader active="board" />
      <article className="mx-auto max-w-2xl px-5 pt-28 pb-12 md:pt-36">
        <button onClick={() => nav('/board')} className="mb-5 flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-gray-900">
          <ArrowLeft size={16} /> 목록으로
        </button>

        <div className="mb-3 flex items-center gap-2">
          <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${CAT_CLS[post.category] || CAT_CLS.free}`}>{CAT_LABEL[post.category] || '자유'}</span>
        </div>
        <h1 className="mb-3 text-2xl font-black leading-snug md:text-3xl">{post.title}</h1>
        <div className="flex items-center gap-3 border-b border-gray-200 pb-4 text-sm text-slate-400">
          <Link to={post.user_id === user?.id ? '/me' : `/board/u/${post.user_id}`} className="font-bold text-slate-600 hover:text-[#03C75A] hover:underline">{post.author_nickname}</Link>
          <span>{fmtWhen(post.created_at)}</span>
          <span className="ml-auto flex items-center gap-1"><Eye size={14} />{post.view_count}</span>
          {user && post.user_id !== user.id && (
            <button onClick={() => setReportTarget({ type: 'post', id: post.id })} className="flex items-center gap-1 text-slate-400 transition-colors hover:text-red-500"><Flag size={13} />신고</button>
          )}
          {user && post.user_id === user.id && (
            <>
              <button onClick={() => nav(`/board/write?edit=${post.id}`)} className="font-bold text-slate-400 transition-colors hover:text-[#03C75A]">수정</button>
              <button onClick={delPost} className="font-bold text-slate-400 transition-colors hover:text-red-500">삭제</button>
            </>
          )}
        </div>

        {post.image_url && (
          <img src={post.image_url} alt="" className="mt-5 w-full rounded-2xl border border-gray-200" />
        )}
        {/<[a-z][\s\S]*>/i.test(post.body || '') ? (
          <div className="event-post py-7" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.body || '') }} />
        ) : (
          <div className="whitespace-pre-wrap py-7 text-[15px] leading-[1.9] text-gray-800">{post.body}</div>
        )}
        <style>{`
          .event-post { color:#374151; font-size:1.02rem; line-height:1.9; }
          .event-post > :first-child { margin-top:0; }
          .event-post h1,.event-post h2 { font-size:1.45rem; font-weight:800; color:#111827; margin:1.6em 0 .6em; line-height:1.35; }
          .event-post h3 { font-size:1.18rem; font-weight:800; color:#111827; margin:1.3em 0 .5em; }
          .event-post p { margin:0 0 1.05em; }
          .event-post ul,.event-post ol { margin:0 0 1.05em; padding-left:1.4em; }
          .event-post ul { list-style:disc; }
          .event-post ol { list-style:decimal; }
          .event-post li { margin:.4em 0; }
          .event-post b,.event-post strong { color:#111827; font-weight:800; }
          .event-post a { color:#03C75A; text-decoration:underline; font-weight:600; }
          .event-post img { max-width:100%; border-radius:14px; margin:1.2em 0; }
          .event-post hr { border:0; border-top:1px solid #e5e7eb; margin:1.7em 0; }
          .event-post blockquote { border-left:3px solid #03C75A; background:rgba(3,199,90,.06); padding:.7em 1.1em; border-radius:10px; margin:1.1em 0; }
        `}</style>

        <div className="flex justify-center pb-8">
          <button onClick={toggleLike}
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition-all active:scale-95 ${liked ? 'bg-[#03C75A] text-white shadow-lg shadow-[#03C75A]/25' : 'bg-white text-slate-600 ring-1 ring-gray-200 hover:ring-[#03C75A]/40'}`}>
            <ThumbsUp size={16} /> 추천 {post.like_count}
          </button>
        </div>

        {/* 댓글 */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="mb-4 flex items-center gap-1.5 text-base font-black"><MessageSquare size={17} /> 댓글 {comments.length}</h2>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row">
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitComment()}
              placeholder={user ? '댓글을 입력하세요' : '로그인 후 댓글을 남길 수 있어요'}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#03C75A]" />
            <button onClick={submitComment} disabled={posting}
              className="rounded-xl bg-[#03C75A] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#02b350] active:scale-95 disabled:opacity-50">
              {posting ? '등록 중' : '등록'}
            </button>
          </div>
          {err && <p className="mb-3 text-sm font-medium text-red-500">{err}</p>}

          {comments.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">첫 댓글을 남겨보세요</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {comments.map(c => (
                <li key={c.id} className="py-3.5">
                  <div className="mb-1 flex items-center gap-2 text-xs text-slate-400">
                    <Link to={c.user_id === user?.id ? '/me' : `/board/u/${c.user_id}`} className="font-bold text-slate-600 hover:text-[#03C75A] hover:underline">{c.author_nickname}</Link>
                    <span>{fmtWhen(c.created_at)}</span>
                    {user && c.user_id !== user.id && (
                      <button onClick={() => setReportTarget({ type: 'comment', id: c.id })} className="ml-auto flex items-center gap-1 transition-colors hover:text-red-500"><Flag size={11} />신고</button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{c.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>

      <NicknameModal open={nickOpen} onClose={() => setNickOpen(false)} onDone={() => { setNickOpen(false); submitComment() }} />

      {/* 신고 사유 모달 */}
      {reportTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm" onClick={() => setReportTarget(null)}>
          <div className="w-full max-w-xs rounded-3xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-black text-gray-900">신고하기</h3>
            <p className="mb-4 text-sm text-slate-500">신고 사유를 선택해주세요. 누적되면 자동으로 숨김 처리돼요.</p>
            <div className="flex flex-col gap-2">
              {[['ad', '광고/홍보'], ['abuse', '욕설/비방'], ['flood', '도배'], ['etc', '기타']].map(([k, label]) => (
                <button key={k} onClick={() => submitReport(k)}
                  className="rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-500 active:scale-95">
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-8 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-gray-900 px-5 py-3 text-sm font-bold text-white shadow-xl">{toast}</div>}
    </div>
  )
}

export default BoardPost

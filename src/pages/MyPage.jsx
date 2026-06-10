import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Coins, Flame, Film, Pencil, LogOut, Copy, Check, Gift } from 'lucide-react'
import CommunityHeader from '../components/CommunityHeader'
import NicknameModal from '../components/NicknameModal'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabase'
import { CAT_LABEL, CAT_CLS, fmtWhen } from './Board'

const RED_STATUS = {
  requested: { label: '처리 중', cls: 'bg-amber-100 text-amber-600' },
  sent: { label: '발송 완료', cls: 'bg-[#03C75A]/15 text-[#03C75A]' },
  failed: { label: '발송 실패', cls: 'bg-red-100 text-red-500' },
  rejected: { label: '반려', cls: 'bg-gray-100 text-gray-500' },
}

const MyPage = () => {
  const nav = useNavigate()
  const [user, setUser] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [points, setPoints] = useState(0)
  const [credits, setCredits] = useState(null)
  const [streak, setStreak] = useState(0)
  const [posts, setPosts] = useState([])
  const [comments, setComments] = useState([])
  const [reds, setReds] = useState([])
  const [tab, setTab] = useState('posts')
  const [nickOpen, setNickOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null)) }, [])

  const load = async (uid) => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
    const [{ data: prof }, { data: pts }, { data: bal }, { data: att }, { data: ps }, { data: cs }, { data: rs }] = await Promise.all([
      supabase.from('profiles').select('nickname,email,referral_code,created_at').eq('id', uid).maybeSingle(),
      supabase.rpc('get_my_points_rpc'),
      supabase.rpc('get_my_balance_rpc').single(),
      supabase.from('attendance_checks').select('streak').eq('user_id', uid).eq('check_date', today).maybeSingle(),
      supabase.from('board_posts').select('*').eq('user_id', uid).eq('is_deleted', false).order('created_at', { ascending: false }).limit(50),
      supabase.from('board_comments').select('*').eq('user_id', uid).eq('is_deleted', false).order('created_at', { ascending: false }).limit(50),
      supabase.from('gifticon_redemptions').select('*').order('created_at', { ascending: false }).limit(30),
    ])
    setProfile(prof || { email: user?.email })
    setPoints(pts ?? 0)
    setCredits(bal?.balance ?? 0)
    setStreak(att?.streak ?? 0)
    setPosts(ps || []); setComments(cs || []); setReds(rs || [])
  }
  useEffect(() => { if (user) load(user.id) }, [user])

  const copyRef = () => {
    const code = profile?.referral_code
    if (!code) return
    navigator.clipboard?.writeText(`https://chronit.kr/?ref=${code}`)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  if (user === null) return (
    <div className="min-h-screen bg-[#FAFAF8] font-sans"><CommunityHeader active="me" />
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="text-lg font-bold">로그인이 필요해요</p>
        <button onClick={() => nav('/generate')} className="rounded-full bg-[#03C75A] px-6 py-2.5 font-bold text-white">로그인하러 가기</button>
      </div>
    </div>
  )

  const tabs = [['posts', `내 글 ${posts.length}`], ['comments', `내 댓글 ${comments.length}`], ['reds', `교환내역 ${reds.length}`]]

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAF8] font-sans break-keep text-gray-900">
      <CommunityHeader active="me" />
      <section className="mx-auto max-w-2xl px-5 pt-28 pb-24 md:pt-36">
        {/* 프로필 카드 */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-2xl font-black">{profile?.nickname || '닉네임 미설정'}</span>
                <button onClick={() => setNickOpen(true)} className="shrink-0 text-slate-400 hover:text-[#03C75A]" title="닉네임 변경"><Pencil size={16} /></button>
              </div>
              <div className="mt-1 truncate text-sm text-slate-500">{profile?.email || user?.email}</div>
              {profile?.created_at && <div className="mt-0.5 text-xs text-slate-400">가입일 {new Date(profile.created_at).toLocaleDateString('ko-KR')}</div>}
            </div>
            <button onClick={() => supabase.auth.signOut().then(() => nav('/'))}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-300 px-3.5 py-2 text-sm font-bold text-gray-600 transition-all hover:border-gray-400 active:scale-95">
              <LogOut size={15} /> 로그아웃
            </button>
          </div>
          {profile?.referral_code && (
            <button onClick={copyRef} className="mt-4 flex w-full items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-100">
              <span className="text-sm text-slate-500">내 추천 링크 <span className="font-bold text-gray-800">?ref={profile.referral_code}</span></span>
              {copied ? <Check size={16} className="text-[#03C75A]" /> : <Copy size={16} className="text-slate-400" />}
            </button>
          )}
        </div>

        {/* 요약 stats */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Link to="/points" className="rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:border-[#03C75A]/40">
            <div className="flex items-center gap-1 text-xs text-slate-400"><Coins size={13} /> 포인트</div>
            <div className="mt-1 text-xl font-black text-[#03C75A]">{points.toLocaleString()}</div>
          </Link>
          <Link to="/points" className="rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:border-[#03C75A]/40">
            <div className="flex items-center gap-1 text-xs text-slate-400"><Flame size={13} /> 연속출석</div>
            <div className="mt-1 text-xl font-black text-orange-500">{streak}일</div>
          </Link>
          <Link to="/generate" className="rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:border-[#03C75A]/40">
            <div className="flex items-center gap-1 text-xs text-slate-400"><Film size={13} /> 영상 크레딧</div>
            <div className="mt-1 text-xl font-black text-gray-800">{credits === null ? '…' : credits.toLocaleString()}</div>
          </Link>
        </div>
        <Link to="/shop" className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl bg-[#03C75A] py-3 text-sm font-bold text-white transition-all hover:bg-[#02b350] active:scale-95">
          <Gift size={16} /> 기프티콘 교환소
        </Link>

        {/* 탭 */}
        <div className="mt-8 mb-1 flex border-b border-gray-200">
          {tabs.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-bold transition-colors ${tab === k ? 'border-[#03C75A] text-[#03C75A]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'posts' && (
          posts.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">작성한 글이 없어요</p> :
          <ul className="divide-y divide-gray-100">
            {posts.map(p => (
              <li key={p.id}><Link to={`/board/${p.id}`} className="flex items-center gap-2 py-3.5">
                <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${CAT_CLS[p.category] || CAT_CLS.free}`}>{CAT_LABEL[p.category] || '자유'}</span>
                <span className="flex-1 truncate text-sm font-bold text-gray-900">{p.title}</span>
                <span className="shrink-0 text-xs text-slate-400">{fmtWhen(p.created_at)}</span>
              </Link></li>
            ))}
          </ul>
        )}
        {tab === 'comments' && (
          comments.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">작성한 댓글이 없어요</p> :
          <ul className="divide-y divide-gray-100">
            {comments.map(c => (
              <li key={c.id}><Link to={`/board/${c.post_id}`} className="block py-3.5">
                <p className="truncate text-sm text-gray-800">{c.body}</p>
                <span className="text-xs text-slate-400">{fmtWhen(c.created_at)}</span>
              </Link></li>
            ))}
          </ul>
        )}
        {tab === 'reds' && (
          reds.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">교환 내역이 없어요</p> :
          <ul className="divide-y divide-gray-100">
            {reds.map(r => {
              const st = RED_STATUS[r.status] || RED_STATUS.requested
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-gray-800">{r.gifticon_name}</div>
                    <div className="text-xs text-slate-400">{fmtWhen(r.created_at)} · {r.point_cost.toLocaleString()}P</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <NicknameModal open={nickOpen} onClose={() => setNickOpen(false)} onDone={(n) => { setNickOpen(false); setProfile(p => ({ ...p, nickname: n })) }} />
      <Footer />
    </div>
  )
}

export default MyPage

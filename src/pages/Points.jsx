import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Coins, CalendarCheck, Gift, Flame } from 'lucide-react'
import CommunityHeader from '../components/CommunityHeader'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabase'

const REASON = {
  attendance: '출석체크',
  attendance_streak7: '7일 연속출석 보너스',
  post: '게시글 작성',
  comment: '댓글 작성',
  like_received: '추천 받기',
  redeem: '기프티콘 교환',
  admin: '관리자 조정',
}
const fmt = (s) => new Date(s).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')

const Points = () => {
  const nav = useNavigate()
  const [user, setUser] = useState(undefined)
  const [balance, setBalance] = useState(0)
  const [txns, setTxns] = useState([])
  const [streak, setStreak] = useState(0)
  const [checkedToday, setCheckedToday] = useState(false)
  const [paid, setPaid] = useState(true)
  const [toast, setToast] = useState('')

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null)) }, [])

  const refresh = async (uid) => {
    const [{ data: bal }, { data: tx }, { data: sub }] = await Promise.all([
      supabase.rpc('get_my_points_rpc'),
      supabase.from('point_transactions').select('*').order('created_at', { ascending: false }).limit(40),
      supabase.rpc('get_my_balance_rpc').single(),
    ])
    setBalance(bal ?? 0); setTxns(tx || [])
    setPaid(['starter', 'pro', 'master'].includes(sub?.plan) && (!sub?.expires_at || new Date(sub.expires_at) > new Date()))
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }) // YYYY-MM-DD KST
    const { data: att } = await supabase.from('attendance_checks').select('*').eq('user_id', uid).eq('check_date', today).maybeSingle()
    if (att) { setCheckedToday(true); setStreak(att.streak) }
  }

  useEffect(() => { if (user) refresh(user.id) }, [user])

  const checkIn = async () => {
    const { data, error } = await supabase.rpc('attendance_check_rpc')
    if (error || !data?.ok) {
      if (data?.paid_only) { setToast('출석·포인트는 유료 플랜 전용 혜택이에요'); setTimeout(() => setToast(''), 3000) }
      return
    }
    setCheckedToday(true); setStreak(data.streak)
    if (!data.already) {
      setToast(`출석 완료! +${data.awarded}P${data.bonus ? ` (연속 보너스 +${data.bonus}P)` : ''}`)
      setTimeout(() => setToast(''), 3500)
      refresh(user.id)
    }
  }

  if (user === null) return (
    <div className="min-h-screen bg-[#FAFAF8] font-sans"><CommunityHeader active="points" />
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="text-lg font-bold">로그인이 필요해요</p>
        <button onClick={() => nav('/generate')} className="rounded-full bg-[#03C75A] px-6 py-2.5 font-bold text-white">로그인하러 가기</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAF8] font-sans break-keep text-gray-900">
      <CommunityHeader active="points" />
      <section className="mx-auto max-w-2xl px-5 pt-28 pb-24 md:pt-36">
        {/* 잔액 카드 */}
        <div className="rounded-3xl bg-gradient-to-br from-[#03C75A] to-[#02a04a] p-6 text-white shadow-xl shadow-[#03C75A]/20 md:p-8">
          <div className="flex items-center gap-2 text-sm font-bold opacity-90"><Coins size={18} /> 내 포인트</div>
          <div className="mt-2 text-4xl font-black md:text-5xl">{balance.toLocaleString()}<span className="ml-1 text-2xl">P</span></div>
          <Link to="/shop" className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-sm font-bold backdrop-blur transition-all hover:bg-white/30 active:scale-95">
            <Gift size={15} /> 기프티콘 교환하러 가기
          </Link>
        </div>

        {/* 무료 유저 안내 */}
        {!paid && (
          <Link to="/#pricing" className="mt-5 block rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center transition-all hover:bg-amber-100">
            <p className="text-sm font-bold text-amber-700">포인트·출석·기프티콘 교환은 <span className="underline">유료 플랜(스타터·프로·마스터)</span> 전용 혜택이에요.</p>
            <p className="mt-0.5 text-xs text-amber-600">플랜 보러가기 →</p>
          </Link>
        )}

        {/* 출석체크 */}
        <div className="mt-5 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5">
          <div>
            <div className="flex items-center gap-1.5 text-base font-black"><CalendarCheck size={18} className="text-[#03C75A]" /> 출석체크</div>
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
              {streak > 0 && <Flame size={14} className="text-orange-500" />}
              {streak > 0 ? `${streak}일 연속 출석 중` : '오늘 출석하고 10P 받기'} · 7일마다 +50P
            </p>
          </div>
          <button onClick={checkIn} disabled={checkedToday || !paid}
            className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition-all active:scale-95 ${(checkedToday || !paid) ? 'bg-gray-100 text-slate-400' : 'bg-[#03C75A] text-white hover:bg-[#02b350]'}`}>
            {!paid ? '유료 전용' : checkedToday ? '출석 완료' : '출석하기'}
          </button>
        </div>

        {/* 적립 안내 */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['글쓰기', '20P'], ['댓글', '5P'], ['추천받기', '2P'], ['출석', '10P']].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <div className="text-xs text-slate-400">{k}</div>
              <div className="text-lg font-black text-[#03C75A]">{v}</div>
            </div>
          ))}
        </div>

        {/* 내역 */}
        <h2 className="mt-8 mb-3 text-base font-black">포인트 내역</h2>
        {txns.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">아직 내역이 없어요</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white px-4">
            {txns.map(t => (
              <li key={t.id} className="flex items-center justify-between py-3.5">
                <div>
                  <div className="text-sm font-bold text-gray-800">{REASON[t.reason] || t.reason}</div>
                  <div className="text-xs text-slate-400">{fmt(t.created_at)}</div>
                </div>
                <div className={`text-base font-black ${t.delta >= 0 ? 'text-[#03C75A]' : 'text-red-500'}`}>
                  {t.delta >= 0 ? '+' : ''}{t.delta.toLocaleString()}P
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-gray-900 px-5 py-3 text-sm font-bold text-white shadow-xl">{toast}</div>
      )}
      <Footer />
    </div>
  )
}

export default Points

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Coins, Gift, X, Check, Clock } from 'lucide-react'
import CommunityHeader from '../components/CommunityHeader'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabase'

const STATUS = {
  requested: { label: '처리 중', cls: 'bg-amber-100 text-amber-600', icon: Clock },
  sent:      { label: '발송 완료', cls: 'bg-[#03C75A]/15 text-[#03C75A]', icon: Check },
  failed:    { label: '발송 실패', cls: 'bg-red-100 text-red-500', icon: X },
  rejected:  { label: '반려', cls: 'bg-gray-100 text-gray-500', icon: X },
}
const fmt = (s) => new Date(s).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')

const Shop = () => {
  const nav = useNavigate()
  const [user, setUser] = useState(undefined)
  const [balance, setBalance] = useState(0)
  const [items, setItems] = useState([])
  const [reds, setReds] = useState([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState(null)   // 선택한 기프티콘
  const [phone, setPhone] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [paid, setPaid] = useState(true)

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null)) }, [])

  const refresh = async () => {
    const [{ data: gs }, { data: bal }, { data: rs }, sub] = await Promise.all([
      supabase.from('gifticons').select('*').eq('active', true).order('sort_order').order('point_cost'),
      user ? supabase.rpc('get_my_points_rpc') : Promise.resolve({ data: 0 }),
      user ? supabase.from('gifticon_redemptions').select('*').order('created_at', { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
      user ? supabase.rpc('get_my_balance_rpc').single() : Promise.resolve({ data: null }),
    ])
    setItems(gs || []); setBalance(bal ?? 0); setReds(rs || []); setLoading(false)
    const plan = sub?.data?.plan
    setPaid(['starter', 'pro', 'master'].includes(plan) && (!sub?.data?.expires_at || new Date(sub.data.expires_at) > new Date()))
  }
  useEffect(() => { if (user !== undefined) refresh() }, [user])

  const openRedeem = (g) => {
    if (!user) { nav('/generate'); return }
    if (!paid) { setToast('기프티콘 교환은 유료 플랜 전용이에요'); setTimeout(() => setToast(''), 3000); return }
    setSel(g); setPhone(''); setErr('')
  }

  const confirmRedeem = async () => {
    setErr(''); setBusy(true)
    const { data, error } = await supabase.rpc('redeem_gifticon_rpc', { p_gifticon_id: sel.id, p_phone: phone })
    setBusy(false)
    if (error) { setErr('오류가 발생했어요'); return }
    if (!data?.ok) { setErr(data?.error || '교환할 수 없어요'); return }
    setSel(null)
    setToast('교환 신청 완료! 발송까지 잠시 기다려주세요.')
    setTimeout(() => setToast(''), 3500)
    refresh()
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAF8] font-sans break-keep text-gray-900">
      <CommunityHeader active="shop" />
      <section className="mx-auto max-w-3xl px-5 pt-28 pb-24 md:pt-36">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black md:text-3xl"><Gift size={26} className="text-[#03C75A]" /> 기프티콘 교환소</h1>
            <p className="mt-1.5 text-sm text-slate-500">모은 포인트로 기프티콘을 받아보세요.</p>
          </div>
          {user && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-4 py-2 text-sm font-bold text-amber-600 ring-1 ring-amber-200">
              <Coins size={16} /> {balance.toLocaleString()}P
            </div>
          )}
        </div>

        {user && !paid && (
          <Link to="/#pricing" className="mb-5 block rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center transition-all hover:bg-amber-100">
            <p className="text-sm font-bold text-amber-700">기프티콘 교환은 <span className="underline">유료 플랜(스타터·프로·마스터)</span> 전용이에요.</p>
            <p className="mt-0.5 text-xs text-amber-600">플랜 보러가기 →</p>
          </Link>
        )}

        {loading ? (
          <p className="py-16 text-center text-sm text-slate-500">불러오는 중…</p>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">준비된 상품이 없어요. 곧 추가될 예정이에요!</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {items.map(g => {
              const soldout = g.stock !== null && g.stock <= 0
              const enough = balance >= g.point_cost
              return (
                <div key={g.id} className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-[#03C75A]/10 to-[#03C75A]/5">
                    {g.image_url ? <img src={g.image_url} alt={g.name} className="h-full w-full object-cover" /> : <Gift size={40} className="text-[#03C75A]/40" />}
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    {g.brand && <div className="text-xs text-slate-400">{g.brand}</div>}
                    <div className="text-sm font-bold leading-snug text-gray-900">{g.name}</div>
                    <div className="mt-1 text-base font-black text-[#03C75A]">{g.point_cost.toLocaleString()}P</div>
                    <button onClick={() => openRedeem(g)} disabled={soldout || (user && !enough)}
                      className={`mt-2.5 w-full rounded-lg py-2 text-sm font-bold transition-all active:scale-95 ${soldout ? 'bg-gray-100 text-slate-400' : (user && !enough) ? 'bg-gray-100 text-slate-400' : 'bg-[#03C75A] text-white hover:bg-[#02b350]'}`}>
                      {soldout ? '품절' : (user && !enough) ? '포인트 부족' : '교환하기'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 내 교환 내역 */}
        {user && reds.length > 0 && (
          <>
            <h2 className="mt-10 mb-3 text-base font-black">내 교환 내역</h2>
            <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white px-4">
              {reds.map(r => {
                const st = STATUS[r.status] || STATUS.requested
                const Icon = st.icon
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-gray-800">{r.gifticon_name}</div>
                      <div className="text-xs text-slate-400">{fmt(r.created_at)} · {r.point_cost.toLocaleString()}P</div>
                    </div>
                    <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}><Icon size={12} />{st.label}</span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      {/* 교환 확인 모달 */}
      {sel && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm" onClick={() => setSel(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black">기프티콘 교환</h3>
              <button onClick={() => setSel(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="mb-4 rounded-xl bg-gray-50 p-4">
              <div className="text-sm font-bold text-gray-900">{sel.name}</div>
              <div className="mt-1 text-sm text-[#03C75A]">{sel.point_cost.toLocaleString()}P 차감 · 잔액 {(balance - sel.point_cost).toLocaleString()}P</div>
            </div>
            <label className="mb-1.5 block text-sm font-bold text-gray-700">받을 휴대폰 번호</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" inputMode="tel"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-[#03C75A]" autoFocus />
            <p className="mt-2 text-xs text-slate-400">입력한 번호로 기프티콘이 발송돼요. 차감된 포인트는 환불되지 않아요.</p>
            {err && <p className="mt-2 text-sm font-medium text-red-500">{err}</p>}
            <button onClick={confirmRedeem} disabled={busy}
              className="mt-5 w-full rounded-xl bg-[#03C75A] py-3 text-base font-bold text-white transition-all hover:bg-[#02b350] active:scale-95 disabled:opacity-50">
              {busy ? '신청 중…' : '교환 신청하기'}
            </button>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-8 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-gray-900 px-5 py-3 text-sm font-bold text-white shadow-xl">{toast}</div>}
      <Footer />
    </div>
  )
}

export default Shop

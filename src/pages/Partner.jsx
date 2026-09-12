import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Handshake, Users, CreditCard, UserPlus, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useMyRole } from '../lib/useIsAdmin'
import { planLabel } from '../lib/planLabels'

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }) : '-')

function StatCard({ Icon, label, value, accent }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <p className="flex items-center gap-1.5 text-xs font-bold text-gray-400"><Icon size={14} /> {label}</p>
      <p className={`mt-1.5 text-3xl font-extrabold ${accent || 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

export default function Partner() {
  const role = useMyRole()
  const [summary, setSummary] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (role !== 'partner' && role !== 'super_admin') return
    let alive = true
    ;(async () => {
      setLoading(true); setErr('')
      const [s, m] = await Promise.all([
        supabase.rpc('partner_my_summary'),
        supabase.rpc('partner_my_members'),
      ])
      if (!alive) return
      if (s.error || m.error) setErr('정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
      setSummary(s.data || null)
      setMembers(Array.isArray(m.data) ? m.data : [])
      setLoading(false)
    })()
    return () => { alive = false }
  }, [role])

  if (role === null) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-400">불러오는 중…</div>
  }
  if (role !== 'partner' && role !== 'super_admin') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-[#FAFAF8] text-center">
        <p className="text-gray-600">파트너 전용 페이지예요.</p>
        <Link to="/trend" className="text-sm font-bold text-[#0064FF]">트렌드로 가기</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-gray-900">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-center gap-2 text-[#0064FF]">
          <Handshake size={20} />
          <h1 className="text-2xl font-extrabold text-gray-900">파트너</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">내 코드로 들어온 사람과 현재 플랜을 볼 수 있어요.</p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard Icon={Users} label="총 인원" value={summary?.total ?? 0} />
          <StatCard Icon={CreditCard} label="유료" value={summary?.paid ?? 0} accent="text-[#0064FF]" />
          <StatCard Icon={UserPlus} label="무료" value={summary?.free ?? 0} />
        </div>

        {err && <p className="mt-4 text-sm font-medium text-red-500">{err}</p>}

        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-gray-200 text-xs text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">닉네임</th>
                  <th className="px-4 py-3 text-left font-bold">이메일</th>
                  <th className="px-4 py-3 text-left font-bold">플랜</th>
                  <th className="px-4 py-3 text-left font-bold">가입일</th>
                  <th className="px-4 py-3 text-left font-bold">사용 코드</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="py-12 text-center text-gray-400"><Loader2 size={16} className="mx-auto animate-spin" /></td></tr>
                ) : members.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-sm text-gray-400">아직 내 코드로 들어온 사람이 없어요.</td></tr>
                ) : members.map((m) => {
                  const paid = (m.plan || 'free') !== 'free'
                  return (
                    <tr key={m.student_id} className="border-b border-gray-100 last:border-0">
                      <td className="max-w-[140px] truncate px-4 py-3 font-bold text-gray-800">{m.nickname || '-'}</td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-gray-600">{m.email || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${paid ? 'bg-[#0064FF]/10 text-[#0064FF]' : 'bg-gray-100 text-gray-500'}`}>{planLabel(m.plan)}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{fmtDate(m.joined_at)}</td>
                      <td className="px-4 py-3 font-bold tracking-wide text-gray-600">{m.coupon_code || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

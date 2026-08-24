import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Gift, Copy, Check } from 'lucide-react'

// 친구 초대 CTA. variant: 'card'(상세 박스) | 'button'(compact 버튼)
export default function ReferralCTA({ variant = 'card', className = '' }) {
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    let alive = true
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user
      if (!u || u.is_anonymous) return
      supabase.from('profiles').select('referral_code').eq('id', u.id).maybeSingle()
        .then(({ data }) => { if (alive && data?.referral_code) setCode(data.referral_code) })
    })
    return () => { alive = false }
  }, [])
  if (!code) return null
  const link = `https://chronit.kr/?ref=${code}`
  const copy = () => { try { navigator.clipboard?.writeText(link) } catch { /* noop */ } setCopied(true); setTimeout(() => setCopied(false), 1600) }

  if (variant === 'button') {
    return (
      <button onClick={copy} className={`inline-flex items-center gap-1.5 rounded-full border border-[#0064FF]/30 px-3 py-1.5 text-xs font-bold text-[#0064FF] transition hover:bg-[#0064FF]/5 ${className}`}>
        <Gift size={13} /> {copied ? '초대 링크 복사됨!' : '친구 초대'}
      </button>
    )
  }
  return (
    <div className={`rounded-xl bg-[#0064FF]/5 p-3 ${className}`}>
      <p className="mb-0.5 text-xs font-bold text-gray-800">🎁 친구 초대하고 이용권 받기</p>
      <p className="mb-2 text-[11px] text-gray-500">친구가 첫 결제하면 <b className="text-gray-700">나 50개 · 친구 20개</b> 이용권을 드려요</p>
      <button onClick={copy} className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#0064FF]/20 bg-white px-3 py-2 text-xs transition hover:border-[#0064FF]">
        <span className="truncate text-gray-600">chronit.kr/?ref={code}</span>
        {copied ? <Check size={14} className="shrink-0 text-[#0064FF]" /> : <Copy size={14} className="shrink-0 text-gray-400" />}
      </button>
    </div>
  )
}

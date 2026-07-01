import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'

/**
 * 닉네임 설정 모달. 게시판 글/댓글 작성 시 닉네임이 없으면 노출.
 * - onDone(nickname): 설정 완료 콜백
 */
const NicknameModal = ({ open, onClose, onDone, required = false }) => {
  const [nick, setNick] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const submit = async () => {
    setErr(''); setSaving(true)
    const { data, error } = await supabase.rpc('set_nickname_rpc', { p_nick: nick })
    setSaving(false)
    if (error) { setErr('오류가 발생했어요. 잠시 후 다시 시도해주세요.'); return }
    if (!data?.ok) { setErr(data?.error || '닉네임을 설정할 수 없어요'); return }
    onDone?.(data.nickname)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm" onClick={required ? undefined : onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-900">닉네임 설정</h3>
          {!required && <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>}
        </div>
        <p className="mb-4 text-sm leading-relaxed text-gray-500">게시판에 표시될 닉네임을 정해주세요. (2~10자, 중복 불가)</p>
        <input
          value={nick}
          onChange={e => setNick(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          maxLength={10}
          placeholder="예: 숏폼장인"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base text-gray-900 outline-none focus:border-[#0064FF]"
          autoFocus
        />
        {err && <p className="mt-2 text-sm font-medium text-red-500">{err}</p>}
        <button
          onClick={submit}
          disabled={saving}
          className="mt-5 w-full rounded-xl bg-[#0064FF] py-3 text-base font-bold text-white transition-all hover:bg-[#0052D6] active:scale-95 disabled:opacity-50"
        >
          {saving ? '저장 중…' : '설정하기'}
        </button>
      </div>
    </div>
  )
}

export default NicknameModal

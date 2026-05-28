import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Megaphone, Save, LogOut, ShieldCheck, Loader } from 'lucide-react'

const Admin = () => {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState({ active: false, label: '', text: '', cta_text: '' })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  // 로그인 상태 + admin 체크
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      setUser(session.user)

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('role')
        .eq('user_id', session.user.id)
        .single()

      if (sub?.role === 'super_admin') {
        setIsAdmin(true)
        await loadEvent()
      }
      setLoading(false)
    }
    init()
  }, [])

  const loadEvent = async () => {
    const { data } = await supabase
      .from('site_events')
      .select('*')
      .limit(1)
      .single()
    if (data) setEvent(data)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    const { error } = await supabase
      .from('site_events')
      .update({
        active: event.active,
        label: event.label,
        text: event.text,
        cta_text: event.cta_text,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', event.id)

    setSaving(false)
    setSaveMsg(error ? '저장 실패: ' + error.message : '저장 완료!')
    setTimeout(() => setSaveMsg(null), 3000)
  }

  // 로딩
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-400">
      <Loader size={24} className="animate-spin" />
    </div>
  )

  // 비로그인
  if (!user) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#020617] text-slate-100">
      <ShieldCheck size={48} className="text-slate-600" />
      <p className="text-lg font-bold text-slate-400">로그인이 필요합니다</p>
      <button
        onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
        className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-500"
      >
        Google로 로그인
      </button>
    </div>
  )

  // 권한 없음
  if (!isAdmin) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#020617] text-slate-100">
      <ShieldCheck size={48} className="text-red-500/60" />
      <p className="text-lg font-bold text-slate-400">관리자 권한이 없습니다</p>
      <p className="text-sm text-slate-600">{user.email}</p>
      <button
        onClick={() => supabase.auth.signOut()}
        className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-slate-400 hover:text-white"
      >
        <LogOut size={15} /> 로그아웃
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] px-4 py-16 text-slate-100">
      <div className="mx-auto max-w-2xl">

        {/* 헤더 */}
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck size={22} className="text-blue-400" />
            <h1 className="text-xl font-black tracking-tight">Chronit 관리자</h1>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400 transition-colors hover:text-white"
          >
            <LogOut size={14} /> 로그아웃
          </button>
        </div>

        {/* 이벤트 관리 카드 */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8">
          <div className="mb-6 flex items-center gap-2">
            <Megaphone size={18} className="text-violet-400" />
            <h2 className="text-base font-bold">홈페이지 이벤트 배너</h2>
          </div>

          {/* ON/OFF 토글 */}
          <div className="mb-6 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-5 py-4">
            <div>
              <p className="font-bold text-slate-200">이벤트 활성화</p>
              <p className="mt-0.5 text-sm text-slate-500">켜면 홈페이지 상단에 배너가 표시됩니다</p>
            </div>
            <button
              onClick={() => setEvent(e => ({ ...e, active: !e.active }))}
              className={`relative h-7 w-12 rounded-full transition-colors ${event.active ? 'bg-blue-600' : 'bg-white/10'}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${event.active ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {/* 배지 라벨 */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-slate-400">배지 라벨</label>
            <input
              type="text"
              value={event.label}
              onChange={e => setEvent(ev => ({ ...ev, label: e.target.value }))}
              placeholder="이벤트 진행중"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50"
            />
          </div>

          {/* 이벤트 문구 */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-slate-400">이벤트 문구</label>
            <textarea
              value={event.text}
              onChange={e => setEvent(ev => ({ ...ev, text: e.target.value }))}
              placeholder="🎁 친구 초대 보너스 1,000 크레딧 + 후기 작성 시 2,000 크레딧으로 상향!"
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50 resize-none"
            />
          </div>

          {/* CTA 버튼 텍스트 */}
          <div className="mb-8">
            <label className="mb-2 block text-sm font-bold text-slate-400">버튼 텍스트</label>
            <input
              type="text"
              value={event.cta_text}
              onChange={e => setEvent(ev => ({ ...ev, cta_text: e.target.value }))}
              placeholder="지금 참여"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 outline-none focus:border-blue-500/50"
            />
          </div>

          {/* 미리보기 */}
          {event.active && (
            <div className="mb-6 rounded-xl overflow-hidden">
              <p className="mb-2 text-xs font-bold text-slate-600 uppercase tracking-widest">미리보기</p>
              <div className="flex items-center justify-center gap-3 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white">
                <Megaphone size={14} className="shrink-0" />
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-black uppercase">
                  {event.label || '이벤트 진행중'}
                </span>
                <span>{event.text || '이벤트 문구를 입력하세요'}</span>
                <span className="ml-2 shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-black">
                  {event.cta_text || '지금 참여'}
                </span>
              </div>
            </div>
          )}

          {/* 저장 버튼 */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              저장
            </button>
            {saveMsg && (
              <span className={`text-sm font-bold ${saveMsg.includes('실패') ? 'text-red-400' : 'text-green-400'}`}>
                {saveMsg}
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default Admin

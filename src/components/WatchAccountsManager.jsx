import { useState, useMemo } from 'react'
import { X, Search, Trash2, RotateCw, Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { fmtCount } from '../lib/format'
import { statusOf, STATUS_META, fmtWhen } from '../lib/watchAccounts'

// 감시 계정 관리 — 수백~1000개를 다루므로 칩 나열 대신 표 + 검색 + 일괄선택.
const ROW_CAP = 200   // 한 번에 그리는 최대 행. 넘치면 검색으로 좁히도록 안내.

const FILTERS = [['all', '전체'], ['live', '정상'], ['quiet', '조용함'], ['dead', '응답없음'], ['off', '꺼짐']]

export default function WatchAccountsManager({ open, onClose, accounts, feedCounts, onChanged }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [sel, setSel] = useState([])
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (accounts || []).filter((a) => {
      if (needle && !`${a.username} ${a.nickname || ''}`.toLowerCase().includes(needle)) return false
      if (filter === 'off') return a.active === false
      if (filter === 'all') return true
      if (a.active === false) return false
      return statusOf(a) === filter
    })
  }, [accounts, q, filter])

  if (!open) return null

  const shown = rows.slice(0, ROW_CAP)
  const allShownSelected = shown.length > 0 && shown.every((a) => sel.includes(a.id))
  const toggleAll = () => setSel(allShownSelected ? [] : shown.map((a) => a.id))
  const toggleOne = (id) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const run = async (fn) => { setBusy(true); try { await fn() } catch { /* noop */ } setBusy(false); setSel([]); onChanged() }

  const removeSelected = () => {
    if (!sel.length) return
    if (!window.confirm(`선택한 ${sel.length}개 계정을 삭제할까요? 수집된 게시물은 남아 있어요.`)) return
    run(() => supabase.from('watch_accounts').delete().in('id', sel))
  }
  const retrySelected = () => run(() => supabase.from('watch_accounts').update({ active: true, fail_count: 0 }).in('id', sel))
  const removeOne = (a) => run(() => supabase.from('watch_accounts').delete().eq('id', a.id))
  const retryOne = (a) => run(() => supabase.from('watch_accounts').update({ active: true, fail_count: 0 }).eq('id', a.id))
  const toggleActive = (a) => run(() => supabase.from('watch_accounts').update({ active: !(a.active !== false) }).eq('id', a.id))

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-2xl border border-white/10 bg-[#0c0d11] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">감시 계정 관리 <span className="text-white/40">{accounts.length}</span></h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>

        {/* 검색 + 상태 필터 */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="아이디 · 이름 검색"
              className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#0064FF]" />
          </div>
          {FILTERS.map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${filter === k ? 'bg-[#0064FF] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}>{l}</button>
          ))}
        </div>

        {/* 일괄 작업 */}
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-white/40">{rows.length}개 표시{sel.length > 0 ? ` · ${sel.length}개 선택됨` : ''}</span>
          {sel.length > 0 && (
            <>
              <button onClick={retrySelected} disabled={busy} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 font-bold text-white hover:bg-white/15 disabled:opacity-40"><RotateCw size={12} /> 다시 시도</button>
              <button onClick={removeSelected} disabled={busy} className="flex items-center gap-1 rounded-lg bg-red-500/15 px-3 py-1.5 font-bold text-red-400 hover:bg-red-500/25 disabled:opacity-40"><Trash2 size={12} /> 삭제</button>
            </>
          )}
          {busy && <Loader2 size={14} className="animate-spin text-white/40" />}
        </div>

        {/* 표 */}
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 z-10 bg-[#0c0d11] text-xs text-white/40">
              <tr className="border-b border-white/10">
                <th className="w-10 px-3 py-2.5"><input type="checkbox" checked={allShownSelected} onChange={toggleAll} aria-label="표시된 계정 모두 선택" /></th>
                <th className="px-3 py-2.5 text-left font-semibold">계정</th>
                <th className="px-3 py-2.5 text-right font-semibold">팔로워</th>
                <th className="px-3 py-2.5 text-right font-semibold">최근 게시물</th>
                <th className="px-3 py-2.5 text-right font-semibold">수집</th>
                <th className="px-3 py-2.5 text-left font-semibold">상태</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-white/35">해당하는 계정이 없어요.</td></tr>}
              {shown.map((a) => {
                const st = statusOf(a)
                const meta = STATUS_META[st]
                const off = a.active === false
                return (
                  <tr key={a.id} className={`border-b border-white/5 last:border-0 ${off ? 'opacity-45' : ''}`}>
                    <td className="px-3 py-2.5"><input type="checkbox" checked={sel.includes(a.id)} onChange={() => toggleOne(a.id)} aria-label={`@${a.username} 선택`} /></td>
                    <td className="px-3 py-2.5">
                      <a href={`https://www.instagram.com/${a.username}/`} target="_blank" rel="noreferrer" className="font-bold text-white hover:text-[#0064FF]">@{a.username}</a>
                      {a.nickname && <span className="ml-2 text-xs text-white/35">{a.nickname}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-white/60">{a.follower_count ? fmtCount(a.follower_count) : '-'}</td>
                    <td className="px-3 py-2.5 text-right text-white/45">{fmtWhen(a.last_found_at)}</td>
                    <td className="px-3 py-2.5 text-right text-white/60">{feedCounts[a.username] || 0}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.cls}`}>{meta.label}</span>
                      {off && <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white/50">꺼짐</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {(st === 'dead' || off) && (
                          <button onClick={() => retryOne(a)} disabled={busy} title="다시 시도 (갱신 대상으로 복구)" className="rounded-md p-1.5 text-white/40 hover:bg-white/10 hover:text-white"><RotateCw size={14} /></button>
                        )}
                        <button onClick={() => toggleActive(a)} disabled={busy} title={off ? '갱신 켜기' : '갱신 끄기'} className="rounded-md p-1.5 text-white/40 hover:bg-white/10 hover:text-white">{off ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                        <button onClick={() => removeOne(a)} disabled={busy} title="삭제" className="rounded-md p-1.5 text-white/40 hover:bg-red-500/20 hover:text-red-400"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {rows.length > ROW_CAP && (
          <p className="mt-2 text-center text-[11px] text-white/35">{rows.length}개 중 {ROW_CAP}개만 표시했어요 — 검색이나 상태 필터로 좁혀보세요.</p>
        )}
        <p className="mt-2 text-[11px] text-white/35">🔴 응답없음은 갱신에서 자동 제외돼요(이용권 절약). 오타를 고쳤거나 다시 공개됐다면 ‘다시 시도’를 눌러주세요.</p>
      </div>
    </div>
  )
}

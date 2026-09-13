import { useState, useRef } from 'react'
import { X, Upload, Loader2, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { readAccountsFile } from '../lib/importAccounts'

// CSV/시트에서 감시 계정 불러오기 — 파일 선택 → 추출 미리보기 → 등록.
// 등록은 watch_bulk_add_rpc 한 번으로 끝낸다(중복·형식·한도는 서버가 판정).
export default function ImportAccountsModal({ open, onClose, onDone }) {
  const fileRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [list, setList] = useState(null)      // 추출된 username 배열
  const [headerUsed, setHeaderUsed] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  if (!open) return null

  const reset = () => { setFileName(''); setList(null); setHeaderUsed(null); setErr(''); setResult(null) }
  const close = () => { reset(); onClose() }

  const pick = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    reset()
    setFileName(f.name); setParsing(true)
    try {
      const { usernames, headerUsed: hu } = await readAccountsFile(f)
      setList(usernames); setHeaderUsed(hu)
      if (!usernames.length) setErr('계정을 찾지 못했어요. 계정·username·링크 같은 열이 있는지 확인해주세요.')
    } catch (e2) {
      setErr('파일을 읽지 못했어요: ' + String(e2?.message || e2))
    }
    setParsing(false)
  }

  const submit = async () => {
    if (!list?.length || busy) return
    setBusy(true); setErr('')
    const { data, error } = await supabase.rpc('watch_bulk_add_rpc', { p_usernames: list })
    setBusy(false)
    if (error || data?.ok === false) { setErr('등록에 실패했어요: ' + (error?.message || data?.error || '')); return }
    setResult(data)
    onDone?.()
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onClick={close}>
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-[#0c0d11] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">CSV · 시트에서 불러오기</h3>
          <button onClick={close} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>

        {result ? (
          <>
            <p className="text-sm font-bold text-emerald-400">
              {result.added}개 추가 · {result.duplicates}개 중복 · {result.invalid}개 형식오류
              {result.over_limit > 0 ? ` · ${result.over_limit}개 한도초과` : ''}
            </p>
            <p className="mt-1 text-xs text-white/40">현재 감시 계정 {result.total_now}/{result.limit}개</p>
            {result.over_limit > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-300">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>요금제 한도({result.limit}개)를 넘어 {result.over_limit}개는 등록하지 못했어요. 업그레이드하면 더 담을 수 있어요.</span>
              </div>
            )}
            <button onClick={close} className="mt-5 w-full rounded-xl bg-[#0064FF] py-2.5 text-sm font-bold text-white hover:brightness-95">닫기</button>
          </>
        ) : (
          <>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={pick} />
            <button onClick={() => fileRef.current?.click()} disabled={parsing}
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-5 text-sm font-bold text-white/70 transition hover:border-[#0064FF] hover:text-white disabled:opacity-50">
              {parsing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {parsing ? '읽는 중…' : fileName || 'CSV · 엑셀 파일 선택 (.csv .xlsx .xls)'}
            </button>
            <p className="mt-2 text-[11px] text-white/35">
              계정·username·링크 열이 있으면 그 열만 읽어요. 없으면 @아이디나 인스타 주소가 든 칸만 골라내고, 숫자·메모는 건너뜁니다.
            </p>

            {err && <p className="mt-3 text-xs font-bold text-red-400">{err}</p>}

            {list && list.length > 0 && (
              <>
                <p className="mt-4 text-sm font-bold text-white">
                  다음 {list.length.toLocaleString('ko-KR')}개를 등록합니다
                  {headerUsed && <span className="ml-1 text-xs font-medium text-white/35">· ‘{headerUsed}’ 열에서</span>}
                </p>
                <div className="mt-2 min-h-0 flex-1 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((u) => (
                      <span key={u} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-bold text-white/70">@{u}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={close} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-bold text-white/60 hover:bg-white/5">취소</button>
                  <button onClick={submit} disabled={busy}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0064FF] py-2.5 text-sm font-bold text-white hover:brightness-95 disabled:opacity-40">
                    {busy && <Loader2 size={15} className="animate-spin" />} 등록
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

import { BarChart3, Sparkles } from 'lucide-react'

// 소재 분석 리포트 — 베라 채팅용 다크 카드 (analyze-clip 결과 a 로 렌더)
const Bar = ({ label, val, kind }) => (
  <div>
    <div className="mb-0.5 flex items-center justify-between text-[11px]"><span className="text-white/60">{label}{kind ? <span className="ml-1 text-white/30">· {kind}</span> : null}</span><span className="font-bold text-white/85">{val != null ? `${val}` : '—'}</span></div>
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#0064FF]" style={{ width: `${Math.max(0, Math.min(100, Number(val) || 0))}%` }} /></div>
  </div>
)

export default function ClipAnalysisReport({ a }) {
  if (!a) return null
  const cs = a.comment_sentiment || {}
  const hasCs = (cs.purchase_intent || cs.positive || cs.question || cs.complaint)
  const rx = a.remix || {}
  const C = 2 * Math.PI * 14
  const segs = [['구매의도', cs.purchase_intent || 0, '#0064FF'], ['긍정', cs.positive || 0, '#22C55E'], ['질문', cs.question || 0, '#F59E0B'], ['불만', cs.complaint || 0, '#EF4444']]
  const tot = segs.reduce((s, b) => s + b[1], 0) || 100
  let acc = 0
  return (
    <div className="w-full rounded-2xl glass p-4">
      <div className="mb-3 flex items-center gap-1.5 text-sm font-bold text-white"><BarChart3 size={15} className="text-[#5AA0FF]" /> 소재 분석{a.product_name ? <span className="text-white/50">· {a.product_name}</span> : null}</div>

      <div className="space-y-2">
        <Bar label="훅 · 첫 3초" val={a.hook_score} kind="진단" />
        <Bar label="페이오프 · 결말" val={a.payoff_score} kind="진단" />
      </div>

      {a.hook && (
        <div className="mt-3 rounded-xl bg-white/5 p-3">
          <div className="text-[12px] font-bold text-[#5AA0FF]">훅 · 첫 3초{a.hook_type ? ` (${a.hook_type})` : ''}</div>
          <div className="mt-0.5 text-[13px] text-white/85">{a.hook}</div>
          {a.hook_why && <div className="mt-1 text-[12px] leading-relaxed text-white/55">{a.hook_why}</div>}
        </div>
      )}

      {Array.isArray(a.selling_points) && a.selling_points.length > 0 && (
        <div className="mt-3">
          <div className="text-[12px] font-bold text-white/70">셀링포인트</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-white/80">{a.selling_points.map((sp, i) => <li key={i}>{sp}</li>)}</ul>
        </div>
      )}
      {(a.structure || a.target) && (
        <div className="mt-3 space-y-1 text-[13px] text-white/75">
          {a.structure && <div><span className="text-white/45">구성 · </span>{a.structure}</div>}
          {a.target && <div><span className="text-white/45">타깃 · </span>{a.target}</div>}
        </div>
      )}

      {hasCs && (
        <div className="mt-3 flex items-center gap-4 rounded-xl bg-white/5 p-3">
          <svg viewBox="0 0 40 40" className="h-20 w-20 shrink-0 -rotate-90">
            {segs.map(([n, v, col]) => { const frac = v / tot; const el = <circle key={n} cx="20" cy="20" r="14" fill="none" stroke={col} strokeWidth="8" strokeDasharray={`${(frac * C).toFixed(2)} ${C.toFixed(2)}`} strokeDashoffset={`${(-acc * C).toFixed(2)}`} />; acc += frac; return el })}
          </svg>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-white/70">
            <div><span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: '#0064FF' }} />구매의도 {cs.purchase_intent || 0}%</div>
            <div><span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: '#22C55E' }} />긍정 {cs.positive || 0}%</div>
            <div><span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: '#F59E0B' }} />질문 {cs.question || 0}%</div>
            <div><span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: '#EF4444' }} />불만 {cs.complaint || 0}%</div>
          </div>
        </div>
      )}

      {(rx.hook_ideas?.length || rx.edit_script?.length || rx.differentiation?.length) ? (
        <div className="mt-3 rounded-xl border border-[#0064FF]/25 bg-[#0064FF]/[0.06] p-3">
          <div className="mb-1.5 flex items-center gap-1 text-[12px] font-bold text-[#5AA0FF]"><Sparkles size={12} /> 내 걸로 만들기</div>
          {rx.hook_ideas?.length > 0 && <div className="mb-1.5"><div className="text-[12px] font-bold text-white/70">내 상품용 훅</div><ul className="mt-0.5 list-disc space-y-0.5 pl-5 text-[13px] text-white/80">{rx.hook_ideas.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          {rx.edit_script?.length > 0 && <div className="mb-1.5"><div className="text-[12px] font-bold text-white/70">편집 컷 구성</div><ol className="mt-0.5 list-decimal space-y-0.5 pl-5 text-[13px] text-white/80">{rx.edit_script.map((x, i) => <li key={i}>{x}</li>)}</ol></div>}
          {rx.differentiation?.length > 0 && <div><div className="text-[12px] font-bold text-white/70">차별화 포인트</div><ul className="mt-0.5 list-disc space-y-0.5 pl-5 text-[13px] text-white/80">{rx.differentiation.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        </div>
      ) : null}

      {Array.isArray(a.hashtags) && a.hashtags.length > 0 && <div className="mt-3 text-[12px] text-[#5AA0FF]">{a.hashtags.join(' ')}</div>}
    </div>
  )
}

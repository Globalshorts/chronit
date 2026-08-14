import { X, Sparkles, Loader2, AlertTriangle } from 'lucide-react'

const Row = ({ label, val }) => val ? (
  <div><span className="font-bold text-slate-700">{label}</span><div className="mt-0.5 whitespace-pre-line leading-relaxed text-slate-600">{val}</div></div>
) : null

export default function ChannelModal({ open, loading, result, err, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-base font-extrabold text-slate-900">채널 따라하기 플레이북</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 py-10 text-slate-400"><Loader2 size={16} className="animate-spin" />채널을 분석하고 있어요… (10~20초)</div>
        ) : err ? (
          <div className="flex items-center gap-1.5 py-6 text-red-500"><AlertTriangle size={15} />{err}</div>
        ) : result ? (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-2.5">
              <div className="text-xs font-bold text-slate-500">{result.platform === 'youtube' ? 'YouTube' : 'Instagram'} · {result.name}</div>
              {result.channel_summary && <div className="mt-1 font-bold text-slate-800">{result.channel_summary}</div>}
            </div>
            {(result.key_actions || []).length > 0 && (
              <div className="rounded-lg border border-orange-200 bg-orange-50/60 p-2.5">
                <div className="mb-1.5 flex items-center gap-1 text-xs font-extrabold text-orange-700"><Sparkles size={12} />바로 적용할 핵심</div>
                <ul className="space-y-1.5">
                  {result.key_actions.map((k, i) => (
                    <li key={i}><mark className="rounded-[3px] bg-orange-200/80 px-1 py-0.5 font-semibold text-slate-800 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">{k}</mark></li>
                  ))}
                </ul>
              </div>
            )}
            <Row label="📐 포맷·구성 공식" val={result.format} />
            <Row label="✂️ 편집 스타일" val={result.editing_style} />
            <Row label="🎯 콘텐츠 전략" val={result.content_strategy} />
            <Row label="📝 대본 템플릿" val={result.script_template} />
            <Row label="🏷️ 제목·캡션 공식" val={result.title_formula} />
          </div>
        ) : null}
        <p className="mt-4 text-center text-[11px] text-slate-400">벤치마킹·리서치 목적 · 콘텐츠 저작권은 원저작자에게 있습니다.</p>
      </div>
    </div>
  )
}

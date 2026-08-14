import { X, Loader2, AlertTriangle, LayoutList, Scissors, Target, FileText, Type, Zap, Youtube, Instagram } from 'lucide-react'

function Section({ icon: Icon, label, children }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
        <Icon size={14} className="text-[#0064FF]" />{label}
      </div>
      <div className="text-sm leading-relaxed text-slate-600">{children}</div>
    </div>
  )
}

export default function ChannelModal({ open, loading, result, err, onClose }) {
  if (!open) return null
  const r = result
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-base font-extrabold text-slate-900">채널 따라하기 플레이북</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-12 text-slate-400"><Loader2 size={16} className="animate-spin" />채널을 분석하고 있어요… (10~20초)</div>
        ) : err ? (
          <div className="flex items-center gap-1.5 py-6 text-red-500"><AlertTriangle size={15} />{err}</div>
        ) : r ? (
          <div className="space-y-2.5">
            <div className="rounded-xl bg-gradient-to-br from-[#0064FF]/10 to-[#06B6D4]/10 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0064FF]">
                {r.platform === 'youtube' ? <Youtube size={14} /> : <Instagram size={14} />}{r.name}
              </div>
              {r.channel_summary && <div className="mt-1 text-[15px] font-extrabold leading-snug text-slate-900">{r.channel_summary}</div>}
            </div>

            {(r.key_actions || []).length > 0 && (
              <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-orange-700"><Zap size={14} />지금 당장 이것부터</div>
                <ul className="space-y-1.5">
                  {r.key_actions.map((k, i) => (
                    <li key={i} className="flex gap-1.5 text-sm leading-relaxed text-slate-700">
                      <span className="mt-0.5 shrink-0 text-orange-400">▸</span>
                      <mark className="rounded-[3px] bg-orange-200/70 px-1 font-semibold text-slate-800 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">{k}</mark>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(r.format || []).length > 0 && (
              <Section icon={LayoutList} label="영상 구성 공식">
                <ol className="space-y-1.5">
                  {r.format.map((step, i) => {
                    const clean = String(step).replace(/^\s*\d+[.)]\s*/, '')
                    const [head, ...rest] = clean.split('—')
                    return (
                      <li key={i} className="flex gap-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0064FF] text-[11px] font-bold text-white">{i + 1}</span>
                        <span className="pt-0.5"><b className="text-slate-800">{head.trim()}</b>{rest.length ? <span className="text-slate-500"> — {rest.join('—').trim()}</span> : null}</span>
                      </li>
                    )
                  })}
                </ol>
              </Section>
            )}

            <Section icon={Type} label="제목·캡션 공식"><div className="whitespace-pre-line">{r.title_formula || '—'}</div></Section>
            <Section icon={FileText} label="대본 템플릿"><div className="whitespace-pre-line rounded-lg bg-slate-50 p-2 text-[13px] leading-relaxed">{r.script_template || '—'}</div></Section>
            <Section icon={Scissors} label="편집 스타일">{r.editing_style || '—'}</Section>
            <Section icon={Target} label="콘텐츠 전략">{r.content_strategy || '—'}</Section>
          </div>
        ) : null}

        <p className="mt-4 text-center text-[11px] text-slate-400">벤치마킹·리서치 목적 · 콘텐츠 저작권은 원저작자에게 있습니다.</p>
      </div>
    </div>
  )
}

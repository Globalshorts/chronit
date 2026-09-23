import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Sparkles, ArrowRight } from 'lucide-react'
import notes from '../data/releaseNotes.json'
import EnergyOrb from './EnergyOrb'

const KEY = 'chr_seen_release'
// 최신 릴리즈를 아직 안 본 사용자에게만 1회 노출되는 What's New 카드
export default function WhatsNew() {
  const latest = notes && notes[0]
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!latest) return
    let seen = null
    try { seen = localStorage.getItem(KEY) } catch { /* noop */ }
    if (seen !== latest.version) { const t = setTimeout(() => setOpen(true), 1200); return () => clearTimeout(t) }
  }, [latest])
  if (!latest || !open) return null
  const dismiss = () => { try { localStorage.setItem(KEY, latest.version) } catch { /* noop */ } setOpen(false) }
  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[2147483000] w-[min(92vw,340px)] md:bottom-6 md:right-6">
      <div className="pointer-events-auto relative overflow-hidden rounded-2xl glass p-4 shadow-2xl shadow-black/50">
        <button onClick={dismiss} aria-label="닫기" className="absolute right-2.5 top-2.5 text-white/40 transition hover:text-white/80"><X size={16} /></button>
        <div className="flex items-center gap-2">
          <EnergyOrb size={26} />
          <span className="rounded-md bg-[#0064FF]/20 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-[#5AA0FF]">NEW</span>
          <span className="pr-5 text-sm font-bold text-white">{latest.title}</span>
        </div>
        <ul className="mt-2.5 space-y-1.5">
          {latest.highlights.slice(0, 3).map((h, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[13px] leading-snug text-white/70"><Sparkles size={12} className="mt-0.5 shrink-0 text-[#5AA0FF]" />{h}</li>
          ))}
        </ul>
        <Link to="/changelog" onClick={dismiss} className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-[#0064FF] py-2 text-[13px] font-bold text-white transition hover:brightness-95">자세히 보기 <ArrowRight size={14} /></Link>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Eye, Heart, MessageCircle, Sparkles, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

// 릴스 재생 모달 — 트렌드/워치리스트 공용.
// clip: { video_url, video_id(=shortcode), thumbnail_url, views, likes, comments }
const fmt = (n) => { n = Math.max(0, Math.trunc(Number(n) || 0)); return n >= 10000 ? (n / 10000).toFixed(1) + '만' : n >= 1000 ? (n / 1000).toFixed(1) + '천' : String(n) }

export default function VideoModal({ clip, onClose, onSource, onAnalyze }) {
  const [src, setSrc] = useState(clip?.video_url || '')
  const [mode, setMode] = useState(clip?.video_url ? 'video' : 'embed')
  const [tried, setTried] = useState(false)
  const onVidError = async () => {
    if (!tried) {
      setTried(true)
      try { const { data } = await supabase.functions.invoke('trend-reel', { body: { shortcode: clip?.video_id } }); if (data?.video_url) { setSrc(data.video_url); return } } catch { /* noop */ }
    }
    setMode('embed')
  }
  if (!clip) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-black" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"><X size={18} /></button>
        {mode === 'video' && src ? (
          <video key={src} src={src} poster={clip.thumbnail_url} controls autoPlay loop muted playsInline onError={onVidError} className="aspect-[9/16] w-full bg-black object-contain" />
        ) : (
          <iframe key="emb" src={`https://www.instagram.com/reel/${clip.video_id}/embed`} title="reel" loading="lazy" allow="autoplay; encrypted-media; clipboard-write" className="aspect-[9/16] w-full border-0 bg-black" />
        )}
        <div className="bg-white p-3">
          <div className="mb-2 flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-0.5"><Eye size={12} />{fmt(clip.views)}</span>
            <span className="flex items-center gap-0.5"><Heart size={12} />{fmt(clip.likes)}</span>
            <span className="flex items-center gap-0.5"><MessageCircle size={12} />{fmt(clip.comments)}</span>
          </div>
          <button onClick={onSource} className="mb-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0064FF] py-3 text-sm font-extrabold text-white transition hover:brightness-95"><Sparkles size={16} />이 영상 소스 찾기</button>
          <button onClick={onAnalyze} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition hover:border-[#0064FF] hover:text-[#0064FF]">벤치마크 분석</button>
        </div>
      </div>
    </div>
  )
}

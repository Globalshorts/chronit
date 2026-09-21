import { useState } from 'react'
import { Eye, Heart, MessageCircle, Sparkles, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

// 릴스 재생 모달 — 트렌드/워치리스트 공용.
// clip: { video_url, video_id(=shortcode), thumbnail_url, views, likes, comments }
const fmt = (n) => { n = Math.max(0, Math.trunc(Number(n) || 0)); return n >= 10000 ? (n / 10000).toFixed(1) + '만' : n >= 1000 ? (n / 1000).toFixed(1) + '천' : String(n) }

export default function VideoModal({ clip, onClose, onSource, onAnalyze }) {
  const imgs = Array.isArray(clip?.images) ? clip.images.filter(Boolean) : []
  const [src, setSrc] = useState(clip?.video_url || '')
  // 영상이 없고 이미지가 있으면 캐러셀 — 앱 안에서 넘겨 본다(인스타로 내보내면 원본 URL 이 노출된다)
  const [mode, setMode] = useState(clip?.video_url ? 'video' : imgs.length ? 'images' : 'embed')
  const [idx, setIdx] = useState(0)
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 sm:p-4" onClick={onClose}>
      {/* 모바일은 화면 전체(100dvh — vh 는 주소창 높이를 못 따라간다).
          영상은 남는 공간만 쓰고(min-h-0), 액션바는 shrink-0 이라 항상 보인다. */}
      <div className="relative flex h-[100dvh] w-full max-w-sm flex-col overflow-hidden bg-black sm:h-[92dvh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"><X size={18} /></button>
        {mode === 'images' ? (
          <div className="relative flex min-h-0 w-full flex-1 items-center justify-center bg-black">
            <img src={imgs[idx]} alt="" referrerPolicy="no-referrer" onContextMenu={(ev) => ev.preventDefault()}
              className="max-h-full max-w-full object-contain" />
            {imgs.length > 1 && (
              <>
                <button onClick={() => setIdx((i) => (i - 1 + imgs.length) % imgs.length)} aria-label="이전 장"
                  className="absolute left-2 rounded-full bg-black/55 p-2 text-white transition hover:bg-black/80"><ChevronLeft size={20} /></button>
                <button onClick={() => setIdx((i) => (i + 1) % imgs.length)} aria-label="다음 장"
                  className="absolute right-2 rounded-full bg-black/55 p-2 text-white transition hover:bg-black/80"><ChevronRight size={20} /></button>
                <div className="absolute bottom-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white">{idx + 1} / {imgs.length}</div>
              </>
            )}
          </div>
        ) : mode === 'video' && src ? (
          <video key={src} src={src} poster={clip.thumbnail_url} controls autoPlay loop muted playsInline
            controlsList="nodownload noplaybackrate noremoteplayback"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            onError={onVidError}
            className="min-h-0 w-full flex-1 bg-black object-contain" />
        ) : (
          <iframe key="emb" src={`https://www.instagram.com/reel/${clip.video_id}/embed`} title="reel" loading="lazy" allow="autoplay; encrypted-media; clipboard-write" className="min-h-0 w-full flex-1 border-0 bg-black" />
        )}
        <div className="shrink-0 bg-white p-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
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

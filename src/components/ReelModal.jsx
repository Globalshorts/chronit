import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Eye, Heart, MessageCircle, Sparkles, X, ChevronLeft, ChevronRight, Bookmark, Loader2, ArrowRight, BarChart3 } from 'lucide-react'
import { supabase } from '../lib/supabase'

// 릴스 재생 모달 — 트렌드/워치리스트 공용.
// clip: { video_url, video_id(=shortcode), thumbnail_url, views, likes, comments }
const fmt = (n) => { n = Math.max(0, Math.trunc(Number(n) || 0)); return n >= 10000 ? (n / 10000).toFixed(1) + '만' : n >= 1000 ? (n / 1000).toFixed(1) + '천' : String(n) }

export default function VideoModal({ clip, onClose, onSave, saved = false, onScript, scriptState, onAnalyze }) {
  const _navScript = useNavigate()
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
          {onScript ? (
            <button onClick={() => onScript()} disabled={scriptState?.status === 'generating'} title={scriptState?.error || ''} className={`mb-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-extrabold text-white transition hover:brightness-95 ${scriptState?.status === 'ready' ? 'bg-emerald-500' : scriptState?.status === 'error' ? 'bg-rose-500' : 'bg-[#0064FF]'} ${scriptState?.status === 'generating' ? 'opacity-70' : ''}`}>{scriptState?.status === 'generating' ? <><Loader2 size={16} className="animate-spin" />대본 생성 중…</> : scriptState?.status === 'ready' ? <><ArrowRight size={16} />베라에서 대본 보기</> : scriptState?.status === 'error' ? <><Sparkles size={16} />다시 시도</> : <><Sparkles size={16} />대본 작성하기</>}</button>
          ) : (
            <button onClick={() => { _navScript('/script', { state: { source_ref: clip?.video_id, caption: clip?.caption || '', thumbnail: clip?.thumbnail_url || '', product_name: '' } }); onClose && onClose() }} className="mb-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0064FF] py-3 text-sm font-extrabold text-white transition hover:brightness-95"><Sparkles size={16} />대본 작성하기</button>
          )}
          {onAnalyze && (
            <button onClick={() => onAnalyze()} className="mb-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 py-2.5 text-sm font-bold text-white/75 transition hover:border-[#0064FF] hover:text-white"><BarChart3 size={15} /> 소재 분석 · 이용권 1</button>
          )}
          {onSave && (
            <button onClick={onSave} aria-pressed={saved} className={`flex w-full items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-bold transition ${saved ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-600 hover:border-[#0064FF] hover:text-[#0064FF]'}`}><Bookmark size={15} className={saved ? 'fill-emerald-500 text-emerald-500' : ''} />{saved ? '워치리스트에 담김' : '워치리스트에 담기'}</button>
          )}
        </div>
      </div>
    </div>
  )
}

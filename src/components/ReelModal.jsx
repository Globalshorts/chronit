import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { Eye, Heart, MessageCircle, Sparkles, X, ChevronLeft, ChevronRight, Bookmark, Loader2, ArrowRight, BarChart3 } from 'lucide-react'
import { supabase } from '../lib/supabase'

// 릴스 재생 모달 — 트렌드/벤치마크 공용.
// clip: { video_url, video_id(=shortcode), thumbnail_url, views, likes, comments }
const fmt = (n) => { n = Math.max(0, Math.trunc(Number(n) || 0)); return n >= 10000 ? (n / 10000).toFixed(1) + '만' : n >= 1000 ? (n / 1000).toFixed(1) + '천' : String(n) }

// 캐러셀 슬라이드는 원본이 인스타 CDN 서명 URL(만료·핫링크 차단)이라 브라우저에서 바로 뜨지 않는다.
// 썸네일처럼 프록시(서버 fetch → 스토리지 캐시)로 돌려 안정적으로 띄운다. 스토리지 URL은 그대로.
const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const proxied = (u, sc, i) => {
  if (!u) return ''
  if (u.includes('/storage/v1/object/public/')) return u
  return `${SB}/functions/v1/thumbnail-proxy?url=${encodeURIComponent(u)}${sc ? `&sc=${encodeURIComponent(sc)}` : ''}${i != null ? `&i=${i}` : ''}`
}

export default function VideoModal({ clip, onClose, onSave, saved = false, onScript, scriptState, onAnalyze, viewOnly = false }) {
  const _navScript = useNavigate()
  const imgs = Array.isArray(clip?.images) ? clip.images.filter(Boolean) : []
  const [src, setSrc] = useState(clip?.video_url || '')
  // 영상이 없고 이미지가 있으면 캐러셀 — 앱 안에서 넘겨 본다(인스타로 내보내면 원본 URL 이 노출된다).
  // 영상 URL 이 아직 없고(프리페치 전/만료) shortcode 가 있으면 서버에서 신선한 원본을 받아 네이티브로 재생한다.
  // (예전엔 여기서 인스타 embed iframe 으로 떨어졌는데, 네이티브가 아닌 인스타 화면이 떠서 제거함)
  const [mode, setMode] = useState(clip?.video_url ? 'video' : imgs.length ? 'images' : clip?.video_id ? 'resolving' : 'error')
  const [idx, setIdx] = useState(0)
  const [tried, setTried] = useState(false)
  const [rawImg, setRawImg] = useState({}) // 프록시 실패 시 해당 장만 원본 URL로 폴백
  const [imgLoading, setImgLoading] = useState(false) // 장 넘길 때 로딩 표시
  // 캐러셀 넘김 — 버튼/스와이프/키보드 공용. (예전엔 버튼만 있어 모바일에서 손가락으로 넘겨도 안 바뀌었다)
  const nImgs = imgs.length
  const go = (d) => { if (nImgs > 1) setIdx((i) => (i + d + nImgs) % nImgs) }
  const touch = useRef({ x: 0, y: 0, active: false })
  // 장(idx)이 바뀌면 프록시 콜드 캐시 동안 직전 프레임이 남지 않게 로딩 상태로 전환
  useEffect(() => { if (mode === 'images') setImgLoading(true) }, [idx, mode])
  useEffect(() => {
    if (mode !== 'images' || nImgs <= 1) return
    const onKey = (e) => { if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, nImgs])
  const resolveVideo = async () => {
    try {
      const { data } = await supabase.functions.invoke('trend-reel', { body: { shortcode: clip?.video_id } })
      if (data?.video_url) { setSrc(data.video_url); setMode('video'); return true }
    } catch { /* noop */ }
    return false
  }
  // 영상 URL 없이 열렸으면 즉시 서버에서 신선한 원본 URL 을 받아온다
  useEffect(() => {
    if (mode !== 'resolving') return
    let alive = true
    ;(async () => { const ok = await resolveVideo(); if (alive && !ok) setMode('error') })()
    return () => { alive = false }
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps
  const onVidError = async () => {
    if (!tried) { setTried(true); if (await resolveVideo()) return }
    setMode('error')
  }
  if (!clip) return null
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/85 sm:p-4" style={{ zIndex: 2147483100 }} onClick={onClose}>
      {/* 모바일은 화면 전체(100dvh — vh 는 주소창 높이를 못 따라간다).
          영상은 남는 공간만 쓰고(min-h-0), 액션바는 shrink-0 이라 항상 보인다. */}
      <div className="relative flex h-[100dvh] w-full max-w-sm flex-col overflow-hidden bg-black sm:h-[92dvh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}>
        {/* 상단 바: 노치/상태바(safe-area) 아래로 내리고, 닫기 버튼을 영상 밖에 둬서 플레이어 음소거 버튼과 안 겹치게 */}
        <div className="flex shrink-0 items-center justify-end bg-black px-2 pb-1.5" style={{ paddingTop: 'max(0.375rem, env(safe-area-inset-top))' }}>
          <button onClick={onClose} aria-label="닫기" className="rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20"><X size={18} /></button>
        </div>
        {mode === 'images' ? (
          <div className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden bg-black"
            onTouchStart={(e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY, active: true } }}
            onTouchEnd={(e) => { if (!touch.current.active) return; touch.current.active = false; const t = e.changedTouches[0]; const dx = t.clientX - touch.current.x; const dy = t.clientY - touch.current.y; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1) }}>
            {imgLoading && <div className="absolute inset-0 grid place-items-center bg-black"><Loader2 size={22} className="animate-spin text-white/50" /></div>}
            <img key={idx} src={rawImg[idx] ? imgs[idx] : proxied(imgs[idx], clip?.video_id, idx)} alt="" referrerPolicy="no-referrer"
              onLoad={() => setImgLoading(false)}
              onError={() => { setImgLoading(false); setRawImg((f) => (f[idx] ? f : { ...f, [idx]: true })) }}
              onContextMenu={(ev) => ev.preventDefault()}
              className="max-h-full max-w-full select-none object-contain" draggable={false} />
            {nImgs > 1 && (
              <>
                <button onClick={() => go(-1)} aria-label="이전 장"
                  className="absolute left-2 z-10 rounded-full bg-black/55 p-2 text-white transition hover:bg-black/80"><ChevronLeft size={20} /></button>
                <button onClick={() => go(1)} aria-label="다음 장"
                  className="absolute right-2 z-10 rounded-full bg-black/55 p-2 text-white transition hover:bg-black/80"><ChevronRight size={20} /></button>
                <div className="absolute bottom-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white">{idx + 1} / {nImgs}</div>
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
        ) : mode === 'resolving' ? (
          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2 bg-black text-white/60">
            <Loader2 size={22} className="animate-spin" />
            <span className="text-xs">원본 영상 불러오는 중…</span>
          </div>
        ) : (
          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white/60">
            <span className="text-sm">원본 영상을 불러오지 못했어요.</span>
            <button onClick={() => { setTried(false); setMode('resolving') }} className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/20">다시 시도</button>
          </div>
        )}
        <div className="shrink-0 bg-white px-3 pt-2.5" style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))' }}>
          <div className="mb-2 flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-0.5"><Eye size={12} />{fmt(clip.views)}</span>
            <span className="flex items-center gap-0.5"><Heart size={12} />{fmt(clip.likes)}</span>
            <span className="flex items-center gap-0.5"><MessageCircle size={12} />{fmt(clip.comments)}</span>
          </div>
          {!viewOnly && (onScript ? (
            <button onClick={() => onScript()} disabled={scriptState?.status === 'generating'} title={scriptState?.error || ''} className={`mb-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-extrabold text-white transition hover:brightness-95 ${scriptState?.status === 'ready' ? 'bg-emerald-500' : scriptState?.status === 'error' ? 'bg-rose-500' : 'bg-[#0064FF]'} ${scriptState?.status === 'generating' ? 'opacity-70' : ''}`}>{scriptState?.status === 'generating' ? <><Loader2 size={16} className="animate-spin" />대본 생성 중…</> : scriptState?.status === 'ready' ? <><ArrowRight size={16} />베라에서 대본 보기</> : scriptState?.status === 'error' ? <><Sparkles size={16} />다시 시도</> : <><Sparkles size={16} />대본 작성하기</>}</button>
          ) : (
            <button onClick={() => { _navScript('/script', { state: { source_ref: clip?.video_id, caption: clip?.caption || '', thumbnail: clip?.thumbnail_url || '', product_name: '' } }); onClose && onClose() }} className="mb-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0064FF] py-2.5 text-sm font-extrabold text-white transition hover:brightness-95"><Sparkles size={16} />대본 작성하기</button>
          ))}
          {!viewOnly && (onAnalyze || onSave) && (
            <div className={`grid gap-1.5 ${onAnalyze && onSave ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {onAnalyze && (
                <button onClick={() => onAnalyze()} className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 py-2.5 text-[13px] font-bold text-slate-600 transition hover:border-[#0064FF] hover:text-[#0064FF]"><BarChart3 size={14} /> 소재 분석 · 1</button>
              )}
              {onSave && (
                <button onClick={onSave} aria-pressed={saved} className={`flex items-center justify-center gap-1 rounded-xl border py-2.5 text-[13px] font-bold transition ${saved ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-600 hover:border-[#0064FF] hover:text-[#0064FF]'}`}><Bookmark size={14} className={saved ? 'fill-emerald-500 text-emerald-500' : ''} />{saved ? '벤치마크에 담김' : '벤치마크에 담기'}</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

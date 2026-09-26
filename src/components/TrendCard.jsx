import { useState } from 'react'
import { Flame, Eye, Heart, MessageCircle, Sparkles, Lock, Play, Bookmark, Layers, ExternalLink, Loader2, ArrowRight, BarChart3 } from 'lucide-react'
import { fmtCount, timeAgo } from '../lib/format'
import { isCarousel, coverOf, imagesOf, openPost } from '../lib/filterConfig'

// 트렌드 피드 카드 — 트렌드/워치리스트 공용.
const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'

// 스토리지 원본 URL을 피드 카드용 리사이즈(render) URL로 바꿔 egress 절감 (원본은 보관, 서빙만 축소).
const sizedStorage = (u, w = 360, q = 62) =>
  u.includes('/storage/v1/object/public/')
    ? u.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + (u.includes('?') ? '&' : '?') + `width=${w}&quality=${q}`
    : u

// sc(shortcode)를 넘기면 프록시가 post/{sc}.jpg 한 경로에만 캐시한다.
// 안 넘기면 URL 해시로 돌아가는데, IG URL 서명이 갱신될 때마다 새 파일이 쌓인다.
export function TrendThumb({ url, sc, eager = false, w = 360 }) {
  const [err, setErr] = useState(false)
  const [loaded, setLoaded] = useState(false)
  // 스토리지 캐시본은 프록시 없이 리사이즈만, IG URL 은 프록시(캐시)로.
  const src = !url ? '' : url.includes('/storage/v1/object/public/')
    ? sizedStorage(url, w)
    : `${SB}/functions/v1/thumbnail-proxy?url=${encodeURIComponent(url)}${sc ? `&sc=${encodeURIComponent(sc)}` : ''}`
  if (!src || err) return <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-300"><Flame size={26} /></div>
  return (
    <img
      src={src}
      referrerPolicy="no-referrer"
      loading={eager ? 'eager' : 'lazy'}
      fetchpriority={eager ? 'high' : 'auto'}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setErr(true)}
      className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
    />
  )
}


// it: watch_feed / trend-feed 공통 행
//   shortcode,url,video_url,thumbnail_url,caption,comment_count,like_count,view_count,owner,taken_at,velocity
//   post_type('reel'|'carousel'), images[] (캐러셀 이미지, 릴스는 [])
// 숫자가 아직 안 온 행(골격)은 0 을 그리면 틀린 값이 된다 → 자리만 잡아둔다
const Num = ({ value, pending }) => (
  pending ? <span className="inline-block h-2.5 w-7 animate-pulse rounded bg-slate-300/50 align-middle" /> : <>{fmtCount(value)}</>
)

export default function TrendCard({
  it, rank, locked = false, watching = false, lockedLabel = '프로 이상 전용',
  lazyDetail = false, coach = false, showOwner = false, eager = false,
  onPlay, onOpen, onAnalyze, onSource, onToggleWatch, onUnlock, onScript, scriptState,
}) {
  const carousel = isCarousel(it)
  const cover = coverOf(it)
  const count = imagesOf(it).length
  const pending = it._skeleton === true
  // 캐러셀은 바로 게시물로. 그 외에는 video_url 이 있으면 재생,
  // lazyDetail(목록에 video_url 을 안 싣는 피드)이면 호출부가 상세를 받아 판단한다.
  const openOnly = carousel || (!lazyDetail && !it.video_url)
  return (
    <div className="overflow-hidden rounded-xl glass">
      {locked ? (
        <div role="button" onClick={onUnlock} className="relative block aspect-[9/16] cursor-pointer bg-white/[0.06]">
          <div className="h-full w-full overflow-hidden blur-[12px]"><TrendThumb url={cover} sc={it.shortcode} /></div>
          {rank != null && <div className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">#{rank}</div>}
          {it.taken_at && <div className="absolute right-1.5 top-1.5 rounded bg-[#0064FF] px-1.5 py-0.5 text-[10px] font-bold text-white">{timeAgo(it.taken_at)}</div>}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/30 text-white">
            <Lock size={20} />
            <span className="text-xs font-bold">{lockedLabel}</span>
          </div>
        </div>
      ) : (
        <div role="button" onClick={openOnly ? () => (onOpen ? onOpen() : openPost(it.url)) : onPlay}
          aria-label={openOnly ? (showOwner ? `@${it.owner} 게시물 열기` : '이 게시물 열기') : undefined}
          className="relative block aspect-[9/16] cursor-pointer bg-white/[0.06]">
          <TrendThumb url={cover} sc={it.shortcode} eager={eager} />
          {rank != null && <div className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">#{rank}</div>}
          {it.taken_at && <div className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">{timeAgo(it.taken_at)}</div>}
          <div className="absolute inset-0 flex items-center justify-center opacity-90">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white">
              {openOnly ? (onOpen ? <Layers size={15} /> : <ExternalLink size={15} />) : <Play size={16} className="ml-0.5" />}
            </div>
          </div>
          {carousel && (
            // 여러 장 게시물 표시 — 장수만 보여주고 넘겨보기는 인스타에서.
            // (카드 안에서 모든 장을 띄우면 장마다 썸네일 프록시·스토리지 쓰기가 늘어난다)
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-1 text-[11px] font-bold text-white backdrop-blur">
              <Layers size={12} />{count > 0 ? `${count}장` : '캐러셀'}
            </div>
          )}
        </div>
      )}
      <div className="p-2">
        <div className="mb-1.5 flex items-center gap-2 text-[11px] text-white/45">
          {!carousel && <span className="flex items-center gap-0.5"><Eye size={11} /><Num value={it.view_count} pending={pending} /></span>}
          <span className="flex items-center gap-0.5"><Heart size={11} /><Num value={it.like_count} pending={pending} /></span>
          <span className="flex items-center gap-0.5"><MessageCircle size={11} /><Num value={it.comment_count} pending={pending} /></span>
        </div>
        <div className="mb-1.5 truncate text-[11px] text-white/35">
          {locked ? lockedLabel
            : showOwner ? `@${it.owner}${!pending && it.follower_count ? ` · 팔로워 ${fmtCount(it.follower_count)}` : ''}`
            : (!pending && it.follower_count) ? `팔로워 ${fmtCount(it.follower_count)}`
            : (it.category || '\u00a0')}
        </div>
        {locked ? (
          <button onClick={onUnlock} className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#0064FF] py-1.5 text-xs font-bold text-white transition hover:brightness-95"><Lock size={12} />잠금 해제하고 보기</button>
        ) : (
          <>
            <button onClick={onScript} disabled={scriptState?.status === 'generating'} title={scriptState?.error || '이 소재로 대본 작성하기'}
              className={`flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold text-white transition hover:brightness-95 ${scriptState?.status === 'ready' ? 'bg-emerald-500' : scriptState?.status === 'error' ? 'bg-rose-500' : 'bg-[#0064FF]'} ${scriptState?.status === 'generating' ? 'opacity-70' : ''}${coach ? ' animate-pulse ring-2 ring-[#0064FF]/45 ring-offset-2' : ''}`}>
              {scriptState?.status === 'generating' ? <><Loader2 size={12} className="animate-spin" />생성 중…</> : scriptState?.status === 'ready' ? <><ArrowRight size={12} />베라에서 보기</> : scriptState?.status === 'error' ? <><Sparkles size={12} />다시 시도</> : <><Sparkles size={12} />대본 작성</>}
            </button>
            <div className="mt-1.5 flex gap-1.5">
              {onAnalyze && (
                <button onClick={onAnalyze} title="이 소재 분석 (이용권 1개)"
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 py-1.5 text-xs font-bold text-white/55 transition hover:border-[#0064FF] hover:text-[#5AA0FF]">
                  <BarChart3 size={12} />분석
                </button>
              )}
              {onToggleWatch && (
                <button onClick={onToggleWatch} title="담기 = 이 계정을 워치리스트에 저장" aria-pressed={watching}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-xs font-bold transition ${watching ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-white/10 text-white/55 hover:border-[#0064FF] hover:text-[#0064FF]'}`}>
                  <Bookmark size={12} className={watching ? 'fill-emerald-500 text-emerald-500' : ''} />{watching ? '담김' : '담기'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

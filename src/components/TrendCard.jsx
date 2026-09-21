import { useState } from 'react'
import { Flame, Eye, Heart, MessageCircle, Sparkles, Lock, Play, Bookmark, Layers, ExternalLink } from 'lucide-react'
import { fmtCount, timeAgo } from '../lib/format'
import { isCarousel, coverOf, imagesOf, openPost } from '../lib/filterConfig'

// 트렌드 피드 카드 — 트렌드/워치리스트 공용.
const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'

// sc(shortcode)를 넘기면 프록시가 post/{sc}.jpg 한 경로에만 캐시한다.
// 안 넘기면 URL 해시로 돌아가는데, IG URL 서명이 갱신될 때마다 새 파일이 쌓인다.
export function TrendThumb({ url, sc }) {
  const [err, setErr] = useState(false)
  // 이미 우리 스토리지에 캐시된 URL 은 프록시를 거치지 않는다 — 거치면 같은 사진이
  // post/{sc}.jpg 로 한 번 더 복사되고, 불필요한 함수 호출이 한 번 더 난다.
  const src = !url ? '' : url.includes('/storage/v1/object/public/')
    ? url
    : `${SB}/functions/v1/thumbnail-proxy?url=${encodeURIComponent(url)}${sc ? `&sc=${encodeURIComponent(sc)}` : ''}`
  if (!src || err) return <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-300"><Flame size={26} /></div>
  return <img src={src} referrerPolicy="no-referrer" loading="lazy" className="h-full w-full object-cover" onError={() => setErr(true)} />
}


// it: watch_feed / trend-feed 공통 행
//   shortcode,url,video_url,thumbnail_url,caption,comment_count,like_count,view_count,owner,taken_at,velocity
//   post_type('reel'|'carousel'), images[] (캐러셀 이미지, 릴스는 [])
export default function TrendCard({
  it, rank, locked = false, watching = false, lockedLabel = '프로 이상 전용',
  onPlay, onAnalyze, onSource, onToggleWatch, onUnlock,
}) {
  const carousel = isCarousel(it)
  const cover = coverOf(it)
  const count = imagesOf(it).length
  // 캐러셀이거나 영상 주소가 없으면(일부 피드는 video_url 을 주지 않는다) 재생 대신 게시물을 연다
  const openOnly = carousel || !it.video_url
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {locked ? (
        <div role="button" onClick={onUnlock} className="relative block aspect-[9/16] cursor-pointer bg-slate-100">
          <div className="h-full w-full overflow-hidden blur-[12px]"><TrendThumb url={cover} sc={it.shortcode} /></div>
          {rank != null && <div className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">#{rank}</div>}
          {it.taken_at && <div className="absolute right-1.5 top-1.5 rounded bg-[#0064FF] px-1.5 py-0.5 text-[10px] font-bold text-white">{timeAgo(it.taken_at)}</div>}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/30 text-white">
            <Lock size={20} />
            <span className="text-xs font-bold">{lockedLabel}</span>
          </div>
        </div>
      ) : (
        <div role="button" onClick={openOnly ? () => openPost(it.url) : onPlay}
          aria-label={openOnly ? `@${it.owner} 게시물 인스타그램에서 보기` : undefined}
          className="relative block aspect-[9/16] cursor-pointer bg-slate-100">
          <TrendThumb url={cover} sc={it.shortcode} />
          {rank != null && <div className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">#{rank}</div>}
          {it.taken_at && <div className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">{timeAgo(it.taken_at)}</div>}
          <div className="absolute inset-0 flex items-center justify-center opacity-90">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white">
              {openOnly ? <ExternalLink size={15} /> : <Play size={16} className="ml-0.5" />}
            </div>
          </div>
          {carousel && (
            // 여러 장 게시물 표시 — 장수만 보여주고 넘겨보기는 인스타에서.
            // (카드 안에서 모든 장을 띄우면 장마다 썸네일 프록시·스토리지 쓰기가 늘어난다)
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-1 text-[11px] font-bold text-white backdrop-blur">
              <Layers size={12} />{count > 0 ? `${count}장` : '캐러셀'}
            </div>
          )}
          {onToggleWatch && (
            // 이 계정을 워치리스트에 담기/빼기 (히트영역·아이콘 2배 — 잘 안 보인다는 피드백)
            <button onClick={(e) => { e.stopPropagation(); onToggleWatch() }}
              title={watching ? `@${it.owner} 감시 해제` : `@${it.owner} 워치리스트에 추가`}
              aria-label={watching ? `@${it.owner} 감시 해제` : `@${it.owner} 워치리스트에 추가`} aria-pressed={watching}
              className="absolute bottom-2 right-2 flex h-14 w-14 items-center justify-center rounded-full bg-black/65 text-white shadow-lg ring-1 ring-white/20 backdrop-blur transition hover:bg-black/85 active:scale-95">
              <Bookmark size={28} strokeWidth={2.25} className={watching ? 'fill-emerald-400 text-emerald-400' : ''} />
            </button>
          )}
        </div>
      )}
      <div className="p-2">
        <div className="mb-1.5 flex items-center gap-2 text-[11px] text-slate-500">
          {!carousel && <span className="flex items-center gap-0.5"><Eye size={11} />{fmtCount(it.view_count)}</span>}
          <span className="flex items-center gap-0.5"><Heart size={11} />{fmtCount(it.like_count)}</span>
          <span className="flex items-center gap-0.5"><MessageCircle size={11} />{fmtCount(it.comment_count)}</span>
        </div>
        <div className="mb-1.5 truncate text-[11px] text-slate-400">{locked ? lockedLabel : `@${it.owner}${it.follower_count ? ` · 팔로워 ${fmtCount(it.follower_count)}` : ''}`}</div>
        {locked ? (
          <button onClick={onUnlock} className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#0064FF] py-1.5 text-xs font-bold text-white transition hover:brightness-95"><Lock size={12} />잠금 해제하고 보기</button>
        ) : (
          <div className="flex gap-1.5">
            <button onClick={onAnalyze} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#0064FF] py-1.5 text-xs font-bold text-white transition hover:brightness-95"><Sparkles size={12} />분석</button>
            <button onClick={onSource} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs font-bold text-slate-600 transition hover:border-[#0064FF] hover:text-[#0064FF]">소스 찾기</button>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Flame, Eye, Heart, MessageCircle, Sparkles, Lock, Play, Bookmark } from 'lucide-react'
import { fmtCount, timeAgo } from '../lib/format'

// 트렌드 피드 카드 — 트렌드/워치리스트 공용.
const SB = 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'

export function TrendThumb({ url }) {
  const [err, setErr] = useState(false)
  const src = url ? `${SB}/functions/v1/thumbnail-proxy?url=${encodeURIComponent(url)}` : ''
  if (!src || err) return <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-300"><Flame size={26} /></div>
  return <img src={src} referrerPolicy="no-referrer" loading="lazy" className="h-full w-full object-cover" onError={() => setErr(true)} />
}


// it: watch_feed / trend-feed 공통 행
//   shortcode,url,video_url,thumbnail_url,caption,comment_count,like_count,view_count,owner,taken_at,velocity
export default function TrendCard({
  it, rank, locked = false, saved = false,
  onPlay, onAnalyze, onSource, onToggleSave, onUnlock,
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {locked ? (
        <div role="button" onClick={onUnlock} className="relative block aspect-[9/16] cursor-pointer bg-slate-100">
          <div className="h-full w-full overflow-hidden blur-[12px]"><TrendThumb url={it.thumbnail_url} /></div>
          {rank != null && <div className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">#{rank}</div>}
          {it.taken_at && <div className="absolute right-1.5 top-1.5 rounded bg-[#0064FF] px-1.5 py-0.5 text-[10px] font-bold text-white">{timeAgo(it.taken_at)}</div>}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/30 text-white">
            <Lock size={20} />
            <span className="text-xs font-bold">구독 유저 전용</span>
          </div>
        </div>
      ) : (
        <div role="button" onClick={onPlay} className="relative block aspect-[9/16] cursor-pointer bg-slate-100">
          <TrendThumb url={it.thumbnail_url} />
          {rank != null && <div className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">#{rank}</div>}
          {it.taken_at && <div className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">{timeAgo(it.taken_at)}</div>}
          <div className="absolute inset-0 flex items-center justify-center opacity-90"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white"><Play size={16} className="ml-0.5" /></div></div>
          {onToggleSave && (
            <button onClick={(e) => { e.stopPropagation(); onToggleSave() }} aria-label="이번 주 소재로 저장" className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75">
              <Bookmark size={14} className={saved ? 'fill-emerald-400 text-emerald-400' : ''} />
            </button>
          )}
        </div>
      )}
      <div className="p-2">
        <div className="mb-1.5 flex items-center gap-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-0.5"><Eye size={11} />{fmtCount(it.view_count)}</span>
          <span className="flex items-center gap-0.5"><Heart size={11} />{fmtCount(it.like_count)}</span>
          <span className="flex items-center gap-0.5"><MessageCircle size={11} />{fmtCount(it.comment_count)}</span>
        </div>
        <div className="mb-1.5 truncate text-[11px] text-slate-400">{locked ? '구독 유저 전용' : `@${it.owner}${it.follower_count ? ` · 팔로워 ${fmtCount(it.follower_count)}` : ''}`}</div>
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

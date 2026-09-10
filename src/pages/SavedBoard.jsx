import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Sparkles, Trash2, Bookmark, ExternalLink, Plus } from 'lucide-react'

const fmt = (n) => { n = Number(n) || 0; return n >= 10000 ? (n / 10000).toFixed(1) + '만' : n >= 1000 ? (n / 1000).toFixed(1) + '천' : String(n) }
const achv = (r) => Math.round((Number(r.published_views) || 0) / Math.max(1, Number(r.view_count) || 0) * 100)

export default function SavedBoard() {
  const [rows, setRows] = useState(null)

  const load = async () => {
    const { data } = await supabase.from('saved_trends').select('*').order('created_at', { ascending: false })
    setRows(data || [])
  }
  useEffect(() => { load() }, [])

  const remove = async (sc) => { setRows((r) => r.filter((x) => x.shortcode !== sc)); try { await supabase.from('saved_trends').delete().eq('shortcode', sc) } catch { /* noop */ } }

  const registerVideo = async (row) => {
    const url = window.prompt('내가 만든 영상 URL (릴스/틱톡):', row.published_url || '')
    if (url == null) return
    const v = url.trim()
    const viewsStr = window.prompt('그 영상의 현재 조회수를 숫자로 입력해주세요 (예: 52000):', row.published_views != null ? String(row.published_views) : '')
    if (viewsStr == null) return
    const num = parseInt(String(viewsStr).replace(/[^0-9]/g, ''), 10)
    const pv = Number.isFinite(num) ? num : null
    setRows((r) => r.map((x) => x.shortcode === row.shortcode ? { ...x, published_url: v || null, published_views: pv, status: v ? 'posted' : x.status } : x))
    try { await supabase.from('saved_trends').update({ published_url: v || null, published_views: pv, status: v ? 'posted' : 'saved', published_at: new Date().toISOString() }).eq('shortcode', row.shortcode) } catch { /* noop */ }
  }

  const posted = (rows || []).filter((r) => r.published_views != null && r.view_count)
  const totalViews = posted.reduce((s, r) => s + (Number(r.published_views) || 0), 0)
  const avgAch = posted.length ? Math.round(posted.reduce((s, r) => s + achv(r), 0) / posted.length) : null

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-xl font-bold"><Bookmark size={20} className="text-[#0064FF]" /> 내 소재 보드</h1>
          <Link to="/trend" className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-white/80 hover:bg-white/15">트렌드에서 더 담기</Link>
        </div>
        <p className="mb-5 text-sm text-white/50">저장한 소재를 관리하고, 만든 영상을 등록하면 원본 대비 성과(달성률)를 추적해요.</p>

        {posted.length > 0 && (
          <div className="mb-5 grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <div><div className="text-xl font-extrabold text-white">{posted.length}</div><div className="text-[11px] text-white/45">등록한 내 영상</div></div>
            <div><div className="text-xl font-extrabold text-white">{fmt(totalViews)}</div><div className="text-[11px] text-white/45">내 영상 총 조회</div></div>
            <div><div className="text-xl font-extrabold text-[#7DA2FF]">{avgAch}%</div><div className="text-[11px] text-white/45">평균 달성률(원본 대비)</div></div>
          </div>
        )}

        {rows == null ? (
          <div className="py-16 text-center text-white/40">불러오는 중…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <div className="mb-2 text-3xl">🔖</div>
            <p className="font-bold text-white/80">아직 저장한 소재가 없어요.</p>
            <p className="mt-1 text-sm text-white/45">트렌드에서 “이번 주 소재로 저장”을 눌러 담아보세요.</p>
            <Link to="/trend" className="mt-5 inline-block rounded-full bg-[#0064FF] px-6 py-2.5 text-sm font-bold text-white">트렌드 보러 가기</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((r) => (
              <div key={r.shortcode} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="relative aspect-[9/16] w-20 shrink-0 overflow-hidden rounded-lg bg-white/5">
                  {r.thumbnail_url && <img src={r.thumbnail_url} referrerPolicy="no-referrer" alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="mb-1 flex flex-wrap gap-1">
                    {r.velocity != null && <span className="rounded-full bg-[#0064FF]/15 px-2 py-0.5 text-[10px] font-bold text-[#7DA2FF]">↑{Math.round(r.velocity)}</span>}
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/50">👁 {fmt(r.view_count)} · 💬 {fmt(r.comment_count)}</span>
                    {r.status === 'posted' && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">게시함</span>}
                  </div>
                  <div className="mb-2 line-clamp-2 text-[13px] text-white/75">{r.caption || '(설명 없음)'}</div>

                  {r.published_views != null && r.view_count ? (
                    <div className="mb-2 rounded-lg bg-white/[0.04] p-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-white/50">원본 {fmt(r.view_count)} → 내 영상 <b className="text-white">{fmt(r.published_views)}</b></span>
                        <span className="font-bold text-[#7DA2FF]">달성률 {achv(r)}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#0064FF]" style={{ width: Math.min(100, achv(r)) + '%' }} /></div>
                    </div>
                  ) : null}

                  <div className="mt-auto flex flex-wrap gap-1.5">
                    <a href={'/research?url=' + encodeURIComponent(r.url || '')} className="flex items-center gap-1 rounded-lg bg-[#0064FF] px-2.5 py-1.5 text-[11px] font-bold text-white hover:brightness-95"><Sparkles size={12} /> 분석하기</a>
                    <button onClick={() => registerVideo(r)} className="flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] font-bold text-white/70 hover:border-[#0064FF] hover:text-[#0064FF]"><Plus size={12} /> {r.published_views != null ? '성과 업데이트' : '내 영상 등록'}</button>
                    {r.published_url && <a href={r.published_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] font-bold text-white/60 hover:text-white"><ExternalLink size={12} /> 내 영상</a>}
                    <button onClick={() => remove(r.shortcode)} className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-white/35 hover:text-red-400"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-white/30">지금은 조회수 직접 입력이에요 — 곧 자동으로 불러와 원본과 비교해드려요.</p>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Sparkles, Trash2, Bookmark, ExternalLink, Plus } from 'lucide-react'

const fmt = (n) => { n = Number(n) || 0; return n >= 10000 ? (n / 10000).toFixed(1) + '만' : n >= 1000 ? (n / 1000).toFixed(1) + '천' : String(n) }

export default function SavedBoard() {
  const [rows, setRows] = useState(null)

  const load = async () => {
    const { data } = await supabase.from('saved_trends').select('*').order('created_at', { ascending: false })
    setRows(data || [])
  }
  useEffect(() => { load() }, [])

  const remove = async (sc) => { setRows((r) => r.filter((x) => x.shortcode !== sc)); try { await supabase.from('saved_trends').delete().eq('shortcode', sc) } catch { /* noop */ } }

  const registerVideo = async (row) => {
    const url = window.prompt('내가 만든 영상 URL을 붙여넣어 주세요 (릴스/틱톡):', row.published_url || '')
    if (url == null) return
    const v = url.trim()
    setRows((r) => r.map((x) => x.shortcode === row.shortcode ? { ...x, published_url: v, status: v ? 'posted' : x.status } : x))
    try { await supabase.from('saved_trends').update({ published_url: v || null, status: v ? 'posted' : 'saved' }).eq('shortcode', row.shortcode) } catch { /* noop */ }
  }

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-xl font-bold"><Bookmark size={20} className="text-[#0064FF]" /> 내 소재 보드</h1>
          <Link to="/trend" className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-white/80 hover:bg-white/15">트렌드에서 더 담기</Link>
        </div>
        <p className="mb-5 text-sm text-white/50">저장한 소재를 여기서 관리하고, 만든 영상을 등록하면 성과를 추적할 수 있어요.</p>

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
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    <a href={'/research?url=' + encodeURIComponent(r.url || '')} className="flex items-center gap-1 rounded-lg bg-[#0064FF] px-2.5 py-1.5 text-[11px] font-bold text-white hover:brightness-95"><Sparkles size={12} /> 분석하기</a>
                    <button onClick={() => registerVideo(r)} className="flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] font-bold text-white/70 hover:border-[#0064FF] hover:text-[#0064FF]"><Plus size={12} /> {r.published_url ? '내 영상 수정' : '내 영상 등록'}</button>
                    {r.published_url && <a href={r.published_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] font-bold text-white/60 hover:text-white"><ExternalLink size={12} /> 내 영상</a>}
                    <button onClick={() => remove(r.shortcode)} className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-white/35 hover:text-red-400"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-white/30">곧: 등록한 내 영상의 조회수를 원본과 비교해 성과를 보여드려요.</p>
      </div>
    </div>
  )
}

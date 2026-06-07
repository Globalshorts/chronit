import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const DISCLOSURE =
  '이 페이지는 쿠팡 파트너스 활동의 일환으로, 이에 따라 일정액의 수수료를 제공받습니다.'

export default function LinkPage() {
  const { handle } = useParams()
  const [page, setPage] = useState(null)
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading') // loading | ok | notfound
  const [q, setQ] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data: pg } = await supabase
          .from('link_pages')
          .select('user_id, handle, title, bio, theme, active, avatar_url, card_size, accent_color')
          .eq('handle', handle)
          .eq('active', true)
          .maybeSingle()
        if (!pg) { if (alive) setState('notfound'); return }
        const { data: its } = await supabase
          .from('link_items')
          .select('id, title, image_url, video_url, target_url, sort_order, badge')
          .eq('user_id', pg.user_id)
          .eq('active', true)
          .order('sort_order', { ascending: true })
        if (!alive) return
        setPage(pg)
        setItems((its || []).filter((i) => i.target_url))
        setState('ok')
      } catch {
        if (alive) setState('notfound')
      }
    })()
    return () => { alive = false }
  }, [handle])

  // 개인 공개 페이지에서는 채널톡 위젯 숨김
  useEffect(() => {
    const hide = () => { try { window.ChannelIO && window.ChannelIO('hideChannelButton') } catch {} }
    hide()
    const t = setTimeout(hide, 1500) // boot 완료 이후에도 한 번 더 적용
    return () => { clearTimeout(t); try { window.ChannelIO && window.ChannelIO('showChannelButton') } catch {} }
  }, [])

  if (state === 'loading')
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#ECEAE3]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#03C75A] border-t-transparent" />
      </div>
    )

  if (state === 'notfound')
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#ECEAE3] px-6 text-center">
        <p className="text-2xl font-black text-gray-900">페이지를 찾을 수 없어요</p>
        <p className="text-gray-500">주소를 다시 확인해 주세요.</p>
        <a href="https://chronit.kr" className="mt-2 text-sm font-bold text-[#03C75A] hover:underline">크로닛으로 가기 →</a>
      </div>
    )

  const dark = page.theme === 'dark'
  const bg = dark ? 'bg-[#15171F] text-gray-100' : 'bg-[#ECEAE3] text-gray-900'
  const card = dark ? 'bg-[#1E2230] border-white/10' : 'bg-white border-gray-200'
  const sub = dark ? 'text-gray-400' : 'text-gray-500'

  const maxW = 'max-w-md'
  const accent = page.accent_color || '#03C75A'
  const ql = q.trim().toLowerCase()
  const filtered = ql ? items.filter((it) => (it.title || '').toLowerCase().includes(ql)) : items

  return (
    <div className={`min-h-screen ${bg}`} style={{ ['--accent']: accent }}>
      <div className={`mx-auto w-full ${maxW} px-5 py-10`}>
        <header className="mb-8 text-center">
          {page.avatar_url ? (
            <img src={page.avatar_url} alt={page.title || page.handle}
              style={{ boxShadow: `0 0 0 3px ${accent}` }}
              className="mx-auto mb-4 h-20 w-20 rounded-full object-cover" />
          ) : (
            <div style={{ backgroundColor: `${accent}1A`, color: accent }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl">🛍️</div>
          )}
          <h1 className="text-2xl font-black">{page.title || `@${page.handle}`}</h1>
          {page.bio && <p className={`mt-2 text-sm leading-relaxed ${sub}`}>{page.bio}</p>}
        </header>

        {items.length === 0 ? (
          <p className={`py-16 text-center text-sm ${sub}`}>아직 등록된 상품이 없어요.</p>
        ) : (
          <>
            {items.length >= 2 && (
              <div className="mb-5">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 상품 검색…"
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:[border-color:var(--accent)] ${dark ? 'border-white/10 bg-white/5 text-gray-100 placeholder-gray-500' : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400'}`} />
              </div>
            )}
            {filtered.length === 0 ? (
              <p className={`py-16 text-center text-sm ${sub}`}>검색 결과가 없어요.</p>
            ) : (
              <div className="space-y-2.5">
                {filtered.map((it) => (
                  <a
                    key={it.id}
                    href={it.target_url}
                    target="_blank"
                    rel="nofollow sponsored noopener noreferrer"
                    className={`group flex items-center gap-3 overflow-hidden rounded-2xl border p-2.5 shadow-sm transition-transform active:scale-[0.98] hover:[border-color:var(--accent)] ${card}`}
                  >
                    <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl bg-black">
                      {it.image_url
                        ? <img src={it.image_url} alt={it.title || ''} loading="lazy" className="h-full w-full object-cover" />
                        : it.video_url
                          ? <video src={`${it.video_url}#t=0.6`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                          : <div className="flex h-full w-full items-center justify-center text-2xl">🛍️</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      {it.badge && (
                        <span className="mb-1 inline-block rounded-md bg-[#ff4d4f] px-1.5 py-0.5 text-[10px] font-black leading-none text-white">{it.badge}</span>
                      )}
                      <p className="line-clamp-2 text-sm font-bold leading-snug">{it.title || '상품 보러가기'}</p>
                    </div>
                    <span className={`shrink-0 pr-1 text-lg group-hover:[color:var(--accent)] ${dark ? 'text-gray-500' : 'text-gray-300'}`}>›</span>
                  </a>
                ))}
              </div>
            )}
          </>
        )}

        <footer className={`mt-10 border-t pt-5 text-center ${dark ? 'border-white/10' : 'border-gray-200'}`}>
          <p className={`text-[11px] leading-relaxed ${sub}`}>{DISCLOSURE}</p>
        </footer>
      </div>
    </div>
  )
}

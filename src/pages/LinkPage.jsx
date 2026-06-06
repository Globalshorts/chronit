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

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data: pg } = await supabase
          .from('link_pages')
          .select('user_id, handle, title, bio, theme, active, avatar_url')
          .eq('handle', handle)
          .eq('active', true)
          .maybeSingle()
        if (!pg) { if (alive) setState('notfound'); return }
        const { data: its } = await supabase
          .from('link_items')
          .select('id, title, video_url, target_url, sort_order')
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

  return (
    <div className={`min-h-screen ${bg}`}>
      <div className="mx-auto w-full max-w-md px-5 py-10">
        <header className="mb-8 text-center">
          {page.avatar_url ? (
            <img src={page.avatar_url} alt={page.title || page.handle}
              className="mx-auto mb-4 h-20 w-20 rounded-full object-cover ring-2 ring-black/5" />
          ) : (
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${dark ? 'bg-white/10' : 'bg-[#03C75A]/10'}`}>🛍️</div>
          )}
          <h1 className="text-2xl font-black">{page.title || `@${page.handle}`}</h1>
          {page.bio && <p className={`mt-2 text-sm leading-relaxed ${sub}`}>{page.bio}</p>}
        </header>

        {items.length === 0 ? (
          <p className={`py-16 text-center text-sm ${sub}`}>아직 등록된 상품이 없어요.</p>
        ) : (
          <div className="space-y-4">
            {items.map((it) => (
              <a
                key={it.id}
                href={it.target_url}
                target="_blank"
                rel="nofollow sponsored noopener noreferrer"
                className={`group block overflow-hidden rounded-3xl border shadow-sm transition-transform active:scale-[0.98] ${card}`}
              >
                {it.video_url && (
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                    <video
                      src={it.video_url}
                      muted
                      loop
                      autoPlay
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 p-4">
                  <p className="line-clamp-2 flex-1 text-sm font-bold leading-snug">{it.title || '상품 보러가기'}</p>
                  <span className="shrink-0 rounded-xl bg-[#03C75A] px-4 py-2 text-sm font-extrabold text-white">보러가기</span>
                </div>
              </a>
            ))}
          </div>
        )}

        <footer className={`mt-10 border-t pt-5 text-center ${dark ? 'border-white/10' : 'border-gray-200'}`}>
          <p className={`text-[11px] leading-relaxed ${sub}`}>{DISCLOSURE}</p>
        </footer>
      </div>
    </div>
  )
}

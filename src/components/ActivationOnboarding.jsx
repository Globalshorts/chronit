import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Bookmark, Loader2, Check, MessageCircle, Eye, PartyPopper } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { phCapture } from '../lib/posthog'
import { ONBOARDING_NICHES, catOfNiche } from '../lib/niche'
import { preloadKakao, addKakaoChannel } from '../lib/kakaoChannel'
import { TrendThumb } from './TrendCard'
import { AnalyzeModal } from '../pages/Finds'
import { fmtCount } from '../lib/format'

const SB = import.meta.env.VITE_SUPABASE_URL || 'https://oxygqtbdpnxxcgzwdlzi.supabase.co'
const PICK_COUNT = 3

// 신규 유저 활성화 온보딩 — 니치 → 관련 트렌드 → 첫 액션(분석 or 저장) → 카톡 채널.
// 완료 전에는 닫을 수 없다. 단, 트렌드를 못 불러오면 갇히지 않게 빠져나갈 길을 연다.
export default function ActivationOnboarding({ onDone, onDefer }) {
  const [step, setStep] = useState('niche')      // niche | action | done
  const [niche, setNiche] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [modalClip, setModalClip] = useState(null)
  const [savedOwner, setSavedOwner] = useState('')
  const [kakaoDone, setKakaoDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { try { phCapture('onboarding_started') } catch { /* noop */ } }, [])
  // 팝업 차단을 피하려면 클릭 시점엔 SDK 가 이미 떠 있어야 한다
  useEffect(() => { if (step === 'done') preloadKakao() }, [step])

  const loadTrends = useCallback(async (canonical) => {
    setLoading(true); setErr('')
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      const r = await fetch(`${SB}/functions/v1/trend-feed`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${s?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const d = await r.json()
      const all = (Array.isArray(d.items) ? d.items : []).filter((it) => it && it.shortcode)
      const cat = catOfNiche(canonical)
      const mine = cat ? all.filter((it) => it.category === cat) : []
      const byViews = (a, b) => (Number(b.view_count) || 0) - (Number(a.view_count) || 0)
      // 그 니치가 부족하면 전체 상위로 채운다
      const rest = all.filter((it) => !mine.includes(it)).sort(byViews)
      const picked = [...mine.sort(byViews), ...rest].slice(0, PICK_COUNT)
      if (!picked.length) setErr('지금은 보여드릴 소재가 없어요.')
      setItems(picked)
    } catch {
      setErr('트렌드를 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }, [])

  const pickNiche = (label, canonical) => {
    setNiche(canonical)
    try { localStorage.setItem('chr_niche', canonical) } catch { /* noop */ }
    supabase.rpc('set_user_niche_rpc', { p_niche: canonical }).then(null, () => {})
    try { phCapture('niche_selected', { niche: canonical, chip: label }) } catch { /* noop */ }
    setStep('action')
    loadTrends(canonical)
  }

  // 완료 기록 — activation_at 스탬프 + 니치 저장을 한 번에.
  // (가입 쪽 complete_onboarding_rpc 는 여기서 쓰지 않는다)
  // 서버 기록이 실패해도 모달에 갇히지 않게 기기 단위 표시를 함께 남긴다.
  const complete = useCallback(async (action) => {
    try { phCapture('activation_action_completed', { action, niche }) } catch { /* noop */ }
    try { await supabase.rpc('complete_activation_rpc', { p_niche: niche || null }) } catch { /* noop */ }
    try { localStorage.setItem('chr_activation_done', '1') } catch { /* noop */ }
    setStep('done')
  }, [niche])

  const clipOf = (it) => ({
    title: it.caption, source: 'instagram', thumbnail_url: it.thumbnail_url, author: it.owner,
    views: it.view_count, likes: it.like_count, comments: it.comment_count,
    page_url: it.url, video_url: it.video_url, video_id: it.shortcode, taken_at: it.taken_at,
  })

  // 첫 분석은 무료 — 이용권을 차감하지 않고, 첫 분석 보너스만 소진 처리한다
  const analyze = (it) => {
    setModalClip(clipOf(it))
    supabase.rpc('grant_first_analysis_bonus_rpc').then(null, () => {})
  }

  // 여기선 '토글'이 아니라 항상 추가한다 — 이미 담긴 계정을 토글하면 오히려 빠진다.
  const save = async (it) => {
    if (busy) return
    setBusy(true)
    const name = String(it.owner || '').trim().toLowerCase().replace(/^@/, '')
    let ok = false
    try {
      const { data } = await supabase.rpc('watch_toggle_account_rpc', { p_username: name, p_add: true })
      ok = data?.ok !== false && ['added', 'exists'].includes(data?.status)
    } catch { /* noop */ }
    setBusy(false)
    // 담기에 실패해도(한도 초과 등) 활성화 자체는 끝난 걸로 본다 — 대신 담았다고 말하지 않는다
    setSavedOwner(ok ? it.owner : '')
    await complete(ok ? 'save' : 'save_failed')
  }

  const kakao = () => {
    const how = addKakaoChannel()
    setKakaoDone(true)
    try { phCapture('kakao_optin', { how }) } catch { /* noop */ }
    supabase.rpc('set_kakao_opt_in_rpc').then(null, () => {})   // 인자 없는 함수
  }

  const finish = () => { onDone?.() }
  // 나중에 하기: activation_at 을 찍지 않으므로 유예가 지나면 다시 뜬다
  const later = () => {
    try { phCapture('onboarding_deferred', { step }) } catch { /* noop */ }
    onDefer ? onDefer() : onDone?.()
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm sm:items-center">
      <div className="my-auto w-full max-w-lg rounded-3xl border border-white/10 p-6 shadow-2xl" style={{ background: '#14161c' }}>

        {step === 'niche' && (
          <>
            <p className="text-center text-xl font-bold text-white">무슨 상품 다루세요?</p>
            <p className="mt-1.5 text-center text-sm text-white/50">고른 분야의 ‘요즘 터지는 소재’부터 보여드릴게요</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {ONBOARDING_NICHES.map(([label, canonical]) => (
                <button key={label} onClick={() => pickNiche(label, canonical)}
                  className="rounded-full border border-white/12 bg-white/[0.06] px-5 py-2.5 text-sm font-bold text-white transition hover:border-[#0064FF] hover:bg-[#0064FF]/15 active:scale-95">
                  {label}
                </button>
              ))}
            </div>
            <button onClick={later} className="mt-5 w-full py-1 text-center text-xs font-medium text-white/35 hover:text-white/60">
              나중에 하기
            </button>
          </>
        )}

        {step === 'action' && (
          <>
            <p className="text-center text-lg font-bold text-white">요즘 터지는 소재예요</p>
            <p className="mt-1.5 text-center text-sm text-white/50">
              하나만 눌러보면 끝이에요 — <b className="text-white/80">분석</b>은 지금 무료고, <b className="text-white/80">저장</b>하면 새 소재를 계속 받아요
            </p>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-14 text-sm text-white/40">
                <Loader2 size={15} className="animate-spin" />소재를 고르는 중…
              </div>
            ) : err ? (
              <div className="py-10 text-center">
                <p className="text-sm text-white/60">{err}</p>
                <button onClick={later} className="mt-4 text-xs font-bold text-white/45 underline">
                  다음에 하기
                </button>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-3 gap-2.5">
                {items.map((it) => (
                  <div key={it.shortcode} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                    <div className="relative aspect-[9/16] bg-white/5">
                      <TrendThumb url={it.thumbnail_url} sc={it.shortcode} />
                    </div>
                    <div className="p-1.5">
                      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] text-white/45">
                        <span className="flex items-center gap-0.5"><Eye size={9} />{fmtCount(it.view_count)}</span>
                        <span className="flex items-center gap-0.5"><MessageCircle size={9} />{fmtCount(it.comment_count)}</span>
                      </div>
                      <button onClick={() => analyze(it)}
                        className="mb-1 flex w-full items-center justify-center gap-1 rounded-lg bg-[#0064FF] py-2 text-[11px] font-bold text-white transition hover:brightness-95">
                        <Sparkles size={11} />분석
                      </button>
                      <button onClick={() => save(it)} disabled={busy}
                        className="flex w-full items-center justify-center gap-1 rounded-lg border border-white/15 py-2 text-[11px] font-bold text-white/70 transition hover:border-[#0064FF] hover:text-white disabled:opacity-40">
                        <Bookmark size={11} />저장
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!loading && !err && (
              <button onClick={later} className="mt-4 w-full py-1 text-center text-xs font-medium text-white/35 hover:text-white/60">
                나중에 하기
              </button>
            )}
          </>
        )}

        {step === 'done' && (
          <>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#0064FF]/15 text-[#7FB2FF]">
              <PartyPopper size={22} />
            </div>
            <p className="text-center text-xl font-bold text-white">준비 끝났어요</p>
            <p className="mt-1.5 text-center text-sm leading-relaxed text-white/55">
              {savedOwner
                ? <>@{savedOwner} 를 워치리스트에 담았어요. 이 계정의 새 소재를 계속 받아볼 수 있어요.</>
                : <>고른 분야의 소재를 계속 모아드릴게요.</>}
            </p>

            <div className="mt-5 rounded-2xl border border-[#FEE500]/25 bg-[#FEE500]/[0.07] p-4 text-center">
              <p className="text-sm font-bold text-white">이런 소재 매주 카톡으로 받기</p>
              <p className="mt-1 text-xs text-white/50">채널을 추가하면 주 1회 터진 소재를 정리해서 보내드려요</p>
              <button onClick={kakao} disabled={kakaoDone}
                className="mt-3 w-full rounded-xl px-4 py-3 text-sm font-bold text-[#191600] transition active:scale-[0.98] disabled:opacity-60"
                style={{ background: '#FEE500' }}>
                {kakaoDone ? '채널 추가함 ✓' : '카카오 채널 추가'}
              </button>
            </div>

            <button onClick={finish}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/10 py-3 text-sm font-bold text-white transition hover:bg-white/15">
              <Check size={15} />시작하기
            </button>
          </>
        )}
      </div>

      {modalClip && (
        <AnalyzeModal
          clip={modalClip}
          onAnalyzed={() => { complete('analyze') }}
          onClose={() => setModalClip(null)}
        />
      )}
    </div>
  )
}

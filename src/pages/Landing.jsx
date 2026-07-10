import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AuthModal from '../components/AuthModal'

const BLUE = '#3182F6'
const CAP = 100

function Scarcity({ spots }) {
  if (spots == null) return null
  const pct = Math.min(100, Math.round((spots / CAP) * 100))
  return (
    <div className="mx-auto mt-4 max-w-xs">
      <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
        <span className="text-[#FF5A5F]">🔥 선착순 100명 무료</span>
        <span className="text-gray-500">현재 {spots}명 신청</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div className="h-full rounded-full transition-all" style={{ width: pct + '%', background: '#FF5A5F' }} />
      </div>
    </div>
  )
}

export default function Landing() {
  const [authOpen, setAuthOpen] = useState(false)
  const [code, setCode] = useState(null)
  const [session, setSession] = useState(null)
  const [demo, setDemo] = useState(null)
  const [spots, setSpots] = useState(null)

  useEffect(() => {
    try { window.gtag?.('event', 'landing_view', { page: 'start' }) } catch {}
    const p = new URLSearchParams(window.location.search)
    const c = p.get('code')
    if (c) { setCode(c.toUpperCase()); sessionStorage.setItem('chronit_code', c) }
    else { const st = sessionStorage.getItem('chronit_code'); if (st) setCode(st) }
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.from('demo_videos').select('url').order('sort_order').limit(1)
      .then(({ data }) => { if (data && data[0]) setDemo(data[0].url) })
    supabase.rpc('public_signup_count').then(({ data }) => { if (typeof data === 'number') setSpots(data) })
  }, [])

  const start = () => {
    try { window.gtag?.('event', 'cta_click', { page: 'start', logged_in: !!session }) } catch {}
    if (session) window.location.href = '/generate'; else setAuthOpen(true)
  }
  // ── 가입 전 체험(무료 미리보기) ──
  const [pvUrl, setPvUrl] = useState('')
  const [pvLoading, setPvLoading] = useState(false)
  const [pvResult, setPvResult] = useState(null)
  const [pvError, setPvError] = useState('')
  const getFp = () => {
    try { let f = localStorage.getItem('chronit_fp'); if (!f) { f = 'fp_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('chronit_fp', f) } return f } catch { return 'anon' }
  }
  const runPreview = async () => {
    const u = pvUrl.trim()
    if (!u || pvLoading) return
    setPvError(''); setPvResult(null); setPvLoading(true)
    try { window.gtag?.('event', 'preview_start', { page: 'start' }) } catch {}
    try {
      const r = await fetch('https://oxygqtbdpnxxcgzwdlzi.supabase.co/functions/v1/preview-link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_url: u, fp: getFp() }),
      })
      const d = await r.json()
      if (d.ok) { setPvResult(d); try { window.gtag?.('event', 'preview_done', { page: 'start', product: !!d.product_name }) } catch {} }
      else { setPvError(d.error || '미리보기에 실패했어요'); try { window.gtag?.('event', 'preview_fail', { page: 'start', reason: d.limited ? 'limit' : 'err' }) } catch {} }
    } catch { setPvError('네트워크 오류 — 잠시 후 다시 시도해주세요') }
    setPvLoading(false)
  }
  const startFromPreview = () => {
    try { window.gtag?.('event', 'cta_click', { page: 'start', from: 'preview' }) } catch {}
    if (session) window.location.href = '/generate'; else setAuthOpen(true)
  }
  const pct = spots == null ? 0 : Math.min(100, Math.round((spots / CAP) * 100))

  return (
    <div className="min-h-screen bg-white text-[#191F28]">
      <style>{`
        @keyframes lpFill { from { width: 0% } to { width: 100% } }
        @keyframes lpFade { 0%,72% { opacity: 1 } 100% { opacity: 0; visibility: hidden } }
        .lp-overlay { animation: lpFade 3.2s ease forwards }
        .lp-bar { animation: lpFill 3s ease forwards }
      `}</style>

      {/* ── 상단 고정 선착순 바 ── */}
      <div className="sticky top-0 z-50 bg-[#FF5A5F] px-4 py-3 shadow-md">
        <div className="mx-auto flex max-w-md items-center gap-3 text-white">
          <span className="shrink-0 text-sm font-black">🔥 선착순 100명 무료</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/30">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: pct + '%' }} />
          </div>
          <span className="shrink-0 text-sm font-black">{spots == null ? '–' : spots}/100</span>
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="mx-auto max-w-md px-5 pt-12 pb-8 text-center">
        <p className="text-sm font-bold tracking-wide" style={{ color: BLUE }}>이미 영상으로 매출 내는 셀러를 위한</p>
        <h1 className="mt-3 text-[2.05rem] font-black leading-tight">
          잘 만든 1개보다,<br/>꾸준히 올린 30개
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
          터질 영상 골라 링크만 넣으면 <b className="text-[#191F28]">5분</b>에 한 편.<br/>
          외주·편집 없이, 매일 꾸준히 올리세요.
        </p>

        {/* 폰 + 로딩바 → 데모 영상 */}
        <div className="relative mx-auto mt-7 w-[260px]">
          <div className="overflow-hidden rounded-[2rem] border-[6px] border-[#191F28] bg-black shadow-2xl">
            {demo
              ? <video src={demo} autoPlay loop muted playsInline className="block h-[462px] w-full object-cover" />
              : <div className="h-[462px] w-full bg-gray-100" />}
            <div className="lp-overlay absolute inset-[6px] flex flex-col items-center justify-center rounded-[1.6rem] bg-white">
              <p className="mb-3 text-sm font-bold text-gray-700">AI가 영상 만드는 중…</p>
              <div className="h-2 w-40 overflow-hidden rounded-full bg-gray-200">
                <div className="lp-bar h-full rounded-full" style={{ background: BLUE }} />
              </div>
              <p className="mt-3 text-xs text-gray-400">링크 → 완성 영상</p>
            </div>
          </div>
        </div>

        {/* 🎁 가입 전 체험 — 내 상품으로 무료 미리보기 */}
        <div className="mt-7 rounded-2xl border border-[#0064FF]/25 bg-[#F7FAFF] p-4 text-left">
          <p className="text-sm font-black text-[#191F28]">🎁 내 상품으로 무료 미리보기</p>
          <p className="mt-0.5 text-xs text-gray-500">인스타·틱톡·유튜브 영상 링크만 넣으면 — 가입 없이 결과 확인</p>
          <div className="mt-2.5 flex gap-2">
            <input value={pvUrl} onChange={e => setPvUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && runPreview()}
              placeholder="영상 링크 붙여넣기" disabled={pvLoading}
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0064FF]" />
            <button onClick={runPreview} disabled={pvLoading || !pvUrl.trim()}
              className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-black text-white transition active:scale-95 disabled:opacity-40" style={{ background: BLUE }}>
              {pvLoading ? '분석 중…' : '미리보기'}
            </button>
          </div>
          {pvLoading && <p className="mt-2 text-xs text-gray-400">AI가 영상을 분석하고 있어요 · 약 1분</p>}
          {pvError && <p className="mt-2 text-xs text-red-500">{pvError}</p>}
        </div>

        {/* 분석 결과 카드 */}
        {pvResult && (
          <div className="mt-4 rounded-2xl border border-[#0064FF]/25 bg-white p-4 text-left shadow-sm">
            <div className="flex items-center gap-2.5">
              {pvResult.frames && pvResult.frames[0] && (
                <img src={pvResult.frames[0]} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              )}
              <p className="text-sm font-black text-[#0064FF]">✅ AI가 영상을 분석했어요</p>
            </div>
            <div className="mt-3 space-y-3">
              {pvResult.product_name && (
                <div>
                  <span className="text-xs text-gray-400">감지된 상품</span>
                  <p className="text-[15px] font-black text-[#191F28] [word-break:keep-all]">{pvResult.product_name}</p>
                </div>
              )}
              {pvResult.use_case && (
                <div>
                  <span className="text-xs text-gray-400">쓰임새</span>
                  <p className="text-sm text-gray-700 [word-break:keep-all]">{pvResult.use_case}</p>
                </div>
              )}
              {pvResult.keywords && pvResult.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pvResult.keywords.slice(0, 5).map((k, i) => (
                    <span key={i} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">{k}</span>
                  ))}
                </div>
              )}
              {pvResult.hook_title && (
                <div className="rounded-xl bg-[#F7FAFF] p-3">
                  <span className="text-xs font-bold text-[#0064FF]">✍️ 이 제목(캡션)으로 만들 거예요</span>
                  <p className="mt-1 text-[15px] font-black text-[#191F28] [word-break:keep-all]">{pvResult.hook_title}</p>
                </div>
              )}
            </div>
            <button onClick={startFromPreview}
              className="mt-4 w-full rounded-2xl py-3.5 text-base font-black text-white shadow-lg transition active:scale-[0.98]" style={{ background: BLUE }}>
              👉 이대로 완성 영상 만들기
            </button>
            <p className="mt-1.5 text-center text-xs text-gray-400">가입하면 컷편집·줄자막·AI 더빙까지 1분 · 카드 없이 7일 무료</p>
          </div>
        )}

        <button onClick={start}
          className="mt-4 w-full rounded-2xl py-4 text-base font-black text-white shadow-lg transition active:scale-[0.98]"
          style={{ background: BLUE }}>
          카카오로 시작 · 프로 7일 무료
        </button>
        <p className="mt-2 text-xs text-gray-400">카드 등록 없이 바로 시작</p>
        <Scarcity spots={spots} />
      </section>

      {/* ── 공감(은근한 압박) ── */}
      <section className="bg-[#F7FAFF] px-5 py-12">
        <div className="mx-auto max-w-md">
          <h2 className="text-center text-xl font-black">찍고 싶은 만큼, 왜 못 올릴까요?</h2>
          <div className="mt-6 space-y-3">
            {[
              ['⏱', '소싱→다운로드→캡컷 재가공→업로드', '한 편에 매일 2~3시간'],
              ['🧱', '계정 늘리면 수익도 느는 걸 아는데', '몸이 하나라 스케일업이 막혀요'],
              ['🥱', '퇴근하고 또 밤샘 편집', '체력이 먼저 바닥나죠'],
            ].map(([e, t, s]) => (
              <div key={t} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
                <span className="text-2xl">{e}</span>
                <div className="text-left">
                  <p className="text-[15px] font-bold">{t}</p>
                  <p className="text-sm text-gray-500">{s}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-[15px] font-bold text-gray-700">
            병목은 아이디어가 아니라 <span style={{ color: BLUE }}>재가공 속도</span>예요.
          </p>
        </div>
      </section>

      {/* ── 작동 방식 ── */}
      <section className="px-5 py-12">
        <div className="mx-auto max-w-md">
          <h2 className="text-center text-xl font-black">당신은 고르기만 하면 돼요</h2>
          <div className="mt-7 space-y-5">
            {[
              ['1', '터지는 영상 소싱', '직촬·릴스·틱톡·쇼츠 링크 아무거나'],
              ['2', '자막·더빙·재가공 자동', '5분이면 한 편 완성'],
              ['3', '다운로드 후 업로드', '그 시간에 다음 걸 소싱하세요'],
            ].map(([n, t, s]) => (
              <div key={n} className="flex items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white" style={{ background: BLUE }}>{n}</span>
                <div className="text-left">
                  <p className="text-[16px] font-bold">{t}</p>
                  <p className="text-sm text-gray-500">{s}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 혜택 ── */}
      <section className="bg-[#191F28] px-5 py-12 text-white">
        <div className="mx-auto max-w-md">
          <h2 className="text-center text-xl font-black">이렇게 바뀌어요</h2>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              ['2~3시간 → 5분', '재가공 시간'],
              ['하루 10개+', '대량 양산'],
              ['계정 N개', '동시 운영'],
              ['소싱에 집중', '남는 시간'],
            ].map(([big, sm]) => (
              <div key={sm} className="rounded-2xl bg-white/5 p-5 text-center">
                <p className="text-lg font-black" style={{ color: '#7DB0FF' }}>{big}</p>
                <p className="mt-1 text-xs text-gray-400">{sm}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 오퍼 ── */}
      <section className="px-5 py-14 text-center">
        <div className="mx-auto max-w-md">
          <h2 className="text-2xl font-black leading-snug">고수는 데모로<br/>판단하죠</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-gray-500">
            프로 기능 7일 무료 — <b className="text-[#191F28]">카드 없이</b>.<br/>
            캡컷·Vrew 써본 눈으로 자막싱크·더빙 퀄을 직접 확인하세요.<br/>
            첫 결제 땐 <b className="text-[#191F28]">1개월 + 1개월</b>. 자동결제 없어요.
          </p>
          <button onClick={start}
            className="mt-7 w-full rounded-2xl py-4 text-base font-black text-white shadow-lg transition active:scale-[0.98]"
            style={{ background: BLUE }}>
            카카오로 시작 · 프로 7일 무료
          </button>
          <p className="mt-2 text-xs text-gray-400">3초면 시작돼요</p>
          <Scarcity spots={spots} />
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-[#F7FAFF] px-5 py-12">
        <div className="mx-auto max-w-md space-y-4">
          {[
            ['퀄리티가 캡컷만큼 나오나요?', '자막싱크·AI 더빙·썸네일까지 7일 직접 돌려보고 판단하세요. 데모로 먼저 확인할 수 있어요.'],
            ['하루에 몇 개까지 되나요?', '플랜 한도 안에서 계속 뽑아낼 수 있어요. 대량 양산을 전제로 설계됐어요.'],
            ['무료 7일 끝나면요?', '자동결제 없어요. 마음에 들 때 결제하면 됩니다.'],
          ].map(([q, a]) => (
            <div key={q} className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-[15px] font-bold">Q. {q}</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 푸터 CTA ── */}
      <section className="px-5 py-12 text-center">
        <p className="text-lg font-black">소싱할 시간, 지금 벌어두세요</p>
        <button onClick={start}
          className="mx-auto mt-5 block w-full max-w-md rounded-2xl py-4 text-base font-black text-white shadow-lg transition active:scale-[0.98]"
          style={{ background: BLUE }}>
          카카오로 시작 · 프로 7일 무료
        </button>
        <p className="mt-6 text-xs text-gray-400">* 수익은 상품·콘텐츠·꾸준함에 따라 달라질 수 있어요.</p>
        <p className="mt-1 text-xs text-gray-400">© Chronit · chronit.kr</p>
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} referralCode={code} />
    </div>
  )
}

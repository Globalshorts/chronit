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
  const [spots, setSpots] = useState(null)

  useEffect(() => {
    try { window.gtag?.('event', 'landing_view', { page: 'start' }) } catch {}
    const p = new URLSearchParams(window.location.search)
    const c = p.get('code')
    if (c) { setCode(c.toUpperCase()); sessionStorage.setItem('chronit_code', c) }
    else { const st = sessionStorage.getItem('chronit_code'); if (st) setCode(st) }
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
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

        {/* 실제 앱 데모 GIF (파일 업로드되면 자동 노출, 없으면 숨김) */}
        <div className="relative left-1/2 mt-7 w-[92vw] max-w-2xl -translate-x-1/2">
          <img
            src="/app-demo.gif"
            alt="크로닛 사용 화면 — 링크 넣으면 숏폼 완성"
            loading="lazy"
            onError={e => { e.currentTarget.style.display = 'none' }}
            className="w-full rounded-2xl border border-gray-200 shadow-lg"
          />
        </div>


        <div className="mt-7 rounded-2xl border border-[#0064FF]/25 bg-[#F7FAFF] px-4 py-3">
          <p className="text-[15px] font-black text-[#191F28]">🎁 로그인만 하면 <span style={{ color: BLUE }}>무료 영상 2개</span></p>
          <p className="mt-0.5 text-xs text-gray-500">카드 없이 · 카카오 3초 · 바로 만들기</p>
        </div>

        <button onClick={start}
          className="mt-4 w-full rounded-2xl py-4 text-base font-black text-white shadow-lg transition active:scale-[0.98]"
          style={{ background: BLUE }}>
          카카오로 무료 시작
        </button>
        <p className="mt-2 text-xs text-gray-400">카드 등록 없이 바로 시작</p>
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
            <b className="text-[#191F28]">무료로 바로</b> 시작 — 카드 없이.<br/>
            캡컷·Vrew 써본 눈으로 자막싱크·더빙 퀄을 직접 확인하세요.<br/>
            더 만들려면 <b className="text-[#191F28]">친구 초대(무료)</b> 또는 결제. 자동결제 없어요.
          </p>
          <button onClick={start}
            className="mt-7 w-full rounded-2xl py-4 text-base font-black text-white shadow-lg transition active:scale-[0.98]"
            style={{ background: BLUE }}>
            카카오로 무료 시작
          </button>
          <p className="mt-2 text-xs text-gray-400">3초면 시작돼요</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-[#F7FAFF] px-5 py-12">
        <div className="mx-auto max-w-md space-y-4">
          {[
            ['퀄리티가 캡컷만큼 나오나요?', '무료 2개로 직접 만들어 자막싱크·AI 더빙·썸네일 퀄을 판단하세요.'],
            ['하루에 몇 개까지 되나요?', '무료는 매달 2개, Pro는 월 30개까지 뽑아낼 수 있어요. 대량 양산을 전제로 설계됐어요.'],
            ['더 만들고 싶으면요?', '친구를 초대하면 Pro가 열리고, 결제하면 월 30개까지 만들 수 있어요. 자동결제는 없어요.'],
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
          카카오로 무료 시작
        </button>
        <p className="mt-6 text-xs text-gray-400">* 수익은 상품·콘텐츠·꾸준함에 따라 달라질 수 있어요.</p>
        <p className="mt-1 text-xs text-gray-400">© Chronit · chronit.kr</p>
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} referralCode={code} />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AuthModal from '../components/AuthModal'

const BLUE = '#3182F6'

export default function Landing() {
  const [authOpen, setAuthOpen] = useState(false)
  const [code, setCode] = useState(null)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const c = p.get('code')
    if (c) { setCode(c.toUpperCase()); sessionStorage.setItem('chronit_code', c) }
    else { const st = sessionStorage.getItem('chronit_code'); if (st) setCode(st) }
    // 이미 로그인돼 있으면 바로 앱으로
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = '/generate'
    })
  }, [])

  const start = () => setAuthOpen(true)

  return (
    <div className="min-h-screen bg-white text-[#191F28]">
      <style>{`
        @keyframes lpFill { from { width: 0% } to { width: 100% } }
        @keyframes lpFade { 0%,70% { opacity: 1 } 100% { opacity: 0; visibility: hidden } }
        .lp-overlay { animation: lpFade 3.2s ease forwards }
        .lp-bar { animation: lpFill 3s ease forwards }
      `}</style>

      {/* ── HERO ── */}
      <section className="mx-auto max-w-md px-5 pt-10 pb-8 text-center">
        <p className="text-sm font-bold tracking-wide" style={{ color: BLUE }}>쇼핑 릴스 자동화</p>
        <h1 className="mt-3 text-[2rem] font-black leading-tight">
          릴스 편집에 쓰는 시간,<br/>지금도 새고 있어요
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
          상품 링크 하나만 넣으면 자막·더빙·썸네일까지<br/>
          AI가 <b className="text-[#191F28]">5분 만에</b> 새 영상으로. 편집 실력도, 외주비도 0.
        </p>

        {/* 폰 목업 + 로딩바 → 데모 영상 */}
        <div className="relative mx-auto mt-7 w-[260px]">
          <div className="overflow-hidden rounded-[2rem] border-[6px] border-[#191F28] bg-black shadow-2xl">
            <video src="/demo.mp4" autoPlay loop muted playsInline className="block h-[462px] w-full object-cover" />
            <div className="lp-overlay absolute inset-[6px] flex flex-col items-center justify-center rounded-[1.6rem] bg-white">
              <p className="mb-3 text-sm font-bold text-gray-700">AI가 영상 만드는 중…</p>
              <div className="h-2 w-40 overflow-hidden rounded-full bg-gray-200">
                <div className="lp-bar h-full rounded-full" style={{ background: BLUE }} />
              </div>
              <p className="mt-3 text-xs text-gray-400">상품 링크 → 완성 영상</p>
            </div>
          </div>
        </div>

        <button onClick={start}
          className="mt-7 w-full rounded-2xl py-4 text-base font-black text-white shadow-lg transition active:scale-[0.98]"
          style={{ background: BLUE }}>
          카카오로 3초 시작 · 프로 7일 무료
        </button>
        <p className="mt-2 text-xs text-gray-400">카드 등록 없음 · 선착순 무료 (마감되면 사라져요)</p>
      </section>

      {/* ── 지금도 새고 있는 손실 ── */}
      <section className="bg-[#F7FAFF] px-5 py-12">
        <div className="mx-auto max-w-md">
          <h2 className="text-center text-xl font-black">지금 이 순간에도 새고 있는 것</h2>
          <div className="mt-6 space-y-3">
            {[
              ['⏳', '편집 2시간 × 매일', '한 달 60시간이 증발해요'],
              ['💸', '외주 1편 5만원 × 30편', '월 150만원이 빠져나가요'],
              ['📉', '경쟁 셀러는 매일 올리는데', '멈춘 하루 = 놓친 노출·매출'],
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
          <p className="mt-6 text-center text-[15px] font-bold">
            영상 하나 못 올린 하루 = <span style={{ color: BLUE }}>놓친 클릭, 놓친 수익.</span>
          </p>
        </div>
      </section>

      {/* ── 작동 방식 ── */}
      <section className="px-5 py-12">
        <div className="mx-auto max-w-md">
          <h2 className="text-center text-xl font-black">링크 하나면, 끝</h2>
          <div className="mt-7 space-y-5">
            {[
              ['1', '상품 링크 붙여넣기', '쿠팡·스마트스토어·릴스 링크 아무거나'],
              ['2', 'AI가 5분 만에 재창작', '자막·더빙·썸네일 전부 자동'],
              ['3', '완성 영상 다운로드', '바로 업로드 → 노출 시작'],
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
          <h2 className="text-center text-xl font-black">바뀌는 것</h2>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              ['2시간 → 5분', '편집 시간'],
              ['0원', '외주비'],
              ['매일 10개', '양산 가능'],
              ['1도 몰라도', '편집 실력'],
            ].map(([big, sm]) => (
              <div key={sm} className="rounded-2xl bg-white/5 p-5 text-center">
                <p className="text-lg font-black" style={{ color: '#7DB0FF' }}>{big}</p>
                <p className="mt-1 text-xs text-gray-400">{sm}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 오퍼 + 긴급성 ── */}
      <section className="px-5 py-14 text-center">
        <div className="mx-auto max-w-md">
          <h2 className="text-2xl font-black leading-snug">
            안 써보면<br/><span style={{ color: BLUE }}>당신만 손해예요</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-gray-500">
            <b className="text-[#191F28]">프로 7일 무료</b> — 카드 없이 지금 바로.<br/>
            첫 결제 시 <b className="text-[#191F28]">1개월 + 1개월</b>까지.<br/>
            선착순이라 마감되면 다음엔 유료예요.
          </p>
          <button onClick={start}
            className="mt-7 w-full rounded-2xl py-4 text-base font-black text-white shadow-lg transition active:scale-[0.98]"
            style={{ background: BLUE }}>
            지금 무료로 시작 — 경쟁자보다 먼저
          </button>
          <p className="mt-2 text-xs text-gray-400">카카오 3초 가입 · 카드 등록 없음</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-[#F7FAFF] px-5 py-12">
        <div className="mx-auto max-w-md space-y-4">
          {[
            ['편집을 1도 못 하는데요?', '괜찮아요. 링크만 넣으면 AI가 다 해요. 클릭 몇 번이면 끝.'],
            ['무료 7일 끝나면요?', '자동 결제 안 돼요. 마음에 들면 그때 결제하면 됩니다.'],
            ['어떤 상품이 되나요?', '쿠팡·스마트스토어 등 쇼핑 상품 링크면 다 가능해요.'],
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
        <p className="text-lg font-black">릴스 편집, 오늘이 마지막이에요</p>
        <button onClick={start}
          className="mx-auto mt-5 block w-full max-w-md rounded-2xl py-4 text-base font-black text-white shadow-lg transition active:scale-[0.98]"
          style={{ background: BLUE }}>
          카카오로 3초 시작 · 프로 7일 무료
        </button>
        <p className="mt-6 text-xs text-gray-400">© Chronit · chronit.kr</p>
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} referralCode={code} />
    </div>
  )
}

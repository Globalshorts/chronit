import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AuthModal from '../components/AuthModal'

const BLUE = '#3182F6'

export default function Landing() {
  const [authOpen, setAuthOpen] = useState(false)
  const [code, setCode] = useState(null)
  const [session, setSession] = useState(null)
  const [demo, setDemo] = useState(null)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const c = p.get('code')
    if (c) { setCode(c.toUpperCase()); sessionStorage.setItem('chronit_code', c) }
    else { const st = sessionStorage.getItem('chronit_code'); if (st) setCode(st) }
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.from('demo_videos').select('url').order('sort_order').limit(1)
      .then(({ data }) => { if (data && data[0]) setDemo(data[0].url) })
  }, [])

  const start = () => { if (session) window.location.href = '/generate'; else setAuthOpen(true) }

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
        <p className="text-sm font-bold tracking-wide" style={{ color: BLUE }}>쇼핑 릴스 자동화</p>
        <h1 className="mt-3 text-[2.05rem] font-black leading-tight">
          링크만 넣으면,<br/>릴스가 완성돼요
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
          직접 찍은 영상이나 릴스·틱톡·쇼츠 링크 하나면 충분해요.<br/>
          자막·더빙·썸네일까지 AI가 <b className="text-[#191F28]">5분 만에</b>.
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

        <button onClick={start}
          className="mt-7 w-full rounded-2xl py-4 text-base font-black text-white shadow-lg transition active:scale-[0.98]"
          style={{ background: BLUE }}>
          카카오로 시작 · 프로 7일 무료
        </button>
        <p className="mt-2 text-xs text-gray-400">카드 등록 없이 바로 시작</p>
      </section>

      {/* ── 공감(은근한 압박) ── */}
      <section className="bg-[#F7FAFF] px-5 py-12">
        <div className="mx-auto max-w-md">
          <h2 className="text-center text-xl font-black">이런 고민, 있으셨죠?</h2>
          <div className="mt-6 space-y-3">
            {[
              ['⏱', '편집 한 편에 두세 시간', '하루가 그냥 사라져요'],
              ['💸', '외주는 건당 비용이 부담', '꾸준히 맡기긴 어렵죠'],
              ['📈', '고민하는 사이', '경쟁 셀러는 매일 올려요'],
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
            콘텐츠는 결국 <span style={{ color: BLUE }}>꾸준히 올린 사람</span>이 가져가요.
          </p>
        </div>
      </section>

      {/* ── 작동 방식 ── */}
      <section className="px-5 py-12">
        <div className="mx-auto max-w-md">
          <h2 className="text-center text-xl font-black">링크 하나면, 끝</h2>
          <div className="mt-7 space-y-5">
            {[
              ['1', '영상이나 링크 넣기', '직촬 영상·릴스·틱톡·쇼츠 링크 아무거나'],
              ['2', 'AI가 5분 만에 재창작', '자막·더빙·썸네일 전부 자동'],
              ['3', '다운로드 후 업로드', '바로 노출 시작'],
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
              ['2시간 → 5분', '편집 시간'],
              ['0원', '외주비'],
              ['매일 여러 편', '양산 가능'],
              ['몰라도 OK', '편집 실력'],
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
          <h2 className="text-2xl font-black leading-snug">일단, 7일 무료로<br/>써보세요</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-gray-500">
            프로 기능 7일 — <b className="text-[#191F28]">카드 등록 없이</b>.<br/>
            마음에 안 들면 그냥 안 쓰면 돼요. 자동결제 없어요.<br/>
            첫 결제 땐 <b className="text-[#191F28]">1개월 + 1개월</b>까지.
          </p>
          <button onClick={start}
            className="mt-7 w-full rounded-2xl py-4 text-base font-black text-white shadow-lg transition active:scale-[0.98]"
            style={{ background: BLUE }}>
            카카오로 시작 · 프로 7일 무료
          </button>
          <p className="mt-2 text-xs text-gray-400">3초면 시작돼요</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-[#F7FAFF] px-5 py-12">
        <div className="mx-auto max-w-md space-y-4">
          {[
            ['편집을 못 하는데 괜찮나요?', '네. 영상이나 링크만 넣으면 AI가 다 해요. 클릭 몇 번이면 끝나요.'],
            ['무료 7일 끝나면요?', '자동으로 결제되지 않아요. 마음에 들 때 결제하면 됩니다.'],
            ['어떤 영상이 되나요?', '직접 찍은 영상이나 릴스·틱톡·쇼츠 링크면 다 가능해요.'],
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
        <p className="text-lg font-black">오늘 한 편, 5분이면 돼요</p>
        <button onClick={start}
          className="mx-auto mt-5 block w-full max-w-md rounded-2xl py-4 text-base font-black text-white shadow-lg transition active:scale-[0.98]"
          style={{ background: BLUE }}>
          카카오로 시작 · 프로 7일 무료
        </button>
        <p className="mt-6 text-xs text-gray-400">© Chronit · chronit.kr</p>
      </section>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} referralCode={code} />
    </div>
  )
}

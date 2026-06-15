import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// 정식 오픈 예정일 — PG 심사 확정되면 이 값만 바꾸면 돼요
const LAUNCH = new Date('2026-07-01T00:00:00+09:00')
const LAUNCH_LABEL = '2026.07.01 (수) 00:00 KST'
const BASE = 99 // 표시 시작 인원 (다음 신청자가 100번째)
const KAKAO_JS_KEY = import.meta.env?.VITE_KAKAO_JS_KEY || '84ee352af8ddaf49632d40de964fa9f4'
const CHANNEL_ID = '_DcNnX'
const SHARE_URL = 'https://chronit.kr/reserve'
const SHARE_IMG = 'https://chronit.kr/reserve_card_v2.png'

const MILESTONES = [
  { n: 100,  tag: '선착순',   label: '첫 100명',     reward: '프로 7일 무료',  sub: '런칭일 코드 자동 발송' },
  { n: 250,  tag: '마일스톤', label: '누적 250명',   reward: '1,000 크레딧',   sub: '예약 전원 소급 지급' },
  { n: 500,  tag: '마일스톤', label: '누적 500명',   reward: '2,000 크레딧',   sub: '예약 전원 소급 지급' },
  { n: 1000, tag: '마일스톤', label: '누적 1,000명', reward: '프로 30일 무료', sub: '예약 전원 소급 지급' },
]

function ensureKakao() {
  return new Promise((resolve, reject) => {
    const w = window
    const init = () => { try { if (w.Kakao && !w.Kakao.isInitialized()) w.Kakao.init(KAKAO_JS_KEY); resolve(w.Kakao) } catch (e) { reject(e) } }
    if (w.Kakao?.isInitialized?.()) return resolve(w.Kakao)
    if (w.Kakao) return init()
    const ex = document.getElementById('kakao-sdk')
    if (ex) { ex.addEventListener('load', init); ex.addEventListener('error', () => reject(new Error('kakao'))); return }
    const sc = document.createElement('script')
    sc.id = 'kakao-sdk'; sc.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js'; sc.async = true
    sc.onload = init; sc.onerror = () => reject(new Error('kakao load fail'))
    document.head.appendChild(sc)
  })
}
async function addKakaoChannel() {
  try { const K = await ensureKakao(); K.Channel.addChannel({ channelPublicId: CHANNEL_ID }) }
  catch { window.open('https://pf.kakao.com/' + CHANNEL_ID, '_blank') }
}

function useCountdown(target) {
  const calc = () => Math.max(0, target - new Date())
  const [ms, setMs] = useState(calc)
  useEffect(() => { const t = setInterval(() => setMs(calc()), 1000); return () => clearInterval(t) }, [])
  const s = Math.floor(ms / 1000)
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

function Box({ n, label }) {
  return (
    <div className="flex-1 rounded-2xl bg-white/10 py-3">
      <div className="text-3xl font-black tabular-nums">{String(n).padStart(2, '0')}</div>
      <div className="mt-1 text-[11px] font-bold tracking-widest text-white/40">{label}</div>
    </div>
  )
}

export default function Reserve() {
  // const { d, h, m, s } = useCountdown(LAUNCH) // 날짜 확정 시 카운트다운 복구용
  const [count, setCount] = useState(null)
  const [email, setEmail] = useState('')
  const [agree, setAgree] = useState(false)
  const [mkt, setMkt] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)

  const loadCount = async () => {
    const { data } = await supabase.rpc('waitlist_count_rpc')
    if (typeof data === 'number') setCount(data)
  }
  useEffect(() => { loadCount() }, [])

  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) && agree
  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  const submit = async () => {
    if (!valid || loading) return
    setLoading(true); setErr('')
    try {
      const { data, error } = await supabase.rpc('reserve_waitlist_rpc', {
        p_email: email.trim(), p_phone: null, p_source: 'reserve', p_marketing: mkt,
      })
      if (error || !data?.ok) { setErr(data?.error || '잠시 후 다시 시도해 주세요.'); setLoading(false); return }
      setDone(true); loadCount()
    } catch { setErr('잠시 후 다시 시도해 주세요.'); setLoading(false) }
  }

  const share = async () => {
    try {
      const K = await ensureKakao()
      K.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: '크로닛 사전예약 — 7월 오픈',
          description: '편집 1도 못 해도 링크만 넣으면 쇼핑 숏폼 자동완성! 사전예약하면 프로 무료 혜택, 함께할수록 다 같이 더 받아요.',
          imageUrl: SHARE_IMG,
          link: { mobileWebUrl: SHARE_URL, webUrl: SHARE_URL },
        },
        buttons: [{ title: '사전예약하기', link: { mobileWebUrl: SHARE_URL, webUrl: SHARE_URL } }],
      })
      return
    } catch {}
    try { await navigator.clipboard.writeText(SHARE_URL); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  const shown = count != null ? BASE + count : null
  const aIdx = shown != null ? MILESTONES.findIndex(mm => shown < mm.n) : 0
  const activeIdx = aIdx === -1 ? MILESTONES.length - 1 : aIdx
  const prevN = activeIdx > 0 ? MILESTONES[activeIdx - 1].n : 0
  const nextN = MILESTONES[activeIdx].n
  const segPct = shown != null ? Math.min(100, Math.round(((shown - prevN) / (nextN - prevN)) * 100)) : 0
  const remain = shown != null ? Math.max(0, nextN - shown) : null

  return (
    <div className="min-h-screen bg-[#0f3628] text-white">
      {/* 상단 바 */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0f3628]/85 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/favicon-192.png" alt="Chronit" className="h-7 w-7 rounded-lg bg-white p-0.5" />
            <span className="font-black tracking-tight">Chronit</span>
          </Link>
          <button onClick={() => scrollTo('form')} className="rounded-full bg-[#03C75A] px-4 py-1.5 text-sm font-bold">사전예약</button>
        </div>
      </div>

      <div className="mx-auto max-w-md px-6 pb-20">
        {/* 히어로 */}
        <div className="pt-8 text-center">
          <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-[#34E08C]">Pre-Registration · 사전예약</span>
          <h1 className="mt-5 text-[34px] font-black leading-tight">
            <span className="text-[#34E08C]">7월, 크로닛</span>이<br />문을 열어요
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            지금 사전예약하고 <b className="text-white">런칭일 혜택</b>을 그대로 받으세요
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#34E08C]/40 bg-[#34E08C]/10 px-4 py-2 text-sm font-bold text-[#34E08C]">
            🗓️ 6월 오픈 예정 · 사전예약자분께 가장 먼저 알려드려요
          </div>

          <button onClick={() => scrollTo('form')}
            className="mt-7 w-full rounded-xl bg-[#03C75A] py-4 text-lg font-black transition hover:bg-[#02b350]">
            지금 사전예약 신청 →
          </button>
          <button onClick={addKakaoChannel}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3.5 text-base font-bold text-[#3C1E1E] transition hover:brightness-95">
            💬 카카오 채널 추가하고 알림받기
          </button>

          {/* 실시간 인원 */}
          <div className="mt-8">
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-[#34E08C]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#34E08C]" />LIVE
              </span>
              <span><b className="text-xl font-black">{shown != null ? shown.toLocaleString() : '—'}</b>명이 함께 기다리는 중</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#03C75A] transition-all duration-700" style={{ width: segPct + '%' }} />
            </div>
            {remain != null && remain > 0 && (
              <p className="mt-2 text-xs text-white/50">
                다음 목표 <b className="text-white/80">{nextN.toLocaleString()}명</b>까지 {remain.toLocaleString()}명 — 달성 시 <b className="text-[#34E08C]">{MILESTONES[activeIdx].reward}</b>
              </p>
            )}
          </div>
        </div>

        {/* 크로닛이 뭐예요 */}
        <section className="mt-16">
          <p className="text-center text-xs font-black tracking-widest text-[#34E08C]">WHAT IS CHRONIT</p>
          <h2 className="mt-1 text-center text-xl font-black">크로닛이 뭐예요?</h2>
          <p className="mt-2 text-center text-sm leading-relaxed text-white/70">
            쿠팡파트너스 같은 부업엔 상품 소개 <b className="text-white">영상</b>이 필요해요.
            크로닛은 그 영상을 <b className="text-white">대신 만들어주는</b> 도구예요. 설치도, 편집 지식도 필요 없어요.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Feat emoji="💬" t="자동 자막" />
            <Feat emoji="🎙️" t="AI 목소리" />
            <Feat emoji="🖼️" t="썸네일 제작" />
            <Feat emoji="✍️" t="제목·설명 추천" />
          </div>
          <p className="mt-4 text-center text-xs leading-relaxed text-white/45">
            영상 1편에 반나절 걸리던 일이 5분으로 줄어요. 좋은 상품을 소개하고 <b className="text-white/70">추가 수익</b>에 도전해보세요.
          </p>
        </section>

        {/* 사전예약 혜택 티어 */}
        <section className="mt-16">
          <p className="text-center text-xs font-black tracking-widest text-[#34E08C]">BENEFITS</p>
          <h2 className="mt-1 text-center text-xl font-black">사전예약 혜택 티어</h2>
          <p className="mt-2 text-center text-sm leading-relaxed text-white/60">
            예약자가 많아질수록 혜택도 커져요.<br /><b className="text-white/80">목표 달성 시 먼저 예약한 분도 전원 소급 지급.</b>
          </p>
          <div className="mt-6 space-y-3">
            {MILESTONES.map((mm, i) => {
              const active = i === activeIdx
              const reached = shown != null && shown >= mm.n
              return (
                <div key={mm.n}
                  className={'rounded-2xl border p-4 ' + (active ? 'border-[#34E08C] bg-[#34E08C]/10' : 'border-white/15 bg-white/5')}>
                  <div className="flex items-center justify-between">
                    <span className={'rounded-full px-2.5 py-0.5 text-[11px] font-bold ' + (active ? 'bg-[#03C75A] text-white' : 'bg-white/10 text-white/60')}>{mm.tag}</span>
                    {active && <span className="text-[11px] font-bold text-[#34E08C]">● 지금 이 순간</span>}
                    {reached && !active && <span className="text-[11px] font-bold text-white/50">✓ 달성</span>}
                  </div>
                  <p className="mt-2 text-sm text-white/60">{mm.label}</p>
                  <p className="text-2xl font-black">{mm.reward}</p>
                  <p className="mt-1 text-xs text-white/45">{mm.sub}</p>
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-white/40">
            ※ 사전예약 혜택(크레딧·프로 기간)은 정식 오픈 시 일괄·소급 지급돼요.
            프로 무료 기간 동안은 월 무료 크레딧이 별도 지급되지 않아요. 수익은 상품·꾸준함에 따라 달라요.
          </p>
        </section>

        {/* 참여 방법 */}
        <section className="mt-16">
          <p className="text-center text-xs font-black tracking-widest text-[#34E08C]">HOW IT WORKS</p>
          <h2 className="mt-1 text-center text-xl font-black">참여 방법은 3단계</h2>
          <div className="mt-6 space-y-3">
            <Step n="1" t="이메일로 사전예약" d="아래 폼에 이메일만 남기면 예약 끝. 1분이면 돼요. 결제 없어요." />
            <Step n="2" t="카카오 채널 추가" d="채널을 추가하면 오픈 소식을 카톡으로 가장 먼저 받아요." />
            <Step n="3" t="오픈일 코드 자동 발송" d="정식 오픈일에 혜택 코드를 카톡·이메일로 보내드려요. 가입 시 적용." />
          </div>
        </section>

        {/* 친구와 함께 */}
        <section className="mt-16 rounded-3xl bg-white/5 p-6 text-center">
          <p className="text-xs font-black tracking-widest text-[#34E08C]">SHARE</p>
          <h2 className="mt-1 text-xl font-black">친구가 많을수록<br />모두의 혜택이 커져요</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            누적 인원이 250 · 500 · 1,000명을 넘을 때마다 <b className="text-white">먼저 예약한 분 전원</b>에게 혜택이 소급 지급돼요.
            함께 부를수록 다 같이 더 받는 구조예요.
          </p>
          <button onClick={share}
            className="mx-auto mt-5 flex items-center justify-center gap-2 rounded-xl bg-[#FEE500] px-6 py-3.5 text-base font-bold text-[#3C1E1E] transition hover:brightness-95">
            💬 {copied ? '링크 복사됨!' : '카카오톡으로 공유하기'}
          </button>
        </section>

        {/* 신청 폼 */}
        <section id="form" className="mt-16">
          <p className="text-center text-xs font-black tracking-widest text-[#34E08C]">SIGN UP</p>
          <h2 className="mt-1 text-center text-xl font-black">사전예약 신청</h2>
          <p className="mt-2 text-center text-xs text-white/50">입력 정보는 오픈 알림 목적으로만 사용 · 오픈 후 6개월 내 파기</p>
          {!done ? (
            <div className="mt-5 space-y-3">
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErr('') }}
                placeholder="이메일 주소"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-base placeholder-white/50 outline-none focus:border-[#34E08C]" />
              <label className="flex items-start gap-2 px-1 text-sm text-white/70">
                <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-1" />
                <span>[필수] 개인정보 수집·이용 및 오픈 알림 수신에 동의합니다.
                  <Link to="/privacy" className="ml-1 underline" target="_blank">개인정보처리방침</Link></span>
              </label>
              <label className="flex items-start gap-2 px-1 text-sm text-white/55">
                <input type="checkbox" checked={mkt} onChange={e => setMkt(e.target.checked)} className="mt-1" />
                <span>[선택] 마케팅 정보 수신 동의 (이벤트·추가 혜택 안내, 언제든 철회 가능)</span>
              </label>
              {err && <p className="text-sm font-bold text-red-300">{err}</p>}
              <button onClick={submit} disabled={!valid || loading}
                className="w-full rounded-xl bg-[#03C75A] py-4 text-lg font-black transition hover:bg-[#02b350] disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/40">
                {loading ? '신청 중…' : '사전예약 완료하기'}
              </button>
              <p className="px-1 text-[11px] leading-relaxed text-white/35">
                수집 항목: 이메일 · 목적: 사전예약 확인 및 오픈 코드 발송 · 보유 기간: 오픈 후 6개월 · 동의 거부 시 사전예약 혜택이 제한됩니다.
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-white/10 py-8 text-center">
              <div className="text-5xl">🎉</div>
              <h3 className="mt-4 text-xl font-black">사전예약 완료!</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                마지막으로 카카오 채널을 추가하면<br />오픈 소식을 <b className="text-white/90">카톡으로 가장 먼저</b> 받아요.
              </p>
              <button onClick={addKakaoChannel}
                className="mx-auto mt-5 flex items-center justify-center gap-2 rounded-xl bg-[#FEE500] px-6 py-3.5 text-base font-bold text-[#3C1E1E] transition hover:brightness-95">
                💬 카카오 채널 추가하기
              </button>
              <button onClick={share} className="mx-auto mt-3 block text-sm font-bold text-white/60 underline">카카오톡으로 공유하기</button>
            </div>
          )}
        </section>

        {/* FAQ */}
        <section className="mt-16">
          <p className="text-center text-xs font-black tracking-widest text-[#34E08C]">FAQ</p>
          <h2 className="mt-1 text-center text-xl font-black">자주 묻는 질문</h2>
          <div className="mt-6 space-y-2">
            <Faq q="혜택은 언제, 어떻게 받나요?" a="정식 오픈일에 카카오 채널 메시지와 이메일로 혜택 코드를 발송해요. 가입할 때 코드를 넣으면 자동 적용됩니다." />
            <Faq q="지금 결제해야 하나요?" a="아니요. 결제 없이 이메일만으로 예약돼요. 오픈 전까지 어떤 비용도 청구되지 않아요." />
            <Faq q="카카오 채널은 왜 추가하나요?" a="오픈 소식을 카톡으로 가장 빠르게 받기 위해서예요. 추가는 무료고, 언제든 차단할 수 있어요." />
            <Faq q="컴퓨터를 잘 못 하는데 쓸 수 있나요?" a="설치할 앱이 없어요. 구글 로그인 후 쇼핑 영상 링크만 붙여넣으면 5분 뒤 영상이 자동완성됩니다." />
            <Faq q="수익이 보장되나요?" a="아니요. 크로닛은 영상 만드는 노동을 줄여주는 도구일 뿐이에요. 수익은 상품 선택과 꾸준함에 따라 달라집니다." />
            <Faq q="선착순 100명은 어떻게 정해지나요?" a="사전예약(이메일 등록) 완료 시각 순서예요." />
          </div>
        </section>

        {/* 푸터 */}
        <footer className="mt-16 border-t border-white/10 pt-8 text-center">
          <div className="flex justify-center gap-4 text-xs text-white/50">
            <Link to="/terms" className="underline" target="_blank">이용약관</Link>
            <Link to="/privacy" className="underline" target="_blank">개인정보처리방침</Link>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-white/35">
            상호: 크로닛(Chronit) · 대표자: 최승호 · 사업자등록번호: 277-20-02625<br />
            주소: 대전광역시 서구 가장로 107, 205동 101호<br />
            문의: pv2066pv@gmail.com · 010-4915-3066<br />
            © 2026 Chronit. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  )
}

function Step({ n, t, d }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-white/5 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#03C75A] text-sm font-black">{n}</div>
      <div>
        <p className="font-bold">{t}</p>
        <p className="mt-0.5 text-sm text-white/60">{d}</p>
      </div>
    </div>
  )
}
function Feat({ emoji, t }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3.5">
      <span className="text-xl">{emoji}</span>
      <span className="font-bold">{t}</span>
    </div>
  )
}
function Faq({ q, a }) {
  return (
    <details className="group rounded-2xl bg-white/5 px-4 py-3.5">
      <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
        <span>{q}</span>
        <span className="ml-2 text-[#34E08C] transition group-open:rotate-45">＋</span>
      </summary>
      <p className="mt-2 text-sm leading-relaxed text-white/65">{a}</p>
    </details>
  )
}

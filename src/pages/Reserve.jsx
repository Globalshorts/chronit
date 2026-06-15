import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// 정식 오픈 예정일 — PG 심사 확정되면 이 값만 바꾸면 돼요
const LAUNCH = new Date('2026-07-01T00:00:00+09:00')
const GOAL = 100 // 선착순 혜택 목표 인원
const BASE = 99 // 표시 시작 인원 (다음 신청자가 100번째)
const KAKAO_JS_KEY = import.meta.env?.VITE_KAKAO_JS_KEY || '84ee352af8ddaf49632d40de964fa9f4'
const CHANNEL_ID = '_DcNnX'

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
  const { d, h, m, s } = useCountdown(LAUNCH)
  const [count, setCount] = useState(null)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  const loadCount = async () => {
    const { data } = await supabase.rpc('waitlist_count_rpc')
    if (typeof data === 'number') setCount(data)
  }
  useEffect(() => { loadCount() }, [])

  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) && agree
  const scrollForm = () => document.getElementById('form')?.scrollIntoView({ behavior: 'smooth' })

  const submit = async () => {
    if (!valid || loading) return
    setLoading(true); setErr('')
    try {
      const { data, error } = await supabase.rpc('reserve_waitlist_rpc', {
        p_email: email.trim(), p_phone: phone.trim() || null, p_source: 'reserve',
      })
      if (error || !data?.ok) { setErr(data?.error || '잠시 후 다시 시도해 주세요.'); setLoading(false); return }
      setDone(true); loadCount()
    } catch { setErr('잠시 후 다시 시도해 주세요.'); setLoading(false) }
  }

  const shown = count != null ? BASE + count : null
  const pct = shown != null ? Math.min(100, Math.round((shown / GOAL) * 100)) : 0

  return (
    <div className="min-h-screen bg-[#0f3628] text-white">
      {/* 상단 바 */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0f3628]/80 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <img src="/favicon-192.png" alt="Chronit" className="h-7 w-7 rounded-lg bg-white p-0.5" />
            <span className="font-black tracking-tight">Chronit</span>
          </div>
          <button onClick={scrollForm} className="rounded-full bg-[#03C75A] px-4 py-1.5 text-sm font-bold">사전예약</button>
        </div>
      </div>

      <div className="mx-auto max-w-md px-6 pb-16 pt-8 text-center">
        <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-[#34E08C]">🔥 사전예약 진행 중</span>

        <h1 className="mt-5 text-[34px] font-black leading-tight">
          <span className="text-[#34E08C]">7월, 크로닛</span>이<br />문을 열어요
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/70">
          편집 1도 못 해도, 쇼핑 영상 링크만 넣으면<br />
          자막·AI목소리·썸네일까지 5분 만에 자동으로요.
        </p>
        <p className="mt-3 text-xs text-white/50">지금 예약하면 <b className="text-white/80">런칭일 혜택</b>을 가장 먼저 드려요</p>

        {/* 카운트다운 */}
        <div className="mt-6 flex gap-2">
          <Box n={d} label="DAYS" /><Box n={h} label="HOURS" /><Box n={m} label="MINS" /><Box n={s} label="SECS" />
        </div>

        <button onClick={scrollForm}
          className="mt-7 w-full rounded-xl bg-[#03C75A] py-4 text-lg font-black transition hover:bg-[#02b350]">
          지금 사전예약 신청 →
        </button>

        <button onClick={addKakaoChannel}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3.5 text-base font-bold text-[#3C1E1E] transition hover:brightness-95">
          💬 카카오 채널 추가하고 오픈 알림받기
        </button>
        <p className="mt-1.5 text-xs text-white/40">채널을 추가하면 오픈 소식을 카톡으로 가장 먼저 받아요</p>

        {/* 실시간 인원 */}
        <div className="mt-9">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-[#34E08C]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#34E08C]" />LIVE
            </span>
            <span><b className="text-xl font-black">{shown != null ? shown.toLocaleString() : '—'}</b>명이 함께 기다리는 중</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#03C75A] transition-all duration-700" style={{ width: pct + '%' }} />
          </div>
          <p className="mt-2 text-xs text-white/45">선착순 {GOAL}명 — 정식 오픈 시 <b className="text-white/70">프로 7일 무료</b></p>
        </div>

        {/* 혜택 */}
        <div className="mt-10 space-y-3 text-left">
          <Benefit emoji="🎁" t="런칭일 혜택" d="선착순으로 프로 7일 무료 코드를 가장 먼저 받아요." />
          <Benefit emoji="⚡" t="5분 자동완성" d="링크만 붙여넣으면 끝. 설치도, 편집 지식도 필요 없어요." />
          <Benefit emoji="💬" t="오픈 알림" d="정식 오픈하면 입력하신 곳으로 바로 알려드려요." />
        </div>

        {/* 폼 */}
        <div id="form" className="mt-10 space-y-3 text-left">
          <h2 className="text-center text-lg font-black">사전예약하기</h2>
          {!done ? (
            <>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErr('') }}
                placeholder="이메일 주소 (오픈 알림 받을 곳)"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-base placeholder-white/50 outline-none focus:border-[#34E08C]" />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="휴대폰 번호 (선택)"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-base placeholder-white/50 outline-none focus:border-[#34E08C]" />
              <label className="flex items-start gap-2 px-1 text-sm text-white/70">
                <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-1" />
                <span>오픈 안내를 위한 개인정보 수집·이용 및 알림 수신에 동의합니다.
                  <Link to="/privacy" className="ml-1 underline" target="_blank">개인정보처리방침</Link></span>
              </label>
              {err && <p className="text-sm font-bold text-red-300">{err}</p>}
              <button onClick={submit} disabled={!valid || loading}
                className="w-full rounded-xl bg-[#03C75A] py-4 text-lg font-black transition hover:bg-[#02b350] disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/40">
                {loading ? '신청 중…' : '무료 오픈 알림 받기'}
              </button>
              <p className="text-center text-xs text-white/40">※ 지금은 결제 없이 예약만 받아요. 수익은 상품·꾸준함에 따라 달라요.</p>
            </>
          ) : (
            <div className="rounded-2xl bg-white/10 py-10 text-center">
              <div className="text-5xl">🎉</div>
              <h3 className="mt-4 text-xl font-black">사전예약 완료!</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                정식 오픈하면 가장 먼저,<br />선착순 프로 7일 무료 혜택과 함께 알려드릴게요.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Benefit({ emoji, t, d }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-white/5 p-4">
      <div className="text-2xl">{emoji}</div>
      <div>
        <p className="font-bold">{t}</p>
        <p className="mt-0.5 text-sm text-white/60">{d}</p>
      </div>
    </div>
  )
}

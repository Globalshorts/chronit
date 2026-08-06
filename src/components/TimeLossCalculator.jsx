import { useState } from 'react'
import { ArrowRight, Clock, Moon } from 'lucide-react'

const fmtH = (min) => {
  min = Math.max(0, Math.round(min))
  const h = Math.floor(min / 60), m = min % 60
  if (h > 0 && m > 0) return `${h.toLocaleString()}시간 ${m}분`
  if (h > 0) return `${h.toLocaleString()}시간`
  return `${m}분`
}

const numCls = 'w-14 rounded-lg border border-[#0064FF]/30 bg-white px-2 py-1.5 text-center text-sm font-bold text-gray-900 outline-none focus:border-[#0064FF]'
const boxCls = 'rounded-xl border border-[#0064FF]/25 bg-[#0064FF]/5 p-3'
const labelCls = 'mb-2 text-xs font-bold text-[#0064FF]'

const TimeLossCalculator = ({ onStart }) => {
  const [sh, setSh] = useState('0'); const [sm, setSm] = useState('20')
  const [eh, setEh] = useState('0'); const [em, setEm] = useState('40')
  const [vw, setVw] = useState('5')
  const [revealed, setRevealed] = useState(false)
  const [shown, setShown] = useState(false)

  const n = (v) => { const x = parseInt(v, 10); return isNaN(x) ? 0 : x }
  const perVideo = (n(sh) * 60 + n(sm)) + (n(eh) * 60 + n(em))   // 순수 소싱+편집 (크로닛 미포함)
  const vids = Math.max(0, n(vw))
  const lossWeek = perVideo * vids                               // 지금 매주 버리는 시간 (raw)
  const lossMonth = lossWeek * (30 / 7)
  const lossYear = lossWeek * (365 / 7)
  const evenings = Math.round(lossYear / 180)
  const savedWeek = Math.max(0, perVideo - 5) * vids            // 크로닛으로 되찾는 시간 (영상당 5분)

  const reveal = () => { setRevealed(true); setTimeout(() => setShown(true), 10) }
  const numProps = { type: 'number', inputMode: 'numeric', pattern: '[0-9]*' }

  return (
    <div className="rounded-2xl border-2 border-[#0064FF]/20 bg-white p-5 text-left shadow-sm">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-gray-500">
        <Clock size={15} className="text-[#0064FF]" /> 잠깐 — 지금 영상 1개에 얼마나 쓰고 있어요?
      </p>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className={boxCls}>
          <p className={labelCls}>소싱(찾기) 시간</p>
          <div className="flex items-center gap-1.5">
            <input {...numProps} min="0" max="24" value={sh} onChange={e => setSh(e.target.value)} className={numCls} aria-label="소싱 시간" />
            <span className="text-xs text-gray-400">시간</span>
            <input {...numProps} min="0" max="59" value={sm} onChange={e => setSm(e.target.value)} className={numCls} aria-label="소싱 분" />
            <span className="text-xs text-gray-400">분</span>
          </div>
        </div>
        <div className={boxCls}>
          <p className={labelCls}>편집 시간</p>
          <div className="flex items-center gap-1.5">
            <input {...numProps} min="0" max="24" value={eh} onChange={e => setEh(e.target.value)} className={numCls} aria-label="편집 시간" />
            <span className="text-xs text-gray-400">시간</span>
            <input {...numProps} min="0" max="59" value={em} onChange={e => setEm(e.target.value)} className={numCls} aria-label="편집 분" />
            <span className="text-xs text-gray-400">분</span>
          </div>
        </div>
        <div className={boxCls}>
          <p className={labelCls}>일주일에 몇 개?</p>
          <div className="flex items-center gap-1.5">
            <input {...numProps} min="1" max="100" value={vw} onChange={e => setVw(e.target.value)} className="w-16 rounded-lg border border-[#0064FF]/30 bg-white px-2 py-1.5 text-center text-sm font-bold text-gray-900 outline-none focus:border-[#0064FF]" aria-label="주당 영상 개수" />
            <span className="text-xs text-gray-400">개 / 주</span>
          </div>
        </div>
      </div>

      {!revealed && (
        <button onClick={reveal}
          className="mt-4 w-full rounded-xl bg-[#0064FF] py-3.5 text-base font-bold text-white transition-all hover:bg-[#0052D6] active:scale-[0.98]">
          내가 편집에 버리는 시간 보기
        </button>
      )}

      {revealed && (
        <div className={`transition-all duration-300 ${shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="mb-0.5 text-xs font-bold text-red-600">지금 매주 편집에 버리는 시간</p>
            <p className="text-3xl font-black leading-tight text-red-500">{fmtH(lossWeek)}</p>
            <p className="mt-1 text-xs font-bold text-red-400">이게 매주 반복돼요.</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 p-3.5">
              <p className="mb-0.5 text-xs text-gray-500">한 달이면</p>
              <p className="text-xl font-black text-gray-900">{fmtH(lossMonth)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3.5">
              <p className="mb-0.5 text-xs text-gray-500">1년이면</p>
              <p className="text-xl font-black text-gray-900">{fmtH(lossYear)}</p>
            </div>
          </div>
          {lossYear > 0 && (
            <p className="mt-3 flex items-center gap-1.5 text-sm leading-relaxed text-gray-800">
              <Moon size={15} className="shrink-0 text-red-500" /> 1년이면 <b className="font-black text-red-500">퇴근 후 저녁 {evenings.toLocaleString()}번</b>을 편집에 뺏기는 거예요.
            </p>
          )}

          <div className="mt-4 rounded-xl border border-[#0064FF]/25 bg-[#0064FF]/5 p-4">
            <p className="mb-0.5 text-xs font-bold text-[#0064FF]">크로닛으로 바꾸면 · 영상당 5분</p>
            <p className="text-2xl font-black leading-tight text-[#0064FF]">매주 {fmtH(savedWeek)} 되찾음</p>
            <p className="mt-1 text-xs font-bold text-[#0064FF]/70">이 시간에 편집 대신, 채널을 굴리세요.</p>
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-[15px] font-bold text-gray-900">남들이 이 시간에 갈려나갈 때, 당신은 되찾습니다.</p>
            <p className="mb-3 text-xs text-gray-500">아직 크로닛으로 시스템을 굴리는 사람은 소수예요. 편집자 말고, 운영자가 되세요.</p>
            <button onClick={onStart}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#0064FF] py-3.5 text-base font-extrabold text-white transition-all hover:bg-[#0052D6] active:scale-[0.98]">
              먼저 시스템 갖기 <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TimeLossCalculator

import { useState } from 'react'
import { ArrowRight, Clock, Moon } from 'lucide-react'

const fmtH = (min) => {
  min = Math.max(0, Math.round(min))
  const h = Math.floor(min / 60), m = min % 60
  if (h > 0 && m > 0) return `${h.toLocaleString()}시간 ${m}분`
  if (h > 0) return `${h.toLocaleString()}시간`
  return `${m}분`
}

const nc = 'w-14 rounded-md border border-[#0064FF]/30 bg-white px-1.5 py-1 text-center text-sm font-bold text-gray-900 outline-none focus:border-[#0064FF]'
const rowCls = 'flex items-center justify-between gap-2 px-3 py-2.5'
const rowLabel = 'text-xs font-bold text-[#0064FF]'
const unit = 'text-xs text-gray-400'

const TimeLossCalculator = ({ onStart }) => {
  const [sh, setSh] = useState('0'); const [sm, setSm] = useState('20')
  const [eh, setEh] = useState('0'); const [em, setEm] = useState('40')
  const [vw, setVw] = useState('5')
  const [revealed, setRevealed] = useState(false)
  const [shown, setShown] = useState(false)

  const n = (v) => { const x = parseInt(v, 10); return isNaN(x) ? 0 : x }
  const perVideo = (n(sh) * 60 + n(sm)) + (n(eh) * 60 + n(em))
  const vids = Math.max(0, n(vw))
  const lossWeek = perVideo * vids
  const lossYear = lossWeek * (365 / 7)
  const evenings = Math.round(lossYear / 180)
  const savedWeek = Math.max(0, perVideo - 5) * vids

  const reveal = () => { setRevealed(true); setTimeout(() => setShown(true), 10) }
  const np = { type: 'text', inputMode: 'numeric', pattern: '[0-9]*', maxLength: 3 }

  return (
    <div className="rounded-2xl border-2 border-[#0064FF]/20 bg-white p-4 text-left shadow-sm">
      <p className="mb-2.5 flex items-center gap-1.5 text-sm font-bold text-gray-500">
        <Clock size={15} className="text-[#0064FF]" /> 영상 1개, 지금 얼마나 걸려요?
      </p>

      <div className="divide-y divide-[#0064FF]/10 overflow-hidden rounded-xl border border-[#0064FF]/25 bg-[#0064FF]/5">
        <div className={rowCls}>
          <span className={rowLabel}>소싱(찾기)</span>
          <div className="flex items-center gap-1">
            <input {...np} min="0" max="24" value={sh} onChange={e => setSh(e.target.value)} className={nc} aria-label="소싱 시간" /><span className={unit}>시간</span>
            <input {...np} min="0" max="59" value={sm} onChange={e => setSm(e.target.value)} className={nc} aria-label="소싱 분" /><span className={unit}>분</span>
          </div>
        </div>
        <div className={rowCls}>
          <span className={rowLabel}>편집</span>
          <div className="flex items-center gap-1">
            <input {...np} min="0" max="24" value={eh} onChange={e => setEh(e.target.value)} className={nc} aria-label="편집 시간" /><span className={unit}>시간</span>
            <input {...np} min="0" max="59" value={em} onChange={e => setEm(e.target.value)} className={nc} aria-label="편집 분" /><span className={unit}>분</span>
          </div>
        </div>
        <div className={rowCls}>
          <span className={rowLabel}>일주일에</span>
          <div className="flex items-center gap-1">
            <input {...np} min="1" max="100" value={vw} onChange={e => setVw(e.target.value)} className={nc} aria-label="주당 영상 개수" /><span className={unit}>개 / 주</span>
          </div>
        </div>
      </div>

      {!revealed && (
        <button onClick={reveal}
          className="mt-3 w-full rounded-xl bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] py-3 text-base font-bold text-white transition-all hover:brightness-95 active:scale-[0.98]">
          내가 편집에 버리는 시간 보기
        </button>
      )}

      {revealed && (
        <div className={`transition-all duration-300 ${shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
          <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3.5">
            <p className="text-xs font-bold text-red-600">지금 매주 편집에 버리는 시간</p>
            <p className="text-2xl font-black leading-tight text-red-500">{fmtH(lossWeek)}</p>
            <p className="text-xs font-bold text-red-400">이게 매주 반복돼요.</p>
          </div>
          {lossYear > 0 && (
            <p className="mt-2.5 flex items-start gap-1.5 text-sm leading-relaxed text-gray-800 break-keep">
              <Moon size={15} className="mt-0.5 shrink-0 text-red-500" /> <span>1년이면 <b className="font-black text-red-500">{fmtH(lossYear)}</b> — 퇴근 후 <b className="font-black text-red-500">저녁 {evenings.toLocaleString()}번</b>을 편집에 뺏겨요.</span>
            </p>
          )}
          <div className="mt-3 rounded-xl border border-[#0064FF]/25 bg-[#0064FF]/5 p-3.5">
            <p className="text-xs font-bold text-[#0064FF]">크로닛으로 바꾸면 · 영상당 5분</p>
            <p className="text-xl font-black leading-tight text-[#0064FF]">매주 {fmtH(savedWeek)} 되찾음</p>
          </div>
          <button onClick={onStart}
            className="group mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(140deg,#2A7BFF_0%,#0064FF_55%,#0055DB_100%)] py-3.5 text-base font-extrabold text-white transition-all hover:brightness-95 active:scale-[0.98]">
            먼저 시스템 갖기 <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
          <p className="mt-2 text-center text-xs text-gray-400 break-keep">편집자 말고, 운영자가 되세요.</p>
        </div>
      )}
    </div>
  )
}

export default TimeLossCalculator

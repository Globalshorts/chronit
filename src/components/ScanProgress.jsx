import { useEffect, useRef, useState } from 'react'

// 갱신 진행바 — 청크 응답 사이를 이징으로 메워 '멈춘 느낌'을 없앤다.
//
// watch-scan 은 20계정 청크마다 한 번만 응답한다(≈15초). 응답 때만 막대를 옮기면
// 15초씩 멈췄다 튀므로, 다음 청크가 끝날 지점까지 감속 곡선으로 천천히 채우고
// 실제 응답이 오면 그 값으로 부드럽게 따라붙는다(overshoot 없음).
//
// props
//   cursor   서버가 확인해준 처리 완료 계정 수
//   total    전체 대상 수
//   chunk    청크 크기(=20)
//   avgMs    청크 1개 평균 소요(측정값, 없으면 15000)
//   recent   직전 청크에서 처리한 username 배열 (롤링 표시용)
//   hits     누적 신규 소재 수
const DEFAULT_AVG = 15000
const ROLL_MS = 1300

const etaText = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) return ''
  const s = Math.round(ms / 1000)
  if (s < 60) return `약 ${s}초 남음`
  const m = Math.round(s / 60)
  return `약 ${m}분 남음`
}

export default function ScanProgress({ cursor = 0, total = 0, chunk = 20, avgMs, recent = [], hits = 0 }) {
  const [pct, setPct] = useState(0)
  const [rollIdx, setRollIdx] = useState(0)

  const fromRef = useRef(0)
  const toRef = useRef(0)
  const sinceRef = useRef(0)
  const dispRef = useRef(0)
  const avgRef = useRef(avgMs || DEFAULT_AVG)

  avgRef.current = Math.max(3000, avgMs || DEFAULT_AVG)

  // 서버 응답이 올 때마다 보간 구간을 다음 청크로 옮긴다
  useEffect(() => {
    fromRef.current = cursor
    toRef.current = Math.min(total, cursor + chunk)
    sinceRef.current = performance.now()
  }, [cursor, total, chunk])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const from = fromRef.current
      const to = toRef.current
      const t = Math.max(0, (performance.now() - sinceRef.current) / avgRef.current)
      // 감속 곡선 — 다음 목표치에 점근할 뿐 도달하지 않는다(확인 전 앞질러 가지 않도록)
      const eased = from + (to - from) * (1 - Math.exp(-1.7 * t))
      // 실제 응답이 오면 목표가 갑자기 올라가는데, 이 lerp 가 '살짝 스냅'으로 만들어준다
      dispRef.current += (eased - dispRef.current) * 0.12
      setPct(Math.min(100, (dispRef.current / Math.max(1, total)) * 100))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [total])

  // 방금 처리한 계정 롤링
  useEffect(() => { setRollIdx(0) }, [cursor])
  useEffect(() => {
    if (recent.length < 2) return
    const id = setInterval(() => setRollIdx((i) => (i + 1) % recent.length), ROLL_MS)
    return () => clearInterval(id)
  }, [recent])

  const remainChunks = Math.max(0, Math.ceil((total - cursor) / Math.max(1, chunk)))
  const eta = etaText(remainChunks * avgRef.current)
  const nowAccount = recent.length ? recent[Math.min(rollIdx, recent.length - 1)] : null

  return (
    <div className="min-w-[220px] flex-1">
      <div className="mb-1 flex items-baseline justify-between gap-2 text-[11px]">
        <span className="font-bold text-white/70">
          {Math.min(cursor, total).toLocaleString('ko-KR')} / {total.toLocaleString('ko-KR')} 갱신 중
        </span>
        {eta && <span className="text-white/35">{eta}</span>}
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ background: '#000' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, background: '#0064FF' }}
        >
          {/* 불확정 shimmer — 막대가 잠시 안 움직여도 살아있다는 신호 */}
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <div className="chr-shimmer absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          </div>
        </div>
      </div>

      <div className="mt-1 flex items-baseline justify-between gap-2 text-[11px] text-white/35">
        <span className="truncate">{nowAccount ? `방금 @${nowAccount}` : '계정 목록 확인 중…'}</span>
        <span className="shrink-0">새 소재 <b className="text-white/60">{hits.toLocaleString('ko-KR')}</b>건</span>
      </div>
    </div>
  )
}

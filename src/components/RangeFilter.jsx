import { useRef, useState, useCallback } from 'react'

// 다크 레인지 슬라이더 — 검정 트랙 + 흰 핸들. 트렌드/패스트벤치/워치리스트 공용.
//
// value 가 배열([lo, hi])이면 핸들 2개(구간), 숫자면 핸들 1개(임계값).
// infinitySuffix — 끝값에 닿았을 때의 표기
//   '∞'   : 상한이 max 면 '∞' (= 무제한)
//   '이상' : 상한이 max 면 '{max}{unit} 이상'
//   '이하' : 단일 모드에서 값을 상한으로 해석 ('{v}{unit} 이하')
// marks 는 [값, ...] 또는 [[값, '라벨'], ...] 둘 다 받는다.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export default function RangeFilter({
  label, min = 0, max = 100, step = 1, value, onChange,
  marks, unit = '', infinitySuffix = '∞', formatValue, className = '',
}) {
  const trackRef = useRef(null)
  const [drag, setDrag] = useState(null)   // 'lo' | 'hi' | 'one'
  const isRange = Array.isArray(value)
  const span = Math.max(1, max - min)

  const lo = isRange ? clamp(Number(value[0]) || min, min, max) : min
  const hi = isRange
    ? clamp(value[1] == null ? max : Number(value[1]), min, max)
    : clamp(Number(value) || min, min, max)
  const isUpper = !isRange && infinitySuffix === '이하'

  const pct = (v) => ((v - min) / span) * 100
  const fmtN = (n) => (formatValue ? formatValue(n) : Number(n).toLocaleString('ko-KR'))

  // 현재 선택을 사람이 읽는 문구로
  const readout = (() => {
    if (isRange) {
      if (lo <= min && hi >= max) return '전체'
      const hiText = hi >= max
        ? (infinitySuffix === '∞' ? '∞' : `${fmtN(max)}${unit} 이상`)
        : `${fmtN(hi)}${unit}`
      return `${fmtN(lo)}${unit} ~ ${hiText}`
    }
    if (isUpper) return hi >= max ? '전체' : `${fmtN(hi)}${unit} 이하`
    if (hi <= min) return '전체'
    return hi >= max && infinitySuffix === '∞' ? `${fmtN(max)}${unit}+` : `${fmtN(hi)}${unit} 이상`
  })()

  const valueAt = useCallback((clientX) => {
    const el = trackRef.current
    if (!el) return min
    const r = el.getBoundingClientRect()
    const t = clamp((clientX - r.left) / Math.max(1, r.width), 0, 1)
    return clamp(Math.round((min + t * span) / step) * step, min, max)
  }, [min, max, step, span])

  const emit = (which, v) => {
    if (!isRange) { onChange(v); return }
    if (which === 'lo') onChange([Math.min(v, hi), hi])
    else onChange([lo, Math.max(v, lo)])
  }

  // 두 핸들이 같은 값에 겹쳤을 땐 어느 쪽을 잡았는지 알 수 없으므로
  // 'tie' 로 보류했다가, 처음 움직인 방향으로 잡을 핸들을 정한다(안 그러면 구간을 다시 못 벌림).
  const pick = (v) => {
    if (!isRange) return 'one'
    if (lo === hi) return v > hi ? 'hi' : v < lo ? 'lo' : 'tie'
    return Math.abs(v - lo) <= Math.abs(v - hi) ? 'lo' : 'hi'
  }

  const onDown = (e) => {
    const v = valueAt(e.clientX)
    const which = pick(v)
    setDrag(which)
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
    if (which !== 'tie') emit(which, v)
  }
  const onMove = (e) => {
    if (!drag) return
    const v = valueAt(e.clientX)
    if (drag === 'tie') {
      const which = v > hi ? 'hi' : v < lo ? 'lo' : null
      if (!which) return
      setDrag(which)
      emit(which, v)
      return
    }
    emit(drag, v)
  }
  const onUp = (e) => {
    setDrag(null)
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* noop */ }
  }

  const onKey = (which) => (e) => {
    const cur = which === 'lo' ? lo : hi
    let next = null
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = cur - step
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = cur + step
    else if (e.key === 'Home') next = min
    else if (e.key === 'End') next = max
    if (next == null) return
    e.preventDefault()
    emit(which, clamp(next, min, max))
  }

  // ⚠️ index.css 의 전역 다크 remap 이 bg-white/bg-black 유틸을 덮어쓴다(투명/회색으로 변함).
  //    트랙·구간·핸들 색은 반드시 인라인 스타일로 지정할 것.
  const handleCls = 'absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none transition-transform focus-visible:ring-2 focus-visible:ring-[#0064FF] active:scale-110'
  const handleStyle = { background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.55)' }
  const markList = (marks || []).map((m) => (Array.isArray(m) ? m : [m, `${fmtN(m)}${unit}`]))

  return (
    <div className={`select-none ${className}`}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold text-white/60">{label}</span>
        <span className="text-xs font-extrabold text-white">{readout}</span>
      </div>

      <div
        ref={trackRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="relative h-9 cursor-pointer touch-none"
      >
        {/* 트랙 */}
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full ring-1 ring-white/10" style={{ background: '#000' }} />
        {/* 선택 구간 */}
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{
            background: '#fff',
            ...(isRange
              ? { left: `${pct(lo)}%`, width: `${Math.max(0, pct(hi) - pct(lo))}%` }
              : isUpper
                ? { left: 0, width: `${pct(hi)}%` }
                : { left: `${pct(hi)}%`, right: 0 }),
          }}
        />
        {isRange && (
          <div
            role="slider" tabIndex={0} aria-label={`${label} 최소`}
            aria-valuemin={min} aria-valuemax={max} aria-valuenow={lo}
            onKeyDown={onKey('lo')}
            className={handleCls} style={{ ...handleStyle, left: `${pct(lo)}%` }}
          />
        )}
        <div
          role="slider" tabIndex={0} aria-label={isRange ? `${label} 최대` : label}
          aria-valuemin={min} aria-valuemax={max} aria-valuenow={hi}
          onKeyDown={onKey('hi')}
          className={handleCls} style={{ ...handleStyle, left: `${pct(hi)}%` }}
        />
      </div>

      {markList.length > 0 && (
        <div className="relative mt-0.5 h-4">
          {markList.map(([v, text]) => {
            const at = clamp(pct(v), 0, 100)
            // 양끝 눈금은 바깥으로 넘치지 않게 좌/우 정렬로 붙인다
            const shift = at <= 0.5 ? 'translate-x-0' : at >= 99.5 ? '-translate-x-full' : '-translate-x-1/2'
            return (
              <span
                key={v}
                className={`absolute whitespace-nowrap text-[10px] font-medium text-white/30 ${shift}`}
                style={{ left: `${at}%` }}
              >
                {text}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

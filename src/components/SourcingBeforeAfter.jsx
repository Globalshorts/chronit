const W1 = [66, 54, 70, 50, 62, 72, 56, 64]
const W2 = [40, 30, 46, 34, 28, 48, 32, 42]
const CARDS = Array.from({ length: 14 }, (_, i) => ({ y: 34 + i * 52, w1: W1[i % 8], w2: W2[i % 8] }))

export default function SourcingBeforeAfter() {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 md:gap-4">
      {/* 크로닛 전 — 끝없는 스크롤 */}
      <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-gray-50 p-4 md:p-5">
        <svg viewBox="0 0 180 320" className="w-[130px] md:w-[150px]" role="img" aria-label="끝없이 스크롤하는 피드">
          <defs><clipPath id="finds_scr"><rect x="20" y="28" width="140" height="264" rx="10" /></clipPath></defs>
          <rect x="10" y="10" width="160" height="300" rx="24" fill="#fff" stroke="#C4C9CF" strokeWidth="2" />
          <rect x="70" y="16" width="40" height="7" rx="3.5" fill="#EAECEE" />
          <rect x="20" y="28" width="140" height="264" rx="10" fill="#FAFBFC" />
          <g clipPath="url(#finds_scr)">
            <g>
              <animateTransform attributeName="transform" type="translate" from="0 0" to="0 -416" dur="6s" repeatCount="indefinite" />
              {CARDS.map((c, i) => (
                <g key={i}>
                  <rect x="30" y={c.y} width="40" height="40" rx="6" fill="#D3D8DD" />
                  <rect x="78" y={c.y + 6} width={c.w1} height="7" rx="3.5" fill="#DEE2E6" />
                  <rect x="78" y={c.y + 22} width={c.w2} height="7" rx="3.5" fill="#E4E8EB" />
                </g>
              ))}
            </g>
          </g>
        </svg>
        <p className="mt-3 text-center text-xs font-medium text-gray-400">끝없이 스크롤 · 복불복</p>
      </div>

      {/* 크로닛 후 — 터진 것만 정리 */}
      <div className="flex flex-col items-center rounded-2xl border-2 border-[#0064FF]/20 bg-white p-4 md:p-5">
        <svg viewBox="0 0 180 320" className="w-[130px] md:w-[150px]" role="img" aria-label="터진 소재만 모아 보여주는 화면">
          <rect x="10" y="10" width="160" height="300" rx="24" fill="#fff" stroke="#0064FF" strokeOpacity="0.4" strokeWidth="2" />
          <rect x="70" y="16" width="40" height="7" rx="3.5" fill="#DCEAFF" />
          <rect x="22" y="30" width="52" height="9" rx="4.5" fill="#0064FF" />
          {[46, 132, 218].map((gy, r) => [22, 94].map((gx, c) => (
            <g key={`${r}-${c}`}>
              <rect x={gx} y={gy} width="64" height="74" rx="8" fill="#EAF2FF" stroke="#0064FF" strokeOpacity="0.2" />
              <circle cx={gx + 12} cy={gy + 13} r="5" fill="#0064FF" />
              <rect x={gx + 8} y={gy + 54} width="36" height="6" rx="3" fill="#BBD4FF" />
              <rect x={gx + 8} y={gy + 64} width="24" height="5" rx="2.5" fill="#D2E2FF" />
            </g>
          )))}
        </svg>
        <p className="mt-3 text-center text-xs font-bold text-[#0064FF]">터진 것만, 한눈에</p>
      </div>
    </div>
  )
}

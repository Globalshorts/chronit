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

      {/* 크로닛 후 — 실제 화면 */}
      <div className="flex flex-col items-center rounded-2xl border-2 border-[#0064FF]/20 bg-white p-4 md:p-5">
        <video src="/finds/finds_after.mp4" autoPlay loop muted playsInline
          className="w-[130px] rounded-[20px] border border-gray-200 shadow-sm md:w-[150px]" />
        <p className="mt-3 text-center text-xs font-bold text-[#0064FF]">몇 초 만에 발굴</p>
      </div>
    </div>
  )
}

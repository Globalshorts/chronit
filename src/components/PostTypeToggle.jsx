import { POST_TYPES } from '../lib/filterConfig'

// 콘텐츠 유형 토글 [전체 | 릴스 | 캐러셀] — 트렌드·패스트벤치·워치리스트 필터 패널 공용.
// 필터 패널(어두운 배경)의 지역·정렬 버튼과 같은 모양을 쓴다.
export default function PostTypeToggle({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="콘텐츠 유형">
      <span className="text-xs font-bold text-white/60">유형</span>
      {POST_TYPES.map(([k, l]) => (
        <button key={k} role="radio" aria-checked={value === k} onClick={() => onChange(k)}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${value === k ? 'bg-[#0064FF] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}>
          {l}
        </button>
      ))}
    </div>
  )
}

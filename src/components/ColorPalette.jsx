// 모든 기기에서 동작하는 색상 선택 팔레트
// 네이티브 input[type=color]가 안 뜨는 태블릿/웹뷰를 위해 항상 보이는 스와치 제공
const DEFAULT_PRESETS = [
  '#FFFFFF', '#000000', '#0064FF', '#FF4D4F', '#FF7A00', '#FFC400',
  '#1E90FF', '#7C3AED', '#FF4D9D', '#10B981', '#64748B', '#1E2235',
]

export default function ColorPalette({ value, onChange, presets = DEFAULT_PRESETS, allowCustom = true }) {
  const eq = (a, b) => (a || '').toUpperCase() === (b || '').toUpperCase()
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {presets.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={c}
          title={c}
          className={`h-7 w-7 rounded-full border transition ${eq(value, c) ? 'border-white ring-2 ring-[#0064FF] ring-offset-1' : 'border-gray-300 hover:scale-110'}`}
          style={{ backgroundColor: c }}
        />
      ))}
      {allowCustom && (
        <label
          className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-dashed border-gray-400"
          title="직접 선택"
          style={{ background: 'conic-gradient(red, orange, yellow, lime, cyan, blue, magenta, red)' }}
        >
          <input
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      )}
    </div>
  )
}

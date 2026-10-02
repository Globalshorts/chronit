import EnergyOrb from './EnergyOrb'

// 대본 백그라운드 생성 중 안내 토스트 (크로닛 다크 글래스 · TIP 스타일).
export default function ScriptGenToast({ scriptGen }) {
  const entries = Object.values(scriptGen || {})
  const generating = entries.filter((e) => e?.status === 'generating').length
  if (!generating) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[2147482000] flex justify-center px-4 md:bottom-6">
      <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl glass px-4 py-3 shadow-2xl shadow-black/40">
        <EnergyOrb size={30} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-bold text-white">
            <span className="rounded-md bg-[#0064FF]/20 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-[#5AA0FF]">TIP</span>
            베라가 대본을 쓰는 동안{generating > 1 ? ` (${generating})` : ''}
          </div>
          <div className="mt-0.5 text-[13px] leading-snug text-white/55">레드노트·구글렌즈로 쓸 원본을 미리 찾아두세요<br className="hidden sm:block" /> <span className="font-bold text-[#5AA0FF]">‘베라에서 확인하기’</span>를 누르면 바로 넘어가요 (생성은 계속돼요)</div>
        </div>
      </div>
    </div>
  )
}

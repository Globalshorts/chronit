import { Sparkles, Check, ArrowRight, PenLine, Coins, Bot } from 'lucide-react'
import EnergyOrb from './EnergyOrb'

const BA_BEFORE_LQIP = 'data:image/webp;base64,UklGRq4CAABXRUJQVlA4WAoAAAAIAAAAJwAAHQAAVlA4IBACAADwCQCdASooAB4APsFOoUsnpCMhqqwA8BgJagCdMoSEt927dTtGI5loSdvgzDYbVocP58SU8+qgGT3Gqd9eto7bqV3nh+9zVqDy+LtJz43ipoQhKIv2pDQAAP7B8JGaV3G0uR0r/3vhAHBGzxSOxVdtA7617eYj+IJRnGGoN5Z4LnPnEFtsWZ3LR2MLVZPzTBzNedX9HyLpDTFOzOrfgdfy9poFxo2jRPzQmZypICe865zLjACRWf0hTfmO7X2ck7M60MmJYtc2FbC92GEnRBe3IMZWY/Ct6yAM1zZXNwj+Eo84Hp71NUFRCFW5hUUhnvxz4K3OMIMUkhGIHXEllEkM2tEOtfE3wqQcrsl3jaSzjD6+oyOx6lVDFr7KDwFnMPtGzxFC8DiswkvjXWCh2Hm4Lvb51vfe1R8fzXn95VEp64ACBtBkZ/kXVy9zoZD6JtM8/aG54e9pZRUh5eUVEzH+CUJ0fvvzm+3ug8U49D/erbn2lxuNnm+Zm8WE3Dv+acwGRcyjZz/1ojHmdQwL+uObcjYMcR4+g5ayyizwNt9CQzzLuNf16FNJN0lrSdsbeUk2Gg7O9imisAZYlddCmv4kJoZcm28eXnJIPVbJ/djnhy48fnKWcsRFKniWRteruCRyMlYfbYT6drku3+H5UU6GiEBfNquF3c4D70GaDZsjPpQ3kcIRivC6W29WziS+AABFWElGeAAAAElJKgAIAAAABQASAQMAAQAAAAAAAAAaAQUAAQAAAEoAAAAbAQUAAQAAAFIAAAAoAQMAAQAAAAEAAABphwQAAQAAAFoAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAAIAAqAEAAEAAACwBAAAA6AEAAEAAACEAwAAAAAAAA=='
const BA_AFTER_LQIP = 'data:image/webp;base64,UklGRpYCAABXRUJQVlA4IIoCAABQDQCdASooADYAPr1Mn0qnJCKhsBgNUOAXiWYAyMvVzCir8E+jfC4zwvmAxD2SUrR7tyEKHp1bjMH0afDfcY9UyiSjiN73YXhnH3EXbTrBzuBnU6rNu44coZOoLj44QcCqY38Zb/nFvC6d3begCFineSNAAP55PGkI2+T9cuHNdee3ZQ0BWhCVndBT5WQBLQ0xbNs+ZGjMmLhoC3XZsX74zpO+vElxL7IfecL399HNP9oE+nOypRtvm8lP162rtQQB81TLwKk3alUnB1+rI95aHtYrXkIRqe43sCTtWi3SVigBrrdctTUngzSYSgrnff2L8gZst57heX2U6phei9pT7eDf0YNuH1WAXrleYZPhR1QaKDtyQk1cHDz1XTIfyw8m9GQUvc1HxHsxo35NQu0GM012dK+ax/n92ytUGqg1iY3vM/+btw30digPknFeyLZF/NPKQKg54141+EukxtBZm2zMFqPp+0JzOVhpXOEBJwSfIk9LlGOvF2O7McJzY1+HoixxY9zJTdC9IlMGEPGWogIlzGbLxuioE17TB9nycwCUOiGevVYNHj3rmezdqsTJPp1xXnrX3bKtACn4DO873uypvtfKHu/GGoMuhtfr/v/1U6+J7NPY5Xj6U+bAz5viDrG9bLZyqzTCvIFhQpw83pivAWFN+PmaHQw3LspQQxbY5L4XsS2AcAoH6MH/rcZk3Mr9rzLR8IVl4GMDiIG+l4U6esr1bLTKdloDA40rQJ3N4dnFCmuXIhlHAatc8eU7rp3Ul6eNmzsp05fMIP6b94GQW8iWfhy6KNyC37b2WCgsBnSG1S4A4ucYUcLGBZ78/ZRrtb8oIj1lsohPeCBIgB6RhtAjgAAAAA=='
const PAINS = [
  { Icon: PenLine, tag: '막막한 시작', line: '무슨 멘트로 시작할지 몰라 첫 줄부터 막혀요', color: 'text-rose-300', bg: 'bg-rose-400/12' },
  { Icon: Coins, tag: '외주 비용', line: '대본 외주는 편당 몇 만원씩 나가요', color: 'text-amber-300', bg: 'bg-amber-400/12' },
  { Icon: Bot, tag: 'AI 티', line: '챗GPT로 써도 내 말투가 아니라 남이 쓴 것 같아요', color: 'text-sky-300', bg: 'bg-sky-400/12' },
]

export default function ProblemSolution() {
  const Pain = (
    <div className="w-full px-5 py-14 md:py-20">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-white/30">The Problem</div>
        <h2 className="text-center text-3xl font-bold leading-tight text-white break-keep md:text-[2.5rem]">매일 이렇게 대본 앞에서 막막하진 않나요?</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/50 break-keep md:text-base">소재는 찾아도 정작 대본 앞에서 — 시간도, 돈도, 확신도 새어 나갑니다.</p>
        <div className="mt-8 grid grid-cols-1 gap-3 md:mt-10 md:grid-cols-3 md:gap-5">
          {PAINS.map((p) => (
            <div key={p.tag} className="flex items-start gap-4 rounded-2xl glass glass-c p-5 md:flex-col md:gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${p.bg} ${p.color}`}><p.Icon size={22} /></div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wide text-white/45">{p.tag}</div>
                <p className="mt-1 text-[14px] leading-relaxed text-white/80 md:text-[15px]">{p.line}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const BA = (
    <div className="w-full px-5 pb-16 pt-2 md:pb-24 md:pt-4">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-white/30">Before / After</div>
        <h2 className="text-center text-3xl font-bold leading-tight text-white break-keep md:text-[2.5rem]">막막하던 대본, 이제 베라가 내 말투로</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/50 break-keep md:text-base">막막하던 대본 쓰기가, 베라와 몇 분이면 끝나는 내 말투 대본으로 바뀝니다.</p>
        <div className="relative mt-8 md:mt-10">
          <div className="grid grid-cols-2 gap-3 md:gap-5">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-cover bg-center md:rounded-3xl" style={{ backgroundImage: `url(${BA_BEFORE_LQIP})` }}>
              <img src="/ba-before.webp" alt="크로닛 없이" className="h-full min-h-[170px] w-full object-cover grayscale md:min-h-[260px]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0f] via-[#0a0b0f]/80 to-[#0a0b0f]/30" />
              <div className="absolute inset-0 flex flex-col p-4 md:p-6">
                <span className="w-fit rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white/70 md:px-3 md:py-1 md:text-[12px]">크로닛 없이</span>
                <div className="mt-auto"><div className="text-[12px] text-white/70 md:text-[14px]">감으로, 막막하게</div><div className="mt-1 md:flex md:items-baseline md:gap-2"><span className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 md:text-[11px]">소재 찾고 대본 쓰기</span><span className="text-xl font-bold text-red-300 md:text-3xl">하루 1~2시간</span></div></div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-[#0064FF]/40 md:rounded-3xl" style={{ background: 'radial-gradient(circle at 50% 36%, rgba(0,100,255,0.30), #06122b 72%)' }}>
              <div className="flex min-h-[170px] w-full items-center justify-center md:min-h-[260px]"><EnergyOrb size={116} /></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#06122b] via-[#08152f]/55 to-transparent" />
              <div className="absolute inset-0 flex flex-col p-4 md:p-6">
                <span className="w-fit rounded-full bg-[#0064FF] px-2.5 py-0.5 text-[11px] font-bold text-white md:px-3 md:py-1 md:text-[12px]"><span className="mr-1 inline-block align-[-1px]"><Sparkles size={12} className="inline" /></span>베라와 함께</span>
                <div className="mt-3 hidden space-y-1.5 md:block">
                  {['터진 소재를 실시간으로', '베라가 내 말투로 대본 작성', '고칠수록 더 나다워지는 대본'].map((t) => (
                    <div key={t} className="flex items-start gap-2 text-[13px] text-white/90"><Check size={14} className="mt-0.5 shrink-0 text-[#22D3EE]" />{t}</div>
                  ))}
                </div>
                <div className="mt-auto md:flex md:items-baseline md:gap-2"><span className="block text-[10px] font-semibold uppercase tracking-wider text-white/50 md:text-[11px]">크로닛 베라 AI</span><span className="text-xl font-bold text-[#7DA2FF] md:text-3xl">단 3분</span></div>
              </div>
            </div>
          </div>
          {/* 가운데 Before → After 화살표 */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[#0A0B0F] shadow-[0_6px_20px_rgba(0,0,0,0.5)] md:h-14 md:w-14">
              <ArrowRight className="text-[#7DA2FF] md:hidden" size={18} strokeWidth={2.5} />
              <ArrowRight className="hidden text-[#7DA2FF] md:block" size={24} strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <section className="relative">
      {Pain}
      {BA}
    </section>
  )
}

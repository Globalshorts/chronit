import { Sparkles, Check, ArrowRight } from 'lucide-react'
import PAIN_IMG from '../data/painImg.json'

const BA_BEFORE_LQIP = 'data:image/webp;base64,UklGRq4CAABXRUJQVlA4WAoAAAAIAAAAJwAAHQAAVlA4IBACAADwCQCdASooAB4APsFOoUsnpCMhqqwA8BgJagCdMoSEt927dTtGI5loSdvgzDYbVocP58SU8+qgGT3Gqd9eto7bqV3nh+9zVqDy+LtJz43ipoQhKIv2pDQAAP7B8JGaV3G0uR0r/3vhAHBGzxSOxVdtA7617eYj+IJRnGGoN5Z4LnPnEFtsWZ3LR2MLVZPzTBzNedX9HyLpDTFOzOrfgdfy9poFxo2jRPzQmZypICe865zLjACRWf0hTfmO7X2ck7M60MmJYtc2FbC92GEnRBe3IMZWY/Ct6yAM1zZXNwj+Eo84Hp71NUFRCFW5hUUhnvxz4K3OMIMUkhGIHXEllEkM2tEOtfE3wqQcrsl3jaSzjD6+oyOx6lVDFr7KDwFnMPtGzxFC8DiswkvjXWCh2Hm4Lvb51vfe1R8fzXn95VEp64ACBtBkZ/kXVy9zoZD6JtM8/aG54e9pZRUh5eUVEzH+CUJ0fvvzm+3ug8U49D/erbn2lxuNnm+Zm8WE3Dv+acwGRcyjZz/1ojHmdQwL+uObcjYMcR4+g5ayyizwNt9CQzzLuNf16FNJN0lrSdsbeUk2Gg7O9imisAZYlddCmv4kJoZcm28eXnJIPVbJ/djnhy48fnKWcsRFKniWRteruCRyMlYfbYT6drku3+H5UU6GiEBfNquF3c4D70GaDZsjPpQ3kcIRivC6W29WziS+AABFWElGeAAAAElJKgAIAAAABQASAQMAAQAAAAAAAAAaAQUAAQAAAEoAAAAbAQUAAQAAAFIAAAAoAQMAAQAAAAEAAABphwQAAQAAAFoAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAAIAAqAEAAEAAACwBAAAA6AEAAEAAACEAwAAAAAAAA=='
const BA_AFTER_LQIP = 'data:image/webp;base64,UklGRpYCAABXRUJQVlA4IIoCAABQDQCdASooADYAPr1Mn0qnJCKhsBgNUOAXiWYAyMvVzCir8E+jfC4zwvmAxD2SUrR7tyEKHp1bjMH0afDfcY9UyiSjiN73YXhnH3EXbTrBzuBnU6rNu44coZOoLj44QcCqY38Zb/nFvC6d3begCFineSNAAP55PGkI2+T9cuHNdee3ZQ0BWhCVndBT5WQBLQ0xbNs+ZGjMmLhoC3XZsX74zpO+vElxL7IfecL399HNP9oE+nOypRtvm8lP162rtQQB81TLwKk3alUnB1+rI95aHtYrXkIRqe43sCTtWi3SVigBrrdctTUngzSYSgrnff2L8gZst57heX2U6phei9pT7eDf0YNuH1WAXrleYZPhR1QaKDtyQk1cHDz1XTIfyw8m9GQUvc1HxHsxo35NQu0GM012dK+ax/n92ytUGqg1iY3vM/+btw30digPknFeyLZF/NPKQKg54141+EukxtBZm2zMFqPp+0JzOVhpXOEBJwSfIk9LlGOvF2O7McJzY1+HoixxY9zJTdC9IlMGEPGWogIlzGbLxuioE17TB9nycwCUOiGevVYNHj3rmezdqsTJPp1xXnrX3bKtACn4DO873uypvtfKHu/GGoMuhtfr/v/1U6+J7NPY5Xj6U+bAz5viDrG9bLZyqzTCvIFhQpw83pivAWFN+PmaHQw3LspQQxbY5L4XsS2AcAoH6MH/rcZk3Mr9rzLR8IVl4GMDiIG+l4U6esr1bLTKdloDA40rQJ3N4dnFCmuXIhlHAatc8eU7rp3Ul6eNmzsp05fMIP6b94GQW8iWfhy6KNyC37b2WCgsBnSG1S4A4ucYUcLGBZ78/ZRrtb8oIj1lsohPeCBIgB6RhtAjgAAAAA=='
const PAINS = [
  { img: PAIN_IMG.scroll, tag: '무한 스크롤', line: '뭘 올릴지 몰라 피드만 하루 1~2시간' },
  { img: PAIN_IMG.cost, tag: '외주 비용', line: '레퍼런스 외주는 편당 1~2만원' },
  { img: PAIN_IMG.luck, tag: '감으로 복불복', line: '감으로 올려 조회수는 복불복' },
]

export default function ProblemSolution() {
  const Pain = (
    <div className="w-full px-5 py-14 md:py-20">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-white/30">The Problem</div>
        <h2 className="text-center text-3xl font-bold leading-tight text-white break-keep md:text-[2.5rem]">매일 이렇게 소재를 찾고 있진 않나요?</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/50 break-keep md:text-base">쇼핑 크리에이터의 하루 — 시간도, 돈도, 확신도 새어 나갑니다.</p>
        <div className="mt-8 grid grid-cols-1 gap-3 md:mt-10 md:grid-cols-3 md:gap-5">
          {PAINS.map((p) => (
            <div key={p.tag} className="flex overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] md:block md:rounded-3xl">
              {/* 모바일: 좌측 작은 정사각 썸네일 / 데스크톱: 상단 4:3 */}
              <div className="relative aspect-square w-28 shrink-0 overflow-hidden bg-[#15161a] md:aspect-[4/3] md:w-full">
                <img src={p.img} alt={p.tag} fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d11]/60 via-transparent to-transparent" />
                <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white/85 backdrop-blur-sm md:left-3 md:top-3 md:px-2.5 md:py-1 md:text-[11px]">{p.tag}</span>
              </div>
              <div className="flex flex-1 items-center p-4 md:p-5"><p className="flex items-start gap-2 text-[14px] leading-relaxed text-white/75 md:text-[15px]"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />{p.line}</p></div>
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
        <h2 className="text-center text-3xl font-bold leading-tight text-white break-keep md:text-[2.5rem]">감으로 찾던 소재, 이제 데이터로</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/50 break-keep md:text-base">막막하게 스크롤하던 소재 찾기가, 몇 분이면 끝나는 리서치로 바뀝니다.</p>
        <div className="relative mt-8 md:mt-10">
          <div className="grid grid-cols-2 gap-3 md:gap-5">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-cover bg-center md:rounded-3xl" style={{ backgroundImage: `url(${BA_BEFORE_LQIP})` }}>
              <img src="/ba-before.webp" alt="크로닛 없이" className="h-full min-h-[210px] w-full object-cover grayscale md:min-h-[340px]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0f] via-[#0a0b0f]/80 to-[#0a0b0f]/30" />
              <div className="absolute inset-0 flex flex-col p-4 md:p-6">
                <span className="w-fit rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white/70 md:px-3 md:py-1 md:text-[12px]">크로닛 없이</span>
                <div className="mt-auto"><div className="text-[12px] text-white/70 md:text-[14px]">감으로, 흩어진 채</div><div className="mt-1 md:flex md:items-baseline md:gap-2"><span className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 md:text-[11px]">소재 찾기</span><span className="text-xl font-bold text-red-300 md:text-3xl">하루 1~2시간</span></div></div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-[#0064FF]/40 bg-cover bg-center md:rounded-3xl" style={{ backgroundImage: `url(${BA_AFTER_LQIP})` }}>
              <img src="/ba-after.webp" alt="크로닛과 함께" className="h-full min-h-[210px] w-full object-cover md:min-h-[340px]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#06122b] via-[#08152f]/75 to-[#0064FF]/10" />
              <div className="absolute inset-0 flex flex-col p-4 md:p-6">
                <span className="w-fit rounded-full bg-[#0064FF] px-2.5 py-0.5 text-[11px] font-bold text-white md:px-3 md:py-1 md:text-[12px]"><span className="mr-1 inline-block align-[-1px]"><Sparkles size={12} className="inline" /></span>크로닛과 함께</span>
                <div className="mt-3 hidden space-y-1.5 md:block">
                  {['터진 소재를 실시간으로', '왜 통했는지 데이터로 진단', '내 상품 영상용 2차 창작 가이드'].map((t) => (
                    <div key={t} className="flex items-start gap-2 text-[13px] text-white/90"><Check size={14} className="mt-0.5 shrink-0 text-[#22D3EE]" />{t}</div>
                  ))}
                </div>
                <div className="mt-auto md:flex md:items-baseline md:gap-2"><span className="block text-[10px] font-semibold uppercase tracking-wider text-white/50 md:text-[11px]">소재 찾기</span><span className="text-xl font-bold text-[#7DA2FF] md:text-3xl">단 3분</span></div>
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

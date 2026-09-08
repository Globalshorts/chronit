import { Sparkles, Check, ArrowRight } from 'lucide-react'

const PAINS = [
  { img: '/pain/scroll.webp', lqip: 'data:image/webp;base64,UklGRjwBAABXRUJQVlA4WAoAAAAIAAAAFwAAEQAAVlA4IHQAAADQBACdASoYABIAPu1srVEppaQiqAqpMB2JQBYdgiBnMfsLBi08aopGnyGIub5bFAD+wyMrD+ss8v78k9nsRY7sjBRNiHvma0dokC0sTrCuXgnAZmVu14tMaY3lJa+Xch55KG705XqMWOD3Qb63ovXUNingAEVYSUaiAAAASUkqAAgAAAAGABIBAwABAAAAAAAAABoBBQABAAAAdAAAABsBBQABAAAAfAAAACgBAwABAAAAAQAAADsBAgAeAAAAVgAAAGmHBAABAAAAhAAAAAAAAABLQVJPTElOQSBHUkFCT1dTS0EKS0FCT09NUElDUwAAAAAAAQAAAAAAAAABAAAAAgACoAQAAQAAACADAAADoAQAAQAAAFgCAAAAAAAA', tag: '무한 스크롤', line: '뭘 올릴지 몰라 피드만 하루 1~2시간' },
  { img: '/pain/cost.webp', lqip: 'data:image/webp;base64,UklGRk4BAABXRUJQVlA4WAoAAAAIAAAAFwAAEQAAVlA4IIYAAADQBACdASoYABIAPu1osFAppaSiqAqpMB2JYwC7AAt3J4IK2jjqTCpr8oMF0Yj7oAD+6VsSd4q8lssD2G1M6GOkwC+U2ESS6rAuFGAt9+M0oWJntN4a1/1i88Besitu/awmh7cFYwCJdcT0dxZ0eEJJgc954y2L4Q8Bbp8bMp5mUnjBZwAAAEVYSUaiAAAASUkqAAgAAAAGABIBAwABAAAAAAAAABoBBQABAAAAdAAAABsBBQABAAAAfAAAACgBAwABAAAAAQAAADsBAgAeAAAAVgAAAGmHBAABAAAAhAAAAAAAAABLQVJPTElOQSBHUkFCT1dTS0EKS0FCT09NUElDUwAAAAAAAQAAAAAAAAABAAAAAgACoAQAAQAAACADAAADoAQAAQAAAFgCAAAAAAAA', tag: '외주 비용', line: '레퍼런스 외주는 편당 1~2만원' },
  { img: '/pain/luck.webp', lqip: 'data:image/webp;base64,UklGRhgBAABXRUJQVlA4WAoAAAAIAAAAFwAAEQAAVlA4IHoAAADQBACdASoYABIAPu1krU+ppSQiMBgIATAdiWMAxkAQntan/Td8HAeegIK0TQgGQAD92wO2+6ay+wQT9TbSmc0KdZkWop9UOQ8oGy9r0ofp8m677Rmogu2j3UEyBxgqYHa3/Ia/T/hJ1ThERudpdKVIp8k31VEr73AAAEVYSUZ4AAAASUkqAAgAAAAFABIBAwABAAAAAAAAABoBBQABAAAASgAAABsBBQABAAAAUgAAACgBAwABAAAAAQAAAGmHBAABAAAAWgAAAAAAAAAAAAAAAQAAAAAAAAABAAAAAgACoAQAAQAAACADAAADoAQAAQAAAFgCAAAAAAAA', tag: '감으로 복불복', line: '감으로 올려 조회수는 복불복' },
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
              <div className="relative aspect-square w-28 shrink-0 overflow-hidden bg-cover bg-center md:aspect-[4/3] md:w-full" style={{ backgroundImage: `url(${p.lqip})` }}>
                <img src={p.img} alt={p.tag} fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d11] via-[#0c0d11]/20 to-transparent" />
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
            <div className="relative overflow-hidden rounded-2xl border border-white/10 md:rounded-3xl">
              <img src="/ba-before.webp" alt="크로닛 없이" className="h-full min-h-[210px] w-full object-cover grayscale md:min-h-[340px]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0f] via-[#0a0b0f]/80 to-[#0a0b0f]/30" />
              <div className="absolute inset-0 flex flex-col p-4 md:p-6">
                <span className="w-fit rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white/70 md:px-3 md:py-1 md:text-[12px]">크로닛 없이</span>
                <div className="mt-auto"><div className="text-[12px] text-white/70 md:text-[14px]">감으로, 흩어진 채</div><div className="mt-1 md:flex md:items-baseline md:gap-2"><span className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 md:text-[11px]">소재 찾기</span><span className="text-xl font-bold text-red-300 md:text-3xl">하루 1~2시간</span></div></div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-[#0064FF]/40 md:rounded-3xl">
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

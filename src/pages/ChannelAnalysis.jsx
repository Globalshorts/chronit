import FeatureLanding from '../components/FeatureLanding'

export default function ChannelAnalysis() {
  return (
    <FeatureLanding
      active="/channel-analysis"
      eyebrow="Channel Analysis"
      title={<>경쟁 계정의 <span className="text-[#A9C0FF]">공식</span>을 분석합니다</>}
      sub="경쟁 채널 링크만 넣으면 상위 릴·훅 패턴·터진 이유를 한 번에 정리해 벤치마크할 수 있습니다."
      benefits={[
        { title: '상위 콘텐츠 자동 수집', desc: '그 계정에서 반응이 좋았던 릴을 자동으로 모아 보여줍니다.' },
        { title: '훅·구성 패턴 분석', desc: '어떤 훅과 셀링포인트가 통했는지, 반복되는 성공 공식을 짚어냅니다.' },
        { title: '벤치마크 리포트', desc: '분석 결과를 내 콘텐츠에 바로 적용할 수 있게 정리합니다.' },
      ]}
      steps={[
        { title: '계정 링크 입력', desc: '분석하고 싶은 경쟁 인스타 계정 주소를 넣습니다.' },
        { title: '상위 릴 수집·분석', desc: '반응 좋은 콘텐츠를 모아 훅·구성·성과를 분석합니다.' },
        { title: '벤치마크 리포트', desc: '통한 패턴을 정리해 내 영상에 적용할 포인트를 제안합니다.' },
      ]}
      ctaTo="/register" ctaText="무료로 시작하기"
      altTo="/research" altText="리서치에서 실행"
    />
  )
}

import FeatureLanding from '../components/FeatureLanding'

export default function FastBench() {
  return (
    <FeatureLanding
      active="/fastbench"
      eyebrow="FastBench"
      badge="프로 · 비즈니스 전용"
      title={<>확산이 시작되기 전에 <span className="text-[#A9C0FF]">포착</span>합니다</>}
      sub="급상승 중인 쇼핑 릴을 실시간 확산 속도로 감지해, 완전히 퍼지기 전 ‘선점 리스트’로 제공합니다."
      benefits={[
        { title: '실시간 확산 속도', desc: '릴의 댓글·조회 증가율을 시간 단위로 측정해 지금 급상승 중인지 판단합니다.' },
        { title: '급상승 구간만 선별', desc: '이미 포화된 소재는 걸러내고, 아직 안 퍼진 초기 구간의 릴만 골라냅니다.' },
        { title: '선점 리스트', desc: '남들이 따라오기 전에 먼저 제작할 수 있도록 곧 터질 소재를 앞서 확보합니다.' },
      ]}
      steps={[
        { title: '실시간 스캔', desc: '쇼핑 릴의 확산 속도를 끊임없이 측정합니다.' },
        { title: '급상승 감지', desc: '확산 속도가 튀어오르는 초기 구간을 포착합니다.' },
        { title: '선점 리스트 제공', desc: '곧 터질 소재를 먼저 확보해 남보다 앞서 제작합니다.' },
      ]}
      ctaTo="/pricing" ctaText="요금제 보기"
      altTo="/trend" altText="트렌드에서 보기"
    />
  )
}

/**
 * 기능 플래그 — 신규 기능을 "플러그인처럼" 즉시 켜고/끄기 위한 단일 소스.
 * 문제가 생기면 해당 값을 false 로 바꿔 한 줄로 비활성화 → 재배포(약 1분).
 */
export const FEATURES = {
  directUpload: true,   // ① 내 영상 직접 업로드
  trendFeed:   true,    // ② 트렌드 소스 피드 (살림 패팔)
  linkLanding: false,   // ③ 상품 링크 랜딩 페이지 (예정)
};
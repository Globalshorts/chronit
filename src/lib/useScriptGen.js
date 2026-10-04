import { useNavigate } from 'react-router-dom'
import { logEvent } from './events'

// 대본 작성 = 1클릭. 소재를 들고 바로 베라(/script)로 이동해 도착 즉시 자동 생성한다.
// (예전 2단계: 카드에서 백그라운드 생성 → 준비되면 2번째 클릭 이동 → 제거. 상단 생성토스트도 함께 제거)
const EMPTY = {}
export function useScriptGen() {
  const nav = useNavigate()
  const startScript = (it, thumb) => {
    const sc = it.shortcode
    try { logEvent('trend_script_start', { shortcode: sc }) } catch { /* noop */ }
    nav('/script', { state: { source_ref: sc, caption: it.caption || '', thumbnail: thumb || '', gen: true } })
  }
  // scriptGen 은 더 이상 상태를 안 쓴다(항상 빈 객체). 소비부의 상태기반 라벨은 기본값('대본 작성')으로 떨어진다.
  return { scriptGen: EMPTY, startScript }
}

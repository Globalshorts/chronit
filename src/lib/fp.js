// 디바이스 지문(간이) — 추천 체험 기기당 1회 제한용. grant-trial이 쓰던 chronit_fp 재사용.
export function getFp() {
  try {
    let fp = localStorage.getItem('chronit_fp')
    if (!fp) { fp = (crypto?.randomUUID?.() || (String(Date.now()) + Math.random())); localStorage.setItem('chronit_fp', fp) }
    return fp
  } catch { return '' }
}

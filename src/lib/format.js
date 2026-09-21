// 숫자·시간 표기 공용 헬퍼 (트렌드/워치리스트 카드)
export const fmtCount = (n) => { n = Math.max(0, Math.trunc(Number(n) || 0)); return n >= 10000 ? (n / 10000).toFixed(1) + '만' : n >= 1000 ? (n / 1000).toFixed(1) + '천' : String(n) }
// 캡션에 박힌 계정 멘션(@handle)은 가린다 — 카드에서 핸들을 뺀 의미가 여기서 새면 소용없다.
// 이메일은 건드리지 않게 앞에 글자가 붙은 @ 는 넘긴다.
export const maskHandles = (t) => String(t || '').replace(/(^|[^\w.@])@[A-Za-z0-9._]{2,30}/g, '$1@●●●')

export const timeAgo = (ts) => { if (!ts) return ''; const h = Math.floor((Date.now() - new Date(ts).getTime()) / 3600000); if (h < 1) return '방금'; if (h < 24) return `${h}시간 전`; return `${Math.floor(h / 24)}일 전` }

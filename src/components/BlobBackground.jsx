export default function BlobBackground() {
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* 브랜드 2톤 클린 메시 — 큰 형체 2개 + 은은한 악센트 1개 */}
      <div style={{ position: 'absolute', width: '60vw', height: '60vw', left: '-10vw', top: '-14vh', borderRadius: '50%', filter: 'blur(60px)', background: 'radial-gradient(circle at 40% 40%, rgba(0,100,255,.55), rgba(0,100,255,0) 70%)' }} />
      <div style={{ position: 'absolute', width: '58vw', height: '58vw', right: '-12vw', bottom: '-18vh', borderRadius: '50%', filter: 'blur(60px)', background: 'radial-gradient(circle at 55% 55%, rgba(124,92,255,.5), rgba(124,92,255,0) 70%)' }} />
      <div style={{ position: 'absolute', width: '34vw', height: '34vw', left: '46vw', top: '38vh', borderRadius: '50%', filter: 'blur(64px)', background: 'radial-gradient(circle at 50% 50%, rgba(34,211,238,.32), rgba(34,211,238,0) 70%)' }} />
    </div>
  )
}

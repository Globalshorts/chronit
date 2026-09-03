export default function BlobBackground() {
  const blob = { position: 'absolute', borderRadius: '50%', filter: 'blur(72px)' }
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ ...blob, width: '46vw', height: '46vw', left: '-8vw', top: '-6vw', background: '#0064ff', opacity: .34 }} />
      <div style={{ ...blob, width: '40vw', height: '40vw', right: '-6vw', top: '6vh', background: '#7c5cff', opacity: .34 }} />
      <div style={{ ...blob, width: '42vw', height: '42vw', left: '20vw', bottom: '-14vw', background: '#22d3ee', opacity: .28 }} />
      <div style={{ ...blob, width: '26vw', height: '26vw', right: '14vw', bottom: '8vh', background: '#ff7ab8', opacity: .2 }} />
    </div>
  )
}

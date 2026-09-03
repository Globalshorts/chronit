export default function BlobBackground() {
  const blob = { position: 'absolute', borderRadius: '50%', filter: 'blur(38px)' }
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ ...blob, width: '38vw', height: '38vw', left: '4vw', top: '2vh', background: '#0064ff', opacity: .5 }} />
      <div style={{ ...blob, width: '34vw', height: '34vw', right: '2vw', top: '10vh', background: '#7c5cff', opacity: .48 }} />
      <div style={{ ...blob, width: '40vw', height: '40vw', left: '28vw', top: '46vh', background: '#22d3ee', opacity: .4 }} />
      <div style={{ ...blob, width: '30vw', height: '30vw', right: '10vw', bottom: '4vh', background: '#ff7ab8', opacity: .36 }} />
      <div style={{ ...blob, width: '26vw', height: '26vw', left: '2vw', bottom: '8vh', background: '#4a93ff', opacity: .4 }} />
    </div>
  )
}

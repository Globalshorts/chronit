import { useEffect, useRef } from 'react'

export default function CurveBackground() {
  const curve = useRef(null), rev = useRef(null), dot = useRef(null)
  const tip = useRef(null), num = useRef(null), m1 = useRef(null), m2 = useRef(null)

  useEffect(() => {
    const c = curve.current
    if (!c) return
    let L = 0
    try { L = c.getTotalLength() } catch { return }
    if (!L) return
    const q1 = c.getPointAtLength(L * 0.42), q2 = c.getPointAtLength(L * 0.72)
    m1.current.setAttribute('cx', q1.x); m1.current.setAttribute('cy', q1.y)
    m2.current.setAttribute('cx', q2.x); m2.current.setAttribute('cy', q2.y)
    const fmt = (v) => v >= 10000 ? (v / 10000).toFixed(1).replace(/\.0$/, '') + '만'
      : v >= 1000 ? (v / 1000).toFixed(1).replace(/\.0$/, '') + '천' : Math.round(v)
    const upd = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const p = Math.min(1, Math.max(0, window.scrollY / max))
      const e = p * p * (3 - 2 * p)
      const pt = c.getPointAtLength(L * p)
      rev.current.setAttribute('width', pt.x)
      let sx = pt.x / 1000 * window.innerWidth, sy = pt.y / 1000 * window.innerHeight
      sx = Math.min(sx, window.innerWidth - 64)
      dot.current.setAttribute('cx', pt.x); dot.current.setAttribute('cy', pt.y)
      dot.current.setAttribute('opacity', p > 0.02 ? 1 : 0)
      tip.current.style.left = sx + 'px'; tip.current.style.top = sy + 'px'
      tip.current.style.opacity = p > 0.02 ? 1 : 0
      num.current.textContent = fmt(2000 + e * 918000)
      m1.current.setAttribute('opacity', p > 0.42 ? 1 : 0)
      m2.current.setAttribute('opacity', p > 0.72 ? 1 : 0)
    }
    window.addEventListener('scroll', upd, { passive: true })
    window.addEventListener('resize', upd)
    const t = setInterval(upd, 800)
    upd()
    return () => { window.removeEventListener('scroll', upd); window.removeEventListener('resize', upd); clearInterval(t) }
  }, [])

  const fixed0 = { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }
  return (
    <>
      <div style={{ ...fixed0, background: 'radial-gradient(60vw 44vw at 78% 88%, rgba(0,110,255,.18), transparent 60%), radial-gradient(50vw 40vw at 14% 8%, rgba(120,60,255,.13), transparent 60%), #05070f' }} />
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ ...fixed0, width: '100vw', height: '100vh' }}>
        <defs>
          <linearGradient id="cbStroke" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#7c5cff" /><stop offset=".5" stopColor="#0a84ff" /><stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="cbArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a8cff" stopOpacity=".26" /><stop offset="1" stopColor="#1a8cff" stopOpacity="0" />
          </linearGradient>
          <filter id="cbGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <clipPath id="cbReveal"><rect ref={rev} x="0" y="0" width="0" height="1000" /></clipPath>
        </defs>
        <g stroke="rgba(255,255,255,.05)" strokeWidth="1" vectorEffect="non-scaling-stroke">
          <line x1="0" y1="250" x2="1000" y2="250" /><line x1="0" y1="500" x2="1000" y2="500" /><line x1="0" y1="750" x2="1000" y2="750" />
        </g>
        <path clipPath="url(#cbReveal)" fill="url(#cbArea)" d="M40,860 C220,842 350,778 490,610 C620,452 690,388 760,340 C800,313 828,262 848,205 L848,1000 L40,1000 Z" />
        <path ref={curve} clipPath="url(#cbReveal)" fill="none" stroke="url(#cbStroke)" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" filter="url(#cbGlow)" d="M40,860 C220,842 350,778 490,610 C620,452 690,388 760,340 C800,313 828,262 848,205" />
        <circle ref={m1} r="5" fill="#22d3ee" opacity="0" />
        <circle ref={m2} r="5" fill="#22d3ee" opacity="0" />
        <circle ref={dot} r="6" fill="#eaffff" opacity="0" filter="url(#cbGlow)" />
      </svg>
      <div ref={tip} style={{ position: 'fixed', zIndex: 0, transform: 'translate(-50%,-140%)', pointerEvents: 'none', textAlign: 'center', opacity: 0, transition: 'opacity .3s' }}>
        <div ref={num} style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-.5px', color: '#bfe6ff', textShadow: '0 0 18px rgba(34,211,238,.7)' }}>2천</div>
        <div style={{ fontSize: '11px', opacity: .6, color: '#cfe0f5' }}>조회수</div>
      </div>
    </>
  )
}

import React, { useEffect, useRef, useState } from 'react'

// 스크롤 진입 시 자식들이 하나씩(순차) 페이드+상승. Reveal의 stagger 버전.
export default function RevealStagger({ children, className = '', step = 100, as: Tag = 'div' }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShown(true); return }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => setShown(e.isIntersecting))
    }, { threshold: 0.12, rootMargin: '0px 0px -12% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const kids = React.Children.toArray(children).filter(Boolean)
  return (
    <Tag ref={ref} className={className}>
      {kids.map((c, i) => React.isValidElement(c)
        ? React.cloneElement(c, {
            className: `${c.props.className || ''} cr-reveal ${shown ? 'cr-in' : ''}`.trim(),
            style: { ...(c.props.style || {}), transitionDelay: `${i * step}ms` },
          })
        : c)}
    </Tag>
  )
}

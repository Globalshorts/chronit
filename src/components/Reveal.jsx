import { useEffect, useRef, useState } from 'react'

// 스크롤 진입 시 부드럽게 등장(페이드+상승). prefers-reduced-motion 존중.
export default function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShown(true); return }
    const once = window.matchMedia && window.matchMedia('(max-width: 767px)').matches
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        setShown(e.isIntersecting)
        if (once && e.isIntersecting) io.disconnect()   // 모바일: 한 번만 발동(스크롤 재애니메이션/부하 방지)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Tag ref={ref} style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`cr-reveal ${shown ? 'cr-in' : ''} ${className}`}>
      {children}
    </Tag>
  )
}

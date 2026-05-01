import { useEffect, useRef, useState } from 'react'

/**
 * Counts up from 0 to `to` when scrolled into view.
 * - duration: animation length in ms
 * - decimals: number of decimal places
 * - prefix/suffix: text appended around the number
 */
const AnimatedCounter = ({ to = 0, duration = 2000, decimals = 0, prefix = '', suffix = '' }) => {
  const [value, setValue] = useState(0)
  const ref = useRef(null)
  const startedRef = useRef(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true
            const start = performance.now()
            const tick = (now) => {
              const elapsed = now - start
              const progress = Math.min(elapsed / duration, 1)
              // easeOutExpo
              const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
              setValue(eased * to)
              if (progress < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
          }
        })
      },
      { threshold: 0.3 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [to, duration])

  const formatted =
    decimals > 0
      ? value.toFixed(decimals)
      : Math.floor(value).toLocaleString('ko-KR')

  return (
    <span ref={ref}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}

export default AnimatedCounter

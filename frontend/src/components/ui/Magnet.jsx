import { useCallback, useEffect, useRef } from 'react'

export default function Magnet({
  padding = 200,
  disabled = false,
  magnetStrength = 1,
  activeTransition = 'transform 0.3s ease-out',
  inactiveTransition = 'transform 0.5s ease-in-out',
  wrapperClassName = '',
  innerClassName = '',
  children,
}) {
  const wrapperRef = useRef(null)
  const innerRef = useRef(null)
  const rafRef = useRef(0)
  const lastTransformRef = useRef('translate3d(0px, 0px, 0px)')
  const isActiveRef = useRef(false)

  const setTransform = useCallback(
    (transform, isActive) => {
      const inner = innerRef.current
      if (!inner) return

      if (lastTransformRef.current === transform && isActiveRef.current === isActive) return

      lastTransformRef.current = transform
      isActiveRef.current = isActive
      inner.style.transition = isActive ? activeTransition : inactiveTransition
      inner.style.transform = transform
    },
    [activeTransition, inactiveTransition]
  )

  const reset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      setTransform('translate3d(0px, 0px, 0px)', false)
    })
  }, [setTransform])

  const handlePointerMove = useCallback(
    (event) => {
      if (disabled) return
      const wrapper = wrapperRef.current
      if (!wrapper) return

      const rect = wrapper.getBoundingClientRect()
      const expandedLeft = rect.left - padding
      const expandedRight = rect.right + padding
      const expandedTop = rect.top - padding
      const expandedBottom = rect.bottom + padding

      const x = event.clientX
      const y = event.clientY

      const within =
        x >= expandedLeft && x <= expandedRight && y >= expandedTop && y <= expandedBottom

      if (!within) {
        reset()
        return
      }

      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const dx = x - centerX
      const dy = y - centerY

      const rangeX = rect.width / 2 + padding
      const rangeY = rect.height / 2 + padding

      const normalizedX = rangeX === 0 ? 0 : Math.max(-1, Math.min(1, dx / rangeX))
      const normalizedY = rangeY === 0 ? 0 : Math.max(-1, Math.min(1, dy / rangeY))

      const strength = Math.max(0.1, magnetStrength)
      const maxTranslate = (padding / strength) * 2

      const translateX = normalizedX * maxTranslate
      const translateY = normalizedY * maxTranslate

      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        setTransform(
          `translate3d(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px, 0px)`,
          true
        )
      })
    },
    [disabled, magnetStrength, padding, reset, setTransform]
  )

  const handlePointerLeave = useCallback(() => {
    if (disabled) return
    reset()
  }, [disabled, reset])

  useEffect(() => {
    if (disabled) setTransform('translate3d(0px, 0px, 0px)', false)
  }, [disabled, setTransform])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div
      ref={wrapperRef}
      className={wrapperClassName}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div
        ref={innerRef}
        className={innerClassName}
        style={{
          transform: 'translate3d(0px, 0px, 0px)',
          transition: inactiveTransition,
          willChange: disabled ? undefined : 'transform',
        }}
      >
        {children}
      </div>
    </div>
  )
}

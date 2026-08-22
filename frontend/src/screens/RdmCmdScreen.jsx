import { useEffect, useMemo, useRef, useState } from 'react'
import './RdmCmdScreen.css'
import Magnet from '../components/ui/Magnet'

export default function RdmCmdScreen({
  currentPlayer,
  currentIndex,
  totalPlayers,
  error,
  slots,
  selectedIndex,
  selectedPartner,
  onSlotClick,
  onReroll,
  onOpenPartnerModal,
  onConfirmPick,
  canConfirm,
  getCardImage,
  getPartnerInfo,
  rerollsEnabled,
}) {
  if (!currentPlayer) return null

  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  const [exitIndex, setExitIndex] = useState(null)
  const timeoutRef = useRef(0)

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
  }, [])

  useEffect(() => {
    setIsAnimatingOut(false)
    setExitIndex(null)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = 0
    }
  }, [currentIndex, currentPlayer?.id])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleConfirmPick = () => {
    if (!canConfirm || isAnimatingOut) return
    if (prefersReducedMotion) {
      onConfirmPick()
      return
    }

    const animationMs = 420
    setExitIndex(selectedIndex)
    setIsAnimatingOut(true)
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = 0
      onConfirmPick()
    }, animationMs)
  }

  return (
    <section className={['panel', isAnimatingOut ? 'rdmcmd-animating' : ''].join(' ')}>
      <div className="panel-header">
        <div>
          <h2>{currentPlayer.name}</h2>
          <p>Tap a sigil to reveal a Commander.</p>
        </div>
        <div className="turn">
          Player {currentIndex + 1} of {totalPlayers}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className={['card-row', isAnimatingOut ? 'animating-out' : ''].join(' ')}>
        {slots.map((slot, index) => {
          const image = getCardImage(slot.card)
          const slotPartnerInfo = getPartnerInfo(slot.card)
          const classes = ['card-slot']
          if (slot.status === 'loading') classes.push('loading')
          if (slot.status === 'revealed') classes.push('revealed')
          if (selectedIndex === index) classes.push('selected')
          let backLabel = 'Tap to reveal'
          if (slot.status === 'loading') backLabel = 'Summoning'
          if (slot.status === 'error') backLabel = 'Error'

          const stackClasses = ['card-stack']
          if (isAnimatingOut) {
            if (exitIndex === index) stackClasses.push('fly-out-up')
            else stackClasses.push('fly-out-down')
          } else {
            stackClasses.push('fly-in')
          }

          return (
            <div
              className={stackClasses.join(' ')}
              style={{ '--fly-delay': `${index * 80}ms` }}
              key={`slot-${currentIndex}-${index}`}
            >
              <Magnet
                padding={50}
                magnetStrength={5}
                wrapperClassName="card-magnet"
                disabled={isAnimatingOut}
              >
                <button
                  className={classes.join(' ')}
                  onClick={() => onSlotClick(index)}
                  disabled={isAnimatingOut}
                  type="button"
                >
                  <div className="card-flip">
                    <div className="card-face card-back">
                      <span>{backLabel}</span>
                    </div>
                    <div className="card-face card-front">
                      {slot.status === 'revealed' && image && (
                        <img src={image} alt={slot.card?.name ?? 'Commander'} />
                      )}
                      {slot.status === 'revealed' && !image && (
                        <span>{slot.card?.name}</span>
                      )}
                    </div>
                  </div>
                </button>
              </Magnet>
              <div className="card-tools">
                {rerollsEnabled && (
                  <button
                    className="reroll"
                    onClick={() => onReroll(index)}
                    aria-label="Reroll this card"
                    disabled={isAnimatingOut}
                    type="button"
                  >
                    <i className="bi bi-arrow-clockwise" aria-hidden="true" />
                  </button>
                )}
                {slot.status === 'revealed' && slotPartnerInfo && (
                  <button
                    className="partner"
                    onClick={() => onOpenPartnerModal(slot.card)}
                    aria-label="Choose partner"
                    disabled={isAnimatingOut}
                    type="button"
                  >
                    <i className="bi bi-plus" aria-hidden="true" />
                  </button>
                )}
              </div>
              {selectedIndex === index && selectedPartner && (
                <div className="partner-selected">+ {selectedPartner.name}</div>
              )}
            </div>
          )
        })}
      </div>

      <div className="actions">
        <button
          className="primary"
          onClick={handleConfirmPick}
          disabled={!canConfirm || isAnimatingOut}
        >
          Select Commander
        </button>
      </div>
    </section>
  )
}

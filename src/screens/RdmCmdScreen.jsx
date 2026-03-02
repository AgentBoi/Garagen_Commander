import './RdmCmdScreen.css'

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

  return (
    <section className="panel">
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

      <div className="card-row">
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
          return (
            <div className="card-stack" key={`slot-${index}`}>
              <button
                className={classes.join(' ')}
                onClick={() => onSlotClick(index)}
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
              <div className="card-tools">
                {rerollsEnabled && (
                  <button
                    className="reroll"
                    onClick={() => onReroll(index)}
                    aria-label="Reroll this card"
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M20 12a8 8 0 1 1-2.35-5.65"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M20 5v5h-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
                {slot.status === 'revealed' && slotPartnerInfo && (
                  <button
                    className="partner"
                    onClick={() => onOpenPartnerModal(slot.card)}
                    aria-label="Choose partner"
                    type="button"
                  >
                    !
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
        <button className="primary" onClick={onConfirmPick} disabled={!canConfirm}>
          Select Commander
        </button>
      </div>
    </section>
  )
}

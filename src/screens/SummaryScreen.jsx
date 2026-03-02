import './SummaryScreen.css'

export default function SummaryScreen({
  picks,
  flippedPartners,
  onTogglePartnerView,
  getCardImage,
  onViewHistory,
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Commanders chosen</h2>
          <p>Every player stands with their legend.</p>
        </div>
        <button className="ghost" onClick={onViewHistory}>
          View all rounds
        </button>
      </div>
      <div className="summary-grid">
        {picks.map((pick) => (
          <div className="summary-card" key={pick.player.id}>
            <h3>{pick.player.name}</h3>
            <div
              className={`summary-images${
                flippedPartners[`current-${pick.player.id}`] ? ' is-flipped' : ''
              }`}
            >
              <img
                className="summary-main"
                src={getCardImage(pick.card)}
                alt={pick.card?.name ?? 'Commander'}
              />
              {pick.partnerCard && (
                <>
                  <img
                    className="summary-partner"
                    src={getCardImage(pick.partnerCard)}
                    alt={pick.partnerCard?.name ?? 'Partner'}
                  />
                  <button
                    className="summary-toggle"
                    type="button"
                    aria-label="Swap commander display"
                    onClick={() => onTogglePartnerView(`current-${pick.player.id}`)}
                  >
                    <i className="bi bi-arrow-repeat" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
            <p>{pick.card?.name}</p>
            {pick.partnerCard && <p>+ {pick.partnerCard?.name}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}

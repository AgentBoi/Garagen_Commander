import './SummaryScreen.css'
import './HistoryScreen.css'

export default function HistoryScreen({
  history,
  historyEmpty,
  flippedPartners,
  onTogglePartnerView,
  getCardImage,
  onStartNewRound,
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Previous rounds</h2>
          <p>All the Commander drafts you have started.</p>
        </div>
        <button className="ghost" onClick={onStartNewRound}>
          Start new round
        </button>
      </div>

      {historyEmpty && <p>No rounds yet. Start the first draft.</p>}

      <div className="history-list">
        {history.map((round) => (
          <div className="history-round" key={round.id}>
            <div className="round-meta">
              <span>Round</span>
              <span>
                {new Date(round.startedAt).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div className="summary-grid">
              {round.picks.map((pick) => (
                <div className="summary-card" key={pick.player.id}>
                  <h3>{pick.player.name}</h3>
                  <div
                    className={`summary-images${
                      flippedPartners[`${round.id}-${pick.player.id}`]
                        ? ' is-flipped'
                        : ''
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
                          onClick={() =>
                            onTogglePartnerView(`${round.id}-${pick.player.id}`)
                          }
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
          </div>
        ))}
      </div>
    </section>
  )
}

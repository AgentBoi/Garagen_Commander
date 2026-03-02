import './MonoBanScreen.css'

export default function MonoBanScreen({
  player,
  monoBanned,
  onSetMonoBanned,
  onConfirm,
  remainingPlayers,
}) {
  if (!player) return null

  return (
    <section className="panel mono-bans">
      <div className="panel-header">
        <div>
          <h2>{player.name}</h2>
          <p>Choose whether mono-colored commanders can appear.</p>
        </div>
        <div className="turn">Remaining players: {remainingPlayers}</div>
      </div>

      <div className="mono-options">
        <button
          type="button"
          className={monoBanned ? 'mono-card' : 'mono-card selected'}
          onClick={() => onSetMonoBanned(false)}
          aria-pressed={!monoBanned}
        >
          <h3>Allow mono-colored</h3>
          <p>Mono-colored commanders can appear in your pool.</p>
        </button>
        <button
          type="button"
          className={monoBanned ? 'mono-card selected' : 'mono-card'}
          onClick={() => onSetMonoBanned(true)}
          aria-pressed={monoBanned}
        >
          <h3>Ban mono-colored</h3>
          <p>Only multicolor or colorless commanders appear.</p>
        </button>
      </div>

      <div className="actions">
        <button className="primary" onClick={onConfirm}>
          Confirm choice
        </button>
      </div>
    </section>
  )
}

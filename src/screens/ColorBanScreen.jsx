import './ColorBanScreen.css'

const COLOR_LABELS = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  C: 'Colorless',
}

const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G', 'C']

export default function ColorBanScreen({
  player,
  selectedColors,
  onToggleColor,
  onConfirm,
  assets,
  remainingPlayers,
}) {
  if (!player) return null

  return (
    <section className="panel color-bans">
      <div className="panel-header">
        <div>
          <h2>{player.name}</h2>
          <p>Choose up to two colors to ban from your pool.</p>
        </div>
        <div className="turn">Remaining players: {remainingPlayers}</div>
      </div>

      <div className="mana-grid">
        {COLOR_ORDER.map((color) => {
          const selected = selectedColors.includes(color)
          return (
            <button
              key={color}
              type="button"
              className={selected ? 'mana-button selected' : 'mana-button'}
              onClick={() => onToggleColor(color)}
              aria-pressed={selected}
            >
              <img src={assets[color]} alt={COLOR_LABELS[color]} />
              <span>{COLOR_LABELS[color]}</span>
            </button>
          )
        })}
      </div>

      <div className="actions">
        <button className="primary" onClick={onConfirm}>
          Confirm bans
        </button>
      </div>
    </section>
  )
}

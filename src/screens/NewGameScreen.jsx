import './NewGameScreen.css'

export default function NewGameScreen({
  nameInput,
  onNameChange,
  onAddPlayer,
  players,
  onDragStart,
  onDrop,
  onRemovePlayer,
  onOpenOptions,
  onRandomize,
  onReady,
  canReady,
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Add players</h2>
          <p>Drag to reorder. Top player goes first.</p>
        </div>
        <div className="inline-actions">
          <button className="ghost" onClick={onOpenOptions}>
            Options
          </button>
          <button className="ghost" onClick={onRandomize}>
            Randomize order
          </button>
        </div>
      </div>

      <div className="add-row">
        <input
          type="text"
          placeholder="Player name"
          value={nameInput}
          onChange={(event) => onNameChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onAddPlayer()
            }
          }}
        />
        <button className="icon" onClick={onAddPlayer}>
          +
        </button>
      </div>

      <ul className="player-list">
        {players.map((player, index) => (
          <li
            key={player.id}
            draggable
            onDragStart={() => onDragStart(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => onDrop(index)}
          >
            <span className="drag">::</span>
            <span>{player.name}</span>
            <button className="ghost" onClick={() => onRemovePlayer(player.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="actions">
        <button className="primary" onClick={onReady} disabled={!canReady}>
          Ready
        </button>
      </div>
    </section>
  )
}

import './HomeScreen.css'

export default function HomeScreen({ onNewGame, onHistory, onChaos }) {
  return (
    <div className="home-stack">
      <section className="panel hero">
        <div>
          <h2>Random Commander</h2>
          <p>Each player chooses one of three commanders revealed at random.</p>
        </div>
        <div className="actions">
          <button className="primary" onClick={onNewGame}>
            New game
          </button>
          <button className="secondary" onClick={onHistory}>
            Previous rounds
          </button>
        </div>
      </section>

      <section className="panel hero chaos-panel">
        <div>
          <h2>Chaos Commander</h2>
          <p>Roll a d20 to unleash a table-wide effect.</p>
        </div>
        <div className="actions">
          <button className="secondary" onClick={onChaos}>
            Enter chaos mode
          </button>
        </div>
      </section>
    </div>
  )
}

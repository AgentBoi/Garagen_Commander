import './HomeScreen.css'

export default function HomeScreen({ onNewGame, onHistory }) {
  return (
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
  )
}

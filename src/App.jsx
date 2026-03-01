import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'random-commander-history-v1'

const emptySlots = () =>
  Array.from({ length: 3 }, () => ({ status: 'hidden', card: null }))

const shuffle = (list) => {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const getCardImage = (card) => {
  if (!card) return null
  if (card.image_uris?.normal) return card.image_uris.normal
  const face = card.card_faces?.find((item) => item.image_uris?.normal)
  return face?.image_uris?.normal ?? null
}

export default function App() {
  const [screen, setScreen] = useState('home')
  const [players, setPlayers] = useState([])
  const [nameInput, setNameInput] = useState('')
  const [dragIndex, setDragIndex] = useState(null)
  const [history, setHistory] = useState([])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [slots, setSlots] = useState(emptySlots)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [picks, setPicks] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setHistory(JSON.parse(stored))
      } catch {
        setHistory([])
      }
    }
  }, [])

  useEffect(() => {
    if (screen === 'draft') {
      setCurrentIndex(0)
      setPicks([])
      setSlots(emptySlots())
      setSelectedIndex(null)
      setError('')
    }
  }, [screen])

  const currentPlayer = players[currentIndex]
  const canConfirm =
    selectedIndex !== null && slots[selectedIndex]?.status === 'revealed'

  const historyEmpty = history.length === 0

  const addPlayer = () => {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setPlayers((prev) => [...prev, { id: crypto.randomUUID(), name: trimmed }])
    setNameInput('')
  }

  const removePlayer = (id) => {
    setPlayers((prev) => prev.filter((player) => player.id !== id))
  }

  const movePlayer = (from, to) => {
    if (from === to || from === null || to === null) return
    setPlayers((prev) => {
      const copy = [...prev]
      const [item] = copy.splice(from, 1)
      copy.splice(to, 0, item)
      return copy
    })
  }

  const onDragStart = (index) => setDragIndex(index)
  const onDrop = (index) => {
    movePlayer(dragIndex, index)
    setDragIndex(null)
  }

  const startDraft = () => {
    if (players.length === 0) return
    setScreen('draft')
  }

  const randomizeOrder = () => {
    setPlayers((prev) => shuffle(prev))
  }

  const revealCard = async (index) => {
    setError('')
    setSlots((prev) =>
      prev.map((slot, i) =>
        i === index ? { ...slot, status: 'loading' } : slot
      )
    )

    try {
      const response = await fetch(
        'https://api.scryfall.com/cards/random?q=is%3Acommander'
      )
      if (!response.ok) {
        throw new Error('Failed to fetch a card.')
      }
      const data = await response.json()
      setSlots((prev) =>
        prev.map((slot, i) =>
          i === index ? { status: 'revealed', card: data } : slot
        )
      )
    } catch (err) {
      setSlots((prev) =>
        prev.map((slot, i) =>
          i === index ? { status: 'error', card: null } : slot
        )
      )
      setError('Something went wrong while contacting Scryfall.')
    }
  }

  const handleSlotClick = (index) => {
    const slot = slots[index]
    if (slot.status === 'hidden') {
      revealCard(index)
      return
    }
    if (slot.status === 'revealed') {
      setSelectedIndex(index)
    }
  }

  const confirmPick = () => {
    if (!currentPlayer || !canConfirm) return
    const chosen = slots[selectedIndex].card
    const nextPicks = [...picks, { player: currentPlayer, card: chosen }]
    setPicks(nextPicks)

    if (currentIndex === players.length - 1) {
      const newRound = {
        id: crypto.randomUUID(),
        startedAt: new Date().toISOString(),
        picks: nextPicks,
      }
      const updatedHistory = [newRound, ...history]
      setHistory(updatedHistory)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory))
      setScreen('summary')
      return
    }

    setCurrentIndex((prev) => prev + 1)
    setSlots(emptySlots())
    setSelectedIndex(null)
  }

  const rerollSlot = (index) => {
    setSelectedIndex((prev) => (prev === index ? null : prev))
    setError('')
    revealCard(index)
  }

  const summaryPicks = useMemo(() => {
    if (screen === 'summary') return picks
    if (screen === 'history-detail' && history[0]) return history[0].picks
    return []
  }, [screen, picks, history])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="sigil" aria-hidden="true">*</span>
          <div>
            <p className="eyebrow">Magic: The Gathering</p>
            <h1>Random Commander</h1>
          </div>
        </div>
        {screen !== 'home' && (
          <button className="ghost" onClick={() => setScreen('home')}>
            Back to start
          </button>
        )}
      </header>

      {screen === 'home' && (
        <section className="panel hero">
          <div>
            <h2>Choose your ritual</h2>
            <p>
              Spin a new Commander round or revisit the battles you already
              played.
            </p>
          </div>
          <div className="actions">
            <button className="primary" onClick={() => setScreen('new')}>
              New game
            </button>
            <button
              className="secondary"
              onClick={() => setScreen('history')}
            >
              Previous rounds
            </button>
          </div>
        </section>
      )}

      {screen === 'new' && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Add players</h2>
              <p>Drag to reorder. Top player goes first.</p>
            </div>
            <button className="ghost" onClick={randomizeOrder}>
              Randomize order
            </button>
          </div>

          <div className="add-row">
            <input
              type="text"
              placeholder="Player name"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
            />
            <button className="icon" onClick={addPlayer}>
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
                <button className="ghost" onClick={() => removePlayer(player.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div className="actions">
            <button className="primary" onClick={startDraft} disabled={!players.length}>
              Ready
            </button>
          </div>
        </section>
      )}

      {screen === 'draft' && currentPlayer && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{currentPlayer.name}</h2>
              <p>Tap a sigil to reveal a Commander.</p>
            </div>
            <div className="turn">Player {currentIndex + 1} of {players.length}</div>
          </div>

          {error && <p className="error">{error}</p>}

          <div className="card-row">
            {slots.map((slot, index) => {
              const image = getCardImage(slot.card)
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
                    onClick={() => handleSlotClick(index)}
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
                  <button
                    className="reroll"
                    onClick={() => rerollSlot(index)}
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
                </div>
              )
            })}
          </div>

          <div className="actions">
            <button className="primary" onClick={confirmPick} disabled={!canConfirm}>
              Select Commander
            </button>
          </div>
        </section>
      )}

      {screen === 'summary' && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Commanders chosen</h2>
              <p>Every player stands with their legend.</p>
            </div>
            <button className="ghost" onClick={() => setScreen('history')}>
              View all rounds
            </button>
          </div>
          <div className="summary-grid">
            {summaryPicks.map((pick) => (
              <div className="summary-card" key={pick.player.id}>
                <h3>{pick.player.name}</h3>
                <img
                  src={getCardImage(pick.card)}
                  alt={pick.card?.name ?? 'Commander'}
                />
                <p>{pick.card?.name}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {screen === 'history' && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Previous rounds</h2>
              <p>All the Commander drafts you have started.</p>
            </div>
            <button className="ghost" onClick={() => setScreen('new')}>
              Start new round
            </button>
          </div>

          {historyEmpty && <p>No rounds yet. Start the first ritual.</p>}

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
                      <img
                        src={getCardImage(pick.card)}
                        alt={pick.card?.name ?? 'Commander'}
                      />
                      <p>{pick.card?.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

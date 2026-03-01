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

const getOracleText = (card) => {
  if (!card) return ''
  if (card.oracle_text) return card.oracle_text
  if (card.card_faces) {
    return card.card_faces.map((face) => face.oracle_text || '').join('\n')
  }
  return ''
}

const getTypeLine = (card) => (card?.type_line ? card.type_line : '')

const normalizePartnerWithName = (name) =>
  name
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/[.]+$/, '')
    .trim()

const getPartnerInfo = (card) => {
  const oracle = getOracleText(card)
  if (!oracle) return null
  const partnerWith = oracle.match(/Partner with ([^\n]+)/i)
  if (partnerWith) {
    return { type: 'partner-with', name: partnerWith[1].trim() }
  }
  const partnerDash = oracle.match(/Partner\s*[—-]\s*([^\n]+)/i)
  if (partnerDash) {
    return { type: 'partner-dash', label: partnerDash[1].trim() }
  }
  if (/Choose a Background/i.test(oracle)) {
    return { type: 'choose-background' }
  }
  if (/Doctor's companion/i.test(oracle)) {
    return { type: 'doctors-companion' }
  }
  if (/Friends forever/i.test(oracle)) {
    return { type: 'friends-forever' }
  }
  if (/\bPartner\b/i.test(oracle)) {
    return { type: 'partner' }
  }
  if (/Time Lord Doctor/i.test(getTypeLine(card))) {
    return { type: 'time-lord-doctor' }
  }
  return null
}

const fetchAllCards = async (query) => {
  const results = []
  let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
    query
  )}&unique=cards`
  while (url) {
    const response = await fetch(url)
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.details || 'Failed to fetch cards.')
    }
    results.push(...data.data)
    url = data.has_more ? data.next_page : null
  }
  return results
}

export default function App() {
  const [screen, setScreen] = useState('home')
  const [players, setPlayers] = useState([])
  const [nameInput, setNameInput] = useState('')
  const [dragIndex, setDragIndex] = useState(null)
  const [history, setHistory] = useState([])
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [partnerOnly, setPartnerOnly] = useState(false)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [slots, setSlots] = useState(emptySlots)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [picks, setPicks] = useState([])
  const [error, setError] = useState('')
  const [partnerModalOpen, setPartnerModalOpen] = useState(false)
  const [partnerOptions, setPartnerOptions] = useState([])
  const [partnerLoading, setPartnerLoading] = useState(false)
  const [partnerError, setPartnerError] = useState('')
  const [partnerCard, setPartnerCard] = useState(null)
  const [selectedPartner, setSelectedPartner] = useState(null)
  const [flippedPartners, setFlippedPartners] = useState({})

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
      setPartnerModalOpen(false)
      setPartnerOptions([])
      setPartnerLoading(false)
      setPartnerError('')
      setPartnerCard(null)
      setSelectedPartner(null)
    }
  }, [screen])

  const currentPlayer = players[currentIndex]
  const partnerInfo =
    selectedIndex !== null ? getPartnerInfo(slots[selectedIndex]?.card) : null
  const requiresPartner = Boolean(partnerInfo)
  const canConfirm =
    selectedIndex !== null &&
    slots[selectedIndex]?.status === 'revealed' &&
    (!requiresPartner || selectedPartner)

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

  const getCommanderQuery = () => {
    const baseQuery = 'is:commander legal:commander'
    if (!partnerOnly) return baseQuery
    return [
      baseQuery,
      '(',
      'o:"Partner with"',
      'or o:"Partner—"',
      'or o:"Partner -"',
      'or o:"Partner"',
      'or o:"Choose a Background"',
      'or o:"Friends forever"',
      'or o:"Doctor\'s companion"',
      'or type:"time lord doctor"',
      ')',
    ].join(' ')
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
        `https://api.scryfall.com/cards/random?q=${encodeURIComponent(
          getCommanderQuery()
        )}`
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
      setSelectedPartner(null)
      setPartnerCard(slot.card)
    }
  }

  const fetchPartnerOptions = async (card) => {
    const info = getPartnerInfo(card)
    if (!info) return []

    if (info.type === 'partner-with') {
      const targetName = normalizePartnerWithName(info.name)
      const response = await fetch(
        `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(
          targetName
        )}`
      )
      const data = await response.json()
      if (!response.ok) {
        const fallback = await fetch(
          `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(
            targetName
          )}`
        )
        const fallbackData = await fallback.json()
        if (
          !fallback.ok ||
          !fallbackData?.name ||
          fallbackData.name.toLowerCase() !== targetName.toLowerCase()
        ) {
          throw new Error(fallbackData?.details || 'Failed to fetch partner.')
        }
        return [fallbackData]
      }
      return [data]
    }

    if (info.type === 'partner-dash') {
      const label = info.label.replace(/"/g, '')
      if (/friends\s+forever/i.test(label)) {
        return fetchAllCards('o:"Friends forever"')
      }
      return fetchAllCards(
        `o:"Partner—${label}" or o:"Partner - ${label}" is:commander`
      )
    }

    if (info.type === 'choose-background') {
      return fetchAllCards('type:background is:commander')
    }

    if (info.type === 'doctors-companion') {
      return fetchAllCards('type:"time lord doctor" is:commander')
    }

    if (info.type === 'time-lord-doctor') {
      return fetchAllCards('o:"Doctor\'s companion" is:commander')
    }

    if (info.type === 'friends-forever') {
      try {
        return await fetchAllCards('o:"Friends forever"')
      } catch {
        return fetchAllCards('oracle:"Friends forever"')
      }
    }

    if (info.type === 'partner') {
      return fetchAllCards('o:"Partner" -o:"Partner with" -o:"Partner—" is:commander')
    }

    return []
  }

  const openPartnerModal = async (card) => {
    if (!card) return
    setPartnerModalOpen(true)
    setPartnerCard(card)
    setPartnerOptions([])
    setPartnerLoading(true)
    setPartnerError('')
    setSelectedPartner(null)
    try {
      const options = await fetchPartnerOptions(card)
      const filtered = options.filter((option) => option.name !== card.name)
      setPartnerOptions(filtered)
      if (!filtered.length) {
        setPartnerError('No partner options found for this card.')
      }
    } catch (err) {
      setPartnerError('Failed to load partner options.')
    } finally {
      setPartnerLoading(false)
    }
  }

  const closePartnerModal = () => {
    setPartnerModalOpen(false)
  }

  const confirmPick = () => {
    if (!currentPlayer || !canConfirm) return
    const chosen = slots[selectedIndex].card
    const nextPicks = [
      ...picks,
      { player: currentPlayer, card: chosen, partnerCard: selectedPartner },
    ]
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
    setSelectedPartner(null)
    setPartnerCard(null)
  }

  const rerollSlot = (index) => {
    setSelectedIndex((prev) => (prev === index ? null : prev))
    if (selectedIndex === index) {
      setSelectedPartner(null)
      setPartnerCard(null)
      setPartnerModalOpen(false)
    }
    setError('')
    revealCard(index)
  }

  const summaryPicks = useMemo(() => {
    if (screen === 'summary') return picks
    if (screen === 'history-detail' && history[0]) return history[0].picks
    return []
  }, [screen, picks, history])

  const togglePartnerView = (key) => {
    setFlippedPartners((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div>
            <p className="eyebrow">Magic: The Gathering</p>
            <h1>Garagen Commander</h1>
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
            <h2>Random Commander</h2>
            <p>
              Each player chooses one of three commanders revealed at random.
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
            <div className="inline-actions">
              <button className="ghost" onClick={() => setOptionsOpen(true)}>
                Options
              </button>
              <button className="ghost" onClick={randomizeOrder}>
                Randomize order
              </button>
            </div>
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
                  <div className="card-tools">
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
                    {slot.status === 'revealed' && slotPartnerInfo && (
                      <button
                        className="partner"
                        onClick={() => openPartnerModal(slot.card)}
                        aria-label="Choose partner"
                        type="button"
                      >
                        !
                      </button>
                    )}
                  </div>
                  {selectedIndex === index && selectedPartner && (
                    <div className="partner-selected">
                      + {selectedPartner.name}
                    </div>
                  )}
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
                <div
                  className={`summary-images${
                    flippedPartners[`current-${pick.player.id}`]
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
                          togglePartnerView(`current-${pick.player.id}`)
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
                                togglePartnerView(
                                  `${round.id}-${pick.player.id}`
                                )
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
      )}

      {partnerModalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>Choose a partner</h2>
                <p>{partnerCard?.name}</p>
              </div>
              <button className="ghost" onClick={closePartnerModal}>
                Close
              </button>
            </div>
            {partnerLoading && <p>Loading partner options...</p>}
            {partnerError && <p className="error">{partnerError}</p>}
            <div className="modal-grid">
              {partnerOptions.map((option) => (
                <button
                  key={option.id}
                  className={
                    selectedPartner?.id === option.id
                      ? 'modal-card selected'
                      : 'modal-card'
                  }
                  onClick={() => setSelectedPartner(option)}
                  type="button"
                >
                  <img
                    src={getCardImage(option)}
                    alt={option.name}
                    loading="lazy"
                  />
                  <span>{option.name}</span>
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button className="primary" onClick={closePartnerModal}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {optionsOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>Draft options</h2>
                <p>Control what commanders can appear.</p>
              </div>
              <button className="ghost" onClick={() => setOptionsOpen(false)}>
                Close
              </button>
            </div>
            <div className="option-row">
              <div>
                <h3>Partner-only pool</h3>
                <p>
                  Limit to Partner, Partner with, Partner—X, Background, Friends
                  forever, and Doctor&#39;s companion commanders.
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={partnerOnly}
                  onChange={(event) => setPartnerOnly(event.target.checked)}
                />
                <span className="slider" aria-hidden="true" />
              </label>
            </div>
            <div className="modal-actions">
              <button className="primary" onClick={() => setOptionsOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

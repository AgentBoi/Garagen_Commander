import { useEffect, useRef, useState } from 'react'
import './ChaosScreen.css'
import { shuffle } from '../utils/cardUtils'

const EFFECTS = {
  1: 'Each player draws a card',
  2: 'Each player gains 5 life',
  3: 'Each player may play an additional land this round',
  4: 'All creatures gain haste this round',
  5: 'All spells cost {1} less this round',
  6: 'Each player discards a card, then draws a card',
  7: 'Each player sacrifices a creature',
  8: 'Each player creates a 2/2 creature token',
  9: 'Random player draws 3 cards',
  10: 'The next spell you cast this turn is copied',
  11: 'Destroy a nonland permanent of a random player',
  12: 'All creatures get +3/+3 until end of turn',
  13: 'Each player may cast a spell from their hand for free this round',
  14: 'Exile the top card of each library. You may cast it this turn (you may spend any color of mana to cast those cards)',
  15: 'Each player discards their hand, then draws that many cards',
  16: 'Current player takes an extra turn after this one',
  17: 'All creatures must attack if possible and can not attack you until your next turn',
  18: 'Each player reveals their hand; you may cast one spell from it without paying its cost',
  19: 'Gain control of target nonland permanent an opponent controls',
  20: 'Roll twice more (if you roll a second 20, discard it and roll again)',
}

const rollD20 = () => Math.floor(Math.random() * 20) + 1

const rollBonus = () => {
  let value = rollD20()
  while (value === 20) {
    value = rollD20()
  }
  return value
}

export default function ChaosScreen({ onOpenOptions = () => {} }) {
  const [screen, setScreen] = useState('setup')
  const [players, setPlayers] = useState([])
  const [nameInput, setNameInput] = useState('')
  const [dragIndex, setDragIndex] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [ongoingEffects, setOngoingEffects] = useState([])

  const [rolling, setRolling] = useState(false)
  const [result, setResult] = useState(null)
  const [effectText, setEffectText] = useState('')
  const [rollKey, setRollKey] = useState(0)
  const [reelSequence, setReelSequence] = useState(() =>
    Array.from({ length: 80 }, (_, index) => (index % 20) + 1)
  )
  const [offsetPx, setOffsetPx] = useState(0)
  const [rollDurationMs, setRollDurationMs] = useState(0)

  const timeoutsRef = useRef([])
  const itemHeight = 96

  const loops = 2
  const rollDuration = 2800

  const isOngoingEffect = (text) => {
    if (!text) return false
    return /\bthis round\b|\buntil end of round\b|\buntil your next turn\b/i.test(
      text
    )
  }

  const shuffleNumbers = () => {
    const numbers = Array.from({ length: 20 }, (_, index) => index + 1)
    for (let i = numbers.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[numbers[i], numbers[j]] = [numbers[j], numbers[i]]
    }
    return numbers
  }

  useEffect(() => {
    if (!players.length) {
      setCurrentIndex(0)
      return
    }
    setCurrentIndex((prev) => (prev >= players.length ? 0 : prev))
  }, [players.length])

  useEffect(() => {
    if (screen === 'roll') {
      setRolling(false)
      setResult(null)
      setEffectText('')
      setRollDurationMs(0)
      setOffsetPx(0)
    }
  }, [screen])

  useEffect(() => {
    return () => {
      for (const id of timeoutsRef.current) {
        window.clearTimeout(id)
      }
      timeoutsRef.current = []
    }
  }, [])

  const queueTimeout = (fn, delay) => {
    const id = window.setTimeout(fn, delay)
    timeoutsRef.current.push(id)
    return id
  }

  const currentPlayer = players[currentIndex]
  const currentPlayerLabel = currentPlayer?.name || 'Open play'
  const canStart = Boolean(players.length)

  const addPlayer = () => {
    if (rolling) return
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setPlayers((prev) => [...prev, { id: crypto.randomUUID(), name: trimmed }])
    setNameInput('')
    setCurrentIndex(0)
  }

  const removePlayer = (id) => {
    if (rolling) return
    setPlayers((prev) => prev.filter((player) => player.id !== id))
    setCurrentIndex(0)
  }

  const movePlayer = (from, to) => {
    if (rolling) return
    if (from === to || from === null || to === null) return
    setPlayers((prev) => {
      const copy = [...prev]
      const [item] = copy.splice(from, 1)
      copy.splice(to, 0, item)
      return copy
    })
    setCurrentIndex(0)
  }

  const onDragStart = (index) => {
    if (rolling) return
    setDragIndex(index)
  }

  const onDrop = (index) => {
    if (rolling) return
    movePlayer(dragIndex, index)
    setDragIndex(null)
  }

  const randomizeOrder = () => {
    if (rolling) return
    setPlayers((prev) => shuffle(prev))
    setCurrentIndex(0)
  }

  const startRolling = () => {
    if (rolling) return
    if (!players.length) return
    setCurrentIndex(0)
    setOngoingEffects([])
    setScreen('roll')
  }

  const handleRoll = () => {
    if (rolling) return
    if (!players.length) return

    const roller = players[currentIndex]
    if (!roller) return

    // Ongoing effects expire when the same player rolls again.
    setOngoingEffects((prev) =>
      prev.filter((effect) => effect.playerId !== roller.id)
    )

    setRolling(true)
    setResult(null)
    setEffectText('')

    const playerCount = players.length
    const nextIndex = playerCount ? (currentIndex + 1) % playerCount : 0

    const base = shuffleNumbers()
    setReelSequence(Array.from({ length: base.length * loops }, (_, i) => base[i % base.length]))

    // Compute the outcome up-front so we can animate to the exact number.
    const value = rollD20()
    const outcome =
      value === 20
        ? (() => {
            const bonusOne = rollBonus()
            const bonusTwo = rollBonus()
            const bonusEffects = [`${bonusOne}: ${EFFECTS[bonusOne]}`, `${bonusTwo}: ${EFFECTS[bonusTwo]}`].join('\n')
            return {
              value: 20,
              bonusRolls: [bonusOne, bonusTwo],
              effectText: `Bonus rolls: ${bonusOne} and ${bonusTwo}.\n ${bonusEffects}`,
            }
          })()
        : { value, effectText: EFFECTS[value], bonusRolls: [] }

    const indexInBase = base.indexOf(outcome.value)
    const targetIndex = indexInBase + base.length * (loops - 1)
    const targetOffset = -targetIndex * itemHeight

    // Reset instantly, then start a smooth roll that slows down into the target.
    setRollDurationMs(0)
    setOffsetPx(0)
    queueTimeout(() => {
      setRollDurationMs(rollDuration)
      setOffsetPx(targetOffset)
    }, 30)

    queueTimeout(() => {
      setResult(outcome.value)
      setEffectText(outcome.effectText)
      setRollKey((prev) => prev + 1)
      setRolling(false)

      const effectsToAdd = []
      if (outcome.value === 20 && outcome.bonusRolls?.length) {
        for (const bonus of outcome.bonusRolls) {
          const text = EFFECTS[bonus]
          if (isOngoingEffect(text)) {
            effectsToAdd.push({
              id: crypto.randomUUID(),
              playerId: roller.id,
              playerName: roller.name,
              roll: bonus,
              text,
            })
          }
        }
      } else if (isOngoingEffect(outcome.effectText)) {
        effectsToAdd.push({
          id: crypto.randomUUID(),
          playerId: roller.id,
          playerName: roller.name,
          roll: outcome.value,
          text: outcome.effectText,
        })
      }

      if (effectsToAdd.length) {
        setOngoingEffects((prev) => [...prev, ...effectsToAdd])
      }

      setCurrentIndex(nextIndex)
    }, rollDuration)
  }

  return (
    <section className="panel chaos">
      <div className="panel-header">
        <div>
          <h2>Chaos Commander</h2>
          {screen === 'setup' ? (
            <p>Add players, set order, then roll.</p>
          ) : (
            <p>Click the d20 in the beginning of your first main phase to unleash a random effect. Don't roll in extra turns!</p>
          )}
        </div>

        <div className="inline-actions">
          {screen === 'setup' ? (
            <>
              <button
                className="ghost"
                type="button"
                onClick={onOpenOptions}
                disabled={rolling}
              >
                Options
              </button>
              <button
                className="ghost"
                type="button"
                onClick={randomizeOrder}
                disabled={rolling || !players.length}
              >
                Randomize order
              </button>
            </>
          ) : (
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setScreen('setup')
                setOngoingEffects([])
                setCurrentIndex(0)
              }}
              disabled={rolling}
            >
              Change Players
            </button>
          )}
        </div>
      </div>

      {screen === 'setup' ? (
        <>
          <div className="add-row">
            <input
              type="text"
              placeholder="Player name"
              value={nameInput}
              disabled={rolling}
              onChange={(event) => setNameInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addPlayer()
                }
              }}
            />
            <button className="icon" onClick={addPlayer} disabled={rolling}>
              +
            </button>
          </div>

          <ul className="player-list">
            {players.map((player, index) => (
              <li
                key={player.id}
                className={index === currentIndex ? 'current' : ''}
                draggable={!rolling}
                onDragStart={() => onDragStart(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => onDrop(index)}
              >
                <span className="drag">::</span>
                <span>{player.name}</span>
                <button
                  className="ghost"
                  onClick={() => removePlayer(player.id)}
                  disabled={rolling}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div className="actions">
            <button
              className="primary"
              type="button"
              onClick={startRolling}
              disabled={!canStart}
            >
              Ready
            </button>
          </div>
        </>
      ) : (
        <div className="chaos-roll-layout">
          <div className="chaos-stage">
            <div className="chaos-current">
              <p className="chaos-current-label">
                {rolling ? 'Currently rolling' : 'Next up'}
              </p>
              <h3 className="chaos-current-player">{currentPlayerLabel}</h3>
            </div>

            <button
              type="button"
              className={rolling ? 'chaos-die rolling' : 'chaos-die'}
              onClick={handleRoll}
              aria-label="Roll a d20"
            >
              <div
                className={result && !rolling ? 'slot-window settled' : 'slot-window'}
              >
                <div
                  className={rolling ? 'reel rolling' : 'reel'}
                  style={{
                    '--offset': `${offsetPx}px`,
                    '--item-height': `${itemHeight}px`,
                    '--roll-duration': `${rollDurationMs}ms`,
                  }}
                >
                  {reelSequence.map((value, index) => (
                    <div className="reel-item" key={`slot-${index}-${value}`}>
                      {value}
                    </div>
                  ))}
                </div>
                <div className="slot-result" aria-hidden={rolling || !result}>
                  {result ?? ''}
                </div>
              </div>
              <span className="die-label">Roll</span>
            </button>

            <div className="chaos-result" key={rollKey}>
              {result ? <h3>Rolled {result}</h3> : <h3>Ready to roll</h3>}
              {effectText && <p>{effectText}</p>}
              {!effectText && result === 20 && <p>{EFFECTS[20]}</p>}
            </div>
          </div>

          <aside className="chaos-ongoing" aria-label="Ongoing effects">
            <div className="chaos-ongoing-header">
              <h3>Ongoing effects</h3>
            </div>

            {!ongoingEffects.length ? (
              <p className="chaos-ongoing-empty">None</p>
            ) : (
              <ul className="chaos-ongoing-list">
                {ongoingEffects.map((effect) => (
                  <li key={effect.id} className="chaos-ongoing-item">
                    <div className="chaos-ongoing-meta">
                      <span className="chaos-ongoing-player">
                        {effect.playerName}
                      </span>
                      <span className="chaos-ongoing-roll">{effect.roll}</span>
                    </div>
                    <p className="chaos-ongoing-text">{effect.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </section>
  )
}

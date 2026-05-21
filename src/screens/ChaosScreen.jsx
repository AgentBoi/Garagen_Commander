import { useEffect, useRef, useState } from 'react'
import './ChaosScreen.css'
import { shuffle } from '../utils/cardUtils'
import creatureKeywords from '../utils/creature_keywords.json'
import { fetchRandomCreatureTokenEffectText } from '../utils/scryfallUtils'

const EFFECTS = {
  1: 'Each player draws a card',
  2: 'Each player gains 5 life',
  3: 'Each player may play an additional land this round',
  4: 'All creatures gain haste this round',
  5: 'All spells cost {1} less this round',
  6: 'Each player discards a card, then draws a card',
  7: 'Each player sacrifices a creature',
  8: 'Each player creates a random creature token', // special case! => see getEffectText
  9: 'Random player draws 3 cards', // special case! => see getEffectText
  10: 'The next spell you cast this turn is copied',
  11: 'Destroy a nonland permanent of a random opponent', // special case! => see getEffectText
  12: 'Your creatures gain a random keyword until end of turn', // special case! => see getEffectText
  13: 'Each player may cast a spell from their hand for free this round',
  14: 'Exile the top card of each library. You may cast it this turn (you may spend any color of mana to cast those cards)',
  15: 'Each player shuffles their hand into their library, then draws that many cards',
  16: 'Current player takes an extra turn after this one',
  17: 'All creatures must attack if possible and can not attack you until your next turn',
  18: 'Each player reveals their hand; you may cast one spell from it without paying its cost',
  19: 'Gain control of target nonland permanent an opponent controls',
  20: 'Roll twice more (if you roll a second 20, discard it and roll again)',
}

// Validate and normalize keywords data.
const KEYWORDS = Array.isArray(creatureKeywords?.keywords)
  ? creatureKeywords.keywords
  : []

/**
 * Pick a random keyword, weighted by the "weight" property. If weights are missing or invalid, falls back to uniform selection.
 * @returns {Object|null} The selected keyword, or null if no keywords are available.
 */
const pickRandomKeyword = () => {
  if (!KEYWORDS.length) return null

  let totalWeight = 0
  for (const keyword of KEYWORDS) {
    const weight = Number(keyword?.weight)
    if (Number.isFinite(weight) && weight > 0) {
      totalWeight += weight
    }
  }

  // If weights are missing/invalid, fall back to uniform selection.
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)]
  }

  // Weighted random selection. A higher weight increases the chances of that keyword being selected.
  let roll = Math.random() * totalWeight
  for (const keyword of KEYWORDS) {
    const weight = Number(keyword?.weight)
    const normalized = Number.isFinite(weight) && weight > 0 ? weight : 0
    roll -= normalized
    if (roll <= 0) return keyword
  }

  // Fallback (floating point edge cases)
  return KEYWORDS[KEYWORDS.length - 1]
}

// Simulate rolling a d20, returning a value from 1 to 20.
const rollD20 = () => Math.floor(Math.random() * 20) + 1

/**
 * Simulate a bonus roll for when the initial roll is a 20. If the bonus roll is also a 20, it doesn't trigger additional rolls (to avoid infinite loops).
 * @returns {number} The bonus roll value.
 */
const rollBonus = () => {
  let value = rollD20()
  while (value === 20) {
    value = rollD20()
  }
  return value
}

/**
 * ChaosScreen component manages the state and logic for the Chaos Commander game mode, including player setup, rolling mechanics, and ongoing effects.
 * @param {*} param0 - The component props.
 * @param {function} param0.onOpenOptions - Callback to open the options modal.
 * @param {boolean} param0.debugEnabled - Whether debug mode is enabled, allowing manual input of rolls.
 * @returns {JSX.Element} The rendered ChaosScreen component.
 */
export default function ChaosScreen({
  onOpenOptions = () => { },
  debugEnabled = false,
}) {
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

  const timeoutsRef = useRef([]) // Ref to keep track of active timeouts for cleanup. This allows us to clear any pending timeouts if the component unmounts or if a new roll starts before the previous one finishes, preventing memory leaks and ensuring that state updates don't occur on an unmounted component.
  const itemHeight = 96 // Height of each number in the reel animation, in pixels. This should match the actual height defined in CSS for proper alignment during the roll animation. Adjust as needed if you change the styling.

  const loops = 2 // Number of times to loop through the full sequence of numbers during the roll animation. Higher means a longer, more suspenseful roll, but also a longer wait time before the result is revealed.
  const rollDuration = 2800 // Total duration of the roll animation in milliseconds. This should be long enough to allow the animation to slow down and land on the final result, but not so long that it feels unresponsive. Adjust as needed based on testing and user feedback.

  // Helper function to determine if an effect text indicates an ongoing effect that should persist until a certain condition is met (e.g., end of round, next turn). This is used to manage the list of ongoing effects and when they should expire.
  const isOngoingEffect = (text) => {
    if (!text) return false
    return /\bthis round\b|\buntil end of round\b|\buntil your next turn\b/i.test(
      text
    )
  }

  /**
   * Generate a shuffled sequence of numbers from 1 to 20. This is used to create the reel animation for the d20 roll,
   * ensuring that the numbers appear in a random order each time. The function implements the Fisher-Yates shuffle algorithm for an unbiased shuffle.
   * @returns {number[]} The shuffled sequence of numbers.
   */
  const shuffleNumbers = () => {
    const numbers = Array.from({ length: 20 }, (_, index) => index + 1)
    for (let i = numbers.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
        ;[numbers[i], numbers[j]] = [numbers[j], numbers[i]]
    }
    return numbers
  }

  /**
   * Effect to reset the current player index when the number of players changes. If the current index is out of bounds (e.g., if the last player was removed), it resets to 0.
   * This ensures that the game state remains consistent and prevents errors when trying to access a player that no longer exists.
   * @param {number} players.length - The current number of players.
   * @returns {void} 
   */
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

  const currentPlayer = players[currentIndex] // If there are no players, currentPlayer will be undefined. In that case, we can display "Open play" or a similar message to indicate that the rolls are happening without a specific player.
  const currentPlayerLabel = currentPlayer?.name || 'Open play'
  const canStart = Boolean(players.length)

  const pickRandomPlayer = ({ excludeId } = {}) => {
    if (!players.length) return null
    const pool = excludeId
      ? players.filter((player) => player.id !== excludeId)
      : players
    if (!pool.length) return null
    return pool[Math.floor(Math.random() * pool.length)]
  }

  /**
   * Get the effect text for a given roll. For certain rolls, the effect text includes dynamic information based on a random player or keyword.
   * This function handles those special cases and returns the appropriate text to be displayed after a roll.
   * @param {number} roll - The value of the roll (1-20).
   * @param {Object} roller - The player object representing the current roller, used for effects that depend on the roller's identity.
   * @returns {string} The effect text corresponding to the roll.
   */
  const getEffectText = (roll, roller) => {
    if (roll === 8) {
      return EFFECTS[8]
    }
    if (roll === 9) {
      const chosen = pickRandomPlayer()
      if (!chosen) return EFFECTS[9]
      return `Random player (${chosen.name}) draws 3 cards`
    }

    if (roll === 11) {
      const chosen = pickRandomPlayer({ excludeId: roller?.id })
      if (!chosen) return EFFECTS[11]
      return `Destroy a nonland permanent of a random player (${chosen.name})`
    }

    if (roll === 12) {
      const keyword = pickRandomKeyword()
      if (!keyword?.name) return EFFECTS[12]
      const suffix = keyword.description ? `\n("${keyword.description}")` : ''
      return `Your creatures gain ${keyword.name} until end of turn${suffix}`
    }

    return EFFECTS[roll]
  }

  /**
   * Add a new player to the game. This function checks if the game is currently rolling (in which case it does nothing), trims the input name
   * and if it's not empty, adds a new player object with a unique ID to the players state.
   * It then clears the name input and resets the current index to 0 to ensure the new player is included in the turn order.
   * @returns {void}
   */
  const addPlayer = () => {
    if (rolling) return
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setPlayers((prev) => [...prev, { id: crypto.randomUUID(), name: trimmed }])
    setNameInput('')
    setCurrentIndex(0)
  }

  /**
   * Remove a player from the game by their ID. This function checks if the game is currently rolling (in which case it does nothing), and if not, it filters out the player with the specified ID from the players state.
   * After removing the player, it resets the current index to 0 to ensure the turn order remains consistent and doesn't point to an invalid index.
   * @param {*} id - The unique ID of the player to be removed.
   * @returns {void}
   */
  const removePlayer = (id) => {
    if (rolling) return
    setPlayers((prev) => prev.filter((player) => player.id !== id))
    setCurrentIndex(0)
  }

  /**
   * Move a player from one position in the turn order to another. This function checks if the game is currently rolling (in which case it does nothing), and if not, it checks that the source and destination indices are valid and not the same.
   * It then creates a copy of the players array, removes the player from the source index, and inserts them at the destination index. Finally, it updates the players state with the new order and resets the current index to 0 to ensure the turn order is consistent.
   * @param {*} from - The current index of the player to be moved.
   * @param {*} to - The target index where the player should be moved to.
   * @returns {void}
   */
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

  /**
   * Handle the start of a drag operation for a player.
   * @param {number} index - The index of the player being dragged.
   * @returns {void}
   */
  const onDragStart = (index) => {
    if (rolling) return
    setDragIndex(index)
  }

  /**
   * Handle the drop of a player in a new position. This function checks if the game is currently rolling (in which case it does nothing), and if not, it calls the movePlayer function to update the order of players based on the drag and drop action.
   * After moving the player, it resets the dragIndex to null to indicate that no player is currently being dragged.
   * @param {number} index - The index where the player is dropped.
   * @returns {void}
   */
  const onDrop = (index) => {
    if (rolling) return
    movePlayer(dragIndex, index)
    setDragIndex(null)
  }

  /**
   * Randomize the order of players in the game. This function checks if the game is currently rolling (in which case it does nothing), and if not, it shuffles the players array and resets the current index to 0.
   * @returns {void}
   */
  const randomizeOrder = () => {
    if (rolling) return
    setPlayers((prev) => shuffle(prev))
    setCurrentIndex(0)
  }

  /**
   * Start the rolling phase of the game. This function checks if the game is currently rolling (in which case it does nothing), and if not, it checks that there are players in the game.
   * It then resets the current index to 0, clears any ongoing effects, and switches the screen to the 'roll' view where players can start rolling for effects.
   * @returns {void}
   */
  const startRolling = () => {
    if (rolling) return
    if (!players.length) return
    setCurrentIndex(0)
    setOngoingEffects([])
    setScreen('roll')
  }

  /**
   * Perform a roll for the current player. This function checks if the game is currently rolling (in which case it does nothing), and if not, it checks that there are players in the game.
   * It then retrieves the current player, filters out any ongoing effects for that player, and initiates the rolling animation.
   * @param {*} forcedValue - An optional value to force the roll result.
   * @returns {void}
   */
  const performRoll = (forcedValue) => {
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
    setReelSequence(
      Array.from(
        { length: base.length * loops },
        (_, i) => base[i % base.length]
      )
    )

    // Compute the outcome up-front so we can animate to the exact number.
    const value = Number.isInteger(forcedValue) ? forcedValue : rollD20()

    const getEffectTextAsync = async (roll) => {
      if (roll === 8) return fetchRandomCreatureTokenEffectText(EFFECTS[8])
      return getEffectText(roll, roller)
    }

    const outcome =
      value === 20
        ? (() => {
          const bonusOne = rollBonus()
          const bonusTwo = rollBonus()
          return {
            value: 20,
            bonusRolls: [bonusOne, bonusTwo],
          }
        })()
        : { value, effectText: getEffectText(value, roller), bonusRolls: [] }

    const effectTextPromise =
      value === 20
        ? (async () => {
          const [bonusOne, bonusTwo] = outcome.bonusRolls
          const [bonusOneText, bonusTwoText] = await Promise.all([
            getEffectTextAsync(bonusOne),
            getEffectTextAsync(bonusTwo),
          ])
          return [
            `(NAT 20!) Two bonus rolls: ${bonusOne} and ${bonusTwo}.`,
            `${bonusOne}: ${bonusOneText}`,
            `${bonusTwo}: ${bonusTwoText}`,
          ].join('\n')
        })()
        : getEffectTextAsync(value)

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
      effectTextPromise
        .then((text) => setEffectText(text))
        .catch(() => setEffectText(getEffectText(value, roller)))
      setRollKey((prev) => prev + 1)
      setRolling(false)

      const effectsToAdd = []
      if (outcome.value === 20 && outcome.bonusRolls?.length) {
        for (const bonus of outcome.bonusRolls) {
          const text = getEffectText(bonus, roller)
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

  const handleRoll = () => {
    performRoll()
  }

  const handleDebugRoll = () => {
    if (rolling) return
    if (!players.length) return

    const raw = window.prompt('Debug roll: enter a number from 1 to 20', '1')
    if (raw === null) return

    const forced = Number.parseInt(raw, 10)
    if (!Number.isFinite(forced) || forced < 1 || forced > 20) return

    performRoll(forced)
  }

  return (
    <section className="panel chaos">
      <div className="panel-header">
        <div>
          <h2>Chaos Commander</h2>
          {screen === 'setup' ? (
            <p>Add players, set order, then roll.</p>
          ) : (
            <p>Click the d20 in the beginning of your first main phase   to unleash a random effect. Don't roll in extra turns!</p>
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
            <>
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
              {debugEnabled && (
                <button
                  className="ghost"
                  type="button"
                  onClick={handleDebugRoll}
                  disabled={rolling || !players.length}
                  aria-label="Debug: choose the next roll"
                >
                  Debug
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {screen === 'setup' ? (
        <>
          <div className="add-row">
            <input
              className="nameInput"
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

import { useEffect, useRef, useState } from 'react'
import './ChaosScreen.css'

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
  10: 'The next spell cast this turn is copied',
  11: 'Destroy a nonland permanent of a random player',
  12: 'All creatures get +3/+3 until end of turn',
  13: 'Each player may cast a spell from their hand for free this round',
  14: 'Exile the top card of each library; you may play it this turn (you may spend any color of mana to cast those cards)',
  15: 'Each player discards their hand, then draws that many cards',
  16: 'Current player takes an extra turn after this one',
  17: 'All creatures are goaded until your next turn (cant attack current player)',
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

export default function ChaosScreen() {
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

  const shuffleNumbers = () => {
    const numbers = Array.from({ length: 20 }, (_, index) => index + 1)
    for (let i = numbers.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[numbers[i], numbers[j]] = [numbers[j], numbers[i]]
    }
    return numbers
  }

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

  const handleRoll = () => {
    if (rolling) return
    setRolling(true)
    setResult(null)
    setEffectText('')

    const base = shuffleNumbers()
    setReelSequence(Array.from({ length: base.length * loops }, (_, i) => base[i % base.length]))

    // Compute the outcome up-front so we can animate to the exact number.
    const value = rollD20()
    const outcome =
      value === 20
        ? (() => {
            const bonusOne = rollBonus()
            const bonusTwo = rollBonus()
            const bonusEffects = [EFFECTS[bonusOne], EFFECTS[bonusTwo]].join(' / ')
            return {
              value: 20,
              effectText: `Bonus rolls: ${bonusOne} and ${bonusTwo}. ${bonusEffects}`,
            }
          })()
        : { value, effectText: EFFECTS[value] }

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
    }, rollDuration)
  }

  return (
    <section className="panel chaos">
      <div className="panel-header">
        <div>
          <h2>Chaos Commander</h2>
          <p>Click the d20 to unleash a random table effect.</p>
        </div>
      </div>

      <div className="chaos-stage">
        <button
          type="button"
          className={rolling ? 'chaos-die rolling' : 'chaos-die'}
          onClick={handleRoll}
          aria-label="Roll a d20"
        >
          <div className={result && !rolling ? 'slot-window settled' : 'slot-window'}>
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
    </section>
  )
}

import { useEffect, useMemo, useState } from 'react'
import './App.css'
import HomeScreen from './screens/HomeScreen'
import NewGameScreen from './screens/NewGameScreen'
import RdmCmdScreen from './screens/RdmCmdScreen'
import SummaryScreen from './screens/SummaryScreen'
import HistoryScreen from './screens/HistoryScreen'
import ColorBanScreen from './screens/ColorBanScreen'
import MonoBanScreen from './screens/MonoBanScreen'
import ChaosScreen from './screens/ChaosScreen'
import PartnerModal from './components/PartnerModal'
import OptionsModal from './components/OptionsModal'
import { emptySlots, shuffle, getCardImage } from './utils/cardUtils'
import { getPartnerInfo, fetchPartnerOptions } from './utils/partnerUtils'
import whiteMana from './assets/mana_symbols/white_mana.png'
import blueMana from './assets/mana_symbols/blue_mana.png'
import blackMana from './assets/mana_symbols/black_mana.png'
import redMana from './assets/mana_symbols/red_mana.png'
import greenMana from './assets/mana_symbols/green_mana.png'
import colorlessMana from './assets/mana_symbols/colorless_mana.png'

const STORAGE_KEY = 'random-commander-history-v1'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [players, setPlayers] = useState([])
  const [nameInput, setNameInput] = useState('')
  const [dragIndex, setDragIndex] = useState(null)
  const [history, setHistory] = useState([])
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [partnerOnly, setPartnerOnly] = useState(false)
  const [colorBans, setColorBans] = useState(false)
  const [monoChoiceEnabled, setMonoChoiceEnabled] = useState(false)
  const [rerollsEnabled, setRerollsEnabled] = useState(true)
  const [colorBanIndex, setColorBanIndex] = useState(0)
  const [playerBans, setPlayerBans] = useState({})
  const [monoBanIndex, setMonoBanIndex] = useState(0)
  const [playerMonoBans, setPlayerMonoBans] = useState({})

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
    if (colorBans) {
      setPlayerBans({})
      setColorBanIndex(0)
      if (monoChoiceEnabled) {
        setPlayerMonoBans({})
        setMonoBanIndex(0)
      }
      setScreen('color-bans')
      return
    }
    if (monoChoiceEnabled) {
      setPlayerMonoBans({})
      setMonoBanIndex(0)
      setScreen('mono-bans')
      return
    }
    setScreen('draft')
  }

  const randomizeOrder = () => {
    setPlayers((prev) => shuffle(prev))
  }

  const getCommanderQuery = (bans) => {
    const baseQuery = 'is:commander legal:commander'
    const filters = []
    if (partnerOnly) {
      filters.push(
        '(',
        'o:"Partner with"',
        'or o:"Partner—"',
        'or o:"Partner -"',
        'or o:"Partner"',
        'or o:"Choose a Background"',
        'or o:"Friends forever"',
        'or o:"Doctor\'s companion"',
        'or type:"time lord doctor"',
        ')'
      )
    }

    if (bans && bans.length) {
      const bannedSet = new Set(bans)
      const allColors = ['W', 'U', 'B', 'R', 'G']
      const allowed = allColors.filter((color) => !bannedSet.has(color))

      if (allowed.length === 0) {
        filters.push('id<=0')
      } else {
        filters.push(`id<=${allowed.join('')}`)
      }

      if (bannedSet.has('C')) {
        filters.push('-c:c')
      }
    }

    return [baseQuery, ...filters].join(' ')
  }

  const revealCard = async (index) => {
    setError('')
    setSlots((prev) =>
      prev.map((slot, i) =>
        i === index ? { ...slot, status: 'loading' } : slot
      )
    )

    try {
      const activeBans = colorBans
        ? playerBans[currentPlayer?.id] ?? []
        : []
      const activeMonoBan = monoChoiceEnabled
        ? playerMonoBans[currentPlayer?.id] ?? false
        : false
      const response = await fetch(
        `https://api.scryfall.com/cards/random?q=${encodeURIComponent(
          getCommanderQuery(activeBans) + (activeMonoBan ? ' -id<=1' : '')
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

  const handleToggleColorBan = (color) => {
    const player = players[colorBanIndex]
    if (!player) return
    setPlayerBans((prev) => {
      const current = prev[player.id] ?? []
      if (current.includes(color)) {
        return {
          ...prev,
          [player.id]: current.filter((item) => item !== color),
        }
      }
      if (current.length >= 2) return prev
      return {
        ...prev,
        [player.id]: [...current, color],
      }
    })
  }

  const confirmColorBans = () => {
    if (colorBanIndex >= players.length - 1) {
      if (monoChoiceEnabled) {
        setMonoBanIndex(0)
        setScreen('mono-bans')
        return
      }
      setScreen('draft')
      return
    }
    setColorBanIndex((prev) => prev + 1)
  }

  const handleSetMonoBanned = (value) => {
    const player = players[monoBanIndex]
    if (!player) return
    setPlayerMonoBans((prev) => ({
      ...prev,
      [player.id]: value,
    }))
  }

  const confirmMonoBans = () => {
    if (monoBanIndex >= players.length - 1) {
      setScreen('draft')
      return
    }
    setMonoBanIndex((prev) => prev + 1)
  }

  const colorBanPlayer = colorBans ? players[colorBanIndex] : null
  const colorBanSelections = colorBanPlayer
    ? playerBans[colorBanPlayer.id] ?? []
    : []
  const monoBanPlayer = monoChoiceEnabled ? players[monoBanIndex] : null
  const monoBanSelection = monoBanPlayer
    ? playerMonoBans[monoBanPlayer.id] ?? false
    : false
  const manaAssets = {
    W: whiteMana,
    U: blueMana,
    B: blackMana,
    R: redMana,
    G: greenMana,
    C: colorlessMana,
  }

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="brand"
          type="button"
          onClick={() => setScreen('home')}
          aria-label="Go to home"
        >
          <div>
            <p className="eyebrow">Magic: The Gathering</p>
            <h1>Garagen Commander</h1>
          </div>
        </button>
        {screen !== 'home' && (
          <button className="ghost" onClick={() => setScreen('home')}>
            Back to start
          </button>
        )}
      </header>

      {screen === 'home' && (
        <HomeScreen
          onNewGame={() => setScreen('new')}
          onChaos={() => setScreen('chaos')}
          onHistory={() => setScreen('history')}
        />
      )}

      {screen === 'new' && (
        <NewGameScreen
          nameInput={nameInput}
          onNameChange={setNameInput}
          onAddPlayer={addPlayer}
          players={players}
          onDragStart={onDragStart}
          onDrop={onDrop}
          onRemovePlayer={removePlayer}
          onOpenOptions={() => setOptionsOpen(true)}
          onRandomize={randomizeOrder}
          onReady={startDraft}
          canReady={Boolean(players.length)}
        />
      )}

      {screen === 'color-bans' && colorBanPlayer && (
        <ColorBanScreen
          player={colorBanPlayer}
          selectedColors={colorBanSelections}
          onToggleColor={handleToggleColorBan}
          onConfirm={confirmColorBans}
          assets={manaAssets}
          remainingPlayers={players.length - colorBanIndex}
        />
      )}

      {screen === 'chaos' && <ChaosScreen />}

      {screen === 'mono-bans' && monoBanPlayer && (
        <MonoBanScreen
          player={monoBanPlayer}
          monoBanned={monoBanSelection}
          onSetMonoBanned={handleSetMonoBanned}
          onConfirm={confirmMonoBans}
          remainingPlayers={players.length - monoBanIndex}
        />
      )}

      {screen === 'draft' && (
        <RdmCmdScreen
          currentPlayer={currentPlayer}
          currentIndex={currentIndex}
          totalPlayers={players.length}
          error={error}
          slots={slots}
          selectedIndex={selectedIndex}
          selectedPartner={selectedPartner}
          onSlotClick={handleSlotClick}
          onReroll={rerollSlot}
          onOpenPartnerModal={openPartnerModal}
          onConfirmPick={confirmPick}
          canConfirm={canConfirm}
          getCardImage={getCardImage}
          getPartnerInfo={getPartnerInfo}
          rerollsEnabled={rerollsEnabled}
        />
      )}

      {screen === 'summary' && (
        <SummaryScreen
          picks={summaryPicks}
          flippedPartners={flippedPartners}
          onTogglePartnerView={togglePartnerView}
          getCardImage={getCardImage}
          onViewHistory={() => setScreen('history')}
        />
      )}

      {screen === 'history' && (
        <HistoryScreen
          history={history}
          historyEmpty={historyEmpty}
          flippedPartners={flippedPartners}
          onTogglePartnerView={togglePartnerView}
          getCardImage={getCardImage}
          onStartNewRound={() => setScreen('new')}
        />
      )}

      {partnerModalOpen && (
        <PartnerModal
          partnerCard={partnerCard}
          partnerLoading={partnerLoading}
          partnerError={partnerError}
          partnerOptions={partnerOptions}
          selectedPartner={selectedPartner}
          onSelectPartner={setSelectedPartner}
          onClose={closePartnerModal}
          getCardImage={getCardImage}
        />
      )}

      {optionsOpen && (
        <OptionsModal
          partnerOnly={partnerOnly}
          colorBans={colorBans}
          monoChoiceEnabled={monoChoiceEnabled}
          rerollsEnabled={rerollsEnabled}
          onTogglePartnerOnly={setPartnerOnly}
          onToggleColorBans={setColorBans}
          onToggleMonoChoice={setMonoChoiceEnabled}
          onToggleRerolls={setRerollsEnabled}
          onClose={() => setOptionsOpen(false)}
        />
      )}
    </div>
  )
}

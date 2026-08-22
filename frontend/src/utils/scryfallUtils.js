const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const RANDOM_CREATURE_TOKEN_QUERY = 'type:creature tou>0 pow>0 is:token'

const DEFAULT_RANDOM_CREATURE_TOKEN_FALLBACK_TEXT =
  'Each player creates a random creature token'

const COLOR_IDENTITY_TO_NAME = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
}

const formatColorIdentityLetters = (colorIdentity) => {
  const letters = Array.isArray(colorIdentity)
    ? colorIdentity.filter((letter) => typeof letter === 'string')
    : []
  return letters.length ? letters.join('') : 'colorless'
}

const formatColorIdentityWords = (colorIdentity) => {
  const letters = Array.isArray(colorIdentity)
    ? colorIdentity.filter((letter) => typeof letter === 'string')
    : []

  const words = letters
    .map((letter) => COLOR_IDENTITY_TO_NAME[letter])
    .filter(Boolean)

  return words.length ? words.join(' ') : 'Colorless'
}

const formatOracleTextOneLine = (oracleText) => {
  if (typeof oracleText !== 'string') return ''
  return oracleText.replace(/\s+/g, ' ').trim()
}

export const formatCreatureTokenEffectText = (
  tokenCard,
  fallbackText = DEFAULT_RANDOM_CREATURE_TOKEN_FALLBACK_TEXT
) => {
  const name = tokenCard?.name
  const power = tokenCard?.power
  const toughness = tokenCard?.toughness

  if (!name) return fallbackText

  const colorIdentityWords = formatColorIdentityWords(tokenCard?.color_identity)

  const oracleText = formatOracleTextOneLine(tokenCard?.oracle_text)
  const withClause = oracleText ? ` with "${oracleText}"` : ''

  const tokenName = [name].filter(Boolean)

  if (power != null && toughness != null) {
    return `Each player creates a ${power}/${toughness}  ${colorIdentityWords} ${tokenName} token${withClause}`
  }

  return `Each player creates a  ${colorIdentityWords} ${tokenName} token${withClause}`
}

const fetchScryfallJson = async (url) => {
  const response = await fetch(url)

  let data = null
  try {
    data = await response.json()
  } catch {
    // Ignore JSON parsing errors; we'll throw a generic message below.
  }

  if (!response.ok) {
    throw new Error(
      data?.details || data?.message || 'Failed to fetch from Scryfall.'
    )
  }

  return data
}

const buildApiUrl = (path, params = {}) => {
  const url = new URL(API_BASE_URL + path, window.location.origin)

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  return url.toString()
}

export const fetchRandomCard = async (query) => {
  return fetchScryfallJson(
    buildApiUrl('/scryfall/cards/random', { query })
  )
}

export const fetchNamedCardExact = async (name) => {
  return fetchScryfallJson(
    buildApiUrl('/scryfall/cards/named/exact', { name })
  )
}

export const fetchNamedCardFuzzy = async (name) => {
  return fetchScryfallJson(
    buildApiUrl('/scryfall/cards/named/fuzzy', { name })
  )
}

export const fetchAllCards = async (query) => {
  return fetchScryfallJson(
    buildApiUrl('/scryfall/cards/search', { query })
  )
}

// Convenience helper used by Chaos mode (roll 8).
// Keeps query + error-handling out of UI code.
export const fetchRandomCreatureToken = async () => {
  try {
    return await fetchRandomCard(RANDOM_CREATURE_TOKEN_QUERY)
  } catch {
    return null
  }
}

export const fetchRandomCreatureTokenEffectText = async (
  fallbackText = DEFAULT_RANDOM_CREATURE_TOKEN_FALLBACK_TEXT
) => {
  const token = await fetchRandomCreatureToken()
  return formatCreatureTokenEffectText(token, fallbackText)
}

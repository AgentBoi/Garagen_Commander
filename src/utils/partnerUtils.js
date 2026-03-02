import { getOracleText, getTypeLine } from './cardUtils'

export const normalizePartnerWithName = (name) =>
  name.replace(/\s*\([^)]*\)\s*$/, '').replace(/[.]+$/, '').trim()

export const getPartnerInfo = (card) => {
  const oracle = getOracleText(card)
  if (!oracle) return null
  const partnerWith = oracle.match(/Partner with ([^\n]+)/i)
  if (partnerWith) {
    return { type: 'partner-with', name: partnerWith[1].trim() }
  }
  const partnerDash = oracle.match(/Partner\s*[\u2014-]\s*([^\n]+)/i)
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

export const fetchAllCards = async (query) => {
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

export const fetchPartnerOptions = async (card) => {
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
      `o:"Partner\u2014${label}" or o:"Partner - ${label}" is:commander`
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
    return fetchAllCards(
      'o:"Partner" -o:"Partner with" -o:"Partner\u2014" is:commander'
    )
  }

  return []
}

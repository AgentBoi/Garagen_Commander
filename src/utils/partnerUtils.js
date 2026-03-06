import { getOracleText, getTypeLine } from './cardUtils'
import {
  fetchAllCards,
  fetchNamedCardExact,
  fetchNamedCardFuzzy,
} from './scryfallUtils'

export const normalizePartnerWithName = (name) =>
  name.replace(/\s*\([^)]*\)\s*$/, '').replace(/[.]+$/, '').trim()

export const normalizePartnerDashLabel = (label) =>
  label.replace(/\s*\([^)]*\)\s*$/, '').trim()

export const getPartnerInfo = (card) => {
  const oracle = getOracleText(card)
  if (!oracle) return null
  const partnerWith = oracle.match(/Partner with ([^\n]+)/i)
  if (partnerWith) {
    return { type: 'partner-with', name: partnerWith[1].trim() }
  }
  const partnerDash = oracle.match(/Partner\s*[\u2014-]\s*([^\n]+)/i)
  if (partnerDash) {
    return {
      type: 'partner-dash',
      label: normalizePartnerDashLabel(partnerDash[1].trim()),
    }
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

export { fetchAllCards }

export const fetchPartnerOptions = async (card) => {
  const info = getPartnerInfo(card)
  if (!info) return []

  if (info.type === 'partner-with') {
    const targetName = normalizePartnerWithName(info.name)

    try {
      const data = await fetchNamedCardExact(targetName)
      return [data]
    } catch {
      const fallbackData = await fetchNamedCardFuzzy(targetName)
      if (
        !fallbackData?.name ||
        fallbackData.name.toLowerCase() !== targetName.toLowerCase()
      ) {
        throw new Error('Failed to fetch partner.')
      }
      return [fallbackData]
    }
  }

  if (info.type === 'partner-dash') {
    const label = normalizePartnerDashLabel(info.label).replace(/"/g, '')
    if (/friends\s+forever/i.test(label)) {
      return fetchAllCards('o:"Friends forever"')
    }
    return fetchAllCards(
      `o:"Partner\u2014${label}" is:commander`
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

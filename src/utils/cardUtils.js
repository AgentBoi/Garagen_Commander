export const emptySlots = () =>
  Array.from({ length: 3 }, () => ({ status: 'hidden', card: null }))

export const shuffle = (list) => {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export const getCardImage = (card) => {
  if (!card) return null
  if (card.image_uris?.normal) return card.image_uris.normal
  const face = card.card_faces?.find((item) => item.image_uris?.normal)
  return face?.image_uris?.normal ?? null
}

export const getOracleText = (card) => {
  if (!card) return ''
  if (card.oracle_text) return card.oracle_text
  if (card.card_faces) {
    return card.card_faces.map((face) => face.oracle_text || '').join('\n')
  }
  return ''
}

export const getTypeLine = (card) => (card?.type_line ? card.type_line : '')

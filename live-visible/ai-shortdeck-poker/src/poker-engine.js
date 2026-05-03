/* ============================================
   短牌德州扑克引擎 (Short Deck / 6+ Hold'em)
   ============================================ */

export const SUITS = ['♠', '♥', '♣', '♦']
export const RANKS = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

export const RANK_VALUE = {
  '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14,
}

export const SUIT_COLORS = {
  '♠': '#a0a0a0',
  '♣': '#a0a0a0',
  '♥': '#ff6b7a',
  '♦': '#ff6b7a',
}

/** 创建36张短牌牌组 */
export function createDeck() {
  const deck = []
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({ suit: s, rank: r, value: RANK_VALUE[r] })
    }
  }
  return deck
}

/** Fisher-Yates 洗牌 */
export function shuffle(deck) {
  const a = [...deck]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 从 n 个元素中取 k 个的所有组合 */
function combinations(arr, k) {
  const result = []
  function backtrack(start, path) {
    if (path.length === k) {
      result.push([...path])
      return
    }
    for (let i = start; i < arr.length; i++) {
      path.push(arr[i])
      backtrack(i + 1, path)
      path.pop()
    }
  }
  backtrack(0, [])
  return result
}

/** 判断5张牌是否为顺子，返回 { isStraight, highCard } */
function checkStraight(values) {
  const uniq = [...new Set(values)].sort((a, b) => a - b)
  if (uniq.length !== 5) return { isStraight: false, highCard: 0 }

  // 正常顺子
  if (uniq[4] - uniq[0] === 4) {
    return { isStraight: true, highCard: uniq[4] }
  }

  // 特殊顺子: A-6-7-8-9 (A当5)
  const hasA = uniq.includes(14)
  const has6 = uniq.includes(6)
  const has7 = uniq.includes(7)
  const has8 = uniq.includes(8)
  const has9 = uniq.includes(9)
  if (hasA && has6 && has7 && has8 && has9) {
    return { isStraight: true, highCard: 9 } // 5-6-7-8-9 以9为高
  }

  return { isStraight: false, highCard: 0 }
}

/** 判断5张牌的牌型 (短牌规则: 同花 > 葫芦) */
function getHandRank(cards5) {
  const values = cards5.map(c => c.value).sort((a, b) => a - b)
  const suits = cards5.map(c => c.suit)
  const isFlush = suits.every(s => s === suits[0])
  const { isStraight, highCard: straightHigh } = checkStraight(values)

  // 同花顺 / 皇家同花顺
  if (isFlush && isStraight) {
    const isRoyal = straightHigh === 14
    return {
      rank: 10,
      name: isRoyal ? '皇家同花顺' : '同花顺',
      tiebreaker: [straightHigh],
    }
  }

  // 统计牌值频率
  const freq = {}
  values.forEach(v => { freq[v] = (freq[v] || 0) + 1 })
  const entries = Object.entries(freq)
    .map(([v, c]) => [parseInt(v), c])
    .sort((a, b) => b[1] - a[1] || b[0] - a[0])

  // 四条
  if (entries[0][1] === 4) {
    const kicker = values.find(v => v !== entries[0][0])
    return { rank: 9, name: '四条', tiebreaker: [entries[0][0], kicker] }
  }

  // 同花 (短牌中同花 > 葫芦)
  if (isFlush) {
    return {
      rank: 8,
      name: '同花',
      tiebreaker: [...values].sort((a, b) => b - a),
    }
  }

  // 葫芦
  if (entries[0][1] === 3 && entries[1][1] === 2) {
    return {
      rank: 7,
      name: '葫芦',
      tiebreaker: [entries[0][0], entries[1][0]],
    }
  }

  // 顺子
  if (isStraight) {
    return { rank: 6, name: '顺子', tiebreaker: [straightHigh] }
  }

  // 三条
  if (entries[0][1] === 3) {
    const kickers = values.filter(v => v !== entries[0][0]).sort((a, b) => b - a)
    return { rank: 5, name: '三条', tiebreaker: [entries[0][0], ...kickers] }
  }

  // 两对
  if (entries[0][1] === 2 && entries[1][1] === 2) {
    const pair1 = entries[0][0]
    const pair2 = entries[1][0]
    const kicker = values.find(v => v !== pair1 && v !== pair2)
    return {
      rank: 4,
      name: '两对',
      tiebreaker: [Math.max(pair1, pair2), Math.min(pair1, pair2), kicker],
    }
  }

  // 一对
  if (entries[0][1] === 2) {
    const kickers = values.filter(v => v !== entries[0][0]).sort((a, b) => b - a)
    return { rank: 3, name: '一对', tiebreaker: [entries[0][0], ...kickers] }
  }

  // 高牌
  return {
    rank: 2,
    name: '高牌',
    tiebreaker: [...values].sort((a, b) => b - a),
  }
}

/** 从7张牌(2手牌+5公共牌)中找出最佳5张组合 */
export function evaluateHand(holeCards, communityCards) {
  const all = [...holeCards, ...communityCards]
  const combos = combinations(all, 5)
  let best = null
  for (const combo of combos) {
    const result = getHandRank(combo)
    if (!best || compareRank(result, best) > 0) {
      best = { ...result, cards: combo }
    }
  }
  return best
}

/** 比较两个牌型结果，正数表示a大 */
function compareRank(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank
  for (let i = 0; i < a.tiebreaker.length; i++) {
    if (a.tiebreaker[i] !== b.tiebreaker[i]) {
      return a.tiebreaker[i] - b.tiebreaker[i]
    }
  }
  return 0
}

/** 比较两手牌，返回 'left' | 'right' | 'tie' */
export function compareHands(leftHole, rightHole, communityCards) {
  const leftBest = evaluateHand(leftHole, communityCards)
  const rightBest = evaluateHand(rightHole, communityCards)
  const cmp = compareRank(leftBest, rightBest)
  if (cmp > 0) return { winner: 'left', leftBest, rightBest }
  if (cmp < 0) return { winner: 'right', leftBest, rightBest }
  return { winner: 'tie', leftBest, rightBest }
}

/** 简单评估2张底牌的潜力 (用于AI决策) */
export function getHoleCardStrength(cards) {
  const v1 = cards[0].value
  const v2 = cards[1].value
  const sameSuit = cards[0].suit === cards[1].suit
  const pair = cards[0].rank === cards[1].rank

  let score
  if (pair) {
    score = 60 + v1 // AA=74, 66=66
  } else {
    score = (v1 + v2) * 2
    if (sameSuit) score += 12
    const gap = Math.abs(v1 - v2)
    if (gap <= 2) score += 8
    else if (gap <= 4) score += 4
  }
  return score
}

/** 根据当前牌力选择思考类型 */
export function pickThinkType(strength, isAllIn = false) {
  if (isAllIn) {
    return Math.random() > 0.5 ? 'panic' : 'confident'
  }
  if (strength >= 80) {
    const pool = ['confident', 'happy', 'normal']
    return pool[Math.floor(Math.random() * pool.length)]
  }
  if (strength >= 55) {
    const pool = ['normal', 'analyze', 'confident']
    return pool[Math.floor(Math.random() * pool.length)]
  }
  if (strength >= 35) {
    const pool = ['hesitate', 'analyze', 'normal']
    return pool[Math.floor(Math.random() * pool.length)]
  }
  const pool = ['hesitate', 'sad', 'analyze', 'panic']
  return pool[Math.floor(Math.random() * pool.length)]
}

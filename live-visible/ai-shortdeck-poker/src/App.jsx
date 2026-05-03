import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import ThreeScene from './ThreeScene.jsx'
import {
  createDeck, shuffle, evaluateHand, compareHands,
  getHoleCardStrength, pickThinkType, SUIT_COLORS,
} from './poker-engine.js'

/* ===== 思考类型 ===== */
const THINK_TYPES = {
  analyze:   { label: '深度分析',  expr: 'analyzing', texts: ['短牌里成牌率太高了，对手范围很宽...这次我要谨慎一点','公共牌面很湿，顺子听牌太多了，要小心','他在短牌里这么激进，范围可能是真强牌'] },
  confident: { label: '自信满满',  expr: 'confident', texts: ['A-K同花！短牌里这手牌可以强势加注','两对！在短牌里已经很强了，要保护底池','我中了同花！短牌里同花比葫芦还大，无敌了！'] },
  hesitate:  { label: '犹豫不决',  expr: 'thinking',  texts: ['没中牌...但短牌里诈唬成功率更高','转牌没中，但A可以当5，还有顺子听牌','要不要在这里偷一下...短牌节奏太快了'] },
  panic:     { label: '被逼绝境',  expr: 'shocked',   texts: ['全下！短牌里不能怂！','ALL IN...36张牌运气成分很大，赌一把','他连续加注，但短牌里什么都有可能'] },
  sad:       { label: '沮丧无奈',  expr: 'sad',       texts: ['这手牌在短牌里也打不了...弃牌','又被读透了...短牌运气太差','苦牙西...'] },
  happy:     { label: '得意洋洋',  expr: 'winning',   texts: ['底池全部收下~','ふふん♪','对手完全在我的计算之中，短牌也一样'] },
  normal:    { label: '冷静观察',  expr: 'idle',      texts: ['位置不利，但短牌底池赔率很好，跟注看看','翻牌中了对子，短牌里对子很强了','相信自己的读牌'] },
}

/* ===== 开场放话 ===== */
const INTRO_LINES = {
  left:  ['今晚的底池我全包了。', '短牌才是我的主场。', '准备好输光筹码了吗？', '36张牌，我看你怎么赢。'],
  right: ['话别说太早，短牌里运气才是一切。', '我会让你后悔坐上这张桌子。', '来吧，36张牌决胜负。', '别得意，短牌反转多的是。'],
}

/* ===== 赛后感想 ===== */
const POST_GAME = {
  winner: ['底池全部收下~', '短牌就是要有这种魄力。', 'ふふん♪ 太简单了。', '下一个。', '实力，不需要解释。'],
  loser:  ['又被读透了...', '短牌运气成分太大了...', '苦牙西...', '下一局我一定赢回来。', '刚才那把牌...不甘心。'],
}

/* ===== 动作定义 ===== */
const ACTIONS = {
  fold:   { name: '弃牌', expr: 'sad' },
  check:  { name: '过牌', expr: 'idle' },
  call:   { name: '跟注', expr: 'idle' },
  raise:  { name: '加注', expr: 'confident' },
  allin:  { name: '全下', expr: 'shocked' },
}

const ANTE = 20
const START_CHIPS = 2000

/* ============================================
   主组件
   ============================================ */
function App() {
  const [phase, setPhase]       = useState('idle')
  const [turn, setTurn]         = useState(null)
  const [speaker, setSpeaker]   = useState('')
  const [typed, setTyped]       = useState('')
  const [leftChips, setLeftChips]   = useState(START_CHIPS)
  const [rightChips,setRightChips]  = useState(START_CHIPS)
  const [pot, setPot]           = useState(0)
  const [comm, setComm]         = useState([])
  const [showdown,setShowdown]  = useState(false)
  const [result, setResult]     = useState(null)
  const [buttonPos, setButtonPos]   = useState('left')
  const [gameCount, setGameCount]   = useState(0)

  const deckRef   = useRef([])
  const leftHand  = useRef([])
  const rightHand = useRef([])
  const timers    = useRef([])
  const aborted   = useRef(false)
  const currentPot = useRef(0)
  const leftChipsRef  = useRef(START_CHIPS)
  const rightChipsRef = useRef(START_CHIPS)

  useEffect(() => { leftChipsRef.current = leftChips }, [leftChips])
  useEffect(() => { rightChipsRef.current = rightChips }, [rightChips])
  useEffect(() => { currentPot.current = pot }, [pot])

  const clearTimers = useCallback(() => { timers.current.forEach(t => clearTimeout(t)); timers.current = [] }, [])
  const wait = useCallback((ms) => new Promise((resolve) => {
    if (aborted.current) { resolve(); return }
    const t = setTimeout(resolve, ms)
    timers.current.push(t)
  }), [])
  const checkAbort = () => { if (aborted.current) throw new Error('aborted') }

  const typeText = useCallback(async (text) => {
    // 广播语音事件（零侵入，TTSEngine 独立监听）
    if (speaker && text) {
      window.dispatchEvent(new CustomEvent('ttsSpeak', { detail: { text, speaker } }))
    }
    setTyped('')
    for (let i = 0; i <= text.length; i++) {
      checkAbort()
      setTyped(text.slice(0, i))
      await wait(30)
    }
    await wait(600)
  }, [wait, speaker])

  const moveChips = (side, amount) => {
    if (amount <= 0) return
    if (side === 'left') {
      setLeftChips(c => Math.max(0, c - amount))
    } else {
      setRightChips(c => Math.max(0, c - amount))
    }
    setPot(p => p + amount)
  }

  const triggerImpact = useCallback(() => {
    const root = document.querySelector('.battle-root')
    if (root) { root.classList.add('shake'); setTimeout(() => root.classList.remove('shake'), 500) }
  }, [])

  const decideAction = (side, strength, toCall) => {
    const chips = side === 'left' ? leftChipsRef.current : rightChipsRef.current
    if (toCall >= chips) {
      if (strength < 45) return Math.random() > 0.4 ? 'fold' : 'call'
      return 'call'
    }
    if (strength >= 80) {
      const r = Math.random()
      if (r < 0.35) return 'allin'
      if (r < 0.75) return 'raise'
      return 'call'
    }
    if (strength >= 58) {
      const r = Math.random()
      if (r < 0.12) return 'allin'
      if (r < 0.45) return 'raise'
      if (r < 0.88) return 'call'
      return Math.random() > 0.5 ? 'check' : 'fold'
    }
    if (strength >= 38) {
      const r = Math.random()
      if (r < 0.08) return 'raise'
      if (r < 0.55) return 'call'
      if (r < 0.75) return 'check'
      return 'fold'
    }
    const r = Math.random()
    if (r < 0.25) return 'call'
    if (r < 0.4) return 'raise'
    if (r < 0.6) return 'check'
    return 'fold'
  }

  const evaluateCurrent = (side) => {
    const hand = side === 'left' ? leftHand.current : rightHand.current
    if (comm.length === 0) {
      return getHoleCardStrength(hand)
    }
    const best = evaluateHand(hand, comm)
    const base = best.rank * 8
    const bonus = best.tiebreaker[0] || 0
    return Math.min(100, base + bonus * 0.3)
  }

  /* ============================================
     流程控制
     ============================================ */

  const runIntro = async () => {
    setPhase('intro')
    setSpeaker('AI-A')
    const aLine = INTRO_LINES.left[gameCount % INTRO_LINES.left.length]
    await typeText(aLine)
    checkAbort()
    await wait(400)

    setSpeaker('AI-B')
    const bLine = INTRO_LINES.right[gameCount % INTRO_LINES.right.length]
    await typeText(bLine)
    checkAbort()
    await wait(400)

    setSpeaker('')
    setTyped('')
  }

  const runAnte = async () => {
    setPhase('ante')
    setSpeaker('系统')
    await typeText('请投入前注...')
    checkAbort()

    moveChips('left', ANTE)
    moveChips('right', ANTE)
    const bigAnteSide = buttonPos
    moveChips(bigAnteSide, ANTE)

    setSpeaker('')
    setTyped('')
    await wait(800)
  }

  const runDeal = async () => {
    setPhase('dealing')
    setSpeaker('系统')
    await typeText('发牌...')
    checkAbort()

    leftHand.current = [deckRef.current.pop(), deckRef.current.pop()]
    rightHand.current = [deckRef.current.pop(), deckRef.current.pop()]

    await wait(600)
    setSpeaker('')
    setTyped('')
  }

  const runBettingRound = async (street) => {
    setPhase('betting')

    let leftBet = 0
    let rightBet = 0
    let currentBet = 0
    let actingSide
    if (street === 'preflop') {
      actingSide = buttonPos === 'left' ? 'right' : 'left'
    } else {
      actingSide = buttonPos === 'left' ? 'left' : 'right'
    }

    const maxRounds = 6
    for (let i = 0; i < maxRounds; i++) {
      checkAbort()

      const otherSide = actingSide === 'left' ? 'right' : 'left'
      const toCall = currentBet - (actingSide === 'left' ? leftBet : rightBet)
      const strength = evaluateCurrent(actingSide)

      setTurn(actingSide)
      await wait(700)

      const thinkKey = pickThinkType(strength)
      setSpeaker(actingSide === 'left' ? 'AI-A' : 'AI-B')
      // eslint-disable-next-line react-hooks/purity
      const thinkText = THINK_TYPES[thinkKey].texts[Math.floor(Math.random() * THINK_TYPES[thinkKey].texts.length)]
      await typeText(thinkText)
      checkAbort()

      const action = toCall > 0 ? decideAction(actingSide, strength, toCall) : decideAction(actingSide, strength, 0)
      const act = ACTIONS[action]

      if (action === 'fold') {
        await wait(600)
        const winner = otherSide
        setTurn(null)
        await runFoldResult(winner)
        return 'folded'
      }

      if (action === 'check') {
        await wait(500)
      }

      if (action === 'call') {
        const amt = Math.min(toCall, actingSide === 'left' ? leftChipsRef.current : rightChipsRef.current)
        moveChips(actingSide, amt)
        if (actingSide === 'left') leftBet += amt
        else rightBet += amt
        await wait(500)
      }

      if (action === 'raise') {
        const raiseSize = Math.floor(currentPot.current * 0.5) + 40
        const total = toCall + raiseSize
        const amt = Math.min(total, actingSide === 'left' ? leftChipsRef.current : rightChipsRef.current)
        const actualRaise = amt - (actingSide === 'left' ? leftBet : rightBet)
        if (actualRaise > 0) {
          moveChips(actingSide, actualRaise)
          if (actingSide === 'left') leftBet += actualRaise
          else rightBet += actualRaise
          currentBet = Math.max(leftBet, rightBet)
        }
        triggerImpact()
        await wait(700)
      }

      if (action === 'allin') {
        const amt = actingSide === 'left' ? leftChipsRef.current : rightChipsRef.current
        moveChips(actingSide, amt)
        if (actingSide === 'left') leftBet += amt
        else rightBet += amt
        currentBet = Math.max(leftBet, rightBet)
        triggerImpact()
        await wait(900)
      }

      const otherToCall = currentBet - (otherSide === 'left' ? leftBet : rightBet)
      if (otherToCall <= 0 && i > 0) {
        break
      }

      actingSide = otherSide
      setSpeaker('')
      setTyped('')
      await wait(300)
    }

    setTurn(null)
    setSpeaker('')
    setTyped('')
    return 'continued'
  }

  const runCommunity = async (street) => {
    setPhase('community')
    setSpeaker('系统')

    const label = street === 'flop' ? '翻牌' : street === 'turn' ? '转牌' : '河牌'
    await typeText(`${label}...`)
    checkAbort()

    const count = street === 'flop' ? 3 : 1
    const newCards = []
    for (let i = 0; i < count; i++) {
      newCards.push(deckRef.current.pop())
    }

    setComm(prev => [...prev, ...newCards])
    await wait(800)

    setSpeaker('')
    setTyped('')
    await wait(400)
  }

  const runFoldResult = async (winnerSide) => {
    setPhase('showdown')
    setTurn(null)

    setSpeaker('系统')
    await typeText(`${winnerSide === 'left' ? 'AI-A' : 'AI-B'} 获胜！对手弃牌。`)
    checkAbort()

    const winAmount = currentPot.current
    if (winnerSide === 'left') {
      setLeftChips(c => c + winAmount)
    } else {
      setRightChips(c => c + winAmount)
    }
    setPot(0)

    await wait(600)
    await runPostGame(winnerSide)
  }

  const runShowdown = async () => {
    setPhase('showdown')
    setShowdown(true)
    setSpeaker('系统')
    await typeText('摊牌！双方亮出手牌...')
    checkAbort()
    await wait(600)

    const res = compareHands(leftHand.current, rightHand.current, comm)
    setResult(res)

    const leftName = res.leftBest.name
    const rightName = res.rightBest.name
    await typeText(`AI-A：${leftName}  vs  AI-B：${rightName}`)
    checkAbort()
    await wait(800)

    if (res.winner === 'left') {
      // AI-A 获胜
    } else if (res.winner === 'right') {
      // AI-B 获胜
    } else {
      // 平局
    }

    await wait(500)

    if (res.winner === 'left') {
      setLeftChips(c => c + currentPot.current)
    } else if (res.winner === 'right') {
      setRightChips(c => c + currentPot.current)
    } else {
      const half = Math.floor(currentPot.current / 2)
      setLeftChips(c => c + half)
      setRightChips(c => c + half)
    }
    setPot(0)
    await wait(600)

    if (res.leftBest.rank >= 8 || res.rightBest.rank >= 8) {
      triggerImpact()
      await wait(300)
    }

    await runPostGame(res.winner)
  }

  const runPostGame = async (winnerSide) => {
    setPhase('result')
    setTurn(null)

    if (winnerSide && winnerSide !== 'tie') {
      const loserSide = winnerSide === 'left' ? 'right' : 'left'
      setSpeaker(winnerSide === 'left' ? 'AI-A' : 'AI-B')
      const winLine = POST_GAME.winner[gameCount % POST_GAME.winner.length]
      await typeText(winLine)
      checkAbort()
      await wait(400)

      setSpeaker(loserSide === 'left' ? 'AI-A' : 'AI-B')
      const loseLine = POST_GAME.loser[gameCount % POST_GAME.loser.length]
      await typeText(loseLine)
      checkAbort()
      await wait(400)
    } else {
      setSpeaker('系统')
      await typeText('双方势均力敌，平局！')
      checkAbort()
      await wait(400)
    }

    setSpeaker('')
    setTyped('')
    await wait(600)

    window.dispatchEvent(new CustomEvent('roundEnd', {
      detail: { winner: winnerSide, pot: currentPot.current }
    }))
  }

  /* ============================================
     主控：开始一局
     ============================================ */
  const startGame = useCallback(async () => {
    aborted.current = false
    clearTimers()

    const deck = shuffle(createDeck())
    deckRef.current = deck
    leftHand.current = []
    rightHand.current = []
    setComm([])
    setPot(0)
    setShowdown(false)
    setResult(null)
    setTurn(null)
    setSpeaker('')
    setTyped('')
    currentPot.current = 0

    const newButton = gameCount % 2 === 0 ? 'left' : 'right'
    setButtonPos(newButton)

    try {
      await runIntro()
      checkAbort()
      await runAnte()
      checkAbort()
      await runDeal()
      checkAbort()

      const preflopRes = await runBettingRound('preflop')
      if (preflopRes === 'folded') return

      await runCommunity('flop')
      checkAbort()
      const flopRes = await runBettingRound('flop')
      if (flopRes === 'folded') return

      await runCommunity('turn')
      checkAbort()
      const turnRes = await runBettingRound('turn')
      if (turnRes === 'folded') return

      await runCommunity('river')
      checkAbort()
      const riverRes = await runBettingRound('river')
      if (riverRes === 'folded') return

      await runShowdown()
    } catch (e) {
      if (e.message === 'aborted') return
      throw e
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameCount])

  const nextGame = useCallback(() => {
    setGameCount(c => c + 1)
    setTimeout(() => startGame(), 100)
  }, [startGame])

  useEffect(() => () => clearTimers(), [clearTimers])

  /* ============================================
     渲染 — 仅保留 3D 牌桌 + 开始按钮
     ============================================ */
  return (
    <div className="battle-root">
      <ThreeScene phase={phase} turn={turn} pot={pot} />

      {/* 极简开始按钮 */}
      {phase === 'idle' && (
        <button className="start-btn" onClick={startGame}>
          开始对局
        </button>
      )}
      {phase === 'result' && (
        <button className="start-btn" onClick={nextGame}>
          再来一局
        </button>
      )}
    </div>
  )
}

export default App

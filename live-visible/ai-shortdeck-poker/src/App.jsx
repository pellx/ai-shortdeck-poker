import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

/* ===== 短牌工具 ===== */
const SUITS = ['♠', '♥', '♣', '♦']
const RANKS = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const SUIT_COLORS = { '♠': '#a0a0a0', '♣': '#a0a0a0', '♥': '#ff6b7a', '♦': '#ff6b7a' }
const createDeck = () => { const d = []; for (const s of SUITS) for (const r of RANKS) d.push({ suit: s, rank: r }); return d }
const shuffle = (d) => { const a = [...d]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

/* ===== 图片 ===== */
const img = (f) => new URL(`./assets/charB/${f}`, import.meta.url).href
const FACES = {
  idle:      img('304f04ee-2c0c-4f3b-9301-d2b44b0828ce.png'),
  thinking:  img('a72fc4d8-14e6-47b2-892d-91946f015661.png'),
  analyzing: img('6d069dfb-b74f-4398-ad48-9adaae0fb416.png'),
  confident: img('af875a72-99a0-4de8-9839-7d691106e512.png'),
  winning:   img('ed8861bf-01df-45d6-b783-ec6dd9a7a398.png'),
  sad:       img('104b5b6e-ecb5-4360-84c4-d23c39f85061.png'),
  shocked:   img('f547096b-ff0f-444a-9903-207bc482b1eb.png'),
}

/* ===== 思考类型（模拟后端数据） ===== */
const THINK_TYPES = {
  analyze:   { label: '深度分析',  expr: 'analyzing', texts: ['对手前几局都很激进...这次我要谨慎一点','他好像没什么筹码了...但万一他有底牌呢？','公共牌面很湿，很多听牌，要小心'] },
  confident: { label: '自信满满',  expr: 'confident', texts: ['A-K同花！这手牌可以强势加注','两对！现在手牌很强，要保护底池','我中了坚果同花！无敌了！'] },
  hesitate:  { label: '犹豫不决',  expr: 'thinking',  texts: ['没中牌...但对手过牌了，可以偷一下','转牌没中，但赔率还够，再看一张','要不要在这里诈唬...'] },
  panic:     { label: '被逼绝境',  expr: 'shocked',   texts: ['全下！没有退路了！','ALL IN...只能赌一把了','牌面太恐怖了...但他可能也在偷'] },
  sad:       { label: '沮丧无奈',  expr: 'sad',       texts: ['这手牌没法打了...弃牌','又被读透了...','苦牙西...'] },
  happy:     { label: '得意洋洋',  expr: 'winning',   texts: ['底池全部收下~','ふふん♪','对手完全在我的计算之中'] },
  normal:    { label: '冷静观察',  expr: 'idle',      texts: ['位置不利，但底池赔率很好，跟注看看','翻牌中了对子，继续价值下注','读牌读到这里了，相信自己的判断'] },
}
const TYPE_KEYS = Object.keys(THINK_TYPES)
const ACTIONS = [
  { name: '弃牌', expr: 'sad',     chips: 0 },
  { name: '跟注', expr: 'idle',    chips: 40 },
  { name: '加注', expr: 'confident', chips: 120 },
  { name: '全下', expr: 'shocked', chips: 'all' },
]

/* ===== 主组件 ===== */
function App() {
  const [phase, setPhase]       = useState('idle')
  const [round, setRound]       = useState('preflop')
  const [focus, setFocus]       = useState(null)
  const [animPhase, setAnimPhase] = useState('idle') // 'idle' | 'exit' | 'enter'
  const [leftFace, setLeftFace] = useState('idle')
  const [rightFace,setRightFace]= useState('idle')
  const [leftThink, setLeftThink]   = useState(null)
  const [rightThink,setRightThink]  = useState(null)
  const [speaker, setSpeaker]   = useState('')
  const [typed, setTyped]       = useState('')
  const [cursorOn, setCursorOn] = useState(false)
  const [leftChips, setLeftChips]   = useState(2000)
  const [rightChips,setRightChips]  = useState(2000)
  const [pot, setPot]           = useState(0)
  const [comm, setComm]         = useState([])
  const [showdown,setShowdown]  = useState(false)
  const [log, setLog]           = useState([])

  const deckRef   = useRef([])
  const chipsRef  = useRef({ left: 2000, right: 2000 })
  const timers    = useRef([])

  useEffect(() => { chipsRef.current.left  = leftChips }, [leftChips])
  useEffect(() => { chipsRef.current.right = rightChips }, [rightChips])

  const clearAll = useCallback(() => { timers.current.forEach(t => clearTimeout(t)); timers.current = [] }, [])
  const after = useCallback((fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t) }, [])

  /* 打字机 */
  const typeText = useCallback((text, done) => {
    setTyped(''); setCursorOn(true)
    let i = 0
    const step = () => {
      i++; setTyped(text.slice(0, i))
      if (i < text.length) after(step, 30)
      else if (done) after(done, 600)
    }
    after(step, 100)
  }, [after])

  const pickThink = () => {
    const key = TYPE_KEYS[Math.floor(Math.random() * TYPE_KEYS.length)]
    const type = THINK_TYPES[key]
    const text = type.texts[Math.floor(Math.random() * type.texts.length)]
    return { key, ...type, text }
  }

  const triggerImpact = useCallback(() => {
    const root = document.querySelector('.battle-root')
    if (root) { root.classList.add('shake'); setTimeout(() => root.classList.remove('shake'), 500) }
  }, [])

  /* 核心流程：资金条 exit → 位置更新 → enter → 思考 */
  const thinkTurn = useCallback((side, rnd) => {
    // 阶段 1：资金条向边缘移出
    setAnimPhase('exit')

    after(() => {
      // 阶段 2：更新 focus，资金条获得新位置（此时 opacity=0）
      setFocus(side)
      setAnimPhase('enter')

      after(() => {
        // 阶段 3：资金条从另一侧进入完成，开始思考
        setAnimPhase('idle')

        setPhase('thinking')
        const think = pickThink()

        if (side === 'left') {
          setLeftFace(think.expr)
          setRightFace('idle')
          setLeftThink(think)
          setRightThink(null)
          setSpeaker('AI-A')
        } else {
          setRightFace(think.expr)
          setLeftFace('idle')
          setRightThink(think)
          setLeftThink(null)
          setSpeaker('AI-B')
        }
        typeText(think.text, () => actTurn(side))
      }, 500)
    }, 400)
  }, [after, typeText])

  const actTurn = useCallback((side) => {
    setPhase('acting')
    triggerImpact()
    const act = ACTIONS[Math.floor(Math.random() * ACTIONS.length)]
    const current = side === 'left' ? chipsRef.current.left : chipsRef.current.right
    const amt = act.chips === 'all' ? current : Math.min(act.chips, current)

    if (side === 'left') {
      setLeftFace(act.expr)
      if (amt > 0) { setLeftChips(c => c - amt); setPot(p => p + amt) }
    } else {
      setRightFace(act.expr)
      if (amt > 0) { setRightChips(c => c - amt); setPot(p => p + amt) }
    }
    setLog(l => [...l.slice(-4), `${side === 'left' ? 'AI-A' : 'AI-B'} ${act.name}${amt > 0 ? ` $${amt}` : ''}`])
    after(() => advance(side), 1400)
  }, [triggerImpact, after])

  const advance = useCallback((last) => {
    const next = last === 'left' ? 'right' : 'left'
    const rounds = ['preflop', 'flop', 'turn', 'river']
    const idx = rounds.indexOf(round)

    if (next === 'left') {
      if (idx < 3) {
        const nr = rounds[idx + 1]
        setRound(nr); setPhase('community'); setFocus(null)
        setLeftFace('idle'); setRightFace('idle')
        setLeftThink(null); setRightThink(null)
        setSpeaker(''); setTyped('')
        const cnt = nr === 'flop' ? 3 : 1
        const cards = []; for (let i = 0; i < cnt; i++) cards.push(deckRef.current.pop())
        after(() => { setComm(p => [...p, ...cards]); thinkTurn('left', nr) }, 1600)
      } else {
        setPhase('showdown'); setFocus(null)
        setLeftFace('confident'); setRightFace('confident')
        setShowdown(true); setSpeaker('系统')
        typeText('摊牌！双方亮出手牌', null)
      }
    } else {
      thinkTurn(next, round)
    }
  }, [round, thinkTurn, typeText, after])

  const startGame = useCallback(() => {
    clearAll()
    const deck = shuffle(createDeck()); deckRef.current = deck
    setComm([]); setPot(40); setShowdown(false); setLog([])
    setLeftChips(1980); setRightChips(1980); setRound('preflop')
    setPhase('dealing'); setFocus(null); setAnimPhase('idle')
    setLeftFace('idle'); setRightFace('idle')
    setLeftThink(null); setRightThink(null)
    setSpeaker(''); setTyped('')
    after(() => thinkTurn('left', 'preflop'), 2000)
  }, [clearAll, after, thinkTurn])

  const restart = () => {
    clearAll(); setPhase('idle'); setRound('preflop'); setFocus(null); setAnimPhase('idle')
    setLeftFace('idle'); setRightFace('idle'); setLeftThink(null); setRightThink(null)
    setSpeaker(''); setTyped(''); setLeftChips(2000); setRightChips(2000)
    setPot(0); setComm([]); setShowdown(false); setLog([])
  }

  useEffect(() => {
    if (phase !== 'thinking') return
    const t = setInterval(() => setCursorOn(c => !c), 480)
    return () => clearInterval(t)
  }, [phase])
  useEffect(() => () => clearAll(), [clearAll])

  /* ===== 渲染 ===== */
  const focusClass = focus === 'left' ? 'focus-left' : focus === 'right' ? 'focus-right' : ''
  const animClass = animPhase ? `anim-${animPhase}` : ''

  const MiniCard = ({ card, hidden }) => (
    <div className={`mcard ${hidden ? 'mhidden' : ''}`}>
      {hidden ? <div className="mback" /> : <>
        <span style={{ color: SUIT_COLORS[card.suit], fontSize: 13, fontWeight: 700 }}>{card.rank}</span>
        <span style={{ color: SUIT_COLORS[card.suit], fontSize: 16 }}>{card.suit}</span>
      </>}
    </div>
  )

  return (
    <div className={`battle-root ${focusClass} ${animClass}`}>
      <div className="bg" />
      <div className="bg-spot" />

      {/* 顶部 POT */}
      <div className="pot-top">
        <span className="pot-txt">POT</span>
        <span className="pot-val">${pot}</span>
      </div>

      {/* ===== 角色立绘层 ===== */}
      <div className="char-layer">
        <div className="char char-a">
          <img src={FACES[leftFace]} alt="AI-A" draggable={false} />
        </div>
        <div className="char char-b">
          <img src={FACES[rightFace]} alt="AI-B" draggable={false} />
        </div>
      </div>

      {/* ===== 资金条 - 跟随角色位置 ===== */}
      <div className={`hp hp-a ${focus === 'left' ? 'hp-front' : 'hp-back'}`}>
        <div className="hp-row">
          <span className="hp-name">AI-A</span>
          <span className="hp-num">${leftChips}</span>
        </div>
        <div className="hp-bar"><div className="hp-fill" style={{ width: `${Math.min(100, leftChips / 20)}%` }} /></div>
        {leftThink && <div className="think-badge" style={{ borderColor: '#ff85a2', color: '#ff85a2' }}>{leftThink.label}</div>}
      </div>

      <div className={`hp hp-b ${focus === 'right' ? 'hp-front' : 'hp-back'}`}>
        <div className="hp-row">
          <span className="hp-name">AI-B</span>
          <span className="hp-num">${rightChips}</span>
        </div>
        <div className="hp-bar"><div className="hp-fill" style={{ width: `${Math.min(100, rightChips / 20)}%` }} /></div>
        {rightThink && <div className="think-badge" style={{ borderColor: '#66d9ff', color: '#66d9ff' }}>{rightThink.label}</div>}
      </div>

      {/* ===== 中间公共牌 ===== */}
      <div className="comm-area">
        <div className="comm-cards">
          {[0,1,2,3,4].map(i => (
            <div key={i} className={`cslot ${comm[i] ? 'cfill' : ''}`}>
              {comm[i] ? <MiniCard card={comm[i]} hidden={false} /> : <div className="cplace" />}
            </div>
          ))}
        </div>
        <div className="mini-log">
          {log.map((t, i) => <span key={i}>{t}</span>)}
        </div>
      </div>

      {/* ===== 底部对话框 ===== */}
      <div className="dialog-box">
        <div className="dialog-main">
          {speaker && (
            <div className="dialog-spk" style={{ color: speaker === 'AI-A' ? '#ff85a2' : speaker === 'AI-B' ? '#66d9ff' : '#ffd700' }}>
              {speaker}
            </div>
          )}
          <div className="dialog-txt">
            {typed}
            {phase === 'thinking' && cursorOn && <span className="cursor">▋</span>}
          </div>
        </div>
        {phase === 'idle' && <button className="btn" onClick={startGame}>▶ 开始对局</button>}
        {phase === 'showdown' && <button className="btn" onClick={restart}>↻ 再来一局</button>}
      </div>
    </div>
  )
}

export default App

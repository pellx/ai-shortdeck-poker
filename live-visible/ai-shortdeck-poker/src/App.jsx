import { useState } from 'react'
import './App.css'

function App() {
  const [phase, setPhase] = useState('idle')

  const startGame = () => {
    setPhase('playing')
  }

  return (
    <div className="table-root">
      {/* 跑道形牌桌 */}
      <div className="poker-table">
        {/* 公共牌区域 */}
        <div className="community-area">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="card-slot" />
          ))}
        </div>

        {/* 底池 */}
        <div className="pot-display">POT $0</div>

        {/* 玩家位置 */}
        <div className="player-pos pos-left">
          <div className="player-avatar" />
          <span className="player-name">AI-A</span>
        </div>
        <div className="player-pos pos-right">
          <div className="player-avatar" />
          <span className="player-name">AI-B</span>
        </div>
      </div>

      {/* 开始按钮 */}
      {phase === 'idle' && (
        <button className="start-btn" onClick={startGame}>
          开始对局
        </button>
      )}
    </div>
  )
}

export default App

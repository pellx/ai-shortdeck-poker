import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Danmu from './danmuka.jsx'
import RankList from './RankList.jsx'

const PANEL_THEMES = {
  dark: {
    bg: 'rgba(18, 18, 26, 0.92)',
    border: '1px solid rgba(255,255,255,0.08)',
    divider: 'rgba(255,255,255,0.08)',
  },
  light: {
    bg: 'rgba(250, 248, 245, 0.92)',
    border: '1px solid rgba(0,0,0,0.06)',
    divider: 'rgba(0,0,0,0.08)',
  },
  blue: {
    bg: 'rgba(10, 25, 50, 0.92)',
    border: '1px solid rgba(100,180,255,0.15)',
    divider: 'rgba(100,180,255,0.2)',
  },
  purple: {
    bg: 'rgba(35, 15, 45, 0.92)',
    border: '1px solid rgba(200,120,255,0.12)',
    divider: 'rgba(200,120,255,0.18)',
  },
  green: {
    bg: 'rgba(20, 64, 27, 0.85)',
    border: '1px solid rgba(78,217,101,0.25)',
    divider: 'rgba(78,217,101,0.3)',
  },
}

function LeftPanel() {
  const [isExpanded, setIsExpanded] = useState(false)

  const params = new URLSearchParams(window.location.search)
  const themeKey = params.get('theme') || 'dark'
  const theme = PANEL_THEMES[themeKey] || PANEL_THEMES.dark

  // 5秒周期自动切换展开/收起
  useEffect(() => {
    const timer = setInterval(() => {
      setIsExpanded((prev) => !prev)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div style={{
      width: '380px',
      height: '100vh',
      padding: '14px',
      boxSizing: 'border-box',
      flexShrink: 0,
      zIndex: 10,
    }}>
      {/* 统一背景容器 - 弹幕 + 排行榜共享 */}
      <div style={{
        width: '100%',
        height: '100%',
        borderRadius: '16px',
        background: theme.bg,
        border: theme.border,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px',
        boxSizing: 'border-box',
        gap: '0px',
        overflow: 'hidden',
      }}>
        {/* 上 2/3：弹幕 */}
        <div style={{ flex: 2, overflow: 'hidden', minHeight: 0 }}>
          <Danmu isExpanded={isExpanded} panelBg={theme.bg} divider={theme.divider} />
        </div>
        {/* 下 1/3：排行榜 */}
        <RankList isExpanded={isExpanded} />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div style={{ position: 'fixed', inset: 0, display: 'flex' }}>
      <LeftPanel />

      {/* 右侧玩法区 - 由另一个 agent 负责开发牌桌场景 */}
      <div style={{
        flex: 1,
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <App />
      </div>
    </div>
  </StrictMode>,
)

import { useState, useEffect, useRef } from 'react'

const USERS = [
  '喵喵拳', '星际旅人', '夜航船', '可乐加冰', '风一样的男子',
  '吃瓜群众', '弹幕测试员', 'AAA建材王哥', '摸鱼大师', '被窝探险家',
  '早八毁灭者', '奶茶续命', '香菜不吃', '猫猫头', '无敌暴龙战士',
]

const CONTENTS = [
  '主播好强！', '666666', '来了来了', '这波操作可以', '哈哈哈哈哈哈',
  '前方高能', '全体起立', '主播声音好听', '什么时候抽奖', '下次一定',
  '这也太帅了吧', '主播辛苦了', '蚌埠住了', '泪目', '火钳刘明',
  '第一！', '梦幻联动', '双厨狂喜', '血压升高', '标准结局',
  '这能输？', '主播是我爹', '保护', '这就是专业', '学废了',
]

const THEMES = {
  dark: {
    name: '深邃黑',
    cardBg: 'rgba(18, 18, 22, 0.88)',
    cardBorder: '1px solid rgba(255,255,255,0.08)',
    userColor: '#ff85a2',
    textColor: '#f5f5f5',
    avatarBorder: '2px solid rgba(255,255,255,0.2)',
  },
  light: {
    name: '奶油白',
    cardBg: 'rgba(255, 252, 245, 0.92)',
    cardBorder: '1px solid rgba(0,0,0,0.06)',
    userColor: '#e91e63',
    textColor: '#1a1a1a',
    avatarBorder: '2px solid rgba(0,0,0,0.1)',
  },
  blue: {
    name: '深海蓝',
    cardBg: 'rgba(10, 25, 50, 0.88)',
    cardBorder: '1px solid rgba(100,180,255,0.15)',
    userColor: '#66d9ff',
    textColor: '#e8f4ff',
    avatarBorder: '2px solid rgba(100,200,255,0.3)',
  },
  purple: {
    name: '幻紫夜',
    cardBg: 'rgba(35, 15, 45, 0.88)',
    cardBorder: '1px solid rgba(200,120,255,0.12)',
    userColor: '#ff9ef0',
    textColor: '#f8e8ff',
    avatarBorder: '2px solid rgba(220,100,255,0.25)',
  },
  green: {
    name: '翠玉青',
    cardBg: 'rgba(20, 64, 27, 0.8)',
    cardBorder: '1px solid rgba(78,217,101,0.25)',
    userColor: '#64e179',
    textColor: '#fffcfe',
    avatarBorder: '2px solid rgba(78,217,101,0.4)',
  },
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getAvatar(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=64&font-size=0.4&length=1`
}

function Danmu() {
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('')
  const idRef = useRef(0)

  const params = new URLSearchParams(window.location.search)
  const roomId = params.get('roomId') || '模拟房间'
  const themeKey = params.get('theme') || 'dark'
  const theme = THEMES[themeKey] || THEMES.dark

  useEffect(() => {
    setStatus(`房间 ${roomId} · 主题: ${theme.name}`)

    const initial = Array.from({ length: 5 }, (_, i) => {
      const user = USERS[i % USERS.length]
      return {
        id: idRef.current++,
        user,
        content: randomPick(CONTENTS),
        avatar: getAvatar(user),
      }
    })
    setMessages(initial)

    const timer = setInterval(() => {
      setMessages((prev) => {
        const user = randomPick(USERS)
        const next = [
          ...prev,
          {
            id: idRef.current++,
            user,
            content: randomPick(CONTENTS),
            avatar: getAvatar(user),
          },
        ]
        if (next.length > 30) next.shift()
        return next
      })
    }, 800)

    return () => clearInterval(timer)
  }, [roomId, theme.name])

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '14px',
        boxSizing: 'border-box',
        fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
        fontSize: '17px',
        pointerEvents: 'none',
      }}
    >
      {/* 调试提示：{status} | 切换主题 ?theme=dark / light / blue / purple / green */}
      {messages.map((msg) => (
        <div
          key={msg.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '6px',
            padding: '5px 5px',
            paddingRight: '14px',
            borderRadius: '25px',
            background: theme.cardBg,
            border: theme.cardBorder,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            animation: 'danmuPop 0.35s ease-out',
            maxWidth: 'fit-content',
          }}
        >
          <img
            src={msg.avatar}
            alt=""
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              flexShrink: 0,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px' }}>
            <span
              style={{
                color: theme.userColor,
                marginLeft: '-4px',
                fontWeight: 700,
                fontSize: '15px',
                flexShrink: 0,
              }}
            >
              {msg.user}
            </span>
            <span
              style={{
                color: theme.textColor,
                fontWeight: 500,
                wordBreak: 'break-all',
              }}
            >
              {msg.content}
            </span>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes danmuPop {
          from { opacity: 0; transform: translateX(-18px) scale(0.96); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </div>
  )
}

export default Danmu

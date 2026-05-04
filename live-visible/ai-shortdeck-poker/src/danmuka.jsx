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

function Danmu({ isExpanded }) {
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('')
  const idRef = useRef(0)

  const params = new URLSearchParams(window.location.search)
  const roomId = params.get('roomId') || '模拟房间'
  const themeKey = params.get('theme') || 'dark'
  const theme = THEMES[themeKey] || THEMES.dark

  // 从 localStorage 读取 B站 Cookie（config.json 不存在时的 fallback）
  const localCookie = localStorage.getItem('bili_cookie') || ''

  useEffect(() => {
    let cleanupFn = null

    const startMockDanmu = () => {
      setStatus('模拟房间 · 主题: ' + theme.name)

      const initial = Array.from({ length: 5 }, (_, i) => {
        const user = USERS[i % USERS.length]
        return {
          id: idRef.current++,
          user,
          content: randomPick(CONTENTS),
          avatar: getAvatar(user),
          hasBadges: Math.random() > 0.4,
        }
      })
      setMessages(initial)

      const timer = setInterval(() => {
        setMessages((prev) => {
          const user = randomPick(USERS)
          const next = [
            {
              id: idRef.current++,
              user,
              content: randomPick(CONTENTS),
              avatar: getAvatar(user),
              hasBadges: Math.random() > 0.4,
            },
            ...prev,
          ]
          if (next.length > 30) next.pop()
          return next
        })
      }, 800)

      cleanupFn = () => clearInterval(timer)
    }

    // 没有真实房间号时使用模拟数据
    if (!roomId || roomId === '模拟房间') {
      startMockDanmu()
      return cleanupFn
    }

    // 有真实房间号，连接 B站直播弹幕
    setStatus(`房间 ${roomId} · 连接中...`)
    let instance = null

    const connect = async () => {
      // 读取配置：优先 config.json，fallback localStorage
      let cookie = localCookie
      let preToken = ''
      let preBuvid = ''
      let preHost = ''
      let prePort = 0
      try {
        const res = await fetch('/config.json')
        const cfg = await res.json()
        if (cfg.cookie) cookie = cfg.cookie
        if (cfg.token) preToken = cfg.token
        if (cfg.buvid) preBuvid = cfg.buvid
        if (cfg.host) preHost = cfg.host
        if (cfg.port) prePort = Number(cfg.port)
      } catch (e) {
        // config.json 不存在或读取失败
      }

      // 从 Cookie 中提取 uid
      let uid = 0
      if (cookie) {
        const m = cookie.match(/DedeUserID=(\d+)/)
        if (m) uid = Number(m[1])
      }

      // 获取 B站弹幕认证参数（token / buvid / 真实房间号）
      let token = preToken
      let buvid = preBuvid
      let realRoomId = Number(roomId)
      let wsHost = preHost
      let wsPort = prePort
      try {
        const authRes = await fetch(`/api/bili/auth?roomId=${roomId}`)
        const authJson = await authRes.json()
        if (authJson.code === 0 && authJson.data) {
          token = authJson.data.token || token
          buvid = authJson.data.buvid || buvid
          realRoomId = authJson.data.roomId || realRoomId
          wsHost = authJson.data.host || wsHost
          wsPort = authJson.data.port || wsPort
        }
      } catch (e) {
        console.warn('[danmu] /api/bili/auth 不可用，尝试使用预配置参数', e.message)
      }

      // 如果仍然没有 buvid，尝试从 cookie 中提取
      if (!buvid && cookie) {
        const m = cookie.match(/buvid3=([^;]+)/)
        if (m) buvid = decodeURIComponent(m[1])
      }

      const wsOptions = {
        platform: 'web',
        protover: 3,
        type: 2,
        uid,
      }
      if (token) wsOptions.key = token
      if (buvid) wsOptions.buvid = buvid
      if (cookie) wsOptions.headers = { Cookie: cookie }
      if (wsHost) {
        wsOptions.host = wsHost
        wsOptions.port = wsPort
        wsOptions.ssl = wsPort === 443
      }

      try {
        const { startListen } = await import('blive-message-listener/browser')
        instance = startListen(realRoomId, {
          onOpen: () => setStatus(`房间 ${realRoomId} · 已连接`),
          onClose: () => setStatus(`房间 ${realRoomId} · 已断开`),
          onError: (err) => {
            console.error('弹幕连接错误', err)
            setStatus(`房间 ${realRoomId} · 连接失败，已切换模拟弹幕`)
            if (instance) { instance.close(); instance = null }
            startMockDanmu() // fallback
          },
          onIncomeDanmu: (msg) => {
            setMessages((prev) => {
              const next = [
                {
                  id: msg.id,
                  user: msg.body.user.uname,
                  content: msg.body.content,
                  avatar: msg.body.user.face || getAvatar(msg.body.user.uname),
                  hasBadges: (msg.body.user.identity?.guard_level ?? 0) > 0,
                },
                ...prev,
              ]
              if (next.length > 30) next.pop()
              return next
            })
          },
        }, { ws: wsOptions })
        cleanupFn = () => { if (instance) instance.close() }
      } catch (err) {
        console.error('导入 blive-message-listener 失败', err)
        setStatus(`房间 ${realRoomId} · 连接失败: ${err.message}`)
        startMockDanmu() // fallback
      }
    }

    connect()

    return () => {
      if (cleanupFn) cleanupFn()
    }
  }, [roomId, theme.name])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 弹幕消息列表：从上向下排列 */}
      <div
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          padding: '6px 0 0 0',
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
              alignItems: 'flex-end',
              marginBottom: '8px',
              animation: 'danmuSlideDown 0.1s ease-out',
              maxWidth: 'fit-content',
            }}
          >
            {/* 头像：在信息栏左上方，z-index 更高 */}
            <img
              src={msg.avatar}
              alt=""
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                border: '3px solid #4CAF50',
                background: '#C8E6C9',
                flexShrink: 0,
                zIndex: 2,
                position: 'relative',
              }}
            />

            {/* 右侧：用户名行 + 绿色信息栏 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginLeft: '-18px',
                minWidth: 0,
                paddingTop: '4px',
              }}
            >
              {/* 用户名 + 成就标示（可拓展数组渲染） */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginBottom: '2px',
                  paddingLeft: '19px',
                }}
              >
                <span
                  style={{
                    color: theme.userColor,
                    fontWeight: 700,
                    fontSize: '14px',
                    flexShrink: 0,
                  }}
                >
                  {msg.user}
                </span>
                {msg.hasBadges && [
                  { color: '#FFD700', key: 'gold' },
                  { color: '#E53935', key: 'red' },
                ].map((badge) => (
                  <span
                    key={badge.key}
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: badge.color,
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>

              {/* 信息栏：弹幕内容 */}
              <div
                style={{
                  background: theme.cardBg,
                  border: theme.cardBorder,
                  borderRadius: '5px',
                  padding: '7px 14px',
                  paddingLeft: '21px',
                  color: theme.textColor,
                  fontSize: '14px',
                  fontWeight: 500,
                  wordBreak: 'break-all',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                }}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        <style>{`
          @keyframes danmuSlideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>


    </div>
  )
}

export default Danmu

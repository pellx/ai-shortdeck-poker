# 🃏 Short Deck LLM Duel Engine / 短牌德州 LLM 对战引擎

> **让两个大语言模型坐上牌桌，打一场短牌德州扑克。**
>
> Pit two LLMs against each other in Short Deck (6+) Hold'em — with live AI commentary.

![Python](https://img.shields.io/badge/Python-3.12+-blue?logo=python)
![PySide6](https://img.shields.io/badge/GUI-PySide6-green?logo=qt)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## What is this? / 这是什么？

一个桌面 GUI 应用，让两个 LLM（大语言模型）以 AI 玩家身份进行 **短牌德州扑克 (Short Deck / 6+ Hold'em)** 单挑对战。支持第三个 LLM 担任实时解说员，像电竞赛事一样播报牌局。

A desktop application where two LLMs play **Short Deck Texas Hold'em** heads-up against each other, with an optional third LLM providing live match commentary.

### Key Features / 核心特性

| 特性 Feature | 说明 Description |
|---|---|
| **双 AI 对战 / Dual AI Battle** | 任意两个 OpenAI 兼容 API 的模型互相对决 — Any two OpenAI-compatible LLMs battle each other |
| **实时解说 / Live Commentary** | 第三个 LLM 担任解说员，分析策略与心理博弈 — A third LLM commentates like a pro poker analyst |
| **选手心理活动 / Player Reactions** | 每手牌结束后 AI 发表内心独白与赛后感言 — AIs express post-hand emotions and match-end reflections |
| **垃圾话 / Trash Talk** | AI 之间可互相喊话施压 — AIs can taunt and bluff each other verbally |
| **手动/自动模式 / Manual & Auto** | 可全自动对局，也可逐步手动操作 — Full auto-play or step-by-step manual control |
| **指定牌面 / Card Override** | 可手动指定任意底牌和公共牌 — Manually set specific hole cards and community cards |
| **深度思考 / Thinking Mode** | 支持 reasoning/thinking 模型的扩展思考 — Supports extended thinking for reasoning models |
| **手牌记忆 / Hand Memory** | AI 记住本手牌内的历史决策上下文 — AI remembers prior decisions within the current hand |
| **完整短牌规则 / Full Short Deck Rules** | 36 张牌、同花 > 葫芦、A-6-7-8-9 最小顺子 — 36-card deck, Flush > Full House, A-6-7-8-9 wheel |
| **可视化牌桌 / Visual Board** | 绿色牌桌风格 UI，实时显示手牌、公共牌、筹码、底池 — Green felt UI with cards, chips, and pot |

---

## Screenshots / 截图

> *（启动后即可看到完整界面）*

界面分为左右两栏 / The UI has a two-panel layout：
- **左侧 Left**：对局控制（盲注/筹码设置、手动操作、自动对局）+ 设置（API 配置）
- **右侧 Right**：可视化牌桌 + 对局日志 + 解说席 + 行动历史

---

## Quick Start / 快速开始

### Prerequisites / 前置条件

- **Python 3.12+**
- **[uv](https://docs.astral.sh/uv/)** — 推荐的 Python 包管理器 / Recommended Python package manager
- 至少一个 **OpenAI 兼容 API**（如 DeepSeek、Doubao/豆包、OpenAI、Gemini via proxy 等）

### 1. Clone & Install / 克隆与安装

```bash
git clone https://github.com/usermbzlj/ai-shortdeck-poker.git
cd ai-shortdeck-poker

# 使用 uv 创建虚拟环境并安装依赖
uv sync
```

### 2. Configure / 配置

复制配置模板并填入你的 API 密钥 / Copy the template and fill in your API keys：

```bash
cp .env.example .env
```

编辑 `.env` 文件 / Edit the `.env` file：

```ini
# AI 选手 A / Player A
A_NAME=DeepSeek
A_BASE_URL=https://api.deepseek.com/v1
A_API_KEY=sk-your-key-here
A_MODEL=deepseek-chat

# AI 选手 B / Player B
B_NAME=Gemini
B_BASE_URL=https://your-api-proxy.com/v1
B_API_KEY=sk-your-key-here
B_MODEL=gemini-2.5-flash

# 解说员（可选）/ Commentator (optional)
COMMENTATOR_BASE_URL=https://api.deepseek.com/v1
COMMENTATOR_API_KEY=sk-your-key-here
COMMENTATOR_MODEL=deepseek-chat
```

### 3. Test API / 测试连通性

```bash
uv run python test_api.py
```

这会依次测试 AI_A、AI_B、解说员的 API 连通性 / Tests connectivity for all configured endpoints.

### 4. Run / 启动

```bash
uv run python main.py
```

---

## How to Play / 怎么玩

### 全自动模式 / Full Auto Mode

1. 配好 `.env` 后启动程序
2. 点击 **「开始新比赛」**
3. 点击 **「▶ 开始自动对局」**
4. 坐下来看两个 AI 互相厮杀

### 手动模式 / Manual Mode

1. 点击 **「开始新比赛」** → **「开始下一手」**
2. （可选）在「手动指定牌面」区域选择特定的底牌/公共牌
3. 点击 **「随机补齐缺牌」** 发牌
4. 使用「手动操作」区域的按钮替 AI 做决策（弃牌/过牌/跟注/下注/加注/全押）
5. 每轮行动结束后点 **「发下一轮公共牌」** 或 **「摊牌结算」**

---

## Architecture / 项目结构

```
shortdeck-llm-duel/
├── main.py          # GUI 入口 — PySide6 界面（牌桌、控件、日志）
├── controller.py    # 游戏控制器 — AI 决策调度、解说员、状态管理
├── core.py          # 游戏引擎 — 短牌规则、手牌评估、LLM 客户端
├── prompts.py       # Prompt 模板 — AI 玩家 & 解说员的系统/用户提示词
├── test_api.py      # API 连通性测试脚本
├── pyproject.toml   # 项目依赖配置 (uv)
├── .env.example     # 配置模板（安全，不含密钥）
├── .env             # 实际配置（含密钥，不上传 Git）
└── .gitignore       # Git 忽略规则
```

### 模块职责 / Module Responsibilities

| 文件 File | 行数 LoC | 职责 Role |
|---|---|---|
| `core.py` | ~890 | 游戏引擎核心：36 张短牌、发牌、下注逻辑、手牌评估（7 选 5 最优组合）、LLM HTTP 客户端 |
| `controller.py` | ~1070 | 控制器：构建 Prompt、异步调用 LLM、解析 AI 决策、驱动解说员、管理自动对局状态机 |
| `main.py` | ~990 | PySide6 GUI：牌桌可视化、设置面板、手动/自动控制、.env 读写 |
| `prompts.py` | ~166 | 所有 Prompt 模板：AI 玩家 System Prompt、解说员 Prompt、选手心理活动 Prompt |
| `test_api.py` | ~150 | API 连通性测试：逐一测试所有配置的 LLM endpoint |

---

## Configuration Reference / 配置项说明

### AI 选手配置 / AI Player Config

| 变量 Variable | 说明 Description | 示例 Example |
|---|---|---|
| `A_NAME` / `B_NAME` | 显示名称 / Display name | `DeepSeek` |
| `A_BASE_URL` / `B_BASE_URL` | API 地址 / API endpoint | `https://api.deepseek.com/v1` |
| `A_API_KEY` / `B_API_KEY` | API 密钥 / API key | `sk-xxx` |
| `A_MODEL` / `B_MODEL` | 模型名 / Model name | `deepseek-chat` |
| `A_TEMPERATURE` / `B_TEMPERATURE` | 温度（留空用全局，`none`=不发送）| `0.2` / `none` |
| `A_THINKING_ENABLED` / `B_THINKING_ENABLED` | 深度思考 / Thinking mode | `true` / `false` |
| `A_THINKING_BUDGET` / `B_THINKING_BUDGET` | 思考 Token 上限 / Thinking token budget | `8000` |
| `A_MEMORY_ENABLED` / `B_MEMORY_ENABLED` | 手牌内记忆 / In-hand memory | `true` |

### 解说员配置 / Commentator Config

| 变量 Variable | 说明 Description |
|---|---|
| `COMMENTATOR_BASE_URL` | API 地址 |
| `COMMENTATOR_API_KEY` | API 密钥 |
| `COMMENTATOR_MODEL` | 模型名 |
| `COMMENTATOR_TEMPERATURE` | 温度（默认 0.7）|
| `COMMENTATOR_ON_ACTION` | 每个动作后解说 (`true`/`false`) |
| `COMMENTATOR_ON_STREET` | 每街结束后解说 |
| `COMMENTATOR_ON_HAND` | 每手结束后解说 |
| `COMMENTATOR_GOD_VIEW` | 上帝视角（看双方底牌）|

### 通用配置 / General Config

| 变量 Variable | 说明 Description | 默认 Default |
|---|---|---|
| `TEMPERATURE` | 全局默认温度 / Global default temperature | `0.2` |
| `DEFAULT_STACK` | 初始筹码 (USD) / Starting stack | `1000.00` |
| `DEFAULT_SB` | 小盲注 (USD) / Small blind | `2.50` |
| `DEFAULT_BB` | 大盲注 (USD) / Big blind | `5.00` |
| `DEBUG_LOG_ENABLED` | Debug 日志（写入 `log/` 文件夹）| `false` |

---

## Short Deck Rules / 短牌规则简介

短牌德州 (6+ Hold'em) 与标准德州的关键差异 / Key differences from standard Hold'em：

- **36 张牌**：移除所有 2-5，最小面值为 6 — 36 cards, no 2-5, minimum rank is 6
- **牌型排名不同**：同花 (Flush) **强于** 葫芦 (Full House) — Flush **beats** Full House
- **最小顺子**：A-6-7-8-9（A 可作最低牌）— A-6-7-8-9 is the lowest straight (A acts as low)
- **更多 action**：起手牌牌力更接近，弃牌 EV 损失更大 — Closer hand equities, more action

---

## Tech Stack / 技术栈

- **Python 3.12+** — 主语言
- **PySide6** — 桌面 GUI 框架（Qt for Python）
- **httpx** — HTTP 客户端（调用 LLM API）
- **uv** — 包管理与虚拟环境

---

## FAQ

**Q: 支持哪些 LLM？/ Which LLMs are supported?**

任何提供 OpenAI 兼容 Chat Completions API 的模型都可以。已测试过：DeepSeek、豆包 (Doubao)、Gemini (via proxy)、OpenAI GPT 系列、GLM 等。

Any model with an OpenAI-compatible Chat Completions API works. Tested with: DeepSeek, Doubao, Gemini (via proxy), OpenAI GPT series, GLM, etc.

**Q: AI 选手 A 和 B 可以用不同的模型吗？/ Can A and B use different models?**

当然可以！这正是本工具的核心玩法——让不同模型互相对决，看谁的扑克水平更高。

Absolutely! That's the whole point — pit different models against each other.

**Q: 解说员必须配置吗？/ Is the commentator required?**

不是，解说员完全可选。不配置时解说席为空，对局功能不受影响。

No, it's fully optional. Without it, the commentary panel stays empty but gameplay works fine.

**Q: 为什么选短牌而不是标准德州？/ Why Short Deck instead of standard Hold'em?**

短牌的 36 张牌使牌力更接近，AI 需要更多博弈思考而非简单弃牌，对话和决策更有趣。

The 36-card deck makes hand equities closer, forcing more strategic thinking and creating more interesting AI dialogues.

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Contributing / 贡献

欢迎 PR 和 Issue！/ PRs and Issues are welcome!

如有任何问题或建议，请在 GitHub Issues 中提出。

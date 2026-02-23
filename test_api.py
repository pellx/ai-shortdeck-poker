"""
全面 API 连通性测试 — 读取 .env 配置，依次测试 AI_A、AI_B、解说员。
用法：uv run py test_api.py
"""
import json
import os
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import core

ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")

TEST_MESSAGES = [
    {"role": "system", "content": "你是一个扑克AI。只返回一个有效 JSON 对象，不要输出 Markdown。"},
    {"role": "user", "content": '请返回这个 JSON: {"analysis": "测试连接", "action": "fold"}'},
]

COMMENTATOR_MESSAGES = [
    {"role": "system", "content": "你是一个扑克解说员，用中文简短解说。"},
    {"role": "user", "content": "1号选手 下注了 $10，请用一句话解说。"},
]


def test_endpoint(label: str, base_url: str, api_key: str, model: str,
                  temperature: float, thinking_enabled: bool, thinking_budget: int,
                  messages: list[dict], expect_json: bool = True) -> bool:
    print(f"\n{'='*60}")
    print(f"测试: {label}")
    print(f"  Base URL : {base_url}")
    print(f"  Model    : {model}")
    print(f"  Thinking : {'开启' if thinking_enabled else '关闭'}"
          + (f" (budget={thinking_budget})" if thinking_enabled else ""))
    print(f"{'='*60}")

    if not base_url or not api_key or not model:
        print("  ⚠️ 跳过 — 未配置 (URL/Key/Model 为空)")
        return True

    client = core.LLMClient(base_url, api_key, model, timeout_s=30)

    start = time.monotonic()
    try:
        result = client.chat(
            messages=messages,
            temperature=temperature,
            thinking_enabled=thinking_enabled,
            thinking_budget=thinking_budget,
        )
    except Exception as e:
        elapsed = round(time.monotonic() - start, 2)
        print(f"  ❌ 请求失败 ({elapsed}s): {type(e).__name__}: {e}")
        return False

    elapsed = round(time.monotonic() - start, 2)
    content = result.get("content", "")
    reasoning = result.get("reasoning_content")

    print(f"  ✅ 请求成功 ({elapsed}s)")

    if reasoning:
        short_r = reasoning[:200] + ("..." if len(reasoning) > 200 else "")
        print(f"  🧠 思考内容: {short_r}")

    print(f"  📝 返回内容: {content[:500]}")

    if expect_json:
        try:
            parsed = core.parse_first_json_object(content)
            print(f"  ✅ JSON 解析成功: {json.dumps(parsed, ensure_ascii=False)}")
        except Exception as e:
            print(f"  ⚠️ JSON 解析失败 (非致命): {e}")

    return True


def main():
    env = core.load_dotenv(ENV_PATH)
    if not env:
        print(f"❌ 未找到 .env 文件或为空: {ENV_PATH}")
        sys.exit(1)

    print(f"已加载 .env ({len(env)} 项)")
    temp = float(env.get("TEMPERATURE", "0.2") or "0.2")

    results: list[tuple[str, bool]] = []

    # AI_A
    ok = test_endpoint(
        label=f"AI_A ({env.get('A_NAME', 'AI_A')})",
        base_url=env.get("A_BASE_URL", ""),
        api_key=env.get("A_API_KEY", ""),
        model=env.get("A_MODEL", ""),
        temperature=temp,
        thinking_enabled=env.get("A_THINKING_ENABLED", "").lower() == "true",
        thinking_budget=int(env.get("A_THINKING_BUDGET", "8000") or "8000"),
        messages=TEST_MESSAGES,
    )
    results.append(("AI_A", ok))

    # AI_B
    ok = test_endpoint(
        label=f"AI_B ({env.get('B_NAME', 'AI_B')})",
        base_url=env.get("B_BASE_URL", ""),
        api_key=env.get("B_API_KEY", ""),
        model=env.get("B_MODEL", ""),
        temperature=temp,
        thinking_enabled=env.get("B_THINKING_ENABLED", "").lower() == "true",
        thinking_budget=int(env.get("B_THINKING_BUDGET", "8000") or "8000"),
        messages=TEST_MESSAGES,
    )
    results.append(("AI_B", ok))

    # 解说员
    ok = test_endpoint(
        label="解说员 (Commentator)",
        base_url=env.get("COMMENTATOR_BASE_URL", ""),
        api_key=env.get("COMMENTATOR_API_KEY", ""),
        model=env.get("COMMENTATOR_MODEL", ""),
        temperature=float(env.get("COMMENTATOR_TEMPERATURE", "0.7") or "0.7"),
        thinking_enabled=env.get("COMMENTATOR_THINKING_ENABLED", "").lower() == "true",
        thinking_budget=int(env.get("COMMENTATOR_THINKING_BUDGET", "8000") or "8000"),
        messages=COMMENTATOR_MESSAGES,
        expect_json=False,
    )
    results.append(("解说员", ok))

    # 汇总
    print(f"\n{'='*60}")
    print("测试汇总:")
    print(f"{'='*60}")
    all_ok = True
    for name, ok in results:
        icon = "✅" if ok else "❌"
        print(f"  {icon} {name}")
        if not ok:
            all_ok = False

    if all_ok:
        print("\n🎉 全部通过!")
    else:
        print("\n⚠️ 存在失败项，请检查对应的 .env 配置。")
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()

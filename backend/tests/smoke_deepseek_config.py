"""离线校验 DeepSeek 通道接线（无网络）：映射 / 工厂分支 / 启动 key 门控两向。

不加真实 key、不打网络；构造 ModelRoute 走 build_model 分支，并临时替换
ai_routes_json 为一个仅含 deepseek text_chat 的路由表来隔离 aihubmix/openrouter
校验，验证 validate_routes 的 DEEPSEEK_API_KEY 启动门控。
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pydantic_ai.models.openai import OpenAIChatModel

import ai.config as ai_config
import ai.model_factory as mf
from ai.errors import AIConfigError
from ai.types import ModelRoute
from core.config import settings

fails: list[str] = []


def _check(cond: bool, label: str) -> None:
    if cond:
        print(f"PASS  {label}")
    else:
        fails.append(label)
        print(f"FAIL  {label}")


def main() -> int:
    async def _shutdown() -> None:
        await mf.shutdown_http_client()

    # 1. platform -> env 映射已登记
    _check(
        ai_config._PLATFORM_API_KEYS.get("deepseek") == "DEEPSEEK_API_KEY",
        "平台->env 映射含 deepseek",
    )

    # 2. 工厂分支可构造（离线构造不需要真 key/连接）
    mf.init_http_client()
    saved_key, saved_base = settings.deepseek_api_key, settings.deepseek_base_url
    saved_aihub_key = settings.aihubmix_api_key  # 仅保持环境一致，分支不读它
    settings.deepseek_api_key = "sk-test"
    settings.deepseek_base_url = "https://api.deepseek.com"
    try:
        route = ModelRoute(
            platform="deepseek",
            adapter="openai_compatible",
            model="deepseek-chat",
            priority=0,
            timeout_s=15,
        )
        model = mf.build_model(route)
        _check(isinstance(model, OpenAIChatModel), "build_model(deepseek) 返回 OpenAIChatModel")
        _check(
            not model.settings.get("openai_continuous_usage_stats"),
            "D4①：不设 continuous_usage",
        )
    finally:
        settings.deepseek_api_key, settings.deepseek_base_url = saved_key, saved_base
        settings.aihubmix_api_key = saved_aihub_key
        asyncio.run(_shutdown())

    # 3. 启动 key 门控两向（用仅含 deepseek text_chat 的路由表隔离其余平台校验）
    saved_routes = settings.ai_routes_json
    deepseek_table = (
        '{"text_chat": [{"platform": "deepseek", "adapter": "openai_compatible",'
        ' "model": "deepseek-chat", "priority": 0, "timeout_s": 15}]}'
    )
    try:
        settings.ai_routes_json = deepseek_table
        ai_config.get_routes.cache_clear()

        settings.deepseek_api_key = ""
        try:
            ai_config.validate_routes()
        except AIConfigError as exc:
            _check("DEEPSEEK_API_KEY" in str(exc), "无 key：validate_routes 抛 DEEPSEEK_API_KEY")
        else:
            _check(False, "无 key：应抛说明需 DEEPSEEK_API_KEY")

        settings.deepseek_api_key = "sk-test"
        ai_config.get_routes.cache_clear()
        try:
            ai_config.validate_routes()
        except AIConfigError as exc:
            _check(
                "DEEPSEEK_API_KEY" not in str(exc),
                f"有 key：不应抛缺 key 错误（实际 {exc}）",
            )
        else:
            _check(True, "有 key：key 门控放行")
    finally:
        settings.ai_routes_json = saved_routes
        settings.deepseek_api_key = saved_key
        ai_config.get_routes.cache_clear()

    if fails:
        print(f"\n{len(fails)} 项失败")
        return 1
    print("\n全部通过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
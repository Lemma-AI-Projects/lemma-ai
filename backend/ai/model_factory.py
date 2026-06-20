"""ModelRoute -> Pydantic AI Model instances (shared httpx client + cache).

HTTP-level retries are set EXPLICITLY on the official SDK clients (终稿裁决 1):
the OpenAI SDK silently defaults to 2 retries and honours Retry-After for up
to 60s, which would stall cross-platform fallback (pydantic-ai issue #3267).
Never stack tenacity or custom transports on top — retries would multiply.
"""

from typing import Any

import httpx
from openai import AsyncOpenAI
from pydantic_ai.models import Model
from pydantic_ai.models.google import GoogleModel, GoogleModelSettings
from pydantic_ai.models.openai import OpenAIChatModel, OpenAIChatModelSettings
from pydantic_ai.models.openrouter import OpenRouterModel, OpenRouterModelSettings
from pydantic_ai.providers.google import GoogleProvider
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.providers.openrouter import OpenRouterProvider

from ai.errors import AIConfigError
from ai.native import gemini_video
from ai.types import ModelRoute
from core.config import settings

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# One retry for transient network blips; anything beyond that is the
# FallbackModel's job (route-level policy), not the HTTP layer's.
_HTTP_MAX_RETRIES = 1

_http_client: httpx.AsyncClient | None = None
_model_cache: dict[str, Model] = {}


def init_http_client() -> None:
    """Create the process-wide HTTP client. Called from the FastAPI lifespan.

    Celery workers must NOT reuse this client across tasks — each task creates
    and closes its own (终稿 5.2 / 9.3).
    """
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(settings.ai_default_timeout_seconds),
            limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
        )


async def shutdown_http_client() -> None:
    global _http_client
    _model_cache.clear()
    if _http_client is not None:
        await _http_client.aclose()
        _http_client = None


def _require_http_client() -> httpx.AsyncClient:
    if _http_client is None:
        raise AIConfigError(
            "AI runtime not initialised — init_ai_runtime() must run in the app lifespan"
        )
    return _http_client


def build_model(route: ModelRoute) -> Model:
    """Return the (cached) executable model for a routing-table entry."""
    key = route.model_dump_json()
    cached = _model_cache.get(key)
    if cached is not None:
        return cached

    channel = (route.platform, route.adapter)
    if channel == ("aihubmix", "openai_compatible"):
        model = _build_aihubmix_openai(route)
    elif channel == ("openrouter", "openrouter"):
        model = _build_openrouter(route)
    elif channel == ("aihubmix", "gemini_video"):
        # Framework video channel — only reached when AI_VIDEO_ENGINE=
        # pydantic_ai (终稿 8.2); the default native engine bypasses the
        # factory entirely (client.ask_video -> native/gemini_video.py).
        model = _build_gemini_framework(route)
    else:
        raise AIConfigError(
            f"no factory branch for {route.platform}/{route.adapter}"
        )
    _model_cache[key] = model
    return model


def _build_aihubmix_openai(route: ModelRoute) -> Model:
    client = AsyncOpenAI(
        base_url=settings.aihubmix_openai_base_url,
        api_key=settings.aihubmix_api_key,
        max_retries=_HTTP_MAX_RETRIES,
        http_client=_require_http_client(),
    )
    settings_kwargs: dict[str, Any] = {
        "timeout": route.timeout_s,
        # AiHubMix repeats cumulative usage across stream chunks (verified
        # against /v1 on 2026-06-10); without this flag the framework sums
        # them and doubles the billed token counts.
        "openai_continuous_usage_stats": True,
    }
    _apply_openai_thinking_settings(settings_kwargs, route)
    return OpenAIChatModel(
        route.model,
        provider=OpenAIProvider(openai_client=client),
        settings=OpenAIChatModelSettings(**settings_kwargs),
    )


def _build_openrouter(route: ModelRoute) -> Model:
    client = AsyncOpenAI(
        base_url=OPENROUTER_BASE_URL,
        api_key=settings.openrouter_api_key,
        max_retries=_HTTP_MAX_RETRIES,
        http_client=_require_http_client(),
    )
    model_settings = OpenRouterModelSettings(
        timeout=route.timeout_s,
        # Required so streamed responses report usage (终稿 5.2 流式 usage).
        openrouter_usage={"include": True},
    )
    _apply_openrouter_thinking_settings(model_settings, route)
    # Platform-internal fallback / provider routing stay in the routing table's
    # `extra` and are pushed down here; Lemma only manages cross-platform order.
    if openrouter_models := route.extra.get("openrouter_models"):
        model_settings["openrouter_models"] = openrouter_models
    if openrouter_provider := route.extra.get("openrouter_provider"):
        model_settings["openrouter_provider"] = openrouter_provider
    return OpenRouterModel(
        route.model,
        provider=OpenRouterProvider(openai_client=client),
        settings=model_settings,
    )


def _build_gemini_framework(route: ModelRoute) -> Model:
    # Reuses the native channel's client builder so base_url/retry discipline
    # stays in one place; the genai SDK manages its own connection pool.
    return GoogleModel(
        route.model,
        provider=GoogleProvider(client=gemini_video.build_client()),
        settings=GoogleModelSettings(
            **_google_settings_kwargs(route),
        ),
    )


def _apply_common_thinking_settings(
    settings_kwargs: dict[str, Any], route: ModelRoute
) -> None:
    if "thinking" in route.extra:
        settings_kwargs["thinking"] = route.extra["thinking"]


def _apply_openai_thinking_settings(
    settings_kwargs: dict[str, Any], route: ModelRoute
) -> None:
    _apply_common_thinking_settings(settings_kwargs, route)
    if "openai_reasoning_effort" in route.extra:
        settings_kwargs["openai_reasoning_effort"] = route.extra[
            "openai_reasoning_effort"
        ]
    elif "reasoning_effort" in route.extra:
        settings_kwargs["openai_reasoning_effort"] = route.extra["reasoning_effort"]
    if "reasoning" in route.extra:
        extra_body = dict(route.extra.get("extra_body") or {})
        extra_body["reasoning"] = route.extra["reasoning"]
        settings_kwargs["extra_body"] = extra_body
    elif "extra_body" in route.extra:
        settings_kwargs["extra_body"] = route.extra["extra_body"]


def _apply_openrouter_thinking_settings(
    settings: OpenRouterModelSettings, route: ModelRoute
) -> None:
    if "thinking" in route.extra:
        settings["thinking"] = route.extra["thinking"]
    if "openrouter_reasoning" in route.extra:
        settings["openrouter_reasoning"] = route.extra["openrouter_reasoning"]
    elif "reasoning" in route.extra:
        settings["openrouter_reasoning"] = route.extra["reasoning"]


def _google_settings_kwargs(route: ModelRoute) -> dict[str, Any]:
    settings_kwargs: dict[str, Any] = {"timeout": route.timeout_s}
    _apply_common_thinking_settings(settings_kwargs, route)
    if "google_thinking_config" in route.extra:
        settings_kwargs["google_thinking_config"] = route.extra[
            "google_thinking_config"
        ]
    elif "thinking_config" in route.extra:
        settings_kwargs["google_thinking_config"] = route.extra["thinking_config"]
    return settings_kwargs

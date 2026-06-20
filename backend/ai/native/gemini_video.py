"""Default video channel: google-genai direct to AiHubMix /gemini (终稿 8.1).

Policy (最新决策 2): ALL video goes through the Gemini Files API — upload first,
reference by file URI. No inline/base64 request bodies.

# TODO(youtube-direct): Gemini accepts public YouTube URLs straight via
# file_data(file_uri=<youtube url>). Kept off until separately probed; for now
# YouTube goes through the same download -> Files API pipeline as B站.

Two SDK facts verified 2026-06-10:
- The SDK appends the API version to a custom base_url, so requests hit
  https://aihubmix.com/gemini/v1beta/... — exactly what AiHubMix expects.
  NEVER set base_url_resource_scope here; it would strip that segment.
- HttpRetryOptions defaults to 5 attempts when unspecified; we set it
  explicitly (裁决 1) so retries can't silently multiply.
"""

import asyncio
import time
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types as genai_types

from ai.errors import AIProviderError, AITimeoutError
from core.config import settings

# Total attempts including the original request: original + 1 retry.
_HTTP_ATTEMPTS = 2
# Files API uploads move whole videos; give them their own generous timeout.
_UPLOAD_TIMEOUT_S = 600
_POLL_INTERVAL_S = 2
_POLL_TIMEOUT_S = 600

_shared_client: genai.Client | None = None


def build_client() -> genai.Client:
    """Fresh client — Celery tasks build and close their own (终稿 9.3)."""
    return genai.Client(
        api_key=settings.aihubmix_api_key,
        http_options=genai_types.HttpOptions(
            base_url=settings.aihubmix_gemini_base_url,
            timeout=int(settings.ai_default_timeout_seconds * 1000),  # SDK takes ms
            retry_options=genai_types.HttpRetryOptions(attempts=_HTTP_ATTEMPTS),
        ),
    )


def shared_client() -> genai.Client:
    """Process-wide client for the web process (connection reuse)."""
    global _shared_client
    if _shared_client is None:
        _shared_client = build_client()
    return _shared_client


async def close_shared_client() -> None:
    global _shared_client
    if _shared_client is not None:
        await _shared_client.aio.aclose()
        _shared_client = None


async def upload_file(
    path: str | Path,
    *,
    mime_type: str | None = None,
    client: genai.Client | None = None,
) -> genai_types.File:
    """Upload a video and wait until the provider finishes processing it."""
    client = client or shared_client()
    file = await client.aio.files.upload(
        file=str(path),
        config=genai_types.UploadFileConfig(
            mime_type=mime_type,
            http_options=genai_types.HttpOptions(timeout=_UPLOAD_TIMEOUT_S * 1000),
        ),
    )
    deadline = time.monotonic() + _POLL_TIMEOUT_S
    while file.state in (
        genai_types.FileState.PROCESSING,
        genai_types.FileState.STATE_UNSPECIFIED,
    ):
        if time.monotonic() > deadline:
            raise AITimeoutError("provider file processing timed out", raw=file)
        await asyncio.sleep(_POLL_INTERVAL_S)
        file = await client.aio.files.get(name=file.name or "")
    if file.state != genai_types.FileState.ACTIVE:
        raise AIProviderError(
            "provider failed to process the uploaded video",
            raw=getattr(file, "error", None),
        )
    return file


async def get_file(name: str, *, client: genai.Client | None = None) -> genai_types.File:
    client = client or shared_client()
    return await client.aio.files.get(name=name)


async def delete_file(name: str, *, client: genai.Client | None = None) -> None:
    client = client or shared_client()
    await client.aio.files.delete(name=name)


async def answer(
    *,
    model: str,
    system_prompt: str,
    question: str,
    file_uri: str,
    mime_type: str | None,
    timeout_s: float,
    route_extra: dict[str, Any] | None = None,
    client: genai.Client | None = None,
) -> tuple[
    str,
    str | None,
    genai_types.GenerateContentResponseUsageMetadata | None,
    str | None,
]:
    """Non-streaming video Q&A.

    Returns (text, thinking_text, usage_metadata, response_model).
    """
    client = client or shared_client()
    thinking_config = _thinking_config_from_route_extra(route_extra or {})
    response = await client.aio.models.generate_content(
        model=model,
        contents=[
            genai_types.Part.from_uri(
                file_uri=file_uri, mime_type=mime_type or "video/mp4"
            ),
            genai_types.Part.from_text(text=question),
        ],
        config=genai_types.GenerateContentConfig(
            system_instruction=system_prompt,
            thinking_config=thinking_config,
            http_options=genai_types.HttpOptions(timeout=int(timeout_s * 1000)),
        ),
    )
    return (
        response.text or "",
        _extract_thought_text(response),
        response.usage_metadata,
        getattr(response, "model_version", None),
    )


def _thinking_config_from_route_extra(
    route_extra: dict[str, Any],
) -> genai_types.ThinkingConfig | None:
    raw = route_extra.get("google_thinking_config") or route_extra.get(
        "thinking_config"
    )
    if isinstance(raw, genai_types.ThinkingConfig):
        return raw
    if isinstance(raw, dict):
        return genai_types.ThinkingConfig(**raw)
    if "include_thoughts" in route_extra or "thinking_budget" in route_extra:
        return genai_types.ThinkingConfig(
            include_thoughts=route_extra.get("include_thoughts"),
            thinking_budget=route_extra.get("thinking_budget"),
        )
    thinking = route_extra.get("thinking")
    if isinstance(thinking, bool):
        return genai_types.ThinkingConfig(include_thoughts=thinking)
    if isinstance(thinking, int):
        return genai_types.ThinkingConfig(
            include_thoughts=True, thinking_budget=thinking
        )
    if isinstance(thinking, str):
        return genai_types.ThinkingConfig(
            include_thoughts=True, thinking_level=thinking
        )
    return None


def _extract_thought_text(response: Any) -> str | None:
    parts: list[str] = []
    for candidate in getattr(response, "candidates", None) or []:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", None) or []:
            text = getattr(part, "text", None)
            if getattr(part, "thought", False) and isinstance(text, str):
                parts.append(text)
    return "".join(parts) or None


async def stream_answer(
    *,
    model: str,
    system_prompt: str,
    question: str,
    file_uri: str,
    mime_type: str | None,
    timeout_s: float,
    client: genai.Client | None = None,
) -> AsyncIterator[
    tuple[str, genai_types.GenerateContentResponseUsageMetadata | None]
]:
    """Streaming video Q&A. Yields (delta_text, usage_metadata_so_far)."""
    client = client or shared_client()
    stream = await client.aio.models.generate_content_stream(
        model=model,
        contents=[
            genai_types.Part.from_uri(
                file_uri=file_uri, mime_type=mime_type or "video/mp4"
            ),
            genai_types.Part.from_text(text=question),
        ],
        config=genai_types.GenerateContentConfig(
            system_instruction=system_prompt,
            http_options=genai_types.HttpOptions(timeout=int(timeout_s * 1000)),
        ),
    )
    async for chunk in stream:
        yield chunk.text or "", chunk.usage_metadata

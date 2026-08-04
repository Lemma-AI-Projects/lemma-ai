"""探针 1-6（终稿 12.1）— 文本轨 + 视频轨通道验证。

跑法（backend/ 目录下）:
    uv run python tools/validate_ai_channels.py            # 全部
    uv run python tools/validate_ai_channels.py --only text   # 仅 1-2
    uv run python tools/validate_ai_channels.py --only video  # 仅 3-6

文本轨（1-2，混合方案中止线）:
  对 text_chat 每条路由逐平台单测（绕过 FallbackModel）:
  [非流式] 回答非空 + usage 三件套完整
  [流式]   增量 >= 2 + 拼接非空 + 流末 usage 完整
  [OpenRouter 加测] provider_details 含 cost

视频轨（3-6，并轨裁决线；按最新决策视频一律 Files API，无 inline）:
  3  /gemini × GoogleModel 纯文本 —— 框架通道在 AiHubMix /gemini 上可用
  4  ffmpeg 合成测试视频（红3s→蓝3s）→ Files API 上传 →
     4a native 引擎问答（默认引擎基线） 4b 框架 GoogleModel + VideoUrl（并轨判据）
     判据: 回答引用真实画面细节（两种颜色都说对）
  5  Files API 生命周期: get=ACTIVE + expiration_time(~48h) 与 provider_files
     过期逻辑对齐 → delete → 再 get 必须报错
  6  /gemini 流式 + usage_metadata: 6a native 流式  6b 框架流式（并轨判据）

裁决（终稿 12.1）: 3-6 全过 → 视频可并轨（AI_VIDEO_ENGINE=pydantic_ai 可选，
默认仍 native）；任一不过 → 视频长期原生直连。
任一硬性检查失败 -> 退出码 1。打印的 token 数用于与平台账单对账。
"""

import asyncio
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

# Standalone script: put backend/ on sys.path so top-level imports (ai, core) resolve.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from google.genai import errors as genai_errors
from pydantic_ai.messages import ModelMessage, ModelResponse, VideoUrl

from ai import init_ai_runtime, shutdown_ai_runtime
from ai.agents import LemmaDeps, text_chat_agent, video_qa_agent
from ai.config import routes_for
from ai.media import provider_files
from ai.model_factory import build_model
from ai.native import gemini_video
from ai.types import AIUseCase, ModelRoute, VideoInput

PROMPT = "用一句话回答：天空为什么是蓝色的？"
# 流式探针用长回答：短回答可能被服务端缓冲成单包，导致 chunks>=2 误报。
STREAM_PROMPT = "分三点解释天空为什么是蓝色的，每点用一句完整的话。"
DEPS = LemmaDeps(
    system_prompt="You are a concise assistant. Answer in one short sentence."
)
STREAM_DEPS = LemmaDeps(
    system_prompt="You are a helpful assistant. Follow the user's format exactly."
)
VIDEO_QUESTION = "这个视频里先后出现了哪两种纯色画面？按出现顺序说出颜色。"
VIDEO_SYSTEM_PROMPT = (
    "You answer questions about the provided video. Be factual and concise; "
    "only describe what is actually visible."
)


class CheckFailure(Exception):
    pass


def _check(condition: bool, label: str, detail: str = "") -> None:
    if not condition:
        raise CheckFailure(f"{label}{f' ({detail})' if detail else ''}")


def _usage_summary(usage) -> str:  # noqa: ANN001 — framework RunUsage, probe-internal
    return (
        f"input={usage.input_tokens} output={usage.output_tokens} "
        f"total={usage.total_tokens}"
    )


def _last_response(messages: list[ModelMessage]) -> ModelResponse | None:
    for message in reversed(messages):
        if isinstance(message, ModelResponse):
            return message
    return None


# ---------------------------------------------------------------- 探针 1-2 文本轨


async def probe_non_stream(route: ModelRoute) -> str:
    model = build_model(route)
    result = await text_chat_agent.run(PROMPT, model=model, deps=DEPS)
    usage = result.usage

    _check(bool(result.output.strip()), "非流式回答为空")
    _check(usage.input_tokens > 0, "input_tokens 缺失", _usage_summary(usage))
    _check(usage.output_tokens > 0, "output_tokens 缺失", _usage_summary(usage))
    _check(usage.total_tokens > 0, "total_tokens 缺失", _usage_summary(usage))

    response = _last_response(result.new_messages())
    actual_model = response.model_name if response else None
    return f"text[{len(result.output)}字] {_usage_summary(usage)} actual_model={actual_model}"


async def probe_stream(route: ModelRoute) -> str:
    model = build_model(route)
    chunks = 0
    text = ""
    async with text_chat_agent.run_stream(
        STREAM_PROMPT, model=model, deps=STREAM_DEPS
    ) as stream:
        # debounce_by=None: 关闭合包，数到的就是真实增量个数
        async for delta in stream.stream_text(delta=True, debounce_by=None):
            chunks += 1
            text += delta
        usage = stream.usage
        messages = stream.all_messages()

    _check(bool(text.strip()), "流式拼接文本为空")
    _check(chunks >= 2, "流式增量不足 2 个，疑似整包返回", f"chunks={chunks}")
    _check(
        usage.input_tokens > 0 and usage.output_tokens > 0 and usage.total_tokens > 0,
        "流式 usage 不完整",
        _usage_summary(usage),
    )

    extra = ""
    if route.platform == "openrouter":
        response = _last_response(messages)
        details = dict(response.provider_details or {}) if response else {}
        _check(
            "cost" in details,
            "openrouter_usage 未生效：provider_details 无 cost",
            f"keys={sorted(details)}",
        )
        extra = f" cost=${details['cost']}"
    return f"chunks={chunks} text[{len(text)}字] {_usage_summary(usage)}{extra}"


async def run_text_probes() -> int:
    failures = 0
    routes = routes_for(AIUseCase.TEXT_CHAT)
    print(f"text_chat 共 {len(routes)} 条路由，逐平台单测（绕过 FallbackModel）\n")
    for index, route in enumerate(routes, start=1):
        for mode, probe in (("非流式", probe_non_stream), ("流式", probe_stream)):
            label = f"探针 {index} [{route.platform} / {route.model}] {mode}"
            failures += await _run_one(label, probe(route))
    return failures


# ---------------------------------------------------------------- 探针 3-6 视频轨


def _make_test_video(target_dir: Path) -> Path:
    """红 3s -> 蓝 3s 的确定性测试视频；回答对颜色顺序即证明真看了画面。"""
    if shutil.which("ffmpeg") is None:
        raise CheckFailure("本机无 ffmpeg（brew install ffmpeg），无法合成测试视频")
    path = target_dir / "lemma_probe_red_blue.mp4"
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "lavfi", "-i", "color=c=red:s=320x240:r=10:d=3",
            "-f", "lavfi", "-i", "color=c=blue:s=320x240:r=10:d=3",
            "-filter_complex", "[0:v][1:v]concat=n=2:v=1:a=0,format=yuv420p",
            "-c:v", "libx264", str(path),
        ],
        check=True,
        capture_output=True,
    )
    return path


def _check_colors(answer: str) -> str:
    lowered = answer.lower()
    has_red = "红" in answer or "red" in lowered
    has_blue = "蓝" in answer or "blue" in lowered
    _check(has_red and has_blue, "回答未同时说出红/蓝两色", f"answer={answer[:120]!r}")
    red_at = answer.find("红") if "红" in answer else lowered.find("red")
    blue_at = answer.find("蓝") if "蓝" in answer else lowered.find("blue")
    order = "红→蓝(对)" if red_at < blue_at else "顺序存疑"
    return order


async def probe_3_framework_text(route: ModelRoute) -> str:
    text_route = route.model_copy(update={"model": "gemini-2.5-flash"})
    result = await text_chat_agent.run(
        PROMPT, model=build_model(text_route), deps=DEPS
    )
    usage = result.usage
    _check(bool(result.output.strip()), "回答为空")
    _check(
        usage.input_tokens > 0 and usage.output_tokens > 0 and usage.total_tokens > 0,
        "usage 三件套不完整",
        _usage_summary(usage),
    )
    return f"text[{len(result.output)}字] {_usage_summary(usage)}"


async def probe_4a_native_qa(route: ModelRoute, video: VideoInput) -> str:
    text, usage_metadata, actual_model = await gemini_video.answer(
        model=route.model,
        system_prompt=VIDEO_SYSTEM_PROMPT,
        question=VIDEO_QUESTION,
        file_uri=video.url or "",
        mime_type=video.mime_type,
        timeout_s=route.timeout_s,
    )
    _check(bool(text.strip()), "回答为空")
    order = _check_colors(text)
    _check(usage_metadata is not None, "usage_metadata 缺失")
    _check(
        bool(usage_metadata.prompt_token_count)
        and bool(usage_metadata.total_token_count),
        "usage_metadata 不完整",
        f"prompt={usage_metadata.prompt_token_count} total={usage_metadata.total_token_count}",
    )
    return (
        f"{order} prompt={usage_metadata.prompt_token_count} "
        f"total={usage_metadata.total_token_count} model={actual_model}"
    )


async def probe_4b_framework_qa(route: ModelRoute, video: VideoInput) -> str:
    deps = LemmaDeps(system_prompt=VIDEO_SYSTEM_PROMPT)
    result = await video_qa_agent.run(
        [
            VIDEO_QUESTION,
            VideoUrl(url=video.url or "", media_type=video.mime_type or "video/mp4"),
        ],
        model=build_model(route),
        deps=deps,
    )
    usage = result.usage
    _check(bool(result.output.strip()), "回答为空")
    order = _check_colors(result.output)
    _check(
        usage.input_tokens > 0 and usage.output_tokens > 0 and usage.total_tokens > 0,
        "usage 三件套不完整",
        _usage_summary(usage),
    )
    return f"{order} {_usage_summary(usage)}"


async def probe_5_files_lifecycle(video: VideoInput) -> str:
    file = await gemini_video.get_file(video.file_id or "")
    _check(str(file.state) == "FileState.ACTIVE", "文件非 ACTIVE", f"state={file.state}")
    _check(file.expiration_time is not None, "expiration_time 缺失（48h 过期管理无依据）")
    from datetime import UTC, datetime

    hours_left = (file.expiration_time - datetime.now(UTC)).total_seconds() / 3600
    _check(0 < hours_left <= 49, "过期时间异常", f"hours_left={hours_left:.1f}")
    _check(not provider_files.is_expired(video), "provider_files 误判刚传的文件已过期")

    await gemini_video.delete_file(video.file_id or "")
    try:
        await gemini_video.get_file(video.file_id or "")
    except genai_errors.APIError as exc:
        code = getattr(exc, "code", None)
        return f"ACTIVE -> 过期 {hours_left:.1f}h 后 -> delete -> get 报 {code}（符合预期）"
    raise CheckFailure("delete 后 get 仍成功，文件未被删除")


async def probe_6a_native_stream(route: ModelRoute, video: VideoInput) -> str:
    chunks = 0
    text = ""
    final_usage = None
    async for delta, usage_metadata in gemini_video.stream_answer(
        model=route.model,
        system_prompt=VIDEO_SYSTEM_PROMPT,
        question=VIDEO_QUESTION,
        file_uri=video.url or "",
        mime_type=video.mime_type,
        timeout_s=route.timeout_s,
    ):
        if delta:
            chunks += 1
            text += delta
        if usage_metadata is not None:
            final_usage = usage_metadata
    _check(bool(text.strip()), "流式拼接文本为空")
    _check(final_usage is not None, "流末 usage_metadata 缺失")
    _check(
        bool(final_usage.prompt_token_count) and bool(final_usage.total_token_count),
        "流末 usage_metadata 不完整",
        f"prompt={final_usage.prompt_token_count} total={final_usage.total_token_count}",
    )
    return (
        f"chunks={chunks} text[{len(text)}字] "
        f"prompt={final_usage.prompt_token_count} total={final_usage.total_token_count}"
    )


async def probe_6b_framework_stream(route: ModelRoute, video: VideoInput) -> str:
    deps = LemmaDeps(system_prompt=VIDEO_SYSTEM_PROMPT)
    chunks = 0
    text = ""
    async with video_qa_agent.run_stream(
        [
            VIDEO_QUESTION,
            VideoUrl(url=video.url or "", media_type=video.mime_type or "video/mp4"),
        ],
        model=build_model(route),
        deps=deps,
    ) as stream:
        async for delta in stream.stream_text(delta=True, debounce_by=None):
            chunks += 1
            text += delta
        usage = stream.usage
    _check(bool(text.strip()), "流式拼接文本为空")
    _check(
        usage.input_tokens > 0 and usage.output_tokens > 0 and usage.total_tokens > 0,
        "流式 usage 不完整",
        _usage_summary(usage),
    )
    return f"chunks={chunks} text[{len(text)}字] {_usage_summary(usage)}"


async def run_video_probes() -> tuple[int, int]:
    """返回 (基线失败数, 并轨判据失败数)。"""
    route = routes_for(AIUseCase.VIDEO_QA)[0]
    baseline_failures = 0
    merge_failures = 0

    merge_failures += await _run_one(
        f"探针 3 [/gemini × GoogleModel] 纯文本", probe_3_framework_text(route)
    )

    print("\n  合成测试视频（红3s→蓝3s）并上传 Files API ...")
    upload_failed = False
    video: VideoInput | None = None
    with tempfile.TemporaryDirectory(prefix="lemma_probe_") as tmp:
        try:
            path = _make_test_video(Path(tmp))
            started = time.monotonic()
            video = await provider_files.upload_video(str(path), mime_type="video/mp4")
            elapsed_ms = int((time.monotonic() - started) * 1000)
            print(
                f"  上传完成: file_id={video.file_id} "
                f"expires_at={video.expires_at} [{elapsed_ms}ms]\n"
            )
        except (CheckFailure, Exception) as exc:  # noqa: BLE001 — 如实报告
            upload_failed = True
            print(f"FAIL  探针 4 前置 [Files API 上传] — {type(exc).__name__}: {exc}")

    if upload_failed or video is None:
        # 上传是 4/5/6 的共同前置；它失败则视频轨整体失败。
        print("SKIP  探针 4/5/6 — Files API 上传失败，无文件可引用")
        return baseline_failures + 1, merge_failures + 3

    baseline_failures += await _run_one(
        f"探针 4a [native / {route.model}] 视频问答", probe_4a_native_qa(route, video)
    )
    merge_failures += await _run_one(
        f"探针 4b [GoogleModel / {route.model}] 视频问答",
        probe_4b_framework_qa(route, video),
    )
    baseline_failures += await _run_one(
        f"探针 6a [native / {route.model}] 视频流式", probe_6a_native_stream(route, video)
    )
    merge_failures += await _run_one(
        f"探针 6b [GoogleModel / {route.model}] 视频流式",
        probe_6b_framework_stream(route, video),
    )
    # 探针 5 放最后：会删掉测试文件。
    merge_failures += await _run_one(
        "探针 5 [Files API] 生命周期", probe_5_files_lifecycle(video)
    )
    return baseline_failures, merge_failures


# ---------------------------------------------------------------------- 驱动


async def _run_one(label: str, coroutine) -> int:  # noqa: ANN001
    started = time.monotonic()
    try:
        detail = await coroutine
    except CheckFailure as exc:
        print(f"FAIL  {label} — {exc}")
        return 1
    except Exception as exc:  # noqa: BLE001 — 探针要如实报告一切异常
        print(f"FAIL  {label} — {type(exc).__name__}: {exc}")
        return 1
    elapsed_ms = int((time.monotonic() - started) * 1000)
    print(f"PASS  {label} — {detail} [{elapsed_ms}ms]")
    return 0


async def main() -> int:
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else "all"
    init_ai_runtime()
    text_failures = 0
    baseline_failures = 0
    merge_failures = 0
    try:
        if only in ("all", "text"):
            text_failures = await run_text_probes()
        if only in ("all", "video"):
            print()
            baseline_failures, merge_failures = await run_video_probes()
    finally:
        await shutdown_ai_runtime()

    print()
    failed = text_failures + baseline_failures + merge_failures
    if only in ("all", "text"):
        print(
            "文本轨(1-2): " + ("全过 — 混合方案成立" if text_failures == 0 else f"{text_failures} 项失败 — 触发中止线（终稿裁决 6）")
        )
    if only in ("all", "video"):
        if baseline_failures:
            print(f"视频基线(native): {baseline_failures} 项失败 — 默认引擎不可用，视频轨需排查")
        else:
            print("视频基线(native): 全过 — 默认引擎可用")
        if merge_failures:
            print(f"并轨判据(3/4b/5/6b): {merge_failures} 项失败 — 视频长期原生直连（终稿 12.1）")
        else:
            print("并轨判据(3/4b/5/6b): 全过 — 视频可并轨，AI_VIDEO_ENGINE=pydantic_ai 转为可选项")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

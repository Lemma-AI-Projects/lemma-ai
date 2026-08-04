"""门面级冒烟（回归集 12.2 的 1/2/4 项雏形）。

跑法（backend/ 目录下）:
    uv run python tests/smoke_ai_facade.py

链路: ai_client.chat -> ai_client.ask_video（合成视频 + Files API）->
查 ai_usage_logs 确认两条成功台账都落了库 -> 清理测试文件。
探针脚本测的是裸通道；这里测的是 services 实际会走的门面 + 落库。
"""

import asyncio
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from ai import delete_video, init_ai_runtime, shutdown_ai_runtime, upload_video
from ai.client import ai_client
from ai.types import AIUseCase, ChatMessage
from core.database import AsyncSessionLocal
from models.ai_usage_log import AiUsageLog


def _make_test_video(target_dir: Path) -> Path:
    if shutil.which("ffmpeg") is None:
        raise SystemExit("本机无 ffmpeg（brew install ffmpeg）")
    path = target_dir / "smoke_red_blue.mp4"
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


async def _ledger_rows(use_case: str) -> list[AiUsageLog]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(AiUsageLog)
            .where(AiUsageLog.use_case == use_case)
            .order_by(AiUsageLog.created_at.desc())
            .limit(3)
        )
        return list(result.scalars())


async def main() -> int:
    init_ai_runtime()
    failures = 0
    try:
        # 1) 文本门面
        response = await ai_client.chat(
            AIUseCase.TEXT_CHAT,
            [ChatMessage(role="user", content="用三个字回答：1+1=?")],
        )
        print(f"chat: [{response.platform}/{response.model}] {response.text!r} "
              f"usage={response.usage.total_tokens}")

        # 2) 视频门面（上传 -> ask_video -> 清理）
        with tempfile.TemporaryDirectory(prefix="lemma_smoke_") as tmp:
            video_path = _make_test_video(Path(tmp))
            video = await upload_video(str(video_path), mime_type="video/mp4")
        try:
            answer = await ai_client.ask_video(
                AIUseCase.VIDEO_QA, video, "视频里先后出现哪两种颜色？"
            )
            print(f"ask_video: [{answer.platform}/{answer.model}] {answer.text!r} "
                  f"usage={answer.usage.total_tokens}")
            ok = ("红" in answer.text or "red" in answer.text.lower()) and (
                "蓝" in answer.text or "blue" in answer.text.lower()
            )
            if not ok:
                failures += 1
                print("FAIL: ask_video 未说出红/蓝")
        finally:
            await delete_video(video)

        # 3) 台账落库
        for use_case in ("text_chat", "video_qa"):
            rows = await _ledger_rows(use_case)
            newest = rows[0] if rows else None
            if newest is None or not newest.success:
                failures += 1
                print(f"FAIL: ai_usage_logs 无 {use_case} 成功行")
            else:
                print(
                    f"ledger[{use_case}]: trace={newest.trace_id[:8]} "
                    f"{newest.platform}/{newest.actual_model} "
                    f"tokens={newest.total_tokens} latency={newest.latency_ms}ms "
                    f"success={newest.success}"
                )
    finally:
        await shutdown_ai_runtime()

    print("SMOKE " + ("FAILED" if failures else "OK"))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

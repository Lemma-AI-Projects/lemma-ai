"""课程视频交付端到端冒烟：

1. Storage 往返：boto3 multipart 上传 (>8MB 触发分片) → SDK 签发 signed URL →
   完整下载 + Range 回放 (206, 视频 seek 依赖) → 删除 → 删后不可达。证明私有桶、
   S3 keys、service role 签名、端点 + path-style 全部正确。
2. 章节视频管线：建临时课(1 unit × 2 chapter，候选指向一个小公开 mp4，yt-dlp 直链
   下载免 cookie) → 直接 await run_download(绕过 Celery) 真下载并转存 Supabase →
   get_chapter_video 返回 ready + 可播 signed URL → HTTP 回放校验字节一致 →
   未下载章节走 downloading + 懒加载兜底入队 + 就近预热下一章。
3. 滑动过期选择：回拨 last_accessed_at，验证 list_expired_assets 命中超期资产。

跑法（backend/ 目录下）:
    uv run python scripts/smoke_video_delivery.py

需配置 Supabase 私有桶 + S3 access keys + service role（见 .env.example）；未配置则
整体 SKIP。直接 await tasks.video_download.run_build 同款思路（绕过 worker），并把
video_asset_service._enqueue_download 打桩记录（免 Redis/worker）。
"""

import asyncio
import os
import sys
import tempfile
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx
from sqlalchemy import select

from core import storage
from core.config import settings
from core.database import AsyncSessionLocal, engine
from core.security import CurrentUser
from models.chapter_video_asset import ChapterVideoAsset
from models.course import Course, CourseChapter, CourseUnit
from models.course_candidate import ChapterVideoCandidate
from models.profile import Profile
from services import video_asset_service
from tasks.video_download import run_download

FAILURES: list[str] = []
CREATED_COURSE_IDS: list[uuid.UUID] = []
# Enqueues are recorded here instead of hitting Celery/Redis (run_download is
# awaited directly, so the worker is never needed).
ENQUEUED: list[uuid.UUID] = []

# Small public mp4 used as the chosen-candidate source: yt-dlp pulls it via the
# generic extractor (direct file URL, no cookies/extraction churn). Swap if it
# ever 404s.
SAMPLE_VIDEO_URL = "https://download.samplelib.com/mp4/sample-5s.mp4"
# Just over the 8 MB multipart threshold so the upload exercises real multipart.
MULTIPART_TEST_BYTES = 9 * 1024 * 1024


def check(condition: bool, label: str) -> None:
    status = "PASS" if condition else "FAIL"
    print(f"{status}  {label}")
    if not condition:
        FAILURES.append(label)


def _record_enqueue(chapter_id: uuid.UUID) -> None:
    ENQUEUED.append(chapter_id)


# --- helpers ---


async def _get_asset(chapter_id: uuid.UUID) -> ChapterVideoAsset | None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ChapterVideoAsset).where(
                ChapterVideoAsset.chapter_id == chapter_id
            )
        )
        return result.scalar_one_or_none()


async def _make_video_course(user_id: uuid.UUID) -> tuple[uuid.UUID, list[uuid.UUID]]:
    async with AsyncSessionLocal() as db:
        course = Course(
            user_id=user_id,
            topic="冒烟视频课",
            title="冒烟视频课",
            status="ready",
        )
        db.add(course)
        await db.flush()
        unit = CourseUnit(
            course_id=course.id, order_index=0, title="unit-0", status="not_started"
        )
        db.add(unit)
        await db.flush()
        chapter_ids: list[uuid.UUID] = []
        # 第一章 bilibili + author_id（可推导作者主页）；第二章 youtube 无 id。
        specs: list[tuple[str, str | None]] = [("bilibili", "123456"), ("youtube", None)]
        for index, (platform, author_id) in enumerate(specs):
            chapter = CourseChapter(
                unit_id=unit.id,
                order_index=index,
                title=f"冒烟章节 {index}",
                summary="",
                status="ready",
            )
            db.add(chapter)
            await db.flush()
            candidate = ChapterVideoCandidate(
                chapter_id=chapter.id,
                platform=platform,
                platform_video_id=f"smoke-vid-{index}",
                url=SAMPLE_VIDEO_URL,
                title=f"样例视频 {index}",
                author="样例作者",
                author_id=author_id,
                duration_s=5,
                discovery_source="smoke",
                raw_json={"smoke": True},
            )
            db.add(candidate)
            await db.flush()
            chapter.chosen_candidate_id = candidate.id
            chapter_ids.append(chapter.id)
        await db.commit()
        CREATED_COURSE_IDS.append(course.id)
        return course.id, chapter_ids


# --- sections ---


async def section_storage_roundtrip() -> None:
    key = f"smoke/{uuid.uuid4()}.bin"
    client = storage.build_s3_client()
    signed = ""
    try:
        with tempfile.NamedTemporaryFile(suffix=".bin", delete=False) as handle:
            handle.write(b"\0" * MULTIPART_TEST_BYTES)
            tmp_path = handle.name
        try:
            storage.upload_file(
                client,
                local_path=tmp_path,
                key=key,
                content_type="application/octet-stream",
            )
        finally:
            os.unlink(tmp_path)
        check(True, "storage: boto3 multipart 上传 9MB 成功（>8MB 触发分片）")

        signed = await storage.create_signed_url(key, expires_in=300)
        check(bool(signed), "storage: 签发 signed URL 成功")

        async with httpx.AsyncClient(timeout=120) as http:
            full = await http.get(signed)
            check(
                full.status_code == 200 and len(full.content) == MULTIPART_TEST_BYTES,
                f"storage: signed URL 完整下载且字节一致 "
                f"(status={full.status_code}, bytes={len(full.content)})",
            )
            ranged = await http.get(signed, headers={"Range": "bytes=0-9"})
            check(
                ranged.status_code == 206 and len(ranged.content) == 10,
                f"storage: Range 请求 206 + 10 字节（视频 seek 依赖）"
                f"(status={ranged.status_code})",
            )
    finally:
        storage.delete_objects(client, keys=[key])

    if signed:
        async with httpx.AsyncClient(timeout=30) as http:
            gone = await http.get(signed)
        check(gone.status_code != 200, f"storage: 删除后对象不可达 (status={gone.status_code})")


async def section_chapter_pipeline(user: CurrentUser) -> list[uuid.UUID]:
    course_id, chapter_ids = await _make_video_course(user.id)
    first_chapter, second_chapter = chapter_ids

    # 真下载 + 转存（绕过 Celery worker，直接 await 异步 body）。
    await run_download(first_chapter)

    asset = await _get_asset(first_chapter)
    check(
        asset is not None and asset.status == "ready",
        f"pipeline: 第一章 asset=ready (status={asset.status if asset else None})",
    )
    check(
        asset is not None
        and bool(asset.storage_path)
        and asset.size_bytes is not None
        and asset.size_bytes > 0,
        "pipeline: storage_path + size_bytes 落库",
    )
    check(
        asset is not None and asset.candidate_id is not None,
        "pipeline: asset.candidate_id 记录所选候选",
    )

    # ready 路径：签发可播 URL + 预热下一章。
    ENQUEUED.clear()
    async with AsyncSessionLocal() as db:
        video = await video_asset_service.get_chapter_video(
            db, user, course_id=course_id, chapter_id=first_chapter
        )
    check(
        video is not None
        and video.status == "ready"
        and bool(video.playback_url),
        "pipeline: get_chapter_video 返回 ready + playbackUrl",
    )
    check(
        video is not None and video.source.url == SAMPLE_VIDEO_URL,
        "pipeline: source.url = 原视频链接（下巴区来源）",
    )
    check(
        video is not None
        and video.source.platform == "bilibili"
        and video.author.homepage_url == "https://space.bilibili.com/123456",
        "pipeline: bilibili 作者主页链接由 author_id 推导（下巴区作者）",
    )
    check(second_chapter in ENQUEUED, "pipeline: 访问就绪章 -> 就近预热下一章入队")

    if video is not None and video.playback_url and asset is not None:
        async with httpx.AsyncClient(timeout=120) as http:
            played = await http.get(video.playback_url)
        check(
            played.status_code == 200 and len(played.content) == asset.size_bytes,
            f"pipeline: 转存视频经 signed URL 可回放且字节一致 "
            f"(status={played.status_code})",
        )

    # 未下载章节：downloading + 懒加载兜底入队 + 建 pending 资产行。
    ENQUEUED.clear()
    async with AsyncSessionLocal() as db:
        video2 = await video_asset_service.get_chapter_video(
            db, user, course_id=course_id, chapter_id=second_chapter
        )
    check(
        video2 is not None and video2.status == "downloading",
        f"pipeline: 未下载章节 -> downloading "
        f"(status={video2.status if video2 else None})",
    )
    check(second_chapter in ENQUEUED, "pipeline: 懒加载兜底入队该章下载")
    asset2 = await _get_asset(second_chapter)
    check(
        asset2 is not None and asset2.status in ("pending", "downloading"),
        "pipeline: 兜底为该章建 pending 资产行",
    )

    # IDOR/404：陌生 courseId 取不到。
    async with AsyncSessionLocal() as db:
        missing = await video_asset_service.get_chapter_video(
            db, user, course_id=uuid.uuid4(), chapter_id=first_chapter
        )
    check(missing is None, "pipeline: 陌生 courseId -> None (404, IDOR 安全)")

    return chapter_ids


async def section_expiry(chapter_id: uuid.UUID) -> None:
    # 回拨最后访问时间，越过滑动 TTL。
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ChapterVideoAsset).where(
                ChapterVideoAsset.chapter_id == chapter_id
            )
        )
        asset = result.scalar_one()
        asset.last_accessed_at = datetime.now(UTC) - timedelta(
            days=settings.video_asset_ttl_days + 5
        )
        await db.commit()
        asset_id = asset.id

    cutoff = datetime.now(UTC) - timedelta(days=settings.video_asset_ttl_days)
    async with AsyncSessionLocal() as db:
        expired = await video_asset_service.list_expired_assets(db, cutoff=cutoff)
    check(
        any(item.id == asset_id for item in expired),
        "expiry: 滑动过期选择命中超期资产",
    )
    check(
        any(item.id == asset_id and item.storage_path for item in expired),
        "expiry: 超期项带 storage_path（供清理删对象）",
    )


async def _cleanup() -> None:
    keys: list[str] = []
    async with AsyncSessionLocal() as db:
        for course_id in CREATED_COURSE_IDS:
            rows = (
                await db.execute(
                    select(ChapterVideoAsset.storage_path)
                    .join(
                        CourseChapter,
                        ChapterVideoAsset.chapter_id == CourseChapter.id,
                    )
                    .join(CourseUnit, CourseChapter.unit_id == CourseUnit.id)
                    .where(
                        CourseUnit.course_id == course_id,
                        ChapterVideoAsset.storage_path.isnot(None),
                    )
                )
            ).scalars().all()
            keys.extend(path for path in rows if path)
        for course_id in CREATED_COURSE_IDS:
            course = await db.get(Course, course_id)
            if course is not None:
                await db.delete(course)  # cascade units/chapters/candidates/assets
        await db.commit()
    if keys:
        client = storage.build_s3_client()
        storage.delete_objects(client, keys=keys)


async def main() -> int:
    if not (
        settings.supabase_s3_endpoint
        and settings.supabase_service_role_key
        and settings.supabase_s3_access_key_id
    ):
        print("SKIP: Supabase Storage 未配置（需 S3 endpoint/keys + service role）")
        return 0

    # 把入队改成记录器：run_download 直接 await，无需 Celery/Redis。
    video_asset_service._enqueue_download = _record_enqueue  # type: ignore[assignment]

    chapter_ids: list[uuid.UUID] = []
    try:
        async with AsyncSessionLocal() as session:
            profile = (await session.execute(select(Profile).limit(1))).scalar_one()
        user = CurrentUser(id=profile.id, email=profile.email)

        try:
            await storage.ensure_bucket()
            check(True, "setup: 私有桶已就绪（存在或已创建）")
        except Exception as exc:  # noqa: BLE001
            check(False, f"setup: 确保私有桶失败: {exc!r}")

        try:
            await section_storage_roundtrip()
        except Exception as exc:  # noqa: BLE001 — smoke: 转成 FAIL 行而非崩栈
            check(False, f"storage 往返抛异常: {exc!r}")

        try:
            chapter_ids = await section_chapter_pipeline(user)
        except Exception as exc:  # noqa: BLE001
            check(False, f"章节视频管线抛异常: {exc!r}")

        if chapter_ids:
            try:
                await section_expiry(chapter_ids[0])
            except Exception as exc:  # noqa: BLE001
                check(False, f"过期选择抛异常: {exc!r}")
    finally:
        await _cleanup()
        await engine.dispose()

    print()
    if FAILURES:
        print(f"SMOKE FAILED: {len(FAILURES)} 项未过")
        return 1
    print("SMOKE OK: 课程视频交付（Storage 往返 + 章节管线 + 过期）全链路通过")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

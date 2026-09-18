"""课程视频交付端到端冒烟：

1. Storage 往返：boto3 multipart 上传 (>8MB 触发分片) → SDK 签发 signed URL →
   完整下载 + Range 回放 (206, 视频 seek 依赖) → 删除 → 删后不可达。证明私有桶、
   S3 keys、service role 签名、端点 + path-style 全部正确。
2. 学习点视频管线：建临时课(1 章 × 1 单元 × 2 学习点，候选指向一个小公开 mp4，
   yt-dlp 直链下载免 cookie) → 直接 await run_download(绕过 Celery) 真下载并转存
   Supabase → get_point_video 返回 ready + 可播 signed URL → HTTP 回放校验字节一致
   → 未下载学习点走 downloading + 懒加载兜底入队 + 就近预热下一个学习点。
3. 滑动过期选择：回拨 last_accessed_at，验证 list_expired_assets 命中超期资产。
4. 删课清对象：purge_course_objects 在删行前清掉 Storage 对象。

跑法（backend/ 目录下）:
    uv run python scripts/smoke_video_delivery.py

需配置 Supabase 私有桶 + S3 access keys + service role（见 .env.example）；未配置则
整体 SKIP。直接 await tasks.video_download.run_download（绕过 worker），并把
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
from models.course import Course, CourseLesson, CourseModule, CoursePoint
from models.point_video_asset import PointVideoAsset
from models.point_video_candidate import PointVideoCandidate
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


def _record_enqueue(point_id: uuid.UUID) -> None:
    ENQUEUED.append(point_id)


# --- helpers ---


async def _get_asset(point_id: uuid.UUID) -> PointVideoAsset | None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(PointVideoAsset).where(PointVideoAsset.point_id == point_id)
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
        module = CourseModule(course_id=course.id, order_index=0, title="module-0")
        db.add(module)
        await db.flush()
        lesson = CourseLesson(module_id=module.id, order_index=0, title="lesson-0")
        db.add(lesson)
        await db.flush()
        point_ids: list[uuid.UUID] = []
        # 第一个学习点 bilibili + author_id（可推导作者主页）；第二个 youtube 无 id。
        specs: list[tuple[str, str | None]] = [("bilibili", "123456"), ("youtube", None)]
        for index, (platform, author_id) in enumerate(specs):
            point = CoursePoint(
                lesson_id=lesson.id,
                order_index=index,
                title=f"冒烟学习点 {index}",
                build_status="ready",
            )
            db.add(point)
            await db.flush()
            candidate = PointVideoCandidate(
                point_id=point.id,
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
            point.chosen_candidate_id = candidate.id
            point_ids.append(point.id)
        await db.commit()
        CREATED_COURSE_IDS.append(course.id)
        return course.id, point_ids


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


async def section_point_pipeline(user: CurrentUser) -> tuple[uuid.UUID, list[uuid.UUID]]:
    course_id, point_ids = await _make_video_course(user.id)
    first_point, second_point = point_ids

    # 真下载 + 转存（绕过 Celery worker，直接 await 异步 body）。
    await run_download(first_point)

    asset = await _get_asset(first_point)
    check(
        asset is not None and asset.status == "ready",
        f"pipeline: 第一个学习点 asset=ready (status={asset.status if asset else None})",
    )
    check(
        asset is not None
        and bool(asset.storage_path)
        and asset.size_bytes is not None
        and asset.size_bytes > 0,
        "pipeline: storage_path + size_bytes 落库",
    )
    check(
        asset is not None and asset.storage_path.startswith("points/"),
        "pipeline: object key 使用 points/ 前缀",
    )
    check(
        asset is not None and asset.candidate_id is not None,
        "pipeline: asset.candidate_id 记录所选候选",
    )
    check(
        asset is not None and bool(asset.download_backend),
        "pipeline: asset.download_backend 记录最终下载后端",
    )

    # ready 路径：签发可播 URL + 预热下一个学习点。
    ENQUEUED.clear()
    async with AsyncSessionLocal() as db:
        video = await video_asset_service.get_point_video(
            db, user, course_id=course_id, point_id=first_point
        )
    check(
        video is not None
        and video.status == "ready"
        and bool(video.playback_url),
        "pipeline: get_point_video 返回 ready + playbackUrl",
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
    check(second_point in ENQUEUED, "pipeline: 访问就绪学习点 -> 就近预热下一个入队")

    if video is not None and video.playback_url and asset is not None:
        async with httpx.AsyncClient(timeout=120) as http:
            played = await http.get(video.playback_url)
        check(
            played.status_code == 200 and len(played.content) == asset.size_bytes,
            f"pipeline: 转存视频经 signed URL 可回放且字节一致 "
            f"(status={played.status_code})",
        )

    # 未下载学习点：downloading + 懒加载兜底入队 + 建 pending 资产行。
    ENQUEUED.clear()
    async with AsyncSessionLocal() as db:
        video2 = await video_asset_service.get_point_video(
            db, user, course_id=course_id, point_id=second_point
        )
    check(
        video2 is not None and video2.status == "downloading",
        f"pipeline: 未下载学习点 -> downloading "
        f"(status={video2.status if video2 else None})",
    )
    check(second_point in ENQUEUED, "pipeline: 懒加载兜底入队该学习点下载")
    asset2 = await _get_asset(second_point)
    check(
        asset2 is not None and asset2.status in ("pending", "downloading"),
        "pipeline: 兜底为该学习点建 pending 资产行",
    )

    # IDOR/404：陌生 courseId 取不到。
    async with AsyncSessionLocal() as db:
        missing = await video_asset_service.get_point_video(
            db, user, course_id=uuid.uuid4(), point_id=first_point
        )
    check(missing is None, "pipeline: 陌生 courseId -> None (404, IDOR 安全)")

    return course_id, point_ids


async def section_expiry(point_id: uuid.UUID) -> None:
    # 回拨最后访问时间，越过滑动 TTL。
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(PointVideoAsset).where(PointVideoAsset.point_id == point_id)
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


async def section_purge_on_delete(course_id: uuid.UUID) -> None:
    """删课前清 Storage：purge_course_objects 删掉该课全部对象。"""
    async with AsyncSessionLocal() as db:
        keys = (
            (
                await db.execute(
                    select(PointVideoAsset.storage_path)
                    .join(CoursePoint, PointVideoAsset.point_id == CoursePoint.id)
                    .join(CourseLesson, CoursePoint.lesson_id == CourseLesson.id)
                    .join(CourseModule, CourseLesson.module_id == CourseModule.id)
                    .where(
                        CourseModule.course_id == course_id,
                        PointVideoAsset.storage_path.isnot(None),
                    )
                )
            )
            .scalars()
            .all()
        )
    if not keys:
        check(False, "purge: 课程下没有已转存对象（前置管线未产出）")
        return
    async with AsyncSessionLocal() as db:
        deleted = await video_asset_service.purge_course_objects(
            db, course_id=course_id
        )
    check(deleted == len(keys), f"purge: 删课前清掉 {deleted}/{len(keys)} 个对象")

    signed_gone = True
    async with httpx.AsyncClient(timeout=30) as http:
        for key in keys:
            try:
                url = await storage.create_signed_url(key, expires_in=60)
            except storage.StorageError:
                continue
            response = await http.get(url)
            if response.status_code == 200:
                signed_gone = False
    check(signed_gone, "purge: 清理后对象不可达")


async def _cleanup() -> None:
    keys: list[str] = []
    async with AsyncSessionLocal() as db:
        for course_id in CREATED_COURSE_IDS:
            rows = (
                (
                    await db.execute(
                        select(PointVideoAsset.storage_path)
                        .join(CoursePoint, PointVideoAsset.point_id == CoursePoint.id)
                        .join(CourseLesson, CoursePoint.lesson_id == CourseLesson.id)
                        .join(CourseModule, CourseLesson.module_id == CourseModule.id)
                        .where(
                            CourseModule.course_id == course_id,
                            PointVideoAsset.storage_path.isnot(None),
                        )
                    )
                )
                .scalars()
                .all()
            )
            keys.extend(path for path in rows if path)
        for course_id in CREATED_COURSE_IDS:
            course = await db.get(Course, course_id)
            if course is not None:
                await db.delete(course)  # cascade modules/lessons/points/candidates
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

    point_ids: list[uuid.UUID] = []
    course_id: uuid.UUID | None = None
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
            course_id, point_ids = await section_point_pipeline(user)
        except Exception as exc:  # noqa: BLE001
            check(False, f"学习点视频管线抛异常: {exc!r}")

        if point_ids:
            try:
                await section_expiry(point_ids[0])
            except Exception as exc:  # noqa: BLE001
                check(False, f"过期选择抛异常: {exc!r}")
        if course_id is not None:
            try:
                await section_purge_on_delete(course_id)
            except Exception as exc:  # noqa: BLE001
                check(False, f"删课清对象抛异常: {exc!r}")
    finally:
        await _cleanup()
        await engine.dispose()

    print()
    if FAILURES:
        print(f"SMOKE FAILED: {len(FAILURES)} 项未过")
        return 1
    print("SMOKE OK: 课程视频交付（Storage 往返 + 学习点管线 + 过期 + 删课清理）通过")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

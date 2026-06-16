"""ai/search 冒烟：离线段验证归一化/字段映射（不联网、不需 key），联网段
（仅当 APIFY_API_TOKEN 配置时）真打 Apify yt/bili 各一次并核对台账落库。

跑法（backend/ 目录下）:
    uv run python scripts/smoke_search_providers.py

离线段样例 item 取自 docs/apify readme/*.md（yt 用 readme 单视频/频道样例；
bili 按 readme 记录的字段构造，readme 未给完整 JSON）。
"""

import asyncio
import sys
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from ai.search import (
    SearchPlatform,
    VideoSearchQuery,
    search_videos,
    validate_search_routes,
)
from ai.search.normalize import parse_duration, parse_int, parse_published_at
from ai.search.providers.apify.bilibili import to_candidate as bili_to_candidate
from ai.search.providers.apify.youtube import to_candidate as yt_to_candidate
from core.config import settings
from core.database import AsyncSessionLocal, engine
from models.provider_usage_log import ProviderUsageLog

FAILURES: list[str] = []


def check(condition: bool, label: str) -> None:
    status = "PASS" if condition else "FAIL"
    print(f"{status}  {label}")
    if not condition:
        FAILURES.append(label)


# --- 样例原始 item ---

# YouTube Scraper "single video" 样例（docs/apify readme/youtube scraper.md）。
YT_VIDEO_ITEM = {
    "title": "Stromae - Santé (Live From The Tonight Show Starring Jimmy Fallon)",
    "id": "CW7gfrTlr0Y",
    "url": "https://www.youtube.com/watch?v=CW7gfrTlr0Y",
    "thumbnailUrl": "https://i.ytimg.com/vi/CW7gfrTlr0Y/maxresdefault.jpg",
    "viewCount": 35582192,
    "date": "2021-12-21",
    "likes": 512238,
    "channelName": "StromaeVEVO",
    "channelUrl": "http://www.youtube.com/@StromaeVEVO",
    "duration": "00:03:17",
    "text": "Stromae - Santé (Live From The Tonight Show ...)",
}

# YouTube "channel info" 样例：相对日期 "10 months ago" + 时长 "29:54"。
YT_RELATIVE_ITEM = {
    "id": "HV6OlMPn5sI",
    "title": "Raimu - The Spirit Within",
    "duration": "29:54",
    "channelName": "Lofi Girl",
    "channelUrl": "https://www.youtube.com/channel/UCSJ4gkVC6NrvII8umztf0Ow",
    "date": "10 months ago",
    "url": "https://www.youtube.com/watch?v=HV6OlMPn5sI",
    "viewCount": 410458,
}

# YouTube error item（readme「Error items」节）：应被跳过。
YT_ERROR_ITEM = {
    "url": "https://www.youtube.com/watch?v=deleted",
    "input": "deleted",
    "error": "VIDEO_UNAVAILABLE",
    "note": "Video is not available",
}

# Bilibili item：字段名按 LIVE actor 实测输出校正（readme 列的 play/like/
# pubdate/pic/arcurl 与真实不符；真实为 play_count/likes/pub_date/thumbnail/
# url）。title 含 <em> 高亮标签、thumbnail 协议相对、pub_date 秒级时间戳。
BILI_ITEM = {
    "bvid": "BV1xx411c7mD",
    "aid": 113006243481679,
    "url": "https://www.bilibili.com/video/BV1xx411c7mD",
    "title": '<em class="keyword">机器学习</em>入门教程',
    "description": "示例简介",
    "author": "示例UP主",
    "mid": 12345678,
    "duration": "12:34",
    "play_count": 1024000,
    "danmaku_count": 789,
    "favorites": 666,
    "likes": 23456,
    "pub_date": 1640000000,
    "thumbnail": "//i0.hdslb.com/bfs/archive/example.jpg",
}


def offline_checks() -> None:
    # 归一化原语
    check(parse_duration("00:03:17") == 197, 'parse_duration "00:03:17" -> 197')
    check(parse_duration("29:54") == 1794, 'parse_duration "29:54" -> 1794')
    check(parse_duration("12:34") == 754, 'parse_duration "12:34" -> 754')
    check(parse_int("1,710,167,563") == 1710167563, "parse_int 去千分位逗号")
    check(parse_published_at("10 months ago") is None, "相对日期 -> None 不报错")

    # YouTube 单视频映射
    yt = yt_to_candidate(YT_VIDEO_ITEM)
    assert yt is not None
    check(yt.platform == SearchPlatform.YOUTUBE, "yt platform=youtube")
    check(yt.platform_video_id == "CW7gfrTlr0Y", "yt platform_video_id 正确")
    check(yt.url == "https://www.youtube.com/watch?v=CW7gfrTlr0Y", "yt url 正确")
    check(yt.duration_s == 197, 'yt duration_s "00:03:17" -> 197')
    check(isinstance(yt.view_count, int) and yt.view_count == 35582192, "yt view_count 是 int")
    check(yt.like_count == 512238, "yt like_count 正确")
    check(
        yt.published_at is not None
        and (yt.published_at.year, yt.published_at.month, yt.published_at.day)
        == (2021, 12, 21),
        "yt published_at 绝对日期解析正确",
    )
    check(yt.thumbnail_url == YT_VIDEO_ITEM["thumbnailUrl"], "yt thumbnail_url 正确")
    check(yt.title and yt.author == "StromaeVEVO", "yt title/author 正确")

    # YouTube 相对日期项
    yt_rel = yt_to_candidate(YT_RELATIVE_ITEM)
    assert yt_rel is not None
    check(yt_rel.published_at is None, "yt 相对日期项 published_at=None（不报错）")
    check(yt_rel.duration_s == 1794, 'yt 相对日期项 duration_s "29:54" -> 1794')

    # YouTube error item 跳过
    check(yt_to_candidate(YT_ERROR_ITEM) is None, "yt error item 被跳过 (-> None)")

    # Bilibili 映射
    bili = bili_to_candidate(BILI_ITEM)
    assert bili is not None
    check(bili.platform == SearchPlatform.BILIBILI, "bili platform=bilibili")
    check(bili.platform_video_id == "BV1xx411c7mD", "bili platform_video_id=bvid")
    check(bili.url == "https://www.bilibili.com/video/BV1xx411c7mD", "bili url 正确")
    check("<" not in bili.title and bili.title == "机器学习入门教程", "bili title 去除 <em> 标签")
    check(bili.duration_s == 754, 'bili duration_s "12:34" -> 754')
    check(bili.view_count == 1024000, "bili view_count=play")
    check(bili.like_count == 23456, "bili like_count=like")
    check(bili.author_id == "12345678", "bili author_id=str(mid)")
    check(
        bili.thumbnail_url == "https://i0.hdslb.com/bfs/archive/example.jpg",
        "bili thumbnail_url 协议相对 -> https",
    )
    check(bili.published_at is not None, "bili published_at 由 pubdate 时间戳解析")


async def _recent_success_rows(since: datetime) -> list[ProviderUsageLog]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(ProviderUsageLog)
            .where(ProviderUsageLog.created_at >= since)
            .where(ProviderUsageLog.success.is_(True))
            .order_by(ProviderUsageLog.created_at.desc())
        )
        return list(result.scalars())


async def online_checks() -> None:
    since = datetime.now(UTC)
    query = VideoSearchQuery(keyword="Python 教程")

    yt = await search_videos(query, platform=SearchPlatform.YOUTUBE, limit=3)
    check(len(yt) >= 1, "联网 youtube 返回 >=1 候选")
    if yt:
        top = yt[0]
        check(
            bool(top.title)
            and bool(top.url)
            and top.platform == SearchPlatform.YOUTUBE
            and top.duration_s is not None
            and top.view_count is not None,
            "youtube 候选 title/url/platform/duration_s/view_count 非空",
        )

    bili = await search_videos(query, platform=SearchPlatform.BILIBILI, limit=3)
    check(len(bili) >= 1, "联网 bilibili 返回 >=1 候选")
    if bili:
        top = bili[0]
        check(
            bool(top.title)
            and bool(top.url)
            and top.platform == SearchPlatform.BILIBILI
            and top.duration_s is not None
            and top.view_count is not None,
            "bilibili 候选 title/url/platform/duration_s/view_count 非空",
        )

    rows = await _recent_success_rows(since)
    platforms = {row.platform for row in rows}
    check("youtube" in platforms, "provider_usage_logs 落了 youtube success=True 行")
    check("bilibili" in platforms, "provider_usage_logs 落了 bilibili success=True 行")


async def main() -> int:
    validate_search_routes()
    try:
        offline_checks()
        if settings.apify_api_token:
            await online_checks()
        else:
            print("SKIP: APIFY_API_TOKEN 未配置，跳过联网验收")
    finally:
        await engine.dispose()

    print()
    if FAILURES:
        print(f"SMOKE FAILED: {len(FAILURES)} 项未过")
        return 1
    print("SMOKE OK: ai/search 视频搜索 provider 层通过")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

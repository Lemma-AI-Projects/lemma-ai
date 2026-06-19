"""自建搜索 provider 冒烟：离线段验证字段映射/归一化（不联网、免 key/token），
联网段（默认跑，可 --offline 跳过）对 yt-dlp(youtube) 与官方(bilibili) 各打中英文
各一次，核对 VideoCandidate 关键字段非空并核验 provider_usage_logs 落库
（自建 provider：cost_usd=0、actor_id=NULL）。

跑法（backend/ 目录下）:
    uv run python scripts/smoke_selfbuilt_search.py            # 离线 + 联网
    uv run python scripts/smoke_selfbuilt_search.py --offline  # 仅离线

离线样例 item 取自 docs/6-19 自建搜索方案/REPORT.md 的实测 JSON（4.1 / 4.2 节）。
bilibili 联网可能遇风控（-412 / v_voucher），按可重试失败处理并标注，不算 smoke 崩。
"""

import asyncio
import sys
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from ai.errors import AIError
from ai.search import SearchPlatform, VideoSearchQuery, search_videos, validate_search_routes
from ai.search.normalize import pick_thumbnail
from ai.search.providers.bilibili import wbi
from ai.search.providers.bilibili.provider import to_candidate as bili_to_candidate
from ai.search.providers.youtube.provider import to_candidate as yt_to_candidate
from core.database import AsyncSessionLocal, engine
from models.provider_usage_log import ProviderUsageLog

_SELF_BUILT_PROVIDERS = {"ytdlp_youtube", "bili_search"}

FAILURES: list[str] = []


def check(condition: bool, label: str) -> None:
    status = "PASS" if condition else "FAIL"
    print(f"{status}  {label}")
    if not condition:
        FAILURES.append(label)


# --- 样例原始 item（REPORT.md 实测 JSON）---

# Bilibili 官方 wbi/search/type 首条（REPORT 4.1）：title 含 <em> 高亮、pic 协议相对、
# duration "mm:ss"（293:4）、pubdate 秒级时间戳、mid 为作者主页 id。
BILI_ITEM = {
    "title": '《<em class="keyword">线性代数</em>》4小时速成课（不挂科） | 框框老师',
    "author": "框框老师课堂",
    "mid": 661141753,
    "bvid": "BV1Ey4y147xn",
    "aid": 802620349,
    "arcurl": "http://www.bilibili.com/video/av802620349",
    "duration": "293:4",
    "play": 23922209,
    "review": 15453,
    "video_review": 180330,
    "favorites": 699573,
    "like": 659532,
    "danmaku": 180330,
    "pubdate": 1617891782,
    "pic": "//i2.hdslb.com/bfs/archive/8c5703b4651ec5bf6d6a21003ace9c5f09a72594.jpg",
    "description": "应广大同学们的要求……",
    "tag": "线性代数,课程,数学",
}

# YouTube yt-dlp flat 首条（REPORT 4.2 flat 样例）：duration 为秒级 int、thumbnails
# 为数组、channel_id 作 author_id、无 like/日期（flat 不给）。
YT_FLAT_ITEM = {
    "id": "J7DzL2_Na80",
    "url": "https://www.youtube.com/watch?v=J7DzL2_Na80",
    "title": "1. The Geometry of Linear Equations",
    "description": "MIT 18.06 Linear Algebra, Spring 2005 ...",
    "duration": 2389,
    "channel_id": "UCEBb1b_L6zDS3xTUrIALZOw",
    "channel": "MIT OpenCourseWare",
    "channel_url": "https://www.youtube.com/channel/UCEBb1b_L6zDS3xTUrIALZOw",
    "uploader": "MIT OpenCourseWare",
    "uploader_id": "@mitocw",
    "uploader_url": "https://www.youtube.com/@mitocw",
    "view_count": 2701092,
    "thumbnails": [
        {"url": "https://i.ytimg.com/vi/J7DzL2_Na80/default.jpg", "height": 90, "width": 120},
        {"url": "https://i.ytimg.com/vi/J7DzL2_Na80/hqdefault.jpg", "height": 270, "width": 480},
    ],
}

# YouTube 完整抽取首条（REPORT 4.2 full 样例）：补 like_count/comment_count/
# timestamp/upload_date/完整简介；缩略图为单个字符串。
YT_FULL_ITEM = {
    "id": "J7DzL2_Na80",
    "title": "1. The Geometry of Linear Equations",
    "uploader": "MIT OpenCourseWare",
    "uploader_id": "@mitocw",
    "channel": "MIT OpenCourseWare",
    "channel_id": "UCEBb1b_L6zDS3xTUrIALZOw",
    "duration": 2389,
    "view_count": 2701092,
    "like_count": 38059,
    "comment_count": 1100,
    "timestamp": 1569356431,
    "upload_date": "20190924",
    "thumbnail": "https://i.ytimg.com/vi/J7DzL2_Na80/sddefault.jpg",
    "webpage_url": "https://www.youtube.com/watch?v=J7DzL2_Na80",
    "description": "MIT 18.06 Linear Algebra, Spring 2005\nInstructor: Gilbert Strang",
}


def offline_checks() -> None:
    # --- normalize: pick_thumbnail ---
    check(
        pick_thumbnail(
            [{"url": "low", "width": 120, "height": 90},
             {"url": "high", "width": 1280, "height": 720}]
        )
        == "high",
        "pick_thumbnail 取最高分辨率",
    )
    check(pick_thumbnail([]) is None, "pick_thumbnail 空列表 -> None")
    check(pick_thumbnail(None) is None, "pick_thumbnail None -> None")

    # --- WBI（默认关，但算法仍须正确，便于一键开启）---
    mixin = wbi.get_mixin_key("a" * 64)
    check(len(mixin) == 32, "wbi mixin_key 长度=32")
    signed = wbi.encode_wbi({"keyword": "线性代数", "page": 1}, mixin, now=1700000000)
    check(signed.get("wts") == 1700000000, "wbi encode 注入 wts")
    check(
        isinstance(signed.get("w_rid"), str) and len(signed["w_rid"]) == 32,
        "wbi encode 产出 32 位 w_rid",
    )

    # --- Bilibili 映射 ---
    bili = bili_to_candidate(BILI_ITEM)
    assert bili is not None
    check(bili.platform == SearchPlatform.BILIBILI, "bili platform=bilibili")
    check(bili.platform_video_id == "BV1Ey4y147xn", "bili platform_video_id=bvid")
    check(
        bili.url == "https://www.bilibili.com/video/BV1Ey4y147xn",
        "bili url 由 bvid 构造",
    )
    check(
        "<em>" not in bili.title and "</em>" not in bili.title
        and bili.title == "《线性代数》4小时速成课（不挂科） | 框框老师",
        "bili title 去除 <em> 高亮标签",
    )
    check(bili.author == "框框老师课堂", "bili author 正确")
    check(bili.author_id == "661141753", "bili author_id=str(mid)（驱动空间主页）")
    check(bili.duration_s == 17584, 'bili duration_s "293:4" -> 17584')
    check(bili.view_count == 23922209, "bili view_count=play")
    check(bili.like_count == 659532, "bili like_count=like")
    check(
        bili.thumbnail_url
        == "https://i2.hdslb.com/bfs/archive/8c5703b4651ec5bf6d6a21003ace9c5f09a72594.jpg",
        "bili thumbnail 协议相对 -> https",
    )
    check(
        bili.published_at is not None and bili.published_at.year == 2021,
        "bili published_at 由 pubdate 时间戳解析",
    )
    check(
        bili.raw.get("danmaku") == 180330 and bili.raw.get("favorites") == 699573,
        "bili raw 保留额外统计（danmaku/favorites 等，未来扩 schema 用）",
    )

    # --- YouTube flat 映射 ---
    yt = yt_to_candidate(YT_FLAT_ITEM)
    assert yt is not None
    check(yt.platform == SearchPlatform.YOUTUBE, "yt platform=youtube")
    check(yt.platform_video_id == "J7DzL2_Na80", "yt platform_video_id=id")
    check(yt.url == "https://www.youtube.com/watch?v=J7DzL2_Na80", "yt url 正确")
    check(yt.title == "1. The Geometry of Linear Equations", "yt title 正确")
    check(yt.author == "MIT OpenCourseWare", "yt author=channel")
    check(
        yt.author_id == "UCEBb1b_L6zDS3xTUrIALZOw",
        "yt author_id=channel_id（补上 Apify 给不出的 YT 作者）",
    )
    check(yt.duration_s == 2389, "yt duration_s 秒级 int 透传")
    check(yt.view_count == 2701092, "yt view_count 正确")
    check(
        yt.thumbnail_url == "https://i.ytimg.com/vi/J7DzL2_Na80/hqdefault.jpg",
        "yt thumbnail 取 thumbnails 数组最高分辨率",
    )
    check(yt.like_count is None, "yt flat like_count=None（flat 不给）")
    check(yt.published_at is None, "yt flat published_at=None（flat 不给）")

    # --- YouTube full 映射 ---
    yt_full = yt_to_candidate(YT_FULL_ITEM)
    assert yt_full is not None
    check(yt_full.like_count == 38059, "yt full like_count 正确")
    check(
        yt_full.published_at is not None and yt_full.published_at.year == 2019,
        "yt full published_at 由 timestamp 解析",
    )
    check(
        yt_full.url == "https://www.youtube.com/watch?v=J7DzL2_Na80",
        "yt full url 由 webpage_url",
    )
    check(
        yt_full.thumbnail_url == "https://i.ytimg.com/vi/J7DzL2_Na80/sddefault.jpg",
        "yt full thumbnail 取单字符串字段",
    )


def _fields_ok(candidate, platform: SearchPlatform) -> bool:
    return (
        bool(candidate.platform_video_id)
        and bool(candidate.title)
        and bool(candidate.url)
        and candidate.platform == platform
        and candidate.duration_s is not None
        and candidate.view_count is not None
    )


async def _recent_rows(since: datetime) -> list[ProviderUsageLog]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(ProviderUsageLog)
            .where(ProviderUsageLog.created_at >= since)
            .where(ProviderUsageLog.provider.in_(_SELF_BUILT_PROVIDERS))
            .order_by(ProviderUsageLog.created_at.desc())
        )
        return list(result.scalars())


async def _search_leg(keyword: str, platform: SearchPlatform):
    """Run one search leg; AIError (risk control / bot / network) -> soft None."""
    try:
        return await search_videos(
            VideoSearchQuery(keyword=keyword),
            platform=platform,
            limit=3,
            use_case="smoke_selfbuilt",
        )
    except AIError as exc:
        print(
            f"NOTE: {platform.value} '{keyword}' 受阻（{type(exc).__name__}: {exc}）"
            "，按可重试失败处理（不算 smoke 崩）"
        )
        return None


async def online_checks() -> None:
    since = datetime.now(UTC)
    keywords = ["linear algebra", "线性代数"]

    for platform in (SearchPlatform.YOUTUBE, SearchPlatform.BILIBILI):
        any_results = False
        any_attempt_blocked = False
        for keyword in keywords:
            results = await _search_leg(keyword, platform)
            if results is None:
                any_attempt_blocked = True
                continue
            if results:
                any_results = True
                top = results[0]
                check(
                    _fields_ok(top, platform),
                    f"{platform.value} '{keyword}' 候选关键字段非空",
                )
                print(
                    f"  {platform.value} '{keyword}': {len(results)} 条，"
                    f"示例 {top.title!r} views={top.view_count} "
                    f"author={top.author!r} author_id={top.author_id!r}"
                )
        if any_attempt_blocked and not any_results:
            # 整平台被风控/网络阻断：可重试失败的合理结果，不判 FAIL。
            print(f"NOTE: {platform.value} 全部尝试受阻，跳过候选断言")
        else:
            check(any_results, f"联网 {platform.value} 至少一个关键词返回候选")

    # 台账：自建 provider 每次尝试（成功或失败）都应落行，且 cost_usd=0 / actor_id=NULL。
    rows = await _recent_rows(since)
    providers = {row.provider for row in rows}
    check("ytdlp_youtube" in providers, "provider_usage_logs 落了 ytdlp_youtube 行")
    check("bili_search" in providers, "provider_usage_logs 落了 bili_search 行")
    if rows:
        check(
            all(row.actor_id is None for row in rows),
            "自建 provider 台账 actor_id 均为 NULL",
        )
        check(
            all(row.cost_usd == 0 for row in rows),
            "自建 provider 台账 cost_usd 均为 0",
        )


async def main() -> int:
    offline_only = "--offline" in sys.argv[1:]
    validate_search_routes()
    print(f"tested_at: {datetime.now(UTC).isoformat()}  (offline_only={offline_only})")
    try:
        offline_checks()
        if not offline_only:
            await online_checks()
        else:
            print("SKIP: --offline 指定，跳过联网验收")
    finally:
        await engine.dispose()

    print()
    if FAILURES:
        print(f"SMOKE FAILED: {len(FAILURES)} 项未过")
        return 1
    print("SMOKE OK: 自建视频搜索 provider（bili 官方 + yt-dlp）通过")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

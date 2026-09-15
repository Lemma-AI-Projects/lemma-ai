"""蓝图编辑的增量写回：证明「改结构不会顺手动别人的内容」。

这是 `planning/free-course-blueprint-editing-plan.md` §9 的核心防线。要证明的是两件事：

1. **未改动的课，其课时正文与作答数量不变** —— 这条直接守住「不能复用 persist_map」
   那个坑（`persist_map` 是全删全建，而 `course_units → course_chapters →
   course_lesson_objects → course_lesson_observations` 有两级 ON DELETE CASCADE）。
2. **已经生成了内容的课节，删不掉** —— `apply_tree_edit` 必须先查出会丢东西再拒，
   而不是删完才发现。

跑完会把自己建的那门课整个删掉（连带级联）。用法（在 backend/ 下）：

    PYTHONPATH=. .venv/Scripts/python.exe scripts/smoke_free_course_tree_edit.py
"""

from __future__ import annotations

import asyncio
import uuid

from sqlalchemy import delete, func, select

from core.database import AsyncSessionLocal
from models.course import Course, CourseChapter, CourseUnit
from models.free_course import CourseLessonObject, CourseLessonObservation
from schemas.free_course import (
    CourseLessonEditIn,
    CourseTreeEditIn,
    CourseUnitEditIn,
)
from services import free_course_service
from services.free_course_service import TreeEditConflict, TreeEditInvalid

FAILURES: list[str] = []


def check(name: str, condition: bool, detail: str = "") -> None:
    if condition:
        print(f"  PASS  {name}")
    else:
        FAILURES.append(name)
        print(f"  FAIL  {name}{f' — {detail}' if detail else ''}")


async def _pick_user_id() -> uuid.UUID | None:
    from models.profile import Profile

    async with AsyncSessionLocal() as db:
        return await db.scalar(select(Profile.id).limit(1))


async def _count_content(db, chapter_id: uuid.UUID) -> tuple[int, int]:
    objects = await db.scalar(
        select(func.count())
        .select_from(CourseLessonObject)
        .where(CourseLessonObject.chapter_id == chapter_id)
    )
    observations = await db.scalar(
        select(func.count())
        .select_from(CourseLessonObservation)
        .join(
            CourseLessonObject,
            CourseLessonObservation.object_id == CourseLessonObject.id,
        )
        .where(CourseLessonObject.chapter_id == chapter_id)
    )
    return int(objects or 0), int(observations or 0)


async def _add_content(
    db, chapter_id: uuid.UUID, *, with_observation: bool
) -> uuid.UUID:
    """给一节课塞一条正文（可选再塞一条作答），模拟「已经生成过」。"""
    obj = CourseLessonObject(
        chapter_id=chapter_id,
        order_index=0,
        kind="explanation",
        title="smoke object",
        body="这是 smoke 造的内容，跑完会随课程一起删掉。",
        difficulty="core",
    )
    db.add(obj)
    await db.flush()
    if with_observation:
        db.add(
            CourseLessonObservation(
                object_id=obj.id,
                kind="answer",
                verdict="correct",
                is_correct=True,
            )
        )
        await db.flush()
    return obj.id


async def main() -> None:
    user_id = await _pick_user_id()
    if user_id is None:
        raise SystemExit("profiles 是空的，没有可借用的 user_id")

    async with AsyncSessionLocal() as db:
        course = await free_course_service.create_free_course(
            db,
            user_id=user_id,
            intent="__smoke_tree_edit__",
            conversation_id=None,
        )
        await free_course_service.persist_map(
            db,
            course,
            {
                "title": "__smoke_tree_edit__",
                "audience": "",
                "summary": "",
                "units": [
                    {
                        "title": "单元 A",
                        "lessons": [
                            {"title": "A1 有内容", "objective": "o"},
                            {"title": "A2 没内容", "objective": "o"},
                        ],
                    },
                    {
                        "title": "单元 B",
                        "lessons": [{"title": "B1 没内容", "objective": "o"}],
                    },
                ],
            },
        )
        course_id = course.id

    try:
        async with AsyncSessionLocal() as db:
            tree = await free_course_service.get_owned_course_tree(
                db, user_id=user_id, course_id=course_id
            )
            assert tree is not None
            unit_a, unit_b = tree.units
            a1, a2 = unit_a.chapters
            (b1,) = unit_b.chapters

            # 给 A1 造内容（含一条作答），B1 也造一条 —— 用来验证「删不掉」。
            await _add_content(db, a1.id, with_observation=True)
            await _add_content(db, b1.id, with_observation=False)
            await db.commit()

            a1_objects, a1_observations = await _count_content(db, a1.id)
            b1_objects, _ = await _count_content(db, b1.id)
            check("前置：A1 有 1 条正文 + 1 条作答", a1_objects == 1 and a1_observations == 1)
            check("前置：B1 有 1 条正文", b1_objects == 1)

        print("\n[1] 改名 + 删无内容的课节 + 加一节 + 新增一个单元")
        async with AsyncSessionLocal() as db:
            await free_course_service.apply_tree_edit(
                db,
                user_id=user_id,
                course_id=course_id,
                payload=CourseTreeEditIn(
                    units=[
                        CourseUnitEditIn(
                            id=unit_a.id,
                            title="单元 A（改名）",
                            lessons=[
                                CourseLessonEditIn(
                                    id=a1.id, title="A1（改名）", objective="o2"
                                ),
                                # 删掉 A2（它没有内容），加一节新的
                                CourseLessonEditIn(
                                    id=None, title="A3 新增", objective=None
                                ),
                            ],
                        ),
                        CourseUnitEditIn(
                            id=unit_b.id,
                            title="单元 B",
                            lessons=[
                                CourseLessonEditIn(
                                    id=b1.id, title="B1 没内容", objective="o"
                                )
                            ],
                        ),
                        CourseUnitEditIn(
                            id=None,
                            title="单元 C（新增）",
                            lessons=[
                                CourseLessonEditIn(
                                    id=None, title="C1 新增", objective=None
                                )
                            ],
                        ),
                    ]
                ),
            )

        async with AsyncSessionLocal() as db:
            tree = await free_course_service.get_owned_course_tree(
                db, user_id=user_id, course_id=course_id
            )
            assert tree is not None
            titles = [
                (unit.title, [c.title for c in unit.chapters])
                for unit in tree.units
            ]
            check(
                "新树与提交一致（顺序 + 标题 + 新增单元）",
                titles
                == [
                    ("单元 A（改名）", ["A1（改名）", "A3 新增"]),
                    ("单元 B", ["B1 没内容"]),
                    ("单元 C（新增）", ["C1 新增"]),
                ],
                str(titles),
            )

            a1_after, a1_obs_after = await _count_content(db, a1.id)
            check(
                "★ 未改动的课节 A1：正文与作答数量不变",
                a1_after == 1 and a1_obs_after == 1,
                f"objects={a1_after} observations={a1_obs_after}",
            )

            gone = await db.scalar(
                select(func.count())
                .select_from(CourseChapter)
                .where(CourseChapter.id == a2.id)
            )
            check("被删的 A2（无内容）确实没了", gone == 0)

        print("\n[2] 删掉有内容的课节 → 必须 409 拒绝")
        # 载荷必须**结构上合法**（留够课节），否则会先撞上「不能把树删空」那条 400，
        # 测不到我们想测的这条。第一版就是漏了这点，白跑一轮。
        async with AsyncSessionLocal() as db:
            tree = await free_course_service.get_owned_course_tree(
                db, user_id=user_id, course_id=course_id
            )
            assert tree is not None
            payload_units = []
            for unit in tree.units:
                lessons = [
                    CourseLessonEditIn(
                        id=chapter.id,
                        title=chapter.title,
                        objective=chapter.objective,
                    )
                    for chapter in unit.chapters
                    # 只丢掉 A1（唯一有内容的那节），其余原样保留。
                    if chapter.id != a1.id
                ]
                payload_units.append(
                    CourseUnitEditIn(
                        id=unit.id, title=unit.title, lessons=lessons
                    )
                )

        async with AsyncSessionLocal() as db:
            try:
                await free_course_service.apply_tree_edit(
                    db,
                    user_id=user_id,
                    course_id=course_id,
                    payload=CourseTreeEditIn(units=payload_units),
                )
                check("★ 有内容的课节被拒绝删除", False, "居然通过了")
            except TreeEditConflict as exc:
                check(
                    "★ 有内容的课节被拒绝删除",
                    "A1（改名）" in exc.lesson_titles,
                    str(exc.lesson_titles),
                )

        print("\n[3] 拒绝之后，库里的东西一个都没少")
        async with AsyncSessionLocal() as db:
            a1_after, a1_obs_after = await _count_content(db, a1.id)
            check(
                "★ 被拒绝的请求没有产生任何副作用",
                a1_after == 1 and a1_obs_after == 1,
                f"objects={a1_after} observations={a1_obs_after}",
            )
            tree = await free_course_service.get_owned_course_tree(
                db, user_id=user_id, course_id=course_id
            )
            assert tree is not None
            check("树也没被改坏", len(tree.units) == 3)

        print("\n[4] 载荷自律：认不出的 id 拒绝、空树拒绝")
        async with AsyncSessionLocal() as db:
            try:
                await free_course_service.apply_tree_edit(
                    db,
                    user_id=user_id,
                    course_id=course_id,
                    payload=CourseTreeEditIn(
                        units=[
                            CourseUnitEditIn(
                                id=uuid.uuid4(),  # 不属于本课
                                title="冒牌单元",
                                lessons=[
                                    CourseLessonEditIn(
                                        id=None, title="x", objective=None
                                    )
                                ],
                            )
                        ]
                    ),
                )
                check("陌生 unit id 被拒绝", False, "居然通过了")
            except TreeEditInvalid:
                check("陌生 unit id 被拒绝", True)

        async with AsyncSessionLocal() as db:
            try:
                await free_course_service.apply_tree_edit(
                    db,
                    user_id=user_id,
                    course_id=course_id,
                    payload=CourseTreeEditIn(units=[]),
                )
                check("把树删空被拒绝", False, "居然通过了")
            except TreeEditInvalid:
                check("把树删空被拒绝", True)

        print("\n[5] 不存在的课程 → None（照旧 404）")
        async with AsyncSessionLocal() as db:
            result = await free_course_service.apply_tree_edit(
                db,
                user_id=user_id,
                course_id=uuid.uuid4(),
                payload=CourseTreeEditIn(
                    units=[
                        CourseUnitEditIn(
                            id=None,
                            title="x",
                            lessons=[
                                CourseLessonEditIn(id=None, title="y", objective=None)
                            ],
                        )
                    ]
                ),
            )
            check("不是你的课 = None", result is None)

        print("\n[6] 重名课节 → 标题定位必须报错，而不是猜一个")
        # 接口层不禁止重名（前端会挡），所以后端自己必须扛住：AI 层的 map/path
        # 只带标题，一旦重名，「从哪一节开始」就无法确定。猜的代价是把内容写进别人的课。
        async with AsyncSessionLocal() as db:
            tree = await free_course_service.get_owned_course_tree(
                db, user_id=user_id, course_id=course_id
            )
            assert tree is not None
            keep_units = [
                CourseUnitEditIn(
                    id=unit.id,
                    title=unit.title,
                    lessons=[
                        CourseLessonEditIn(
                            id=chapter.id,
                            title=chapter.title,
                            objective=chapter.objective,
                        )
                        for chapter in unit.chapters
                    ],
                )
                for unit in tree.units
            ]
            # 给第一个单元追加一节课，标题与它自己的第一节课**完全一样**
            keep_units[0].lessons.append(
                CourseLessonEditIn(
                    id=None,
                    title=tree.units[0].chapters[0].title,
                    objective=None,
                )
            )
            await free_course_service.apply_tree_edit(
                db,
                user_id=user_id,
                course_id=course_id,
                payload=CourseTreeEditIn(units=keep_units),
            )

        async with AsyncSessionLocal() as db:
            tree = await free_course_service.get_owned_course_tree(
                db, user_id=user_id, course_id=course_id
            )
            assert tree is not None
            unit_a_now = tree.units[0]
            duplicated_title = unit_a_now.chapters[0].title

            try:
                await free_course_service.find_lesson_chapter(
                    db,
                    course_id=course_id,
                    unit_title=unit_a_now.title,
                    lesson_title=duplicated_title,
                )
                check("★ 库里重名时 find_lesson_chapter 报错", False, "居然返回了一条")
            except free_course_service.LessonLookupAmbiguous:
                check("★ 库里重名时 find_lesson_chapter 报错", True)

            try:
                free_course_service.resolve_chapter_by_titles(
                    tree, unit_title=None, lesson_title=duplicated_title
                )
                check(
                    "★ 内存树上重名时 resolve_chapter_by_titles 报错",
                    False,
                    "居然返回了一条",
                )
            except free_course_service.LessonLookupAmbiguous:
                check("★ 内存树上重名时 resolve_chapter_by_titles 报错", True)

            # 唯一标题仍要正常命中 —— 别把功能一刀切死。
            # 注意别随手取 `chapters[-1]`：刚追加的那条**就是**重名的那条。
            counts: dict[str, int] = {}
            for chapter in unit_a_now.chapters:
                counts[chapter.title] = counts.get(chapter.title, 0) + 1
            unique_title = next(
                title for title, count in counts.items() if count == 1
            )
            found = await free_course_service.find_lesson_chapter(
                db,
                course_id=course_id,
                unit_title=unit_a_now.title,
                lesson_title=unique_title,
            )
            check(
                f"唯一标题（{unique_title}）仍然能定位到", found is not None
            )
    finally:
        async with AsyncSessionLocal() as db:
            await db.execute(delete(Course).where(Course.id == course_id))
            await db.commit()
        print("\n已清理 smoke 课程（含级联）。")

    if FAILURES:
        print(f"\n{len(FAILURES)} 项断言失败：")
        for name in FAILURES:
            print(f"  - {name}")
        raise SystemExit(1)
    print("\n全部断言通过。")


asyncio.run(main())

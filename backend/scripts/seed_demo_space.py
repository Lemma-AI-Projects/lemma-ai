"""Seed the demo Learn Space the Global Agent is meant to be tried in.

    cd backend && .venv/Scripts/python.exe scripts/seed_demo_space.py

Creates (or refreshes) three sources in one space so the agent has something
real to read:

    Linear Algebra Notes   (imported material)
    Eigenvalue Notes       (imported material)
    Research Roadmap       (note)

and one short conversation, so the Context Inspector's Conversations section is
not empty on a fresh database.

Only these three titles and that one conversation are touched — anything else in
the space is left alone. Re-running replaces the demo sources with the text in
this file, which is what makes the demo reproducible: no hand-edited state to
lose track of.

Ownership: a space belongs to a profile, so the script needs one. It uses the
owner of the target space when the space already exists, and otherwise requires
--email to pick the profile.
"""

import argparse
import asyncio
import sys
import uuid
from pathlib import Path

# Same convention as the other scripts here: run from backend/ so `core` and
# `services` resolve, and so Settings finds backend/.env.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, select  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: E402

from core.database import AsyncSessionLocal  # noqa: E402
from models.ai_conversation import AiConversation, AiMessage  # noqa: E402
from models.doc import Block, Page  # noqa: E402
from models.profile import Profile  # noqa: E402
from models.project import Project  # noqa: E402
from services.doc_service import markdown_to_blocks  # noqa: E402

SPACE_NAME = "AI for Math"
DEMO_CONVERSATION_TITLE = "eigenvector 到底在说什么"

SOURCES: list[tuple[str, str, str, str]] = [
    (
        "Linear Algebra Notes",
        "imported",
        "upload",
        """# 线性代数笔记

## 向量与空间

向量不只是「一串数」，它是某个向量空间里的一个点。**基**（basis）就是用来
给这个空间安坐标的那组向量：空间里每个向量都能唯一地写成基的线性组合。

维度 = 基里向量的个数。同一个空间可以有无穷多组基，所以「坐标」不是向量本身
的属性，而是「向量 + 一组基」的属性。

## 矩阵 = 线性映射

矩阵乘法看起来是行乘列，本质是**把一个向量变成另一个向量**：

    矩阵 A 把 x 映到 Ax

线性映射要满足两条：`A(x + y) = Ax + Ay`，`A(cx) = c(Ax)`。这两条决定了它
不能弯、不能平移原点。

## 秩与零空间

- **秩**（rank）= 映射后空间的维度 = A 的列空间维度
- **零空间**（null space）= 被 A 映成 0 的向量集合

秩-零化度定理：`rank(A) + nullity(A) = 列数`。

秩告诉你信息丢了多少：秩越小，越多不同的输入被压成同一个输出。这在解方程
`Ax = b` 时就是「有没有解、解是否唯一」的分界线。

## 投影与最小二乘

投影是把向量拆成「在子空间里的部分」和「垂直于子空间的部分」。当 `Ax = b`
无解时，我们退一步求 `Ax` 尽可能接近 b —— 这就是最小二乘，几何上就是把 b
投影到 A 的列空间上。

## 重点检查

1. 能用基解释「坐标」为什么依赖基的选择
2. 能把矩阵读成一个线性映射而不是一张数表
3. 说得清秩的几何意义
""",
    ),
    (
        "Eigenvalue Notes",
        "imported",
        "upload",
        """# 特征值笔记

## 定义

对某个矩阵 A，如果存在**非零**向量 v 和标量 λ 使得

    A v = λ v

那么 λ 是 A 的**特征值**（eigenvalue），v 是对应的**特征向量**（eigenvector）。

「非零」这个条件不能省：`v = 0` 对任何 λ 都成立，那样定义就没有信息了。

## 几何意义：方向不变的方向

大多数向量被 A 作用后方向会拐弯。特征向量是那些**方向不拐弯**的向量 ——
A 作用在它们身上只做拉伸或压缩，比例就是 λ：

- λ > 1：沿这个方向被拉长
- 0 < λ < 1：被压短
- λ < 0：方向反转再伸缩
- λ = 0：这个方向被压塌到原点（所以 A 不可逆）

## 怎么算

`A v = λ v` ⇒ `(A − λI) v = 0`。因为 v 非零，所以 `A − λI` 必须是奇异的：

    det(A − λI) = 0

这就是**特征多项式**，解它得到 λ，再代回去解 `(A − λI)v = 0` 得到 v。

## 对角化

如果 A 有 n 个线性无关的特征向量，就能写成

    A = P D P⁻¹

其中 D 是对角矩阵（对角线是特征值），P 的列是特征向量。意义：**在特征向量
这组基下，A 就只是一个逐方向缩放** —— 复杂矩阵变成 n 个独立的拉伸。

## 为什么它重要

- **降维**：PCA 找协方差矩阵的特征向量，方差最大的方向保留（λ 就是该方向的方差）
- **稳定性**：微分方程组/迭代过程的长期行为由最大 `|λ|` 决定；`|λ| > 1` 发散
- **图与网络**：邻接矩阵的特征向量刻画中心性（PageRank）
- **动力系统**：Markov 链的稳态就是 λ = 1 的特征向量

## 常见误解

- 特征值可以是复数（旋转矩阵在实数域没有实特征向量）
- 「特征值大」不代表矩阵「大」，它只说某个方向上的缩放
- 特征向量不唯一：同一方向的任意非零倍数都是
""",
    ),
    (
        "Research Roadmap",
        "note",
        "manual",
        """# 研究路线图

目标：能读懂并复现「矩阵方法在数据里的应用」，而不是只会做题。

## 第一阶段 · 语言（当前）

把线性代数从「计算」变成「几何直觉」：基、秩、投影、最小二乘。

**出关标准**：看到 `Ax = b`，能立刻说出它在几何上要干什么。

## 第二阶段 · 结构（下一步）

特征值 / 特征向量 / SVD。核心问题是「这个变换在哪些方向上只是缩放」。

**出关标准**：拿到一个矩阵，能说清它做了什么、信息有没有丢、丢在哪。

## 第三阶段 · 应用

选一条真实数据线：降维（PCA）或推荐（矩阵分解）。目标是跑通一次完整流程，
并解释每一步的数学含义。

**出关标准**：能向别人解释结果的几何意义，而不只是报告数字。

## 阅读顺序建议

1. 线性代数笔记（体量最大，先把语言建起来）
2. 特征值笔记（承接第一阶段，是第二阶段的核心工具）
3. 本路线图（用来决定「下一步学哪个」，随进度修改）

## 待解决问题

- 复特征值对应的实变换怎么直观理解？
- SVD 和特征分解的关系到底差在哪一步？
""",
    ),
]

CONVERSATION_MESSAGES: list[tuple[str, str]] = [
    (
        "user",
        "特征向量为什么一定要是非零的？",
    ),
    (
        "assistant",
        "因为 `v = 0` 对任何 λ 都满足 `Av = λv`，它不携带任何关于 A 的信息。\n\n"
        "定义里要求 v 非零，是在问「哪些**方向**在 A 作用下不拐弯」——"
        "方向是零向量给不出来的东西。",
    ),
]


async def pick_owner(
    db: AsyncSession, *, space_name: str, email: str | None
) -> tuple[uuid.UUID, Project | None]:
    existing = (
        await db.execute(select(Project).where(Project.name == space_name))
    ).scalars().first()
    if existing is not None:
        return existing.user_id, existing

    if email is None:
        raise SystemExit(
            f"space «{space_name}» does not exist yet, so --email is required "
            "to choose which profile owns the new one"
        )
    profile = (
        await db.execute(select(Profile).where(Profile.email == email))
    ).scalars().first()
    if profile is None:
        raise SystemExit(f"no profile with email {email}")
    return profile.id, None


async def seed(space_name: str, email: str | None) -> None:
    async with AsyncSessionLocal() as db:
        user_id, project = await pick_owner(db, space_name=space_name, email=email)
        if project is None:
            project = Project(user_id=user_id, name=space_name)
            db.add(project)
            await db.flush()
            print(f"created space {space_name!r}")
        else:
            print(f"using existing space {space_name!r} ({project.id})")

        # Replace the demo sources rather than update-in-place: the file above is
        # the truth, so re-running must converge on it whatever the state was.
        titles = [title for title, _kind, _source, _body in SOURCES]
        stale = (
            await db.execute(
                select(Page.id).where(
                    Page.project_id == project.id, Page.title.in_(titles)
                )
            )
        ).scalars().all()
        if stale:
            await db.execute(delete(Block).where(Block.page_id.in_(stale)))
            await db.execute(delete(Page).where(Page.id.in_(stale)))
            print(f"removed {len(stale)} previous demo source(s)")

        for title, kind, source, body in SOURCES:
            page = Page(
                project_id=project.id,
                title=title,
                kind=kind,
                source=source,
            )
            db.add(page)
            await db.flush()
            blocks = markdown_to_blocks(body)
            for index, block in enumerate(blocks):
                db.add(
                    Block(
                        page_id=page.id,
                        position=index,
                        type=block["type"],
                        content=block["content"],
                        meta=None,
                    )
                )
            print(f"  + {title}: {len(blocks)} blocks, {len(body)} chars")

        # One conversation, so the Context Inspector's Conversations section has
        # something in it and the agent's "other conversations" list is not empty.
        previous = (
            await db.execute(
                select(AiConversation.id).where(
                    AiConversation.project_id == project.id,
                    AiConversation.title == DEMO_CONVERSATION_TITLE,
                )
            )
        ).scalars().all()
        if previous:
            await db.execute(
                delete(AiMessage).where(AiMessage.conversation_id.in_(previous))
            )
            await db.execute(
                delete(AiConversation).where(AiConversation.id.in_(previous))
            )

        conversation = AiConversation(
            user_id=user_id,
            project_id=project.id,
            title=DEMO_CONVERSATION_TITLE,
        )
        db.add(conversation)
        await db.flush()
        for role, content in CONVERSATION_MESSAGES:
            db.add(
                AiMessage(
                    conversation_id=conversation.id, role=role, content_text=content
                )
            )
        print(f"  + conversation {DEMO_CONVERSATION_TITLE!r}: {len(CONVERSATION_MESSAGES)} messages")

        await db.commit()
        print("\ndone. open the space and ask: 这个空间里有哪些资料？")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--space", default=SPACE_NAME, help="target learn space name")
    parser.add_argument("--email", default=None, help="owner profile email (new space only)")
    args = parser.parse_args()
    asyncio.run(seed(args.space, args.email))


if __name__ == "__main__":
    main()

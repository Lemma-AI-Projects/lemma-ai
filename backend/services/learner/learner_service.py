"""Learner 引擎适配层（LemmaHermes L1，S1-S2）。

职责（全部为纯新增，零侵入现有代码）：
- 把 engine/lemma-hermes 的 LearnerCore（SQLite 7 表）以 backend 可调用的
  服务形式暴露：action 转发（C3 工具数据面）+ 记忆上下文生成（C1 注入数据面）
- 铁律：engine/ 零改动；所有读写必须显式传 user_id（禁止引擎 default 值）
- 存储：SQLite 单文件（引擎原生 migrate 自动建 7 表）；PG 抽象（T2.1）独立项
- 生命周期（S2，2026-08-15）：懒加载进程单例 get_learner_service()；
  门控关 => None（S3/S4 调用点判 None 跳过，零副作用）
"""
from __future__ import annotations

import sys
from functools import lru_cache
from pathlib import Path

# ── 引擎路径接入（monorepo：engine/lemma-hermes）─────────────────────────────
# backend/services/learner/learner_service.py → parents[3] = 仓库根
_ENGINE_DIR = Path(__file__).resolve().parents[3] / "engine" / "lemma-hermes"
if str(_ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(_ENGINE_DIR))

from agent.learner.learner_core import LearnerCore  # noqa: E402

# 默认 learner 库位置：backend/data/learner.db（与主库 PG 分离，T2.1 欠账登记）
_DEFAULT_DB_PATH = Path(__file__).resolve().parents[1] / "data" / "learner.db"


class LearnerService:
    """LearnerCore 的 backend 适配：懒加载单例 + 显式 user_id 规约。

    构造即触发引擎 migrate（7 表自动建表）；多用户经表内 user_id 字段隔离
    （7 表全含 user_id），L1 单文件可接受，PG 迁移为 T2.1 独立项。
    """

    def __init__(self, db_path: str | Path) -> None:
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._core = LearnerCore(str(db_path))

    # ── C3 工具数据面：action 转发（引擎 handle_action 1:1 透传） ──────────────
    def handle_action(self, user_id: str, action: str, **kwargs) -> dict:
        """模型工具的 action 分发（upsert_concept/record_episode/query_knowledge/
        add_rule/due_reviews）。user_id 必传——禁止隐式 default 作用域。"""
        if not user_id:
            return {"success": False, "error": "user_id required"}
        return self._core.handle_action(user_id, action, **kwargs)

    # ── C1 注入数据面：记忆上下文生成（S3 用） ─────────────────────────────────
    def memory_context(
        self, user_id: str, query: str = "", limit: int = 10
    ) -> str:
        """按 query 检索 learner 状态，生成 <memory-context> 提示块（引擎
        prefetch_context 原生能力）。空 query 时为近期状态摘要。"""
        return self._core.prefetch_context(query, user_id=user_id, limit=limit)

    # ── 只读摘要（S3 的限 token 保障） ────────────────────────────────────────
    def knowledge_summary(self, user_id: str, limit: int = 20) -> str:
        """近期知识点掌握度摘要（供 prompt 注入；内部限行）。"""
        rows = self._core.get_knowledge(user_id, limit=limit)
        if not rows:
            return ""
        lines = [
            f"- {r.get('concept', '?')} (掌握度 {r.get('mastery', 0):.2f}, 尝试 {r.get('attempts', 0)})"
            for r in rows
        ]
        return "\n".join(lines)

    # ── 前端读接口数据面（L1 主线闭环，2026-08-20）──────────────────────────
    # 全部透传引擎、不改 engine；纵贯铁律：user_id 必传，禁止隐式 default 作用域。
    def get_knowledge(
        self, user_id: str, limit: int = 50
    ) -> list[dict]:
        """结构化掌握度列表（返回 knowledge_nodes 行 dict）。"""
        if not user_id:
            return []
        return self._core.get_knowledge(user_id, limit=limit)

    def get_due_reviews(
        self, user_id: str, limit: int = 50
    ) -> list[dict]:
        """今日到期待复习列表（review_queue JOIN knowledge_nodes 行 dict）。"""
        if not user_id:
            return []
        # now 由引擎默认取当前 UTC 时间（due IS NULL 或 due <= now 视为到期）。
        return self._core.get_due_reviews(user_id, limit=limit)

    def memory_overview(self, user_id: str) -> dict:
        """记忆面板概览（聚合，供前端首屏）：概念数 / 掌握分布 / 今日待复习数。

        引擎零改动铁律：仅有 knowledge_nodes + review_queue 两个可读面，因此
        概览只聚合这两者，不统计引擎未暴露给日的片段数。门控由调用点
        get_learner_service() 判空决定（本方法返回 enabled 供接口透传）。"""
        if not user_id:
            return {
                "enabled": False,
                "concept_count": 0,
                "mastery_buckets": {"mastered": 0, "learning": 0, "new": 0},
                "today_due_count": 0,
            }
        knowledge = self._core.get_knowledge(user_id, limit=1000)
        due = self._core.get_due_reviews(user_id, limit=1000)
        buckets: dict[str, int] = {"mastered": 0, "learning": 0, "new": 0}
        for k in knowledge:
            mastery = float(k.get("mastery") or 0.0)
            attempts = int(k.get("attempts") or 0)
            if mastery >= 0.8:
                buckets["mastered"] += 1
            elif attempts > 0 and mastery > 0.0:
                buckets["learning"] += 1
            else:
                buckets["new"] += 1
        return {
            "enabled": True,
            "concept_count": len(knowledge),
            "mastery_buckets": buckets,
            "today_due_count": len(due),
        }


# ── S2 生命周期：懒加载进程单例（门控关 => None）────────────────────────────
@lru_cache(maxsize=1)
def _get_learner_service(db_path: str | Path | None) -> LearnerService | None:
    """构造 LearnerService（db_path 覆盖用；None => 默认路径）。"""
    from core.config import settings

    if not settings.lemma_hermes_enabled:
        return None
    return LearnerService(
        db_path or settings.lemma_hermes_learner_db_url or _DEFAULT_DB_PATH
    )


def get_learner_service() -> LearnerService | None:
    """进程级访问器：门控开 => LearnerService 单例（首次构造即建 7 表）；
    门控关 => None（调用点判 None 跳过，S3/S4 零副作用）。"""
    return _get_learner_service(None)

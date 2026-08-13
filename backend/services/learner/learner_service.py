"""Learner 引擎适配层（LemmaHermes L1，S1-S2）。

职责（全部为纯新增，零侵入现有代码）：
- 把 engine/lemma-hermes 的 LearnerCore（SQLite 7 表）以 backend 可调用的
  服务形式暴露：action 转发（C3 工具数据面）+ 记忆上下文生成（C1 注入数据面）
- 铁律：engine/ 零改动；所有读写必须显式传 user_id（禁止引擎 default 值）
- 存储：SQLite 单文件（引擎原生 migrate 自动建 7 表）；PG 抽象（T2.1）独立项
"""
from __future__ import annotations

import sys
from pathlib import Path

# ── 引擎路径接入（monorepo：engine/lemma-hermes）─────────────────────────────
# backend/services/learner/learner_service.py → parents[3] = 仓库根
_ENGINE_DIR = Path(__file__).resolve().parents[3] / "engine" / "lemma-hermes"
if str(_ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(_ENGINE_DIR))

from agent.learner.learner_core import LearnerCore  # noqa: E402


class LearnerService:
    """LearnerCore 的 backend 适配：懒加载单例 + 显式 user_id 规约。

    构造即触发引擎 migrate（7 表自动建表）；多用户经表内 user_id 字段隔离
    （7 表全含 user_id），L1 单文件可接受，PG 迁移为 T2.1 独立项。
    """

    def __init__(self, db_path: str | Path) -> None:
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

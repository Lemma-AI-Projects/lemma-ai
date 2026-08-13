"""LemmaHermes L1 S1/S2 smoke：learner 引擎可运行性 + 数据层落地。

backend 惯例（与 tests/smoke_*.py 一致）：直接 python 运行，断言失败退出码非零。
覆盖：
  1. 7 表建表（LearnerCore 构造即 migrate）
  2. record_method / record_episode 写读闭环
  3. handle_action 5 个 action 冒烟（C3 数据面）
  4. 用户隔离（同表不同 user_id 互不可见）
"""
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.learner.learner_service import LearnerService  # noqa: E402


def _fresh_service() -> LearnerService:
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    return LearnerService(tmp.name)


def test_tables_created():
    """场景 1：构造即建 7 表 + schema_version。"""
    import sqlite3

    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    svc = LearnerService(tmp.name)
    conn = sqlite3.connect(tmp.name)
    names = {
        r[0]
        for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
    }
    conn.close()
    expected = {
        "identity", "knowledge_nodes", "knowledge_edges", "learning_patterns",
        "learning_episodes", "meta_rules", "review_queue", "schema_version",
    }
    assert expected <= names, f"缺表: {expected - names}"
    print("[1/4] 7 表建表 OK")


def test_record_roundtrip():
    """场景 2：record_method / record_episode 写读闭环。"""
    svc = _fresh_service()
    # 知识节点 + 掌握度
    r1 = svc.handle_action("user-a", "upsert_concept", concept="换元法", success=True)
    assert r1["success"], r1
    # 学习片段
    r2 = svc.handle_action(
        "user-a", "record_episode",
        goal="求解三角换元积分", concept="换元法",
        method="例题演示", result="stuck", reason="未能识别替换模式",
        new_strategy="先用代数替换建立直觉",
    )
    assert r2["success"], r2
    # 查询回读
    q = svc.handle_action("user-a", "query_knowledge", concepts=["换元法"])
    assert q["success"] and q["knowledge"], q
    node = q["knowledge"][0]
    assert node.get("concept") == "换元法"
    assert node.get("attempts", 0) >= 1
    print("[2/4] record 写读闭环 OK")


def test_all_actions():
    """场景 3：handle_action 5 action 全冒烟。"""
    svc = _fresh_service()
    assert svc.handle_action("user-a", "upsert_concept", concept="矩阵乘法", success=False)["success"]
    assert svc.handle_action("user-a", "record_episode", goal="理解矩阵乘法")["success"]
    assert svc.handle_action("user-a", "query_knowledge")["success"]
    assert svc.handle_action("user-a", "add_rule", rule="先讲直觉再讲证明")["success"]
    due = svc.handle_action("user-a", "due_reviews", limit=3)
    assert due["success"]
    unknown = svc.handle_action("user-a", "not_a_real_action")
    assert not unknown["success"] and "unknown action" in unknown.get("error", "")
    print("[3/4] handle_action 5 action 冒烟 OK")


def test_user_isolation():
    """场景 4：user-a 与 user-b 数据互不可见（user_id 字段隔离）。"""
    svc = _fresh_service()
    svc.handle_action("user-a", "upsert_concept", concept="A的私有概念", success=True)
    q_b = svc.handle_action("user-b", "query_knowledge", concepts=["A的私有概念"])
    assert q_b["success"]
    assert not any(
        c.get("concept") == "A的私有概念" for c in q_b["knowledge"]
    ), "user-b 不应看到 user-a 的概念"
    print("[4/4] 用户隔离 OK")


def main() -> None:
    test_tables_created()
    test_record_roundtrip()
    test_all_actions()
    test_user_isolation()
    print("LEARNER L1 SMOKE OK")


if __name__ == "__main__":
    main()

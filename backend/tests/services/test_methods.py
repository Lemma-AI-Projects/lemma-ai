"""Method V0 — the property under test is that the METHOD changes behaviour.

Two things are checked, and they are different kinds of claim:

  * **Same input, different behaviour.** One `MethodInput`, two methods, and the
    resulting directives must differ in their machine-readable `Behaviour` — not
    merely in wording. If this ever passes with two identical behaviours, the
    feature has become a UI label and the acceptance criterion is not met.
  * **The input is read, not invented.** Focus selection and the "no knowledge
    structure" branch are pure functions of what the Global Agent assembled; the
    cases below pin that they use the fringe, prefer what the learner actually
    named, and say something honest when the space has no structure at all.

No database and no model here: a Method is a pure function, so a test that needs
either of those would be testing the pipeline instead.
"""

from __future__ import annotations

import importlib
import pkgutil
from pathlib import Path

from ai.errors import AIConfigError
from ai.methods import (
    DEFAULT_METHOD,
    METHODS,
    PURPOSES,
    get_method,
    item_labels,
    method_names,
    select_focus,
    validate_methods,
)
from ai.methods.types import (
    DEFAULT_PURPOSE_KEY,
    NOT_APPLICABLE,
    OWN_ROW_PURPOSES,
    AppliesWhen,
    CompletionRule,
    EvidenceTarget,
    GoalView,
    MethodInput,
    Restraint,
    purpose_key,
)
from ai.methods.runtime import UnknownMethod as RuntimeUnknownMethod
from ai.methods.runtime import catalogue, resolve, run_once
from services.method_service import (
    UnknownMethod,
    directive_for_turn,
    list_methods,
    method_digest,
    resolve_name,
    runnable_name,
)

# The Learner State block exactly as ai/knowledge/state.py renders it for the
# demo space once 矩阵基础 → 线性无关 → 特征值 are mastered. Copied rather than
# paraphrased: it is the input the methods actually receive.
LEARNER_STATE = """## 学习状态（由系统根据证据算出，请以此为准）

**已经具备**（3 项）
- 矩阵基础
- 线性无关
- 特征值
**还没测过**（2 项）
- 特征向量
- 对角化

**接下来可学（前提都已具备）**（1 项）
- 特征向量

纪律：以上结论由系统计算得出。不要自行推断学习者的掌握程度。
"""

EMPTY_STATE = "（这个空间还没有知识结构，无法给出学习状态。）"

FRINGE = ["特征向量"]

QUESTION = "我不理解 eigenvector。"


def goal(purpose: str) -> GoalView:
    """这个空间的方向，只有 `purpose` 是逐案变的 —— 其余字段固定。"""
    return GoalView(target_text="考到 117 分", purpose=purpose, context="TOEFL")


def context(
    *,
    message: str = QUESTION,
    learner_state: str = LEARNER_STATE,
    outer_fringe: list[str] | None = None,
    goal: GoalView | None = None,
) -> MethodInput:
    return MethodInput(
        user_message=message,
        space_context=f"## 空间资料\n\n{learner_state}",
        learner_state=learner_state,
        outer_fringe=FRINGE if outer_fringe is None else outer_fringe,
        history_messages=2,
        goal=goal,
    )


def socratic(**kwargs):
    return get_method("socratic").execute(context(**kwargs))


def direct(**kwargs):
    return get_method("direct_explanation").execute(context(**kwargs))


# --- the registry -----------------------------------------------------------


def test_registry_holds_exactly_the_two_methods():
    assert sorted(method_names()) == ["direct_explanation", "socratic"]
    assert set(METHODS) == set(method_names())


def test_default_is_direct_explanation():
    """The default is what the product already did before Methods existed.

    Pinned because flipping it is a product decision, not a refactor: Socratic
    as the default would silently turn every existing conversation into an
    interrogation.
    """
    assert DEFAULT_METHOD == "direct_explanation"


def test_unknown_name_is_refused_on_a_request_but_not_on_a_stored_row():
    """The asymmetry is deliberate: a bad request is a caller bug, a stale row
    is history that must keep working."""
    assert resolve_name(None) == DEFAULT_METHOD
    assert resolve_name("socratic") == "socratic"

    try:
        resolve_name("telepathic")
    except UnknownMethod as exc:
        assert exc.name == "telepathic"
    else:  # pragma: no cover
        raise AssertionError("an unknown requested method must not be defaulted")

    assert runnable_name("telepathic") == DEFAULT_METHOD
    assert runnable_name("socratic") == "socratic"


def test_listed_methods_describe_themselves():
    listed = list_methods()
    assert [row["name"] for row in listed] == method_names()
    assert all(row["display_name"] and row["description"] for row in listed)


# --- the difference ---------------------------------------------------------


def test_same_input_two_methods_give_opposite_behaviours():
    asked = socratic()
    told = direct()

    # Socratic: one question, no answer, then stop and wait.
    assert asked.behaviour.expects_question is True
    assert asked.behaviour.max_questions == 1
    assert asked.behaviour.forbids_full_answer is True
    assert asked.behaviour.awaits_learner is True
    assert asked.behaviour.requires_example is False

    # Direct Explanation: the mirror image.
    assert told.behaviour.expects_question is False
    assert told.behaviour.max_questions == 0
    assert told.behaviour.forbids_full_answer is False
    assert told.behaviour.awaits_learner is False
    assert told.behaviour.requires_example is True

    assert asked.behaviour != told.behaviour


def test_the_two_disciplines_are_different_instructions():
    asked = socratic().discipline
    told = direct().discipline

    assert asked != told
    assert "Socratic" in asked and "Direct Explanation" in told
    # The rules that are the behaviour, stated in the text the model reads.
    assert "只问一个问题" in asked
    assert "不给结论" in asked
    assert "不要用提问代替讲解" in told
    assert "一个具体例子" in told
    # ...and neither text carries the other's rule.
    assert "不要用提问代替讲解" not in asked
    assert "只问一个问题" not in told


def test_both_methods_land_on_the_same_focus():
    """The difference must come from the method, never from a different input."""
    assert socratic().focus == direct().focus == "特征向量"


def test_digest_is_small_and_camel_case():
    digest = method_digest(socratic())
    assert set(digest) == {
        "name",
        "displayName",
        "focus",
        "systemMove",
        "learnerMove",
        "completion",
        "goalRelation",
        "behaviour",
    }
    assert digest["name"] == "socratic"
    assert digest["focus"] == "特征向量"
    assert digest["behaviour"]["awaitsLearner"] is True
    # The discipline text is not reprinted per answer.
    assert "discipline" not in digest


# --- 同一个知识点，不同目标不是同一件事 -------------------------------------
#
# 这一段是"目标真的进了运行时"的判据：同一句问题、同一个学习状态、**只改
# `purpose`**，产出的对象必须不同。测不出来，目标就只是存了一行。


def test_only_the_purpose_changes_the_completion_criterion():
    """⭐ §0 验收 1（同一句话、同一个状态，只改 purpose）。"""
    exam = socratic(goal=goal("exam_performance"))
    understanding = socratic(goal=goal("understanding"))

    # 方法本身没变：同一个焦点、同一套行为（要问一个问题、不许给答案）。
    # 变的是**目标带来的那几格** —— 判据、要你做什么、和目标的关�系。
    assert exam.focus == understanding.focus == "特征向量"
    assert exam.behaviour == understanding.behaviour
    assert exam.name == understanding.name

    # 完成判据必须不同：为了考试是"做对两道"，为了理解是"说得出为什么"。
    assert exam.completion != understanding.completion
    assert "做对两道" in exam.completion
    assert "为什么" in understanding.completion
    assert exam.goal_relation != understanding.goal_relation
    assert exam.learner_move != understanding.learner_move


def test_the_two_methods_disagree_about_what_done_means_for_one_purpose():
    """同一套目标下两个方法的"什么算完成"也不同 —— 它们确实要求不同的东西。"""
    asked = socratic(goal=goal("exam_performance"))
    told = direct(goal=goal("exam_performance"))
    assert asked.completion != told.completion
    assert asked.learner_move != told.learner_move
    assert asked.system_move != told.system_move


def test_without_a_goal_the_status_says_so_instead_of_guessing():
    """空间还没有目标：判据仍然有（这一轮要成什么），但**不说和目标的关系**。"""
    directive = socratic(goal=None)
    assert directive.system_move
    assert directive.learner_move
    assert directive.completion
    assert directive.goal_relation is None
    # 同一套**判据**给"没有目标"和 `other` —— 两种情况下我们同样不知道他要什么，
    # 所以教法不该变。目标关系那句话则必须变（见下一个测试）。
    assert (
        socratic(goal=goal("other")).completion == directive.completion
    )


def test_a_goal_without_a_known_purpose_still_gets_a_line():
    """有方向、但不知道为了什么 —— 这和"没有方向"不是一件事。

    端到端脚本 `.workbuddy/localdb/verify_method_goal_runtime.py` 抓到过这个：
    `other` 原先落到 `goal_relation is None`，于是状态栏在**有目标**时第二行
    空着，和没目标的空间长得一模一样。用户打了方向却看不到任何回应。

    两句话必须不同：没有目标时说什么都没有（那才是编造）；有目标但说不出
    目的时要承认"收到了方向、还不知道为了什么"。
    """
    unknown = socratic(goal=goal("other"))
    none_at_all = socratic(goal=None)

    assert unknown.goal_relation is not None, "有目标却什么都不说"
    assert none_at_all.goal_relation is None, "没目标却在谈目标"
    assert unknown.goal_relation != none_at_all.goal_relation
    # 目的是 unknown 的一种，不是全部 —— 三个已知目的各有各的话。
    known = {
        socratic(goal=goal(p)).goal_relation
        for p in ("exam_performance", "understanding", "build_something")
    }
    assert len(known) == 3
    assert unknown.goal_relation not in known, "unknown 复用了某个已知目的的话"


def test_an_unexpected_purpose_falls_back_to_the_other_line():
    """表里没有的 purpose 是 bug，不是状态。

    库有 CHECK 约束挡着，但 Method 层是纯函数、不读库 —— 挡不住一个手写出来的
    `MethodInput`。这时候退到"其他"那一行，比静默变成 None 好：空行看起来像
    "系统没话说"，而实际上我们确实有话可说。
    """
    directive = socratic(goal=goal("通过考试并且理解原理同时做出东西"))
    assert directive.goal_relation == socratic(goal=goal("other")).goal_relation
    assert directive.completion  # 也不能因此崩掉


def test_every_purpose_row_of_every_method_is_filled():
    """四行缺一行就会在运行时 KeyError，而那只会在某个用户身上发生。

    这条断言的价值来自一次真事故：把 `purpose_key` 从 `OWN_ROW_PURPOSES` 改成
    `PURPOSES` 之后，`other` 被送进一张没有它那行的表，四个测试一起炸在
    `KeyError: 'other'`。`other` 是抽取器真的会产出的值（听到了方向但分不清
    为了什么），所以这不是假想输入。
    """
    assert set(OWN_ROW_PURPOSES) < set(PURPOSES), (
        "有自己教学法行的 purpose 必须是合法 purpose 的真子集"
    )
    for name in method_names():
        method = get_method(name)
        assert method is not None
        for purpose in PURPOSES:
            directive = method.execute(context(goal=goal(purpose)))
            assert directive.system_move and directive.learner_move
            assert directive.completion


def test_purpose_key_never_names_a_row_that_does_not_exist():
    """`purpose_key` 的返回值必须落在每个 Method 真的有的行上。

    直接对着表查一遍，而不是只查 `PURPOSES` 的几个值 —— 键的来源（`PURPOSES`）
    和行存在的判据（`OWN_ROW_PURPOSES`）是两个东西，只有把每个 Method 的表
    都摸一遍才能发现它们对不上。
    """
    for name in method_names():
        method = get_method(name)
        assert method is not None
        rows = _method_rows(name)
        for purpose in (*PURPOSES, "一个没人听过的目的", ""):
            key = purpose_key(GoalView(target_text="t", purpose=purpose))
            assert key in rows, (
                f"{name}: purpose={purpose!r} → {key!r}，但它只有 {sorted(rows)}"
            )
    assert purpose_key(None) == DEFAULT_PURPOSE_KEY
    assert purpose_key(GoalView(target_text="t", purpose="other")) == (
        DEFAULT_PURPOSE_KEY
    ), "other 与「不知道」同义，就该共用默认行"


def _method_rows(name: str) -> set[str]:
    """从 Method 自己那里问出「我有哪些行」。

    故意不复用 `ai/methods/types.py` 里任何常量：那个模块正是被测对象，
    拿它的常量去构造期望值，等于用被测代码证明被测代码。

    路径是 `ai.methods.<name>.method` 而不是 `ai.methods.<name>`：R1 起每个
    做法是一个**目录**（照 `ai/skills/registry.py` 的形状），表在 `method.py`
    里，包的 `__init__` 只 export 那个类。
    """
    module = importlib.import_module(f"ai.methods.{name}.method")
    table = getattr(module, "_LEARNER_FACING")
    return set(table)


def test_the_completion_reaches_the_model_as_an_instruction():
    """只写给用户看，它就不会改变行为 —— 所以纪律文本里也必须有它。"""
    directive = socratic(goal=goal("exam_performance"))
    assert "## 这一轮什么算完成" in directive.discipline
    assert directive.completion in directive.discipline
    # 判据提到目标，但明确不让它变成话题（否则模型每轮都要念一句目标）。
    assert "考到 117 分" in directive.discipline
    assert "不要在回答里提这个目标本身" in directive.discipline


def test_a_method_that_reads_a_goal_can_still_run_without_one():
    """没有目标不是错误路径：两个方法都必须照常产出一条完整指令。"""
    for name in method_names():
        method = get_method(name)
        assert method is not None
        directive = method.execute(context(goal=None))
        assert directive.completion
        assert "这个空间还没有目标" in directive.discipline


# --- reading the input ------------------------------------------------------


def test_item_labels_reads_the_rendered_block():
    """One label here appears twice in the real block — 特征向量 is both
    "还没测过" and "接下来可学" — so the reader de-duplicates while keeping
    order. The fixture above is copied from the renderer, which is what makes
    this the real case rather than a hypothetical one."""
    assert LEARNER_STATE.count("- 特征向量") == 2
    assert item_labels(LEARNER_STATE) == [
        "矩阵基础",
        "线性无关",
        "特征值",
        "特征向量",
        "对角化",
    ]
    assert item_labels(EMPTY_STATE) == []


def test_overflow_bullet_is_not_an_item():
    block = "**已经具备**（1 项）\n- 矩阵基础\n- …（另有 12 项）\n"
    assert item_labels(block) == ["矩阵基础"]


def test_focus_prefers_what_the_learner_named():
    assert select_focus(context(message="我不理解 对角化 到底能干什么")) == "对角化"
    assert select_focus(context(message="矩阵基础 我早就会了")) == "矩阵基础"


def test_focus_falls_back_to_the_outer_fringe():
    """The demo's own case: the learner writes "eigenvector", the space stores
    the Chinese label 特征向量. V0 does not alias-match, and the fringe already
    is that concept — so the fallback lands somewhere correct instead of
    inventing a match."""
    assert "eigenvector" not in LEARNER_STATE
    assert select_focus(context()) == "特征向量"


def test_focus_is_none_without_a_structure():
    assert select_focus(context(learner_state=EMPTY_STATE, outer_fringe=[])) is None


def test_structure_detection_drives_the_fallback_wording():
    with_structure = context()
    without = context(learner_state=EMPTY_STATE, outer_fringe=[])

    assert with_structure.has_knowledge_structure is True
    assert without.has_knowledge_structure is False

    # With a structure, the rule points at it; without one, the rule must not
    # point at a state that does not exist.
    assert "学习状态" in socratic(**{"learner_state": LEARNER_STATE}).discipline
    bare = socratic(learner_state=EMPTY_STATE, outer_fringe=[])
    assert "这个空间还没有知识结构" in bare.discipline
    assert "本轮要衔接的知识点" not in bare.discipline


def test_direct_explanation_starts_above_what_is_already_known():
    discipline = direct().discipline
    assert "已经具备" in discipline
    bare = direct(learner_state=EMPTY_STATE, outer_fringe=[])
    assert "按零基础讲" in bare.discipline


# --- the service seam -------------------------------------------------------


def test_directive_for_turn_without_agent_context():
    """A turn outside a space still runs a method — it just has nothing to read."""
    directive = directive_for_turn(
        method_name="socratic",
        user_message="我不理解 eigenvector。",
        agent_context=None,
    )
    assert directive.name == "socratic"
    assert directive.focus is None
    assert directive.behaviour.awaits_learner is True
    assert "这个空间还没有知识结构" in directive.discipline


class _FakeContext:
    """The three fields `directive_for_turn` reads off AgentContext."""

    prompt_block = "BLOCK"
    learner_state_block = LEARNER_STATE
    learner_ready = FRINGE


def test_directive_for_turn_reads_the_agent_context():
    directive = directive_for_turn(
        method_name="direct_explanation",
        user_message=QUESTION,
        agent_context=_FakeContext(),
        history_messages=4,
    )
    assert directive.focus == "特征向量"
    assert directive.behaviour.requires_example is True

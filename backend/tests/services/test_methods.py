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

from ai.methods import (
    DEFAULT_METHOD,
    METHODS,
    get_method,
    item_labels,
    method_names,
    select_focus,
)
from ai.methods.types import MethodInput
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


def context(
    *,
    message: str = QUESTION,
    learner_state: str = LEARNER_STATE,
    outer_fringe: list[str] | None = None,
) -> MethodInput:
    return MethodInput(
        user_message=message,
        space_context=f"## 空间资料\n\n{learner_state}",
        learner_state=learner_state,
        outer_fringe=FRINGE if outer_fringe is None else outer_fringe,
        history_messages=2,
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
    assert set(digest) == {"name", "displayName", "focus", "behaviour"}
    assert digest["name"] == "socratic"
    assert digest["focus"] == "特征向量"
    assert digest["behaviour"]["awaitsLearner"] is True
    # The discipline text is not reprinted per answer.
    assert "discipline" not in digest


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

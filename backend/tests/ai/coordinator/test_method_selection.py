"""R3 · 选择权交给 Coordinator —— 候选名单与选择表。

计划 `.workbuddy/plans/method-plugin-refactor.md` §3 R3。这一组**只算不接**：
`select_method` 算出一个做法选择并骑进 `Decision.payload`，但对话那一步还没改，
所以用户可见行为与 R2 完全一致。

三件事在这里被钉住：

* **候选名单是注入的。** `ai/coordinator/**` 全文没有一个做法 id ——
  这就是「新增一个做法时核心 Coordinator 不需要修改」那条断言。
* **不干预是一等候选。** 六个 finding 里有三个落在那里，而且这是设计在工作，
  不是没做完。
* **选择依据是声明的属性，不是名字。** 表读 `needs_learner_action`，
  所以一个属性不同的新做法会被选中，而没有人去改 `rules.py`。
"""

from __future__ import annotations

import inspect
from pathlib import Path

import pytest

import ai.coordinator
from ai.coordinator import (
    Finding,
    MethodDecision,
    MethodFact,
    MethodSelection,
    Snapshot,
    decide,
    find,
    select_method,
)
from ai.coordinator.rules import _SELECTABLE_FINDINGS
from ai.knowledge.state import StateValue

COORDINATOR_ROOT = Path(ai.coordinator.__file__).parent

# Two candidates, the way the two installed methods actually differ. Built by
# hand rather than read from the registry on purpose: a rule that only works for
# the two methods that exist today is a rule that has not been tested against a
# third.
SOCRATIC = MethodFact(
    id="socratic",
    display_name="Socratic",
    needs_learner_action=True,
    withholds_answer=True,
)
EXPLAIN = MethodFact(
    id="direct_explanation",
    display_name="Direct Explanation",
    needs_learner_action=False,
    withholds_answer=False,
)
BOTH = (SOCRATIC, EXPLAIN)

#: The single item the turn-start assembly tests seed. A real label, because the
#: lookup under test is an exact one.
TOP = "换元后的上下限"


def snapshot(
    *,
    methods=BOTH,
    from_chat: bool = True,
    focus_value: str = StateValue.NOT_MASTERED.value,
    was_mastered: bool = False,
    ready: tuple[str, ...] = (),
    active_method: str | None = None,
    active_focus: str | None = None,
) -> Snapshot:
    from ai.coordinator import SOURCE_API, SOURCE_CHAT, CoordinatorEvent

    focus = None
    if focus_value:
        from ai.coordinator import FocusItem

        focus = FocusItem(
            id="f1",
            label="换元后的上下限",
            value=focus_value,
            origin=None,
            evidence_count=1,
            last_confirmed_at=None,
            previous_value=StateValue.MASTERED.value if was_mastered else focus_value,
        )
    return Snapshot(
        event=CoordinatorEvent(
            type="learner_state.updated",
            source=SOURCE_CHAT if from_chat else SOURCE_API,
        ),
        current_time=None,
        space_id="space-1",
        space_name="test",
        focus=focus,
        mastered=("矩阵基础",) if focus_value else (),
        ready=ready,
        developing=("换元后的上下限",) if focus_value else (),
        available_methods=methods,
        active_method=active_method,
        active_focus=active_focus,
    )


# --- 真库装配（只有那一条需要） ----------------------------------------------


def _run(coro):
    import asyncio
    import contextlib

    async def wrapper():
        with contextlib.suppress(Exception):
            from core.database import engine

            await engine.dispose()
        try:
            return await coro
        finally:
            with contextlib.suppress(Exception):
                from core.database import engine

                await engine.dispose()

    return asyncio.run(wrapper())


@pytest.fixture()
def space():
    """A throwaway user + space, per test.

    Only the assembly test below needs a database; the rest are pure. Probing
    here (rather than at module import) keeps the other tests running on a
    checkout with no Postgres, and the fixture is function-scoped so a leftover
    episode cannot make a later test hold a promise it did not start.
    """
    import contextlib
    import uuid

    from sqlalchemy import text

    from core.database import engine

    async def _probe():
        with contextlib.suppress(Exception):
            await engine.dispose()
        try:
            async with engine.connect() as conn:
                await conn.execute(text("select 1"))
        finally:
            with contextlib.suppress(Exception):
                await engine.dispose()

    try:
        _run(_probe())
    except Exception as exc:  # noqa: BLE001 — any failure means "no database here"
        pytest.skip(f"no database reachable: {type(exc).__name__}: {exc}")

    user_id, project_id = uuid.uuid4(), uuid.uuid4()
    email = f"method-selection-test-{user_id}@example.test"

    async def _create():
        from sqlalchemy import text as sql_text

        with contextlib.suppress(Exception):
            await engine.dispose()
        try:
            async with engine.begin() as conn:
                await conn.execute(
                    sql_text("insert into auth.users (id, email) values (:i, :e)"),
                    {"i": user_id, "e": email},
                )
                await conn.execute(
                    sql_text(
                        "insert into profiles (id, email, avatar_color) "
                        "values (:i, :e, :c)"
                    ),
                    {"i": user_id, "e": email, "c": "#000000"},
                )
                await conn.execute(
                    sql_text(
                        "insert into projects (id, user_id, name) values (:i, :u, :n)"
                    ),
                    {"i": project_id, "u": user_id, "n": "method-selection-test"},
                )
        finally:
            with contextlib.suppress(Exception):
                await engine.dispose()

    async def _drop():
        from sqlalchemy import text as sql_text

        with contextlib.suppress(Exception):
            await engine.dispose()
        try:
            async with engine.begin() as conn:
                await conn.execute(
                    sql_text("delete from auth.users where id = :i"), {"i": user_id}
                )
        finally:
            with contextlib.suppress(Exception):
                await engine.dispose()

    _run(_create())
    try:
        yield user_id, project_id
    finally:
        _run(_drop())


# --- 名单是注入的 ------------------------------------------------------------


def test_the_decision_layer_never_names_a_method():
    """✗ `ai/coordinator/**` 全文不许出现任何做法 id。

    这是任务书 §6 的核心断言，也是「新增一个做法不需要改核心」的唯一可靠证明。
    候选必须**被注入**：一条能 import 做法名的规则，等于把「有哪些做法」
    写进了决策层，于是加一个插件就变成要改核心。
    """
    for path in sorted(COORDINATOR_ROOT.rglob("*.py")):
        text = path.read_text(encoding="utf-8")
        for name in ("socratic", "direct_explanation"):
            assert name not in text, (
                f"{path.name} 提到了做法 {name!r} —— 协调层只能接收注入的候选名单"
            )


def test_the_registry_is_read_by_the_service_not_by_the_rules():
    """名单的来源在 `services/`，规则只收快照里的东西。"""
    service = Path(inspect.getfile(ai.coordinator)).parent
    del service
    from services import coordinator_service

    source = inspect.getsource(coordinator_service)
    assert "_installed_methods" in source
    assert "ai.methods.runtime import catalogue" in source, (
        "候选必须从做法注册表读，且只在这一处读"
    )


def test_the_snapshot_carries_the_installed_methods():
    """真实装配路径上，候选确实进了快照。"""
    import asyncio
    import contextlib
    import uuid

    from ai.coordinator import SOURCE_CHAT, CoordinatorEvent
    from core.database import AsyncSessionLocal, engine
    from services import coordinator_service
    from sqlalchemy import text

    async def _probe():
        async with engine.connect() as conn:
            await conn.execute(text("select 1"))

    async def _build():
        with contextlib.suppress(Exception):
            await engine.dispose()
        try:
            async with AsyncSessionLocal() as db:
                return await coordinator_service.build_snapshot(
                    db,
                    user_id=uuid.uuid4(),
                    event=CoordinatorEvent(
                        type="learner_state.updated", source=SOURCE_CHAT
                    ),
                    project_id=None,
                )
        finally:
            with contextlib.suppress(Exception):
                await engine.dispose()

    try:
        asyncio.run(_probe())
    except Exception as exc:  # noqa: BLE001
        pytest.skip(f"no database reachable: {type(exc).__name__}: {exc}")

    snap = asyncio.run(_build())
    assert snap.available_methods, "快照里没有候选 —— 装配那一步没接上"
    assert {fact.id for fact in snap.available_methods} == {
        "socratic",
        "direct_explanation",
    }
    # 四要素里被规则真正读的那两格必须真的在。
    by_id = {fact.id: fact for fact in snap.available_methods}
    assert by_id["socratic"].needs_learner_action is True
    assert by_id["socratic"].withholds_answer is True
    assert by_id["direct_explanation"].needs_learner_action is False


# --- 不干预是一等候选 --------------------------------------------------------


@pytest.mark.parametrize(
    "finding",
    [Finding.NONE, Finding.UNSETTLED, Finding.NO_NEXT_STEP],
)
def test_three_of_the_six_findings_choose_to_do_nothing(finding):
    """**大多数 finding 的正确答案是不插进来。**

    若「选择」总能产出一个做法，普通对话会被塞进某个装好的教学法里 ——
    而学习者问的是问题，不是来上课的。一个总在介入的系统和一个从不介入的
    系统，是同一种错误。
    """
    decision = select_method(snapshot(), finding)
    assert decision.selection is MethodSelection.NO_INTERVENTION
    assert decision.method_id is None
    # 不干预也要有理由：「什么都没决定」和「决定不干预」在日志里必须不同。
    assert (decision.reason or "").strip()


def test_nothing_installed_means_no_intervention_not_a_failure():
    """没装任何做法时必须正常回答，而不是抛。

    一个没有方法插件的构建仍然要能对话；「没有做法」的意思是「按普通对话
    回答」，不是「启动失败」。
    """
    decision = select_method(snapshot(methods=()), Finding.STRUGGLE)
    assert decision.selection is MethodSelection.NO_INTERVENTION
    assert "没有可用的做法" in (decision.reason or "")


def test_an_empty_room_is_never_taught():
    """没有活跃对话时不做法有意义 —— 一个做法是对正在被学的人说的。"""
    decision = select_method(snapshot(from_chat=False), Finding.LAPSE)
    assert decision.selection is MethodSelection.NO_INTERVENTION


# --- 选择依据是属性，不是名字 ------------------------------------------------


@pytest.mark.parametrize("finding", sorted(_SELECTABLE_FINDINGS))
def test_the_worthwhile_findings_pick_the_method_that_makes_him_act(finding):
    """三条"值得做点什么"的 finding 都选**要求学习者动手**的那个。

    这是全表唯一一处真正在做选择，而它的依据是一个**声明的属性**：
    他卡住的时候，"再讲一遍"正是已经失败过的做法。
    """
    decision = select_method(snapshot(), finding)
    assert decision.selection is MethodSelection.START
    assert decision.method_id == "socratic"
    assert (decision.reason or "").strip(), "开始一个做法必须说清为什么"


def test_a_third_method_is_selected_without_touching_the_rules():
    """⚠️ 本条是「新增做法不改核心」的可执行证明。

    加一个属性相同的新做法 ⇒ 它与 `socratic` 并列，**表一个字都没改**就选它
    （候选顺序决定取谁）。加一个属性不同的 ⇒ 走另一条分支，同样不用改。
    """
    third = MethodFact(
        id="rebuild",  # a name no rule has ever heard of
        display_name="让学习者重构自己的解释",
        needs_learner_action=True,
        withholds_answer=False,
    )
    decision = select_method(snapshot(methods=(third, *BOTH)), Finding.STRUGGLE)
    assert decision.selection is MethodSelection.START
    # 第一个"要求动手"的候选胜出 —— 而这条规则里没有出现 `rebuild`。
    source = inspect.getsource(select_method)
    assert "rebuild" not in source

    # 属性不同 ⇒ 换一个分支，仍然不改表。
    explaining_only = MethodFact(
        id="explain_more",
        display_name="讲得更细一点",
        needs_learner_action=False,
        withholds_answer=False,
    )
    only_that = select_method(
        snapshot(methods=(explaining_only,)), Finding.STRUGGLE
    )
    assert only_that.method_id == "explain_more", (
        "没有要求动手的候选时必须照用那一个 —— 而不是拒绝干预"
    )


def test_the_rules_file_has_no_method_specific_branch():
    """表里不许出现任何 `if method == ...`。

    写成一张按属性判断的表之后，`rules.py` 里出现做法名就只有一种可能：
    有人又加了一层 if。
    """
    from ai.coordinator import rules

    source = inspect.getsource(rules)
    for pattern in ("if method ==", "method ==", '== "socratic"', "== 'socratic'"):
        assert pattern not in source, f"rules.py 里出现了 {pattern!r}"


# --- 决定与拒绝 -------------------------------------------------------------


def test_a_start_with_no_reason_is_refused():
    """开始或换做法而没有理由 ⇒ 拒绝。

    一次静默的切换与一次随机的切换，在事后看起来一模一样 ——
    而"为什么这次这样教我"是学习者有权问的问题。
    """
    snap = snapshot()
    with pytest.raises(ValueError, match="reason"):
        MethodDecision(
            selection=MethodSelection.START, method_id="socratic"
        ).validate(snap)
    with pytest.raises(ValueError, match="reason"):
        MethodDecision(
            selection=MethodSelection.SWITCH, method_id="socratic"
        ).validate(snap)


def test_naming_a_method_that_is_not_installed_is_refused():
    """决定一个装不上的做法 ⇒ 拒绝。

    那种决定在执行时才会 500，而那时学习者正在一轮对话中间。
    """
    with pytest.raises(ValueError, match="not in the snapshot"):
        MethodDecision(
            selection=MethodSelection.START,
            method_id="ghost",
            reason="测试",
        ).validate(snapshot())


def test_no_intervention_cannot_carry_a_method():
    """「不干预」与「不干预但带个做法」是两个不同的东西，后者是矛盾的。"""
    with pytest.raises(ValueError, match="cannot carry a method"):
        MethodDecision(
            selection=MethodSelection.NO_INTERVENTION, method_id="socratic"
        ).validate(snapshot())


# --- 决定里带上了它 ----------------------------------------------------------


def test_the_decision_carries_the_method_choice_in_the_same_row():
    """决定与做法选择在同一行 —— 一个记了 finding 却没记做法的日志，
    答不了"为什么这次这样教我"，而那是日志存在的唯一理由。"""
    decision = decide(snapshot(focus_value=StateValue.NOT_MASTERED.value))
    assert "method" in decision.payload
    method = decision.payload["method"]
    assert method["selection"] in {s.value for s in MethodSelection}
    # 不干预的那几个 finding 也必须写进去 —— 日志要能区分「没选」与「没记」。
    quiet = decide(snapshot(focus_value=StateValue.UNASSESSED.value))
    assert quiet.payload["method"]["selection"] == MethodSelection.NO_INTERVENTION


def test_the_finding_and_the_method_choice_can_disagree():
    """⚠️ 两条独立的表，所以它们**可以**不一致 —— 而这正是要保留的。

    `CONTINUE` + `NO_INTERVENTION` 的意思是「继续做这一项，但不要在此时改变
    你被教的方式」。若把它们合成一个字段，这个意思就必须丢掉其中一个。
    """
    snap = snapshot(focus_value=StateValue.NOT_MASTERED.value, was_mastered=False)
    finding, _target, _reason = find(snap)
    assert finding is Finding.STRUGGLE
    decision = decide(snap)
    assert decision.action is not None
    assert decision.payload["finding"] == "struggle"
    # 这个场景下两条表是一致的（都在处理中）；不一致的组合由
    # `test_a_finding_that_says_nothing_can_still_ask_for_no_method` 守住。
    assert decision.payload["method"]["selection"] in {
        MethodSelection.START.value,
        MethodSelection.NO_INTERVENTION.value,
    }


def test_a_finding_that_says_nothing_can_still_ask_for_no_method():
    """`UNSETTLED` 说"这一条还没定案"，做法也不该动。"""
    snap = snapshot(focus_value=StateValue.UNASSESSED.value)
    decision = decide(snap)
    assert decision.payload["finding"] == "unsettled"
    assert decision.payload["method"]["selection"] == MethodSelection.NO_INTERVENTION


# --- 已经在跑的一段 ----------------------------------------------------------
#
# R4d：`HOLD` 与 `END` 的产生。理由与「HOLD 零成本」都在
# `ai/coordinator/rules.py:select_method` 的 docstring 里；这里钉住它们。


def test_a_promise_in_progress_is_held_not_re_decided():
    """⚠️ **这一条是 R4d 存在的全部理由。**

    同一个 finding、同一个候选清单，只是因为「已经有一段在进行」，
    结果从 `start` 变成 `hold` —— 而这正是计划 §0.5 优化 1 说的：
    每轮重选会抹掉刚做的撤除帮助，并让选择因为最后一条证据而抖。
    """
    fresh = select_method(snapshot(), Finding.STRUGGLE)
    running = select_method(
        snapshot(active_method="socratic", active_focus="换元后的上下限"),
        Finding.STRUGGLE,
    )
    assert fresh.selection is MethodSelection.START
    assert running.selection is MethodSelection.HOLD
    assert running.method_id == "socratic"
    # 保持不需要理由：继续做正在做的事不需要被论证。
    assert running.reason is None


def test_a_turn_about_something_else_ends_the_promise():
    """⚠️ 关于 A 的承诺不能靠做 B 来兑现。"""
    decision = select_method(
        # 正在进行的是「特征值」，而这一轮的证据是「换元后的上下限」。
        snapshot(active_method="socratic", active_focus="特征值"),
        Finding.STRUGGLE,
    )
    assert decision.selection is MethodSelection.END
    assert decision.method_id == "socratic"
    assert "特征值" in (decision.reason or "")


def test_keeping_a_promise_is_the_cheap_answer_so_thin_evidence_keeps_it():
    """⚠️ 两边都不知道时算「同一件事」—— 这个不对称是故意的。

    With no labels to compare, treating "cannot tell" as "not the same" would
    end every episode in a space with no knowledge structure, so a stretch would
    last exactly one turn — the per-turn behaviour this layer exists to stop.
    The asymmetry: `HOLD` is reversible, `END` throws the promise away.
    """
    no_labels = snapshot(
        focus_value="", active_method="socratic", active_focus=None
    )
    assert select_method(no_labels, Finding.STRUGGLE).selection is (
        MethodSelection.HOLD
    )
    # And the reverse: a stretch with a focus, on a space whose turn has none.
    no_focus = snapshot(
        focus_value="", active_method="socratic", active_focus="换元后的上下限"
    )
    assert select_method(no_focus, Finding.STRUGGLE).selection is MethodSelection.HOLD


def test_holding_or_ending_something_that_is_not_running_is_refused():
    """继续 / 结束一个从未做出的承诺不是决定。"""
    snap = snapshot()
    for selection in (MethodSelection.HOLD, MethodSelection.END):
        with pytest.raises(ValueError, match="not the running episode"):
            MethodDecision(
                selection=selection, method_id="socratic", reason="测试"
            ).validate(snap)


def test_ending_needs_a_reason_while_holding_does_not():
    """静默的结束与随机的结束，事后看起来一模一样。"""
    running = snapshot(active_method="socratic", active_focus="换元后的上下限")
    # A hold with no reason is fine.
    MethodDecision(selection=MethodSelection.HOLD, method_id="socratic").validate(
        running
    )
    with pytest.raises(ValueError, match="reason"):
        MethodDecision(selection=MethodSelection.END, method_id="socratic").validate(
            running
        )


def test_not_intervening_outranks_a_running_promise():
    """一段在进行，但这一轮没有值得插进来的东西 —— 就不插进去。

    "A promise is in progress" is not a reason to keep intervening; the same
    rule that leaves most turns alone applies here, and a system that always
    does something is the mirror image of one that never does.
    """
    running = snapshot(
        active_method="socratic", active_focus="换元后的上下限", focus_value=""
    )
    decision = select_method(running, Finding.NONE)
    assert decision.selection is MethodSelection.NO_INTERVENTION


def test_the_snapshot_reads_the_running_episode_from_the_database(space):
    """装配路径：真的开一段，快照里就有它。

    The rule is only pure because this read happens in
    `coordinator_service.build_snapshot`. A test that skipped the assembly would
    pass while every `HOLD` stayed unreachable in production.
    """
    from ai.coordinator import SOURCE_CHAT, CoordinatorEvent
    from core.database import AsyncSessionLocal
    from services import coordinator_service, method_episode_service

    user_id, project_id = space

    async def _open():
        async with AsyncSessionLocal() as db:
            return await method_episode_service.open_episode(
                db,
                user_id=user_id,
                project_id=project_id,
                method="socratic",
                commitment="你自己做对两道，就算过",
                completion_rule={"kind": "consecutive_correct", "n": 2},
                evidence_target={"item_hint": None, "tier": "B"},
                focus_label="换元后的上下限",
            )

    async def _build():
        async with AsyncSessionLocal() as db:
            return await coordinator_service.build_snapshot(
                db,
                user_id=user_id,
                event=CoordinatorEvent(
                    type="learner_state.updated", source=SOURCE_CHAT
                ),
                project_id=project_id,
            )

    async def _close(episode_id):
        async with AsyncSessionLocal() as db:
            await method_episode_service.close_episode(
                db, user_id=user_id, episode_id=episode_id, status="paused"
            )

    episode = _run(_open())
    assert episode.focus_label == "换元后的上下限"
    snap = _run(_build())
    assert snap.active_method == "socratic"
    assert snap.active_focus == "换元后的上下限"
    # And the rule reads it as a promise in progress, not a fresh start.
    assert select_method(snap, Finding.STRUGGLE).selection is MethodSelection.HOLD
    _run(_close(episode.id))


# --- turn_start：同一个事件，不是一个新事件名 -------------------------------
#
# R4e。`ai/coordinator/types.py` 上方那段注释说清了为什么是 payload 的一个字段
# 而不是新的事件名：每个新事件名 "needs a rule, not just a name"，而「他刚说了
# 一句话」对应的问题不是新问题，只是新**输入**。


def test_an_absent_phase_reads_as_evidence():
    """缺省 = `evidence`，所以每一个 R4e 之前���调用方都不需要改。"""
    from ai.coordinator import (
        DEFAULT_EVENT_PHASE,
        EVENT_PHASE_EVIDENCE,
        EVENT_LEARNER_STATE_UPDATED,
        SOURCE_CHAT,
        CoordinatorEvent,
        event_phase,
    )

    assert DEFAULT_EVENT_PHASE == EVENT_PHASE_EVIDENCE
    plain = CoordinatorEvent(
        type=EVENT_LEARNER_STATE_UPDATED, source=SOURCE_CHAT
    )
    assert event_phase(plain) == EVENT_PHASE_EVIDENCE


def test_an_unknown_phase_is_refused_rather_than_treated_as_evidence():
    """⚠️ 未知 phase ⇒ 拒绝，不是当 evidence。

    把它当 evidence 会为一个系统没有建模的时刻产出决定 —— 与
    `UnsupportedEvent` 对未知**类型**是同一条推理。
    """
    from ai.coordinator import (
        EVENT_LEARNER_STATE_UPDATED,
        SOURCE_CHAT,
        CoordinatorEvent,
        event_phase,
    )

    with pytest.raises(ValueError, match="unknown event phase"):
        event_phase(
            CoordinatorEvent(
                type=EVENT_LEARNER_STATE_UPDATED,
                source=SOURCE_CHAT,
                payload={"phase": "user_lunch_break"},
            )
        )


def test_the_supported_event_list_did_not_grow():
    """⚠️ `SUPPORTED_EVENTS` 仍然只有一个名字 —— 这一步不加事件名。"""
    from ai.coordinator import (
        EVENT_LEARNER_STATE_UPDATED,
        EVENT_PHASE_TURN_START,
        SUPPORTED_EVENTS,
    )

    assert SUPPORTED_EVENTS == (EVENT_LEARNER_STATE_UPDATED,)
    assert EVENT_PHASE_TURN_START == "turn_start"


def test_turn_start_takes_its_focus_from_the_running_episode(space):
    """装配路径：`turn_start` 的 focus 来自那一段，而不是来自证据。

    A turn-start event has no evidence to point at. Attaching the first row of
    anything instead would make the rules decide about an item nobody asked
    about; taking the running episode's item is what lets `HOLD` actually
    happen.
    """
    from ai.coordinator import (
        EVENT_LEARNER_STATE_UPDATED,
        EVENT_PHASE_TURN_START,
        SOURCE_CHAT,
        CoordinatorEvent,
    )
    from core.database import AsyncSessionLocal
    from schemas.knowledge import KnowledgeImportIn
    from services import (
        coordinator_service,
        knowledge_service,
        method_episode_service,
    )

    user_id, project_id = space

    # One item, so "the running episode's item" is unambiguous.
    async def _seed():
        async with AsyncSessionLocal() as db:
            await knowledge_service.import_structure(
                db,
                project_id=project_id,
                payload=KnowledgeImportIn(
                    items=[KnowledgeImportIn.DraftItem(ref="a", label=TOP)],
                    edges=[],
                ),
            )

    async def _open():
        async with AsyncSessionLocal() as db:
            return await method_episode_service.open_episode(
                db,
                user_id=user_id,
                project_id=project_id,
                method="socratic",
                commitment="你自己做对两道，就算过",
                completion_rule={"kind": "consecutive_correct", "n": 2},
                evidence_target={"item_hint": TOP, "tier": "B"},
                focus_label=TOP,
            )

    async def _build(phase):
        async with AsyncSessionLocal() as db:
            return await coordinator_service.build_snapshot(
                db,
                user_id=user_id,
                event=CoordinatorEvent(
                    type=EVENT_LEARNER_STATE_UPDATED,
                    source=SOURCE_CHAT,
                    payload={"phase": phase},
                ),
                project_id=project_id,
            )

    async def _close(episode_id):
        async with AsyncSessionLocal() as db:
            await method_episode_service.close_episode(
                db, user_id=user_id, episode_id=episode_id, status="paused"
            )

    _run(_seed())
    episode = _run(_open())

    at_turn_start = _run(_build(EVENT_PHASE_TURN_START))
    assert at_turn_start.focus is not None
    assert at_turn_start.focus.label == TOP

    # An evidence event with no `itemId` has no focus at all — and that is the
    # honest answer, because no record landed.
    at_evidence = _run(_build("evidence"))
    assert at_evidence.focus is None

    _run(_close(episode.id))


def test_turn_start_with_nothing_running_has_no_focus(space):
    """第一轮：没有在跑的一段 ⇒ 没有 focus ⇒ 不干预。

    Nothing has been started, so there is nothing to hold and no evidence to
    have started one. A first turn that silently picked a method would be
    picking it with no reason at all.
    """
    from ai.coordinator import (
        EVENT_LEARNER_STATE_UPDATED,
        EVENT_PHASE_TURN_START,
        SOURCE_CHAT,
        CoordinatorEvent,
    )
    from core.database import AsyncSessionLocal
    from services import coordinator_service

    user_id, project_id = space

    async def _build():
        async with AsyncSessionLocal() as db:
            return await coordinator_service.build_snapshot(
                db,
                user_id=user_id,
                event=CoordinatorEvent(
                    type=EVENT_LEARNER_STATE_UPDATED,
                    source=SOURCE_CHAT,
                    payload={"phase": EVENT_PHASE_TURN_START},
                ),
                project_id=project_id,
            )

    snap = _run(_build())
    assert snap.active_method is None
    assert snap.focus is None
    finding, _target, _reason = find(snap)
    assert finding is Finding.NONE
    assert select_method(snap, finding).selection is MethodSelection.NO_INTERVENTION


def test_the_label_lookup_is_exact_or_nothing(space):
    """⚠️ 模糊或子串匹配会把一段挂到相邻的知识点上，然后「保持」错的承诺。

    Refusing to answer is the safe direction: no focus reads as "nothing
    running", which cannot hold the wrong promise.
    """
    from services.coordinator_service import _item_id_for_label

    class _Item:
        def __init__(self, item_id: str, label: str) -> None:
            self.id = item_id
            self.label = label

    items = [_Item("i1", "换元后的上下限"), _Item("i2", "换下限")]
    assert _item_id_for_label(items, "换元后的上下限") == "i1"
    # "换下限" is a real item, not a fragment of the other one.
    assert _item_id_for_label(items, "换下限") == "i2"
    assert _item_id_for_label(items, "上下限") is None
    assert _item_id_for_label(items, None) is None
    assert _item_id_for_label(items, "  ") is None

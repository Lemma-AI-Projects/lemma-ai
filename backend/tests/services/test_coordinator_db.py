"""The Coordinator against a real database — the whole chain, and its boundary.

The chain, once, in the order it happens in production:

    evidence written  ->  Learner State changes  ->  Coordinator invoked
                      ->  decision recorded      ->  effect (notification, or a
                                                     step handed to the caller)

`tests/ai/coordinator/test_rules.py` pins the decision logic; this file pins the
wiring and the boundary. The boundary is the part worth testing hardest, because
it is the one the brief is emphatic about: the Coordinator **reads** Learner
State, Space Memory and the knowledge structure, and it **writes** nothing but
its own decision log — plus, when the decision is NOTIFY, a notification through
the Notification Sender. Nothing else may move.

Skips when Postgres is unreachable and needs `alembic upgrade head`.
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid

import pytest
from sqlalchemy import func, select, text

from ai.coordinator import (
    EVENT_LEARNER_STATE_UPDATED,
    SOURCE_API,
    SOURCE_CHAT,
    Action,
    CoordinatorEvent,
)
from core.database import AsyncSessionLocal, engine
from models.coordinator_decision import CoordinatorDecision
from models.knowledge import KnowledgeEdge, KnowledgeEvidence, KnowledgeItem
from models.notification import Notification
from schemas.knowledge import KnowledgeEvidenceIn, KnowledgeImportIn
from services import coordinator_service, knowledge_service, notification_service

# The demo space's real shape: 矩阵基础 -> 线性无关 -> 特征值.
BASE = "矩阵基础"
MIDDLE = "线性无关"
TOP = "特征值"


def run(coro):
    """asyncio.run with the pool drained on both sides (see test_notifications_db)."""

    async def wrapper():
        with contextlib.suppress(Exception):
            await engine.dispose()
        try:
            return await coro
        finally:
            with contextlib.suppress(Exception):
                await engine.dispose()

    return asyncio.run(wrapper())


@pytest.fixture()
def space():
    """A throwaway user with a three-item prerequisite chain, per test."""

    async def _probe():
        async with engine.connect() as conn:
            await conn.execute(text("select 1"))

    try:
        run(_probe())
    except Exception as exc:  # noqa: BLE001 — any failure means "no database here"
        pytest.skip(f"no database reachable: {type(exc).__name__}: {exc}")

    user_id, project_id = run(_create_space())
    yield user_id, project_id, uuid.uuid4()
    run(_drop_user(user_id))


async def _create_space() -> tuple[uuid.UUID, uuid.UUID]:
    user_id, project_id = uuid.uuid4(), uuid.uuid4()
    email = f"coordinator-test-{user_id}@example.test"
    async with engine.begin() as conn:
        await conn.execute(
            text("insert into auth.users (id, email) values (:id, :email)"),
            {"id": user_id, "email": email},
        )
        await conn.execute(
            text(
                "insert into profiles (id, email, avatar_color) "
                "values (:id, :email, :color)"
            ),
            {"id": user_id, "email": email, "color": "#000000"},
        )
        await conn.execute(
            text("insert into projects (id, user_id, name) values (:id, :u, :n)"),
            {"id": project_id, "u": user_id, "n": "coordinator-test-space"},
        )
    async with AsyncSessionLocal() as db:
        await knowledge_service.import_structure(
            db,
            project_id=project_id,
            payload=KnowledgeImportIn(
                items=[
                    KnowledgeImportIn.DraftItem(ref="a", label=BASE),
                    KnowledgeImportIn.DraftItem(ref="b", label=MIDDLE),
                    KnowledgeImportIn.DraftItem(ref="c", label=TOP),
                ],
                edges=[
                    KnowledgeImportIn.DraftEdge(from_ref="a", to_ref="b"),
                    KnowledgeImportIn.DraftEdge(from_ref="b", to_ref="c"),
                ],
            ),
        )
    return user_id, project_id


async def _drop_user(user_id: uuid.UUID) -> None:
    async with engine.begin() as conn:
        await conn.execute(text("delete from auth.users where id = :id"), {"id": user_id})


# --- helpers: exactly what the API/tool do, in the same order ---------------


async def _write_then_announce(
    space,
    *,
    item_label: str,
    verdict: str,
    tier: str = "A",
    source: str = SOURCE_CHAT,
    as_user: uuid.UUID | None = None,
):
    """Write the evidence, then announce the event — two real calls, as in prod."""
    user_id, project_id, _stranger = space
    actor = as_user or user_id
    async with AsyncSessionLocal() as db:
        evidence = await knowledge_service.record_evidence(
            db,
            project_id=project_id,
            user_id=actor,
            payload=KnowledgeEvidenceIn(
                project_id=project_id,
                item_label=item_label,
                verdict=verdict,
                tier=tier,
                reasoning="coordinator test",
            ),
        )
        record = await coordinator_service.handle_event(
            db,
            user_id=actor,
            event=CoordinatorEvent(
                type=EVENT_LEARNER_STATE_UPDATED,
                source=source,
                payload={
                    "projectId": str(project_id),
                    "evidenceId": str(evidence.id),
                    "itemId": str(evidence.item_id),
                    "itemLabel": evidence.item_label,
                    "verdict": evidence.verdict,
                    "tier": evidence.tier,
                },
            ),
        )
    return evidence, record


async def _decisions(space, *, as_user: uuid.UUID | None = None, project_id=None):
    user_id, own_project_id, stranger = space
    async with AsyncSessionLocal() as db:
        return await coordinator_service.list_for_user(
            db,
            user_id=as_user or user_id,
            project_id=project_id if project_id is not None else own_project_id,
        )


async def _feed(space, *, as_user: uuid.UUID | None = None, limit: int = 50):
    user_id, _project_id, stranger = space
    async with AsyncSessionLocal() as db:
        return await notification_service.list_for_user(
            db, user_id=as_user or user_id, limit=limit
        )


async def _counts(space) -> dict[str, int]:
    """Every table the Coordinator could conceivably have touched."""
    user_id, project_id, _stranger = space
    async with AsyncSessionLocal() as db:
        out: dict[str, int] = {}
        for name, query in (
            ("items", select(func.count()).select_from(KnowledgeItem).where(KnowledgeItem.project_id == project_id)),
            ("edges", select(func.count()).select_from(KnowledgeEdge).where(KnowledgeEdge.project_id == project_id)),
            ("evidence", select(func.count()).select_from(KnowledgeEvidence).where(KnowledgeEvidence.project_id == project_id)),
            ("notifications", select(func.count()).select_from(Notification).where(Notification.user_id == user_id)),
            ("decisions", select(func.count()).select_from(CoordinatorDecision).where(CoordinatorDecision.user_id == user_id)),
        ):
            out[name] = int((await db.execute(query)).scalar_one())
        return out


# --- the chain --------------------------------------------------------------


def test_a_finished_item_makes_the_next_one_ready_and_the_background_call_notifies(space):
    """The vertical slice: write -> state -> decision -> a reminder in the Feed."""
    _evidence, record = run(
        _write_then_announce(
            space, item_label=MIDDLE, verdict="correct", source=SOURCE_API
        )
    )

    # The write moved the state: 线性无关 mastered pulls 矩阵基础 in with it, and
    # 特征值 becomes ready.
    assert record.action == Action.NOTIFY.value
    assert record.target == TOP
    assert record.urgency == "normal"
    assert record.effect.startswith("notification_sent:")

    feed = run(_feed(space))
    assert len(feed) == 1
    assert TOP in feed[0].body
    # Provenance: the reminder points back at the decision that produced it.
    assert feed[0].metadata["source"] == "coordinator"
    assert feed[0].metadata["action"] == Action.NOTIFY.value
    assert feed[0].metadata["target"] == TOP
    assert feed[0].metadata["finding"] == "next_step"


def test_the_same_event_in_a_conversation_hands_the_step_to_the_caller(space):
    """Same state change, same finding — but a conversation is live, so the next
    step goes back to whoever announced the event and NO notification is sent."""
    _evidence, record = run(
        _write_then_announce(
            space, item_label=MIDDLE, verdict="correct", source=SOURCE_CHAT
        )
    )

    assert record.action == Action.INTRODUCE.value
    assert record.target == TOP
    assert record.effect == "handed_to_global_agent"
    assert run(_feed(space)) == []


def test_having_it_and_losing_it_is_a_review(space):
    run(_write_then_announce(space, item_label=MIDDLE, verdict="correct", source=SOURCE_CHAT))
    _evidence, record = run(
        _write_then_announce(space, item_label=MIDDLE, verdict="incorrect", source=SOURCE_CHAT)
    )
    assert record.action == Action.REVIEW.value
    assert record.target == MIDDLE
    assert record.urgency == "high"
    assert "此前做对过" in record.reason


def test_a_lapse_reaches_the_learner_as_a_reminder_when_nobody_is_in_a_conversation(space):
    run(_write_then_announce(space, item_label=MIDDLE, verdict="correct", source=SOURCE_API))
    _evidence, record = run(
        _write_then_announce(space, item_label=MIDDLE, verdict="incorrect", source=SOURCE_API)
    )
    assert record.action == Action.NOTIFY.value
    feed = run(_feed(space))
    assert any("复习提醒" == item.title for item in feed)
    assert any(MIDDLE in item.body for item in feed)


def test_failing_something_new_continues(space):
    _evidence, record = run(
        _write_then_announce(space, item_label=TOP, verdict="incorrect", source=SOURCE_CHAT)
    )
    assert record.action == Action.CONTINUE.value
    assert record.target == TOP
    assert record.effect == "handed_to_global_agent"


def test_one_rubric_record_is_not_enough_to_act_on(space):
    """Case 1 on the real path: a single tier-B judgement leaves the item
    unassessed, so the Coordinator does nothing and says why."""
    _evidence, record = run(
        _write_then_announce(space, item_label=MIDDLE, verdict="correct", tier="B", source=SOURCE_API)
    )
    assert record.action == Action.NO_ACTION.value
    assert record.effect == "nothing_to_do"
    assert "定案" in record.reason
    assert run(_feed(space)) == []


def test_two_rubric_records_do_settle_it(space):
    """The pair to the case above: the threshold is real, not a permanent block."""
    run(_write_then_announce(space, item_label=MIDDLE, verdict="correct", tier="B", source=SOURCE_API))
    _evidence, record = run(
        _write_then_announce(space, item_label=MIDDLE, verdict="correct", tier="B", source=SOURCE_API)
    )
    assert record.action == Action.NOTIFY.value
    assert record.target == TOP


# --- the boundary -----------------------------------------------------------


def test_the_coordinator_writes_nothing_but_its_log_and_the_notification(space):
    """The claim the module docstring makes, asserted against every table the
    Coordinator could have touched."""
    before = run(_counts(space))
    run(_write_then_announce(space, item_label=MIDDLE, verdict="correct", source=SOURCE_API))
    after = run(_counts(space))

    # The write itself moved evidence; nothing else.
    assert after["evidence"] == before["evidence"] + 1
    assert after["items"] == before["items"]
    assert after["edges"] == before["edges"]

    # The Coordinator wrote exactly two things: its decision, and the reminder.
    assert after["decisions"] == before["decisions"] + 1
    assert after["notifications"] == before["notifications"] + 1


def test_the_log_is_newest_first_and_scoped_to_the_caller(space):
    run(_write_then_announce(space, item_label=TOP, verdict="incorrect", source=SOURCE_CHAT))
    run(_write_then_announce(space, item_label=MIDDLE, verdict="correct", source=SOURCE_CHAT))

    mine = run(_decisions(space))
    assert [row.action for row in mine[:2]] == [
        Action.INTRODUCE.value,
        Action.CONTINUE.value,
    ]
    assert mine[0].created_at >= mine[1].created_at

    user_id, _project_id, stranger = space
    assert run(_decisions(space, as_user=stranger)) == []


def test_an_event_without_a_space_is_still_decided_and_recorded(space):
    user_id, _project_id, _stranger = space

    async def _handle():
        async with AsyncSessionLocal() as db:
            return await coordinator_service.handle_event(
                db,
                user_id=user_id,
                event=CoordinatorEvent(type=EVENT_LEARNER_STATE_UPDATED, source=SOURCE_API, payload={}),
            )

    record = run(_handle())
    assert record.action == Action.NO_ACTION.value
    assert record.project_id is None
    assert record.effect == "nothing_to_do"


def test_an_unsupported_event_is_refused_and_records_nothing(space):
    user_id, project_id, _stranger = space
    before = run(_counts(space))

    async def _handle():
        async with AsyncSessionLocal() as db:
            with pytest.raises(coordinator_service.UnsupportedEvent):
                await coordinator_service.handle_event(
                    db,
                    user_id=user_id,
                    event=CoordinatorEvent(type="goal.changed", source=SOURCE_API, payload={}),
                )

    run(_handle())
    assert run(_counts(space)) == before


def test_the_safe_wrapper_never_raises_so_a_write_cannot_be_lost(space):
    """`handle_event_safely` is what the evidence write paths call: a broken
    decision must not fail the write that produced it."""
    user_id, _project_id, _stranger = space

    async def _handle():
        async with AsyncSessionLocal() as db:
            return await coordinator_service.handle_event_safely(
                db,
                user_id=user_id,
                event=CoordinatorEvent(type="does.not.exist", source=SOURCE_API, payload={}),
            )

    assert run(_handle()) is None


# --- the dry run ------------------------------------------------------------


def test_explain_decides_without_executing_or_recording(space):
    user_id, project_id, _stranger = space
    run(_write_then_announce(space, item_label=MIDDLE, verdict="correct", source=SOURCE_CHAT))
    before = run(_counts(space))

    async def _explain():
        async with AsyncSessionLocal() as db:
            item = (
                await db.execute(
                    select(KnowledgeItem).where(
                        KnowledgeItem.project_id == project_id,
                        KnowledgeItem.label == MIDDLE,
                    )
                )
            ).scalar_one()
            return await coordinator_service.explain(
                db, user_id=user_id, project_id=project_id, item_id=item.id, source=SOURCE_API
            )

    explanation = run(_explain())
    # It produces a decision and shows the snapshot behind it …
    assert explanation.decision.action in set(Action)
    assert explanation.snapshot.focus is not None
    assert explanation.snapshot.focus.label == MIDDLE
    assert explanation.snapshot.focus.value == "mastered"
    # … the same one a real event would produce on this state …
    assert explanation.snapshot.ready == (TOP,)
    # … and it changed nothing at all.
    assert run(_counts(space)) == before

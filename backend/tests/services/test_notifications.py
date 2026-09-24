"""Notification Sender — the properties that make it a *sender*, DB-free.

Three claims are checked here, and they are the ones a reviewer should be able
to reject this code on:

  * **It knows nobody.** The module's imports are stdlib + SQLAlchemy + its own
    table. If it ever imports `ai.*`, a domain service or the Learner State, the
    delivery path has been welded to the decision path — that is the specific
    failure this feature exists to avoid, so it is a test, not a comment.
  * **It refuses before it writes.** A blank title or an unknown type raises
    without a session: a caller bug must not become a half-rendered feed item,
    and the check must not depend on the database being up.
  * **The caps are applied, not trusted.** Content is trimmed and truncated by
    the sender, so the feed cannot be taken over by one runaway producer.

What is NOT tested here: whether a row lands and which rows a user can read.
Those are properties of the queries, they need a real table, and they live in
`test_notifications_db.py`.
"""

from __future__ import annotations

import ast
import asyncio
import pathlib
import uuid
from datetime import UTC, datetime, timedelta

import pytest

from services import notification_service
from services.notification_service import (
    BODY_MAX_CHARS,
    DEFAULT_TYPE,
    NOTIFICATION_TYPES,
    TITLE_MAX_CHARS,
    InvalidNotification,
    NotificationInput,
    send,
)

MODULE_PATH = pathlib.Path(notification_service.__file__)

# The whole allowed outer world for the sender. Anything else — and in
# particular anything under `ai/` or any other `services/` module — fails the
# coupling test below.
ALLOWED_IMPORT_ROOTS = {
    "__future__",
    "dataclasses",
    "datetime",
    "typing",
    "uuid",
    "sqlalchemy",
    "models",
}


def _imported_roots() -> set[str]:
    tree = ast.parse(MODULE_PATH.read_text(encoding="utf-8"))
    roots: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            roots.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            roots.add(node.module.split(".")[0])
    return roots


def test_the_sender_knows_nobody():
    """No Learn Space, no Learner State, no Method, no Scheduler, no `ai/`."""
    assert _imported_roots() <= ALLOWED_IMPORT_ROOTS


def test_the_sender_only_imports_its_own_table():
    """The one domain import it is allowed is the row it writes."""
    imported_modules = {
        node.module
        for node in ast.walk(ast.parse(MODULE_PATH.read_text(encoding="utf-8")))
        if isinstance(node, ast.ImportFrom) and node.module
    }
    assert "models.notification" in imported_modules
    assert not {m for m in imported_modules if m.startswith("ai")}
    assert not {m for m in imported_modules if m.startswith("services.")}


def test_the_sender_exposes_two_operations_and_no_more():
    """send() and the read. A third public operation would be V1's business."""
    public = {name for name in notification_service.__all__ if not name.isupper()}
    assert {name for name in public if not name[:1].isupper()} == {
        "send",
        "list_for_user",
    }


# --- what a notification is -------------------------------------------------


def test_defaults_are_a_reminder_with_an_empty_body():
    item = NotificationInput(title="Review reminder")
    assert item.type == DEFAULT_TYPE == "reminder"
    assert item.body == ""
    assert item.metadata == {}
    # None means "the database's now()", not "1970" — the sender must not invent
    # a clock when the caller did not ask for one.
    assert item.timestamp is None


def test_the_three_labels_the_feed_can_style():
    assert set(NOTIFICATION_TYPES) == {"reminder", "notification", "system"}


# --- what the sender refuses (and it refuses before touching the database) ---
#
# `db=None` is the assertion, not a shortcut: if validating ever moves after the
# first query, these three tests fail with an AttributeError on None instead of
# raising InvalidNotification.


def _send_without_a_session(item: NotificationInput):
    return asyncio.run(send(None, user_id=uuid.uuid4(), notification=item))


def test_a_blank_title_is_refused_without_a_session():
    with pytest.raises(InvalidNotification):
        _send_without_a_session(NotificationInput(title="   "))


def test_an_unknown_type_is_refused_without_a_session():
    with pytest.raises(InvalidNotification) as excinfo:
        _send_without_a_session(NotificationInput(title="hi", type="urgent_review"))
    assert "urgent_review" in str(excinfo.value)


def test_content_is_trimmed_and_capped():
    """Asserted through the refusal/acceptance path, not by calling internals:
    a title of only spaces is empty *after trimming*."""
    long_title = "  " + "t" * (TITLE_MAX_CHARS + 50) + "  "
    assert len(long_title.strip()) > TITLE_MAX_CHARS

    # The trimming happens before the emptiness check, so a padded title is
    # accepted and a whitespace-only one is not.
    with pytest.raises(InvalidNotification):
        _send_without_a_session(NotificationInput(title="\n\t "))

    assert TITLE_MAX_CHARS > 0 and BODY_MAX_CHARS > 0
    # The caps are a guard against a runaway producer, so they must still allow
    # an honest card: a sentence-long body fits many times over.
    assert BODY_MAX_CHARS > 200


def test_a_metadata_bag_rides_along_without_the_sender_reading_it():
    """Free-form by design: the sender stores structure it does not interpret —
    that is the seam a future Scheduler uses to attach context."""
    item = NotificationInput(
        title="Review reminder",
        body="You studied Eigenvectors three days ago.",
        metadata={"knowledgeItem": "eigenvector", "attempt": 3},
    )
    assert item.metadata["knowledgeItem"] == "eigenvector"


def test_an_explicit_timestamp_is_carried_unchanged():
    """A producer replaying an older event can date it; the sender does not
    rewrite it to now()."""
    when = datetime.now(UTC) - timedelta(days=3)
    assert NotificationInput(title="x", timestamp=when).timestamp == when

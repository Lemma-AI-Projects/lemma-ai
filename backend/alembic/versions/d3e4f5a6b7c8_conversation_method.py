"""conversations: which teaching method this thread runs under

Adds `ai_conversations.method` (Method V0). Additive — one column, nothing
touched, nothing backfilled by hand.

Why a column and not a message field: "how this thread is taught" outlives a
single turn (the learner switches to Socratic and it stays switched), while the
per-answer record of what the agent could see already rides on
`ai_messages.agent_context_json`. Storing the choice on the assistant message
would make every reload guess which one was current.

Why NOT NULL with a server_default: existing rows get Direct Explanation, which
is what this product did before Methods existed — short structured explanation
with one example. Defaulting to Socratic would have silently turned every
existing conversation into an interrogation.

No CHECK constraint and no enum type on purpose: valid names are owned by the
registry in `ai/methods` (served by GET /api/v1/methods), and pinning them into
the schema would mean a migration every time a method is added — exactly the
kind of coupling the registry exists to avoid.

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, Sequence[str], None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_METHOD = "direct_explanation"


def upgrade() -> None:
    op.add_column(
        "ai_conversations",
        sa.Column(
            "method",
            sa.String(),
            nullable=False,
            server_default=DEFAULT_METHOD,
        ),
    )


def downgrade() -> None:
    op.drop_column("ai_conversations", "method")

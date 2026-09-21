"""ai_messages: record what the Global Agent could see for each answer

Additive, nullable — no existing row changes meaning and nothing is rewritten.

Why a column instead of recomputing on read: the digest must say what was in the
prompt AT THAT TURN. Sources get added, renamed and deleted, so recomputing it
later would produce a plausible-looking lie. The column is what makes the
"Agent Context" panel honest after a reload.

Shape (wire-shaped, camelCase, kept small on purpose — it is a digest, not the
prompt):
    {"space": {...}, "sources": [...], "conversations": [...],
     "excerpts": [...], "historyMessages": 8, "promptChars": 4123,
     "action": "answer"}

The prompt text itself is NOT stored: it is recomputable for display from the
Context Inspector, and storing a few KB per message would buy nothing.

Revision ID: e7a8b9c0d1e2
Revises: d5e6f7a8b9c0
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e7a8b9c0d1e2"
down_revision: Union[str, Sequence[str], None] = "d5e6f7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ai_messages",
        sa.Column(
            "agent_context_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
    )


def downgrade() -> None:
    op.drop_column("ai_messages", "agent_context_json")

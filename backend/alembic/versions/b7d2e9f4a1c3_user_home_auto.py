"""user_home: the three Auto switches (about / interests / preferences)

A permission column, not a feature. Each boolean says whether Lemma's analysis
is allowed to fill that section in for this person; the analysis itself lives
elsewhere and does not exist yet. Storing it here — with Home's other
single-valued facts — is what makes "I turned this off last week" survive a
reload and every device.

Why three columns instead of one: the three sections carry different kinds of
statement (who I am / what I care about / how I want to be taught) and a person
can reasonably want automatic help with one and not the others. One global
switch would have to guess.

Why default TRUE: the product's promise is that the layer works without being
configured first ("Lemma AI 会长期追随你的脚步"), and a section that only starts
learning after the user finds a switch is a section that never starts. Turning it
off stays one click away, and turning it off never deletes anything.

Additive and backfilled by the server default: existing rows get `true`, which is
the same state a brand-new account is in, so there is no "old accounts behave
differently" branch to remember.

Revision ID: b7d2e9f4a1c3
Revises: d9e8f7a6b5c4
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "b7d2e9f4a1c3"
down_revision: Union[str, Sequence[str], None] = "d9e8f7a6b5c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_SWITCHES = ("auto_about", "auto_interests", "auto_preferences")


def upgrade() -> None:
    for column in _SWITCHES:
        op.add_column(
            "user_home",
            sa.Column(
                column,
                sa.Boolean(),
                server_default=sa.text("true"),
                nullable=False,
            ),
        )


def downgrade() -> None:
    for column in _SWITCHES:
        op.drop_column("user_home", column)

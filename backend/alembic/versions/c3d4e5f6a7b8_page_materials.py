"""pages: original file name, MIME and the storage key

Grid mode groups space materials by **file type**, and until now the type simply
did not exist: `pages` carried `kind` (note/canvas/imported/folder) and `source`
(manual/upload/…), so "pdf vs word vs spreadsheet" could only be guessed from the
title — which the user is free to rename. These three columns are that missing
fact.

  - `original_name` — the name the file arrived with (extension included). Shown
    to the user; never used as a path.
  - `mime` — its declared content type. The grouping key.
  - `storage_key` — where the bytes live. Local disk for now (an object store
    later); the API never sends it to a client, which is why the read surface is
    `GET /pages/{id}/file` rather than a URL built out of this column.

All three nullable and nothing backfilled: an existing board (a note, a canvas,
a text import) has no separate file, and "no file" must stay distinguishable
from "file we lost". Additive — no existing row changes meaning.

Revision ID: c3d4e5f6a7b8
Revises: b7d2e9f4a1c3
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b7d2e9f4a1c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_COLUMNS = (
    sa.Column("original_name", sa.Text(), nullable=True),
    sa.Column("mime", sa.String(), nullable=True),
    sa.Column("storage_key", sa.Text(), nullable=True),
)


def upgrade() -> None:
    for column in _COLUMNS:
        op.add_column("pages", column)


def downgrade() -> None:
    for column in reversed(_COLUMNS):
        op.drop_column("pages", column.name)

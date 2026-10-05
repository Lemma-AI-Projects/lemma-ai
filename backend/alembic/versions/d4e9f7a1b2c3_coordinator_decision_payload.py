"""coordinator_decisions.decision_payload: 决定自己产出的机器形状

R3 让 Coordinator 会挑做法了，把选择骑在 `Decision.payload["method"]` 上 ——
**但那张表没有 payload 列，所以它只活在内��的 `Decision` 上**。
`handle_event` 当时只写 event_payload / action / target / reason / urgency / effect 六项，
于是「为什么这次这样教我」今天答不了，而那是这张表存在的唯一理由。

加一列，不是往 `reason` 里拼 JSON：

* `reason` 是**给人读的一句话**，`{"selection": "start", "method": "socratic"}`
  塞进去，下一个读它的人会写正则。
* 与 `event_payload` 分开：那个是**进来的**，这个是**出去的**。合并之后
  「事件说的」与「我们定的」事后无法区分 —— 和把消息记成对方发的一样是种混淆。

Additive：一列带 `server_default "{}"`，既有行读出来是空对象，**不回填** ——
旧决定发生在做法选择存在之前，给它们补一个 `method` 等于伪造历史。

Revision ID: d4e9f7a1b2c3
Revises: bc23de45fa67
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d4e9f7a1b2c3"
down_revision: Union[str, Sequence[str], None] = "bc23de45fa67"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "coordinator_decisions",
        sa.Column(
            "decision_payload",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("coordinator_decisions", "decision_payload")

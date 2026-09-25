from datetime import datetime
from typing import Any

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class XkwCatalogCache(Base):
    """Cached XKW basic data (courses, question types, knowledge trees).

    Keyed by (kind, key): e.g. ('courses', 'all'), ('question_types', '27'),
    ('knowledge_tree', '27'). Stored as the provider payload, never queried by
    column; refreshed by the Beat sync (30 days) or on first use.
    """

    __tablename__ = "xkw_catalog_cache"

    kind: Mapped[str] = mapped_column(String, primary_key=True)
    key: Mapped[str] = mapped_column(String, primary_key=True)
    payload_json: Mapped[Any] = mapped_column(JSONB, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)

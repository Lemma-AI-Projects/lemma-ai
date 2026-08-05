"""Dev message board CRUD (ceaser <-> syk handover notes)."""

from sqlalchemy import delete, select

from core.database import AsyncSessionLocal
from models.dev_message import DevMessage


async def list_messages(limit: int = 100) -> list[dict]:
    async with AsyncSessionLocal() as session:
        rows = (
            await session.execute(
                select(DevMessage)
                .order_by(DevMessage.created_at.desc())
                .limit(limit)
            )
        ).scalars()
        return [
            {
                "id": str(r.id),
                "author": r.author,
                "body": r.body,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]


async def create_message(author: str, body: str) -> dict:
    async with AsyncSessionLocal() as session:
        row = DevMessage(author=author, body=body)
        session.add(row)
        await session.commit()
        await session.refresh(row)
        return {
            "id": str(row.id),
            "author": row.author,
            "body": row.body,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }


async def delete_message(message_id: str, actor: str) -> bool:
    async with AsyncSessionLocal() as session:
        row = await session.get(DevMessage, message_id)
        if row is None:
            return False
        if row.author != actor:
            return False  # only the author may delete their own note
        await session.delete(row)
        await session.commit()
        return True

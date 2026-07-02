from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from core.config import settings


class Base(DeclarativeBase):
    pass


# Connection discipline (6-30 / 7-2 两次事故复盘):
# - connect_args 超时: 网络链路劣化时, 已建连接会被黑洞、SSL 握手会被掐断; asyncpg
#   默认等 OS 级 TCP 超时 (60s+), 流水线每一步都跟着挂。收紧为秒级快速失败, 交给上层
#   既有的重试/降级处理。command_timeout 对单条语句生效, 本项目全部是毫秒级 OLTP 查询。
# - pool_size/max_overflow: Supabase session pooler 的客户端配额有限 (项目 Pool Size,
#   超限报 EMAXCONNSESSION)。SQLAlchemy 默认 5+10 让单进程能冲到 15 条 —— uvicorn 与
#   每个 Celery worker 各持一份 engine, 必须收敛每进程上限。
# - pool_recycle: 长闲连接主动换新, 避免被 pooler/NAT 掐掉后才发现。
engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=3,
    max_overflow=2,
    pool_recycle=1800,
    connect_args={"timeout": 10, "command_timeout": 30},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

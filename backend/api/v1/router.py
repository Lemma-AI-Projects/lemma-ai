from fastapi import APIRouter

from api.v1 import (
    chat,
    companion,
    conversations,
    courses,
    credits,
    graphs,
    health,
    knowledge,
    pages,
    payments,
    progress,
    projects,
    users,
    webhooks,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(users.router)
api_router.include_router(chat.router)
api_router.include_router(conversations.router)
api_router.include_router(projects.router)
api_router.include_router(courses.router)
api_router.include_router(companion.router)
api_router.include_router(graphs.router)
api_router.include_router(progress.router)
# 支付/积分（一次性 credits，PayPal；Stripe 在本分支恒为未就绪）。
api_router.include_router(credits.router)
api_router.include_router(payments.router)
api_router.include_router(webhooks.router)
# 知识层（Learner State）：知识结构 + 纯函数派生的状态 + 唯一的证据写入面。
api_router.include_router(knowledge.router)
# 资料层（Space Context）：空间里放着的资料。写面由 DOC_FULL_API_ENABLED 门控 ——
# 迁移未 apply 之前，它应当回 503（「未启用」）而不是 500（「表不存在」）。
api_router.include_router(pages.router)

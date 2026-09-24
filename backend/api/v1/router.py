from fastapi import APIRouter

from api.v1 import (
    chat,
    companion,
    conversations,
    coordinator,
    courses,
    credits,
    free_courses,
    graphs,
    health,
    knowledge,
    methods,
    notifications,
    pages,
    payments,
    progress,
    projects,
    scheduled_tasks,
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
# 自由课程（Free Course）：与视频课并行的另一条课程管线（courses.mode='free'）。
api_router.include_router(free_courses.router)
# 学习方法（Method V0）：注册表只读；本轮用哪个 Method 由 chat 请求携带并记在会话上。
api_router.include_router(methods.router)
# 通知（Notification V0）：Feed 的通知项。读=列表，写=send()。
api_router.include_router(notifications.router)
# 定时（Scheduler V0）：一个未来事件在指定时间发生；到点调 Notification Sender。
# 任务落在 scheduled_tasks 表，进程内轮询循环负责「到点了吗」。
api_router.include_router(scheduled_tasks.router)
# 协调层（Coordinator V0）：事件驱动的决策层。只读面（决策日志 + 干跑解释）；
# 它由「真正写了证据」的那两处进程内调用，没有外部触发口。
api_router.include_router(coordinator.router)

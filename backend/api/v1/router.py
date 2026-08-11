from fastapi import APIRouter

from api.v1 import (
    board,
    chat,
    kb_gateway,
    companion,
    conversations,
    courses,
    graphs,
    health,
    learn_spaces,
    onboarding,
    overview,
    payments,
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
api_router.include_router(overview.router)
api_router.include_router(graphs.router)
api_router.include_router(learn_spaces.router)
api_router.include_router(onboarding.router)
api_router.include_router(board.router)
api_router.include_router(kb_gateway.router)
api_router.include_router(payments.router)
api_router.include_router(webhooks.router)

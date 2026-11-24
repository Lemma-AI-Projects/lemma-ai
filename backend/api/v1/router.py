from fastapi import APIRouter

from api.v1 import (
    chat,
    conversations,
    graphs,
    health,
    projects,
    qbank_admin,
    question_sets,
    users,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(users.router)
api_router.include_router(chat.router)
api_router.include_router(conversations.router)
api_router.include_router(projects.router)
api_router.include_router(graphs.router)
api_router.include_router(question_sets.router)
api_router.include_router(qbank_admin.router)

from fastapi import APIRouter

from api.v1 import (
    chat,
    companion,
    conversations,
    courses,
    graphs,
    health,
    progress,
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
api_router.include_router(courses.router)
api_router.include_router(companion.router)
api_router.include_router(graphs.router)
api_router.include_router(progress.router)
api_router.include_router(question_sets.router)
api_router.include_router(qbank_admin.router)

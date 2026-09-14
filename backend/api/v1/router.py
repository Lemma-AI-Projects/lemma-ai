from fastapi import APIRouter

from api.v1 import (
    calendar,
    chat,
    companion,
    conversations,
    courses,
    credits,
    free_courses,
    graphs,
    health,
    lti,
    overview,
    pages,
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
api_router.include_router(free_courses.router)
api_router.include_router(pages.router)
api_router.include_router(companion.router)
api_router.include_router(overview.router)
api_router.include_router(graphs.router)
api_router.include_router(lti.router)
api_router.include_router(credits.router)
api_router.include_router(payments.router)
api_router.include_router(webhooks.router)
api_router.include_router(calendar.router)

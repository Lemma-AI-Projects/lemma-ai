"""SQLAlchemy ORM models: the single source of truth for table structure."""

from models.ai_conversation import AiConversation, AiMessage
from models.ai_usage_log import AiUsageLog
from models.calendar import CalendarConnection, SyncedEvent
from models.chapter_gemini_file import ChapterGeminiFile
from models.chapter_overview import ChapterOverview
from models.chapter_video_asset import ChapterVideoAsset
from models.course import Course, CourseChapter, CourseUnit
from models.course_candidate import ChapterVideoCandidate
from models.course_search_candidate import CourseSearchCandidate
from models.desmos_graph import DesmosGraph
from models.doc import Block, Page
from models.free_course import CourseLessonObject, CourseLessonObservation
from models.free_course_session import FreeCourseSession
from models.knowledge import KnowledgeEdge, KnowledgeEvidence, KnowledgeItem
from models.payment import CreditLedger, Payment, PaymentWebhookEvent
from models.profile import Profile
from models.roster import (
    ClassGroup,
    Enrollment,
    ExternalIdentity,
    Organization,
    RosterIntegration,
    RosterSyncRun,
)
from models.project import Project
from models.provider_usage_log import ProviderUsageLog

__all__ = [
    "AiConversation",
    "AiMessage",
    "AiUsageLog",
    "Block",
    "CalendarConnection",
    "SyncedEvent",
    "ChapterGeminiFile",
    "ChapterOverview",
    "ChapterVideoAsset",
    "ChapterVideoCandidate",
    "Course",
    "CourseChapter",
    "CourseLessonObject",
    "CourseLessonObservation",
    "FreeCourseSession",
    "CourseSearchCandidate",
    "CourseUnit",
    "DesmosGraph",
    "KnowledgeEdge",
    "KnowledgeEvidence",
    "KnowledgeItem",
    "CreditLedger",
    "Payment",
    "PaymentWebhookEvent",
    "ClassGroup",
    "Enrollment",
    "ExternalIdentity",
    "Organization",
    "Page",
    "Profile",
    "RosterIntegration",
    "RosterSyncRun",
    "Project",
    "ProviderUsageLog",
]

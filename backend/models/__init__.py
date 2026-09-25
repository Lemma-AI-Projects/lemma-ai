"""SQLAlchemy ORM models: the single source of truth for table structure."""

from models.ai_conversation import AiConversation, AiMessage
from models.ai_usage_log import AiUsageLog
from models.coordinator_decision import CoordinatorDecision
from models.course import Course, CourseLesson, CourseModule, CoursePoint
from models.course_point_progress import CoursePointProgress
from models.course_search_candidate import CourseSearchCandidate
from models.desmos_graph import DesmosGraph
from models.doc import Block, Page
from models.free_course import (
    CourseChapter,
    CourseLessonObject,
    CourseLessonObservation,
    CourseUnit,
)
from models.free_course_session import FreeCourseSession
from models.knowledge import KnowledgeEdge, KnowledgeEvidence, KnowledgeItem
from models.notification import Notification
from models.payment import CreditLedger, Payment, PaymentWebhookEvent
from models.point_gemini_file import PointGeminiFile
from models.point_video_asset import PointVideoAsset
from models.point_video_candidate import PointVideoCandidate
from models.profile import Profile
from models.project import Project
from models.provider_usage_log import ProviderUsageLog
from models.qbank_usage_log import QbankUsageLog
from models.question import Question, QuestionVersion
from models.question_attempt import QuestionAttempt, QuestionSetAttempt
from models.question_set import QuestionSet, QuestionSetItem
from models.scheduled_task import ScheduledTask
from models.space_memory import SpaceMemory
from models.xkw_catalog_cache import XkwCatalogCache

__all__ = [
    "AiConversation",
    "AiMessage",
    "AiUsageLog",
    "Block",
    "CoordinatorDecision",
    "Course",
    "CourseChapter",
    "CourseLessonObject",
    "CourseLessonObservation",
    "CourseUnit",
    "FreeCourseSession",
    "CourseLesson",
    "CourseModule",
    "CoursePoint",
    "CoursePointProgress",
    "CourseSearchCandidate",
    "CreditLedger",
    "DesmosGraph",
    "KnowledgeEdge",
    "KnowledgeEvidence",
    "KnowledgeItem",
    "Notification",
    "Page",
    "Payment",
    "PaymentWebhookEvent",
    "PointGeminiFile",
    "PointVideoAsset",
    "PointVideoCandidate",
    "Profile",
    "Project",
    "ProviderUsageLog",
    "QbankUsageLog",
    "Question",
    "QuestionAttempt",
    "QuestionSet",
    "QuestionSetAttempt",
    "QuestionSetItem",
    "QuestionVersion",
    "ScheduledTask",
    "SpaceMemory",
    "XkwCatalogCache",
]

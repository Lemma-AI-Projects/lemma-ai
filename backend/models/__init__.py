"""SQLAlchemy ORM models: the single source of truth for table structure."""

from models.ai_conversation import AiConversation, AiMessage
from models.ai_usage_log import AiUsageLog
from models.course import Course
from models.course_knowledge import CourseKnowledgeEdge, CourseKnowledgePoint
from models.course_schedule_plan import CourseSchedulePlan
from models.course_syllabus import CourseChapter, CourseLesson, CourseUnit
from models.desmos_graph import DesmosGraph
from models.profile import Profile
from models.project import Project
from models.qbank_usage_log import QbankUsageLog
from models.question import Question, QuestionVersion
from models.question_attempt import QuestionAttempt, QuestionSetAttempt
from models.question_set import QuestionSet, QuestionSetItem
from models.schedule_overdue_record import ScheduleOverdueRecord
from models.schedule_task import ScheduleTask
from models.xkw_catalog_cache import XkwCatalogCache

__all__ = [
    "AiConversation",
    "AiMessage",
    "AiUsageLog",
    "Course",
    "CourseChapter",
    "CourseKnowledgeEdge",
    "CourseKnowledgePoint",
    "CourseLesson",
    "CourseSchedulePlan",
    "CourseUnit",
    "DesmosGraph",
    "Profile",
    "Project",
    "QbankUsageLog",
    "Question",
    "QuestionAttempt",
    "QuestionSet",
    "QuestionSetAttempt",
    "QuestionSetItem",
    "QuestionVersion",
    "ScheduleOverdueRecord",
    "ScheduleTask",
    "XkwCatalogCache",
]

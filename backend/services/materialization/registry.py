"""Registered chapter content steps (注册位，仿 ai/tools).

Order matters only for reporting; steps are independent given the ready video. Add
a step (quiz / assignment / unit overview) by appending it here + writing its
ChapterContentStep — the chord骨架 is untouched.
"""

from services.materialization.overview_step import OverviewStep
from services.materialization.types import ChapterContentStep

CONTENT_STEPS: list[ChapterContentStep] = [OverviewStep()]

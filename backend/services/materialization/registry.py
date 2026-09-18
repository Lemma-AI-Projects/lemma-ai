"""Registered point content steps (注册位，仿 ai/tools).

Empty by design: a learning point is `ready` as soon as its video is playable.
The chapter overview used to be a step and was retired with the four-level
restructure; quiz / practice generation is not built yet.

Add a step by appending it here + writing its PointContentStep — the chord
骨架 is untouched. Order matters only for reporting; steps are independent
given the ready video.
"""

from services.materialization.types import PointContentStep

CONTENT_STEPS: list[PointContentStep] = []

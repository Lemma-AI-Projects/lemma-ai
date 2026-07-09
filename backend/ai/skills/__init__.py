"""Agent Skills minimal runtime: on-demand thick specs for tools (渐进披露).

Public surface: the registry accessors. The activation TOOL (load_skill) is
declared in ai/tools/declarations.py like every other tool; services provide
its handler. This package only owns discovery, parsing and validation.
"""

from ai.skills.registry import (
    Skill,
    catalog,
    skill_body,
    skill_names,
    validate_skills,
)

__all__ = [
    "Skill",
    "catalog",
    "skill_body",
    "skill_names",
    "validate_skills",
]

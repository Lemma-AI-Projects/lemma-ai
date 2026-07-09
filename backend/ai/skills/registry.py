"""Skill discovery and loading (Agent Skills open format, minimal runtime).

Skills live as ``ai/skills/<skill-name>/SKILL.md`` — YAML frontmatter
(name/description) + a Markdown body carrying the thick spec. This registry is
the project's whole "skills runtime" (仿 prompts/registry.py):

- discovery/parsing at import time, cached (skills ship with the code, so a
  process restart is the only way they change — same as prompt templates);
- ``catalog()`` feeds the Level-1 progressive disclosure (name+description,
  embedded in the load_skill tool description — never the full body);
- ``skill_body(name)`` is Level-2: the full spec, loaded only when the model
  activates the skill for the current turn;
- ``validate_skills()`` runs from init_ai_runtime() so a malformed skill fails
  the process at startup, not mid-conversation (same fail-fast discipline as
  validate_routes).

Frontmatter parsing is deliberately hand-rolled (first-colon split, one line
per field): our skills are authored in-repo with two known string fields, so a
YAML dependency would be dead weight. The FILE FORMAT still follows the open
spec — portability is about the file, not the parser.
"""

import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from ai.errors import AIConfigError

_SKILLS_DIR = Path(__file__).parent

# Open-spec name constraints: 1-64 chars, lowercase alphanumerics + hyphens,
# no leading/trailing/consecutive hyphens.
_NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
_NAME_MAX = 64
_DESCRIPTION_MAX = 1024
# Spec recommendation: keep the activated body under ~5000 tokens. Enforced as
# a character budget (~4 chars/token 中英混排偏保守) so a runaway skill fails
# at startup instead of silently bloating every drawing turn.
_BODY_MAX_CHARS = 20_000


@dataclass(frozen=True)
class Skill:
    name: str
    description: str
    body: str


def _parse_skill_md(path: Path) -> Skill:
    """Parse one SKILL.md: ``---`` frontmatter block, then the Markdown body.

    Frontmatter values are single-line strings by in-repo convention; the
    split is on the FIRST colon so descriptions may contain colons freely.
    """
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        raise AIConfigError(f"{path}: missing frontmatter opening '---'")
    try:
        _, frontmatter, body = text.split("---", 2)
    except ValueError as exc:
        raise AIConfigError(f"{path}: malformed frontmatter delimiters") from exc

    fields: dict[str, str] = {}
    for line in frontmatter.strip().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, sep, value = line.partition(":")
        if not sep:
            raise AIConfigError(f"{path}: frontmatter line without colon: {line!r}")
        fields[key.strip()] = value.strip()

    name = fields.get("name", "")
    description = fields.get("description", "")
    if not name or not description:
        raise AIConfigError(f"{path}: frontmatter requires 'name' and 'description'")
    if len(name) > _NAME_MAX or not _NAME_RE.match(name):
        raise AIConfigError(f"{path}: invalid skill name {name!r}")
    if name != path.parent.name:
        raise AIConfigError(
            f"{path}: name {name!r} must match directory {path.parent.name!r}"
        )
    if len(description) > _DESCRIPTION_MAX:
        raise AIConfigError(f"{path}: description exceeds {_DESCRIPTION_MAX} chars")
    body = body.strip()
    if not body:
        raise AIConfigError(f"{path}: skill body is empty")
    if len(body) > _BODY_MAX_CHARS:
        raise AIConfigError(
            f"{path}: body exceeds {_BODY_MAX_CHARS} chars (split into references/)"
        )
    return Skill(name=name, description=description, body=body)


@lru_cache(maxsize=1)
def _load_all() -> dict[str, Skill]:
    skills: dict[str, Skill] = {}
    for skill_file in sorted(_SKILLS_DIR.glob("*/SKILL.md")):
        skill = _parse_skill_md(skill_file)
        skills[skill.name] = skill
    return skills


def catalog() -> list[Skill]:
    """All discovered skills (Level 1: name + description live in the
    load_skill tool description; bodies stay on disk until activated)."""
    return list(_load_all().values())


def skill_names() -> list[str]:
    return list(_load_all())


def skill_body(name: str) -> str:
    """Level 2: the full SKILL.md body for one activated skill."""
    skill = _load_all().get(name)
    if skill is None:
        raise KeyError(f"unknown skill '{name}'")
    return skill.body


def validate_skills() -> None:
    """Startup gate (init_ai_runtime): parse every skill, fail fast on a bad one."""
    _load_all()

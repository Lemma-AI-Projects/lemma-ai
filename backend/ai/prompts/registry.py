"""Prompt loading and variable filling.

Prompt text lives only in ai/prompts/templates/ (rules 第八章: no hardcoded
prompts in business code). Templates use $placeholders; unknown placeholders
are left untouched so adding a variable never breaks existing templates.
"""

from functools import lru_cache
from pathlib import Path
from string import Template

from ai.errors import AIConfigError
from ai.types import AIUseCase

_TEMPLATES_DIR = Path(__file__).parent / "templates"


@lru_cache(maxsize=None)
def _load(name: str) -> Template:
    path = _TEMPLATES_DIR / f"{name}.system.txt"
    if not path.is_file():
        raise AIConfigError(f"prompt template not found: {path.name}")
    return Template(path.read_text(encoding="utf-8").strip())


def render_system_prompt(
    use_case: AIUseCase, variables: dict[str, str] | None = None
) -> str:
    return _load(use_case.value).safe_substitute(variables or {})

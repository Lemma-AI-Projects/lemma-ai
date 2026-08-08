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

# Per-template default variables. `safe_substitute` keeps placeholders that are
# MISSING from the variables dict as literal text, so any $var a template
# renders MUST either be provided by every caller or have a default here —
# otherwise the literal placeholder leaks into the model prompt.
_DEFAULT_VARS: dict[str, dict[str, str]] = {
    # C1 persona block (learn space bound agent). Injected by chat_service for
    # conversations inside a project; empty by default so unfiled / course
    # conversations keep the plain Lemma persona.
    AIUseCase.TEXT_CHAT.value: {"agent_persona": ""},
}


@lru_cache(maxsize=None)
def _load(name: str) -> Template:
    path = _TEMPLATES_DIR / f"{name}.system.txt"
    if not path.is_file():
        raise AIConfigError(f"prompt template not found: {path.name}")
    return Template(path.read_text(encoding="utf-8").strip())


def render_system_prompt(
    use_case: AIUseCase, variables: dict[str, str] | None = None
) -> str:
    merged = dict(_DEFAULT_VARS.get(use_case.value, {}))
    merged.update(variables or {})
    return _load(use_case.value).safe_substitute(merged)

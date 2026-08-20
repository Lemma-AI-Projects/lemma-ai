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
    #
    # learner_memory (L1 S3): learner 状态注入块（<memory-context>）。由
    # chat_service 在 learn space 对话 + lemma_hermes 门控开时注入；默认空 =>
    # 模板里的 Memory guidance 不激活，行为与注入前完全一致。
    AIUseCase.TEXT_CHAT.value: {
        "agent_persona": "",
        "learner_memory": "",
    },
    # L1 主线闭环（2026-08-20）：course companion 注入 learner 记忆。默认空 =>
    # 模板里 $learner_memory 不激活，行为与注入前一致；缺此默认 vars 会让
    # 字面量 $learner_memory 泄漏进 prompt（safe_substitute 保留缺省占位符）。
    AIUseCase.COURSE_COMPANION.value: {
        "learner_memory": "",
    },
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

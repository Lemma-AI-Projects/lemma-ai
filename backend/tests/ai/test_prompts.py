"""Prompt 契约：新加的三段准则不能被无声删掉。

⚠️ 这不是"测 prompt 好不好"—— 那测不了。它只钉三件事：

1. 模板还能渲染（占位符没坏、`$method_block` / `$space_context` 的注入位还在）；
2. 2026-10-20 加的三段（Initiative / Evidence boundaries / Acting on the environment）还在；
3. 原有的 Tool discipline 没被覆盖掉。

为什么值得有：prompt 是纯文本，删掉一段不会有任何类型错误，也不会让别的测试变红。
没有这条，将来谁"精简一下提示词"都能静默地把这些约束去掉。
"""

from ai.prompts.registry import render_system_prompt
from ai.types import AIUseCase


def _text_with(**variables: str) -> str:
    return render_system_prompt(AIUseCase.TEXT_CHAT, variables)


def test_renders_with_injected_blocks() -> None:
    text = _text_with(method_block="METHOD_SENTINEL", space_context="SPACE_SENTINEL")
    assert "METHOD_SENTINEL" in text
    assert "SPACE_SENTINEL" in text


def test_unknown_placeholders_survive_instead_of_crashing() -> None:
    """`safe_substitute`：没给变量时原样保留。加变量不该让老调用方炸。"""
    text = _text_with()
    assert "$method_block" in text
    assert "$space_context" in text


def test_keeps_the_three_sections_added_for_initiative() -> None:
    text = _text_with()
    assert "Initiative" in text
    assert "Evidence boundaries" in text
    assert "Acting on the environment" in text


def test_keeps_tool_discipline() -> None:
    """第三段是"有工具时去做"，这一段是"没做就别说做了"。两者缺一不可。"""
    text = _text_with()
    assert "Tool discipline" in text
    assert "Never claim you created or changed" in text


def test_forbids_handing_the_decision_back() -> None:
    """A 原则最容易被模型违反的那一句：反问"你想学什么"。"""
    text = _text_with()
    assert "what would you like to study" in text

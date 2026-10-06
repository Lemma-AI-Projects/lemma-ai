"""The board lesson has to know what the learner asked for.

A learner answers four tuning questions before the content is generated. Two of
those answers — **pace** and **depth** — describe how they want to be taught, and
they used to reach only the blueprint and content steps. The board lesson, which
is a *different rendering of the same lesson*, ignored them entirely: pick
"紧凑" and you got a compact document followed by a board that took its time.

These tests are about the seam between two vocabularies, which is the part that
breaks silently. `_PACE_NOTES` / `_DEPTH_NOTES` here are a **copy** of the
questionnaire's option values. A copy is only safe while something checks it, so
the first test walks the real questionnaire and asserts every option is
recognised. Rename an option and that test fails on the same run, instead of the
learner's choice being dropped with no error anywhere — which is precisely the
bug being fixed here.
"""

from __future__ import annotations

import pytest

from ai.free_course.teaching import planner
from ai.free_course.teaching.planner import _tuning_note


def _questionnaire_options() -> dict[str, set[str]]:
    """{tuning key: the option values the questionnaire actually offers}.

    Read from the live question set rather than restated, so this test fails
    when the questionnaire changes and nobody updates the notes.
    """
    from services.free_course_events import _QUESTION_SET

    return {
        question.key: {option.value for option in question.options}
        for question in _QUESTION_SET
    }


def test_the_board_lesson_knows_every_tuning_answer():
    """⚠️ 问卷的每个选项都必须被认得 —— 这条测试就是那份拷贝的护栏。

    Without it, renaming an option would produce **no note and no error**: the
    learner's answer would be dropped exactly as silently as it was before this
    change, and the failure would look like "the tuning does nothing" rather than
    like a mismatch between two lists.
    """
    options = _questionnaire_options()
    unknown: dict[str, set[str]] = {}

    for key in ("pace", "depth"):
        known = set(planner._PACE_NOTES if key == "pace" else planner._DEPTH_NOTES)
        missing = options[key] - known
        if missing:
            unknown[key] = missing

    assert not unknown, (
        f"问卷改了取值而白板课不认得（= 学习者的选择会被静默丢掉）：{unknown}"
    )


def test_a_tuned_course_puts_the_learners_own_words_in_the_prompt():
    note = _tuning_note("intensive", "derivation")
    assert "紧凑" in note
    assert "推导细节" in note
    # It has to read as an instruction, not as data — otherwise the model
    # treats it as context to consider rather than a choice to honour.
    assert "照做" in note
    assert note.endswith("\n"), "必须是独立一行，不能粘在上一行后面"


@pytest.mark.parametrize(
    ("pace", "depth", "expected"),
    [
        ("relaxed", None, "宽松"),
        (None, "intuition", "直觉理解"),
        ("moderate", "advanced", "适中"),
    ],
)
def test_one_answer_alone_still_produces_a_note(pace, depth, expected):
    """只答一题也要生效 —— 问卷允许跳过（`skip: true`），四维都可能是 None。"""
    assert expected in _tuning_note(pace, depth)


def test_an_untuned_course_gets_no_note_at_all():
    """没有 tuning 的课程必须让 prompt 的形状与「有学习者信息时」一致。

    `learner_state.py` states the same rule for the same reason: a dangling
    "节奏：" teaches the model that a field exists and may be empty.
    """
    assert _tuning_note(None, None) == ""
    assert _tuning_note("", "") == ""


def test_an_unrecognised_value_is_dropped_rather_than_guessed():
    """未知的取值不猜 —— 但这条正是上面那条护栏存在的原因。

    A value from an older build must not become a confident instruction the model
    will try to follow; it simply is not taught this session.
    """
    assert _tuning_note("quick_pace", "intuitive") == ""

"""Direct Explanation Method: say it clearly, with one concrete example.

The mirror image of Socratic on every axis that matters — it gives the answer,
it does not stop to wait, and it owes no learner action. It exists so that
"the difference comes from the Method, not from different input" is a claim the
test suite can actually check, and it is the default because it is what this
product did before Methods existed.

The four elements are declared, not implied:

| 要素 | 值 |
|---|---|
| 1 适用条件 | **不**要学习者动手（`needs_learner_action=False`）—— 这一轮是 AI 做功 |
| 2 要他做的动作 | 读一遍 / 照着再做一道 / 换个例子讲（按 `purpose` 三选一） |
| 3 我不做的事 | **不用提问代替讲解**（讲清楚是本轮的任务，不是先问一句） |
| 4 观察什么 | 一条 `verified`（tier A）记录，**要求无帮助** |
| 5 什么算完成 | 连续 N 次独立做对（按 `purpose`） |
"""

from ai.methods.types import (
    DEFAULT_PURPOSE_KEY,
    AppliesWhen,
    CompletionRule,
    EvidenceTarget,
    MethodDirective,
    MethodInput,
    Restraint,
    completion_lines,
    goal_relation,
    purpose_key,
    select_focus,
)

#: 要素 3。The restraint here is the mirror of Socratic's: it does not withhold
#: the answer. It still refuses one thing — replacing the explanation with a
#: question, which is the failure mode of a model that over-applies Socratic.
RESTRAINT = Restraint(
    asks_question=False,
    max_questions=0,
    withholds_answer=False,
    requires_example=True,
    stops_for_learner=False,
)

#: 要素 1。No learner action is owed, which is exactly what makes it the right
#: default for a space with no structure and no stated goal: asking a learner to
#: act when we cannot say what acting would look like would be theatre.
APPLIES_WHEN = AppliesWhen(needs_learner_action=False, without_structure="fallback")

LearnerFacing = tuple[str, str, str, CompletionRule]
_LEARNER_FACING: dict[str, LearnerFacing] = {
    DEFAULT_PURPOSE_KEY: (
        "我把这一步讲清楚",
        "读一遍，再复述一遍",
        "你能复述一遍，就算过",
        CompletionRule(kind="judged_observation"),
    ),
    "exam_performance": (
        "我按考试的样子讲",
        "读完照着再做一道",
        "你自己做对一道，就算过",
        # 一道，不是两道。这一轮他确实是被讲懂的，判据必须承认这件事 ——
        # 否则它就是在夸一个没发生的动作。
        CompletionRule(kind="consecutive_correct", n=1),
    ),
    "understanding": (
        "我把道理讲清楚",
        "读完换个例子讲",
        "换个例子也讲得清，就算过",
        # 复述不是使用：换个例子讲得清，才是这一轮声称的东西。
        CompletionRule(kind="judged_observation"),
    ),
    "build_something": (
        "我只讲能用上的",
        "用在你手上的东西里",
        "用进去了，就算过",
        CompletionRule(kind="judged_observation"),
    ),
}


class DirectExplanationMethod:
    name = "direct_explanation"
    display_name = "Direct Explanation"
    description = "直接讲清楚：定义、直觉、一个具体例子；不反问，不布置思考题。"

    applies_when = APPLIES_WHEN
    restraint = RESTRAINT

    def execute(self, context: MethodInput) -> MethodDirective:
        focus = select_focus(context)
        purpose = purpose_key(context.goal)
        system_move, learner_move, completion, rule = _LEARNER_FACING[purpose]
        return MethodDirective(
            name=self.name,
            display_name=self.display_name,
            focus=focus,
            discipline=_discipline(context, focus, completion, rule),
            system_move=system_move,
            learner_move=learner_move,
            completion=completion,
            applies_when=self.applies_when,
            restraint=self.restraint,
            # 要素 4：讲解之后那道题是有确定对照的（算得出、核得过），
            # 所以是 tier A —— 一条就能定案。
            evidence_target=EvidenceTarget(item_hint=focus, tier="A"),
            completion_rule=rule,
            goal_relation=goal_relation(context.goal),
        )


def _discipline(
    context: MethodInput, focus: str | None, completion: str, rule: CompletionRule
) -> str:
    """The rules for this turn.

    The "where to start" rule is the one that reads Learner State: on a space
    with a structure, repeating what he already has wastes the turn, so the
    explanation starts one layer up. With no structure there is nothing to skip,
    and the honest instruction is to assume nothing.
    """
    lines = [
        "## 本轮教学方法：Direct Explanation（直接讲解）",
        "",
        "他缺的是基础知识，所以这一轮**直接把概念讲清楚**。以下纪律优先于上面所有通用指南：",
        "",
        "1. **不要用提问代替讲解。** 不要反问他“你觉得呢”，也不要先问一个问题再讲。"
        "这一轮的任务就是把话说明白。",
        "2. 按这个顺序给三样东西，缺一不可：",
        "   - **定义**：一句话说清它是什么（公式照写）；",
        "   - **直觉**：它为什么这样定义、在解决什么问题（一句大白话或一个类比）；",
        "   - **一个具体例子**：带真实数字、算到底。不要“例如某个向量”这种空例子。",
        "3. 篇幅三到五段，不要写成教科书，也不要列一堆分支情况。",
    ]
    if context.has_knowledge_structure:
        lines.append(
            "4. 他已经具备的知识不用复述（「学习状态」里「已经具备」那几项）——"
            "从他还不具备的那一层讲起。"
        )
    else:
        lines.append(
            "4. **这个空间还没有知识结构**，所以不要假设他会什么：按零基础讲，"
            "需要用到前置概念时用一句话补齐。"
        )
    lines += [
        "5. 结尾不要反问、不要布置思考题、不要说“你可以想一想……”。",
    ]
    if focus:
        lines += [
            "",
            f"本轮要讲的知识点：**{focus}**。"
            "（如果他问的是别的，就讲他问的那个。）",
        ]
    lines += completion_lines(context, completion, rule)
    return "\n".join(lines)

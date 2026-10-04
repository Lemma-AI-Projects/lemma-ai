"""Socratic Method: do not hand over the answer — walk him to it, one step.

This is a *behaviour*, not a tone. The observable difference from Direct
Explanation is that this turn ends in a question and nothing else: no definition,
no worked example, no "the answer is". Everything the discipline below says
exists to make that survive contact with a model that would very much like to
help by explaining.

The four elements are declared, not implied:

| 要素 | 值 |
|---|---|
| 1 适用条件 | 要学习者动手（`needs_learner_action=True`）；没有知识结构时走诚实的弱化规则 |
| 2 要他做的动作 | 走一遍 / 写下前两步 / 讲出理解（按 `purpose` 三选一） |
| 3 我不做的事 | **不给结论 · 只问一个问题 · 问完就停** |
| 4 观察什么 | 一条 `judged`（tier B）记录，且**必须是无帮助的** |
| 5 什么算完成 | 连续 N 次独立做对 / 一次讲得出反例（按 `purpose`） |
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

#: 要素 3。**This is the method.** Everything else about it is bookkeeping: a
#: system that does not withhold the answer is not Socratic, however it phrases
#: itself. Declared as data so `Behaviour` is derived from it rather than
#: hand-written beside it.
RESTRAINT = Restraint(
    asks_question=True,
    max_questions=1,
    withholds_answer=True,
    requires_example=False,
    stops_for_learner=True,
)

#: 要素 1。Applies wherever the learner is expected to act. On a space with no
#: knowledge structure it still runs, with a weaker rule (the question is drawn
#: from his own wording) — refusing would be worse than asking, because the
#: alternative is the default method explaining, which is what he did not ask
#: for either.
APPLIES_WHEN = AppliesWhen(needs_learner_action=True, without_structure="fallback")

#: 要素 4 + 要素 5，按目标分四套。
#:
#: 面向学习者的三格 —— **(在做什么, 要你做什么, 什么算完成)**。
#:
#: 「在做什么」不随目标变：这个方法就是不给你答案。变的是**要你做什么**和
#: **什么算完成** —— 而后者是这一层存在的理由：同一个知识点，"你自己做对两道"
#: 与"你说得出为什么、举得出反例"不是同一个标准，而它们分别对应考试与理解。
#:
#: `rule` 是判据的机器形态，与 `completion` 是同一个承诺的两种说法。
LearnerFacing = tuple[str, str, str, CompletionRule]
_LEARNER_FACING: dict[str, LearnerFacing] = {
    DEFAULT_PURPOSE_KEY: (
        "先请你自己走一遍",
        "把下一步写给我",
        "你自己走完，就算过",
        CompletionRule(kind="judged_observation"),
    ),
    "exam_performance": (
        "先请你自己走一遍",
        "先别翻资料，写给我",
        "你自己做对两道，就算过",
        # 两条独立做对。`require_independent=True` 意味着带着提示做对的那条
        # 会被记成 INERT —— 它写进库，但不计入这两条。
        CompletionRule(kind="consecutive_correct", n=2),
    ),
    "understanding": (
        "先请你讲出理解",
        "把为什么写给我",
        "说得出为什么、举得出反例",
        # 一次 judged 记录，但要求两件事同时成立：讲得出 + 举得出反例。
        # 自评式的理解无法证伪，能给出边界条件才是。
        CompletionRule(kind="judged_observation"),
    ),
    "build_something": (
        "先请你用它做一步",
        "用在你手上的东西里",
        "真的用进去了，就算过",
        CompletionRule(kind="judged_observation"),
    ),
}


class SocraticMethod:
    name = "socratic"
    display_name = "Socratic Method"
    description = "不直接给答案，一次只问一个能回答的问题，带着学习者自己走到理解。"

    # 要素 1 与 3 的**不变部分**。Varying parts ride on the directive.
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
            # 要素 4：问出来的答案是开放的，只能按要点判（tier B），
            # 且**要求无帮助** —— 提示过的那次成功正是这个方法要撤掉的东西。
            evidence_target=EvidenceTarget(item_hint=focus, tier="B"),
            completion_rule=rule,
            goal_relation=goal_relation(context.goal),
        )


def _discipline(
    context: MethodInput, focus: str | None, completion: str, rule: CompletionRule
) -> str:
    """The rules for this turn.

    Built rather than fixed because one rule changes with the space: "the
    question must be answerable from what he already has" is meaningful only
    where the system actually knows what he has. On a space with no knowledge
    structure it would be an instruction pointing at nothing, so it is replaced
    by the honest fallback — read his own wording.
    """
    lines = [
        "## 本轮教学方法：Socratic（追问式）",
        "",
        "这一轮你**不是在讲答案**，而是带他自己走一步。以下纪律优先于上面所有通用指南：",
        "",
        "1. **不给结论。** 不写定义、不做完整推导、不给例子、不说“答案是……”。"
        "这一轮你的产出就是**一个问题**。",
        "2. **只推进一个认知步骤，只问一个问题。** 不要在一轮里连问两三个问题，"
        "也不要在问题后面附上提示或半个答案。问完就停下等他回答——这一轮到此结束。",
        "3. **问题要小到他一句话能答。** 针对他卡住的那一步问，不要问“你对这个概念了解多少”"
        "这种泛问题。",
    ]
    if context.has_knowledge_structure:
        lines.append(
            "4. **问题必须能从他已经具备的知识推出来**（下面的「学习状态」写了哪些已经具备）。"
            "他还没具备的东西不要拿来当前提；如果缺得太多，就先问那一步。"
        )
    else:
        lines.append(
            "4. **这个空间还没有知识结构**，所以只能从他的问法里判断他已经会什么："
            "他说出口的东西算他会，他没提的就当作不确定，问题要落在两者之间。"
        )
    lines += [
        "5. 如果他说“我不知道”或不愿回答，就把台阶再降一级：给一个只差一步的小提示，"
        "**然后仍然只问一个问题**。",
        "6. 不要复述他的问题、不要寒暄、不要预告“接下来我们会讲…”。",
    ]
    if focus:
        lines += [
            "",
            f"本轮要衔接的知识点：**{focus}**。"
            "（如果他问的不是这个，就按他问的那一步来——但仍然是只问一个问题。）",
        ]
    lines += completion_lines(context, completion, rule)
    return "\n".join(lines)

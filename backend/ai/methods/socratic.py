"""Socratic Method: do not hand over the answer — walk him to it, one step.

This is a *behaviour*, not a tone. The observable difference from Direct
Explanation is that this turn ends in a question and nothing else: no definition,
no worked example, no "the answer is". Everything the discipline below says
exists to make that survive contact with a model that would very much like to
help by explaining.
"""

from ai.methods.types import Behaviour, MethodDirective, MethodInput, select_focus


class SocraticMethod:
    name = "socratic"
    display_name = "Socratic Method"
    description = "不直接给答案，一次只问一个能回答的问题，带着学习者自己走到理解。"

    def execute(self, context: MethodInput) -> MethodDirective:
        focus = select_focus(context)
        return MethodDirective(
            name=self.name,
            display_name=self.display_name,
            focus=focus,
            discipline=_discipline(context, focus),
            behaviour=Behaviour(
                expects_question=True,
                max_questions=1,
                forbids_full_answer=True,
                requires_example=False,
                awaits_learner=True,
            ),
        )


def _discipline(context: MethodInput, focus: str | None) -> str:
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
    return "\n".join(lines)

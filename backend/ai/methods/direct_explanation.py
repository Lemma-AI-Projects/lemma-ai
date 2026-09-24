"""Direct Explanation: when the learner lacks the basics, explain them.

The control group for Socratic, and deliberately the plainer of the two: give the
definition, the intuition and one worked example, in that order, and do not turn
the answer back into a question. It exists so that "the difference comes from the
Method" can be demonstrated against the same input and the same state.
"""

from ai.methods.types import Behaviour, MethodDirective, MethodInput, select_focus


class DirectExplanationMethod:
    name = "direct_explanation"
    display_name = "Direct Explanation"
    description = "直接讲清楚：定义、直觉、一个具体例子；不反问，不布置思考题。"

    def execute(self, context: MethodInput) -> MethodDirective:
        focus = select_focus(context)
        return MethodDirective(
            name=self.name,
            display_name=self.display_name,
            focus=focus,
            discipline=_discipline(context, focus),
            behaviour=Behaviour(
                expects_question=False,
                max_questions=0,
                forbids_full_answer=False,
                requires_example=True,
                awaits_learner=False,
            ),
        )


def _discipline(context: MethodInput, focus: str | None) -> str:
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
    return "\n".join(lines)

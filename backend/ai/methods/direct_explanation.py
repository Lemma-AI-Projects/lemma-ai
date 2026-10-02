"""Direct Explanation: when the learner lacks the basics, explain them.

The control group for Socratic, and deliberately the plainer of the two: give the
definition, the intuition and one worked example, in that order, and do not turn
the answer back into a question. It exists so that "the difference comes from the
Method" can be demonstrated against the same input and the same state.
"""

from ai.methods.types import (
    DEFAULT_PURPOSE_KEY,
    Behaviour,
    MethodDirective,
    MethodInput,
    completion_lines,
    goal_relation,
    purpose_key,
    select_focus,
)

#: 面向学习者的三格 —— **(在做什么, 要你做什么, 什么算完成)**，按目标分四套。
#:
#: 与 Socratic 同一张表的四行，但每一行都不同：讲清楚之后"什么算完成"是
#: **他自己能再做一遍**，而不是"他自己走完了"—— 因为这一轮他确实是被讲懂的，
#: 判据必须承认这一点，否则它就是在夸一个没发生的动作。
_LEARNER_FACING: dict[str, tuple[str, str, str]] = {
    DEFAULT_PURPOSE_KEY: (
        "我把这一步讲清楚",
        "读一遍，再复述一遍",
        "你能复述一遍，就算过",
    ),
    "exam_performance": (
        "我按考试的样子讲",
        "读完照着再做一道",
        "你自己做对一道，就算过",
    ),
    "understanding": (
        "我把道理讲清楚",
        "读完换个例子讲",
        "换个例子也讲得清，就算过",
    ),
    "build_something": (
        "我只讲能用上的",
        "用在你手上的东西里",
        "用进去了，就算过",
    ),
}


class DirectExplanationMethod:
    name = "direct_explanation"
    display_name = "Direct Explanation"
    description = "直接讲清楚：定义、直觉、一个具体例子；不反问，不布置思考题。"

    def execute(self, context: MethodInput) -> MethodDirective:
        focus = select_focus(context)
        system_move, learner_move, completion = _LEARNER_FACING[
            purpose_key(context.goal)
        ]
        return MethodDirective(
            name=self.name,
            display_name=self.display_name,
            focus=focus,
            discipline=_discipline(context, focus, completion),
            system_move=system_move,
            learner_move=learner_move,
            completion=completion,
            goal_relation=goal_relation(context.goal),
            behaviour=Behaviour(
                expects_question=False,
                max_questions=0,
                forbids_full_answer=False,
                requires_example=True,
                awaits_learner=False,
            ),
        )


def _discipline(context: MethodInput, focus: str | None, completion: str) -> str:
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
    lines += completion_lines(context, completion)
    return "\n".join(lines)

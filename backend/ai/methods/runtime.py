"""Running one Method, once — and nothing else.

The runtime exists to make one separation structural: **a plugin decides how to
intervene; the runtime decides nothing.** Every way a Method could acquire
autonomy is a way this module refuses to give it:

| 自治权 | 在哪一层 | 为什么不在插件 |
|---|---|---|
| 何时被启动 | Coordinator（`ai/coordinator/`） | 「现在要不要动」是政策，不是教法 |
| 换成哪个做法 | Coordinator | 同上；而且依据必须是证据，不是节奏 |
| 什么时候算结束 | Coordinator + `CompletionRule` 判定 | 做法只**声明**判据，不执行它 |
| 调模型 | 管线（`services/chat_service.py`） | 另开一条模型通道会丢掉 `remember` / `record_evidence` |
| 写数据库 | `services/evidence_entry.py` | 证据只有一个门 |
| 下一轮 | 根本不存在这个概念 | 一轮跑完就完了 |

`run_once()` therefore takes a method **by name**, looks it up itself, and
returns the directive. It is the whole runtime surface for V0: one call, no
state, nothing to shut down. The episode machinery (start → observe → one of
five exits) is R4's work and deliberately does not live here.

**It takes a name, not a class.** A caller that already holds a class could
construct any object and pass it in — including something that is not a plugin.
Going through the registry means every run is a run of something that was
discovered *and* validated at boot, which is the only place a plugin's identity
is actually established.
"""

from ai.methods import DEFAULT_METHOD, METHODS, get_method
from ai.methods.types import Method, MethodDirective, MethodInput


class UnknownMethod(ValueError):
    """A name that is not in the registry. Raised, never defaulted.

    Answering in a different teaching style than the one asked for is worse than
    failing: the caller has no way to notice. `services/method_service` has its
    own `UnknownMethod` for the request-facing path; this one exists so that the
    runtime's own contract does not depend on a service module.
    """

    def __init__(self, name: str) -> None:
        super().__init__(f"unknown method: {name}")
        self.name = name


def resolve(name: str | None) -> Method:
    """The method to run, strictly.

    `None` means "nobody chose" and gets `DEFAULT_METHOD` — that is a legitimate
    state, not a fallback for a bad name. A non-None name that is not in the
    registry raises, because a stale stored value or a typo must not silently
    teach in a different style.
    """
    if name is None:
        name = DEFAULT_METHOD
    method = get_method(name)
    if method is None:
        raise UnknownMethod(name)
    return method


def run_once(name: str | None, context: MethodInput) -> MethodDirective:
    """Run one method for one turn. No state, no decisions, no side effects.

    Deliberately three lines. Everything this function does not do is the point:
    it does not judge whether the method applies, does not compare the result
    with a previous turn, does not decide that the episode is over, and does not
    write anything. Those are Coordinator and pipeline jobs, and a runtime that
    grew them would become the autonomous layer the architecture forbids.
    """
    return resolve(name).execute(context)


def catalogue() -> list[dict[str, object]]:
    """Every installed plugin, for the picker and the Coordinator's candidate list.

    Carries the four declared elements alongside the metadata, because a caller
    choosing between methods needs to know **what each one withholds** — that is
    the difference between them, and a list of names plus display strings cannot
    express it.
    """
    return [
        {
            "name": method.name,
            "displayName": method.display_name,
            "description": method.description,
            "needsLearnerAction": method.applies_when.needs_learner_action,
            "withoutStructure": method.applies_when.without_structure,
            "withholdsAnswer": method.restraint.withholds_answer,
            "asksQuestion": method.restraint.asks_question,
            "stopsForLearner": method.restraint.stops_for_learner,
        }
        for method in METHODS.values()
    ]


__all__ = ["UnknownMethod", "catalogue", "resolve", "run_once"]

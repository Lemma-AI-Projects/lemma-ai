"""The Method registry: the one place that knows which methods exist.

Two entries, a dict, and three lookups. A plugin marketplace would need
discovery, versions, permissions and a sandbox; none of that is required to
prove "different methods → different behaviour", and building it now would be
building for the Coordinator phase that has not been designed.

`DEFAULT_METHOD` is Direct Explanation on purpose: it is what this product
already did before Methods existed (short structured explanation with one
example). Making Socratic the default would silently turn every existing
conversation into an interrogation.

**Since R1 the discovery is by directory**, and it borrows three rules verbatim
from `ai/skills/registry.py` — the only mature plugin mechanism in this repo:

  1. one directory per plugin, each exporting its class;
  2. `id` must equal the directory name, or the process fails at startup;
  3. `validate_methods()` runs from `init_ai_runtime()` so a malformed plugin
     fails the boot rather than the first learner who triggers it.

The *format* differs from skills on purpose: a skill is prose (a `SKILL.md`), a
method has to do arithmetic (four declared elements, one pure function). The
file layout is a detail; the discipline is the point.

⚠️ What a plugin may NOT do, and why the package has no way to do it: it cannot
import `ai.client`, `core.database` or anything under `services/` (checked by
`test_plugins_cannot_reach_the_model_or_the_database`), so a Method can neither
call a model nor touch persistence. It is a pure function that answers "how
should this turn intervene", and nothing else. Who starts it, when, and what
happens next belong to the Coordinator and the runtime — a plugin that could
reach them would be a small autonomous agent wearing a teaching costume.
"""

from ai.methods.direct_explanation import DirectExplanationMethod
from ai.methods.socratic import SocraticMethod
from ai.methods.types import (
    DEFAULT_PURPOSE_KEY,
    NOT_APPLICABLE,
    OWN_ROW_PURPOSES,
    PURPOSES,
    AppliesWhen,
    Behaviour,
    CompletionRule,
    EvidenceTarget,
    GoalView,
    Method,
    MethodDirective,
    MethodInput,
    Restraint,
    goal_relation,
    item_labels,
    purpose_key,
    select_focus,
)
from ai.errors import AIConfigError

#: Where plugins live, and what a directory must export. Stated once so
#: `discover()` and `validate_methods()` cannot disagree about the contract.
PLUGIN_PACKAGE = "ai.methods"
#: A class counts as a plugin if it has these three attributes — that *is* the
#: `Method` protocol, checked structurally. Looking for one fixed export name
#: instead would force every plugin to be called `Method`, which reads like the
#: protocol rather than the implementation (the two are not the same thing, and
#: conflating them is how a plugin ends up extending the interface).
PLUGIN_ATTRS = ("name", "display_name", "description", "execute")


def _plugin_class(module) -> type | None:
    """The one plugin class a directory exports, or None.

    Scans the module's own attributes rather than trusting a name, so a plugin
    is free to be called `SocraticMethod`, `RebuildMethod` or anything else.
    Two classes matching would be ambiguous — and an ambiguous plugin directory
    is exactly the kind of thing that should stop the boot.
    """
    import inspect

    found = [
        value
        for name_, value in vars(module).items()
        if not name_.startswith("_")
        and inspect.isclass(value)
        and all(hasattr(value, attr) for attr in PLUGIN_ATTRS)
    ]
    if len(found) > 1:
        raise AIConfigError(
            f"{PLUGIN_PACKAGE}/{module.__name__.rsplit('.', 1)[-1]}: exports "
            f"{len(found)} plugin classes ({', '.join(c.__name__ for c in found)}) "
            "— a method directory exports exactly one, or discovery is a guess"
        )
    return found[0] if found else None


def _discover() -> dict[str, Method]:
    """One directory per plugin. The name must be the directory's own name.

    Imported by explicit module path rather than by scanning `sys.modules`: a
    plugin that is never imported cannot fail at boot, and "fails at boot" is
    the entire reason this registry validates.
    """
    import importlib
    import pkgutil

    found: dict[str, Method] = {}
    package = importlib.import_module(PLUGIN_PACKAGE)
    for info in pkgutil.iter_modules(package.__path__):
        if not info.ispkg or info.name.startswith("_"):
            continue
        module = importlib.import_module(f"{PLUGIN_PACKAGE}.{info.name}")
        exported = _plugin_class(module)
        if exported is None:
            raise AIConfigError(
                f"{PLUGIN_PACKAGE}/{info.name}: a method directory must export one "
                f"class with {', '.join(PLUGIN_ATTRS)} — or it is not a plugin"
            )
        method = exported()
        if method.name != info.name:
            raise AIConfigError(
                f"{PLUGIN_PACKAGE}/{info.name}: declares name {method.name!r} "
                "— a method's id must equal its directory name, so that adding one "
                "is adding a directory and nothing else"
            )
        found[method.name] = method
    if not found:
        raise AIConfigError(
            f"{PLUGIN_PACKAGE}: no method plugin directories found — every method "
            "was removed, and a build with no method cannot answer a turn"
        )
    return found


METHODS: dict[str, Method] = _discover()

DEFAULT_METHOD = DirectExplanationMethod.name


def get_method(name: str | None) -> Method | None:
    """The method registered under `name`, or None when there is no such name.

    Deliberately not a fallback: an unknown name is a client bug (or a stale
    build after a method was removed), and silently answering in a different
    style than the one requested is the worst possible response to it. Callers
    that have nothing to go on pass None and get `DEFAULT_METHOD` themselves.
    """
    if name is None:
        return None
    return METHODS.get(name)


def method_names() -> list[str]:
    return list(METHODS)


def validate_methods() -> None:
    """Startup gate (`init_ai_runtime`): every plugin must declare four elements.

    A plugin missing one of them is not a smaller method — it is a method that
    cannot be checked, and a system that cannot check its own promises cannot
    learn whether they work. Failing here means a bad plugin never reaches a
    learner.
    """
    for name, method in METHODS.items():
        missing = [
            field
            for field in ("applies_when", "restraint", "description", "display_name")
            if getattr(method, field, None) is None
        ]
        if missing:
            raise AIConfigError(
                f"method {name!r} is missing declared element(s): {', '.join(missing)}"
            )
        if method.restraint.max_questions < 0:
            raise AIConfigError(
                f"method {name!r}: restraint.max_questions cannot be negative"
            )
        if method.applies_when.without_structure not in ("fallback", "hold"):
            raise AIConfigError(
                f"method {name!r}: applies_when.without_structure must be "
                "'fallback' or 'hold'"
            )


__all__ = [
    "DEFAULT_METHOD",
    "DEFAULT_PURPOSE_KEY",
    "METHODS",
    "NOT_APPLICABLE",
    "OWN_ROW_PURPOSES",
    "PURPOSES",
    "AppliesWhen",
    "Behaviour",
    "CompletionRule",
    "EvidenceTarget",
    "GoalView",
    "Method",
    "MethodDirective",
    "MethodInput",
    "Restraint",
    "get_method",
    "goal_relation",
    "item_labels",
    "method_names",
    "purpose_key",
    "select_focus",
    "validate_methods",
]

"""The Method registry: the one place that knows which methods exist.

Two entries, a dict, and three lookups. A plugin marketplace would need
discovery, versions, permissions and a sandbox; none of that is required to
prove "different methods → different behaviour", and building it now would be
building for the Coordinator phase that has not been designed.

`DEFAULT_METHOD` is Direct Explanation on purpose: it is what this product
already did before Methods existed (short structured explanation with one
example). Making Socratic the default would silently turn every existing
conversation into an interrogation.
"""

from ai.methods.direct_explanation import DirectExplanationMethod
from ai.methods.socratic import SocraticMethod
from ai.methods.types import (
    Behaviour,
    Method,
    MethodDirective,
    MethodInput,
    item_labels,
    select_focus,
)

METHODS: dict[str, Method] = {
    SocraticMethod.name: SocraticMethod(),
    DirectExplanationMethod.name: DirectExplanationMethod(),
}

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


__all__ = [
    "DEFAULT_METHOD",
    "METHODS",
    "Behaviour",
    "Method",
    "MethodDirective",
    "MethodInput",
    "get_method",
    "item_labels",
    "method_names",
    "select_focus",
]

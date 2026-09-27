"""The portability assertion — a test that is *supposed* to be able to fail.

`ai/knowledge/` claims to be a standalone instrument: copy the directory
somewhere else and it still runs its own tests. That claim is worth something
only if a violation is caught mechanically, so this module scans the package's
own source for imports that would break a copy-out.

The scan is source-based (`ast`), not `sys.modules`-based: an import that never
executes at test time — a function-local import, a `TYPE_CHECKING` block — would
still break a copy-out, and a runtime check would not see it.

Two guards protect the guard itself:

  * `test_the_scan_actually_reads_the_package` — a scan of an empty directory
    passes vacuously, so the expected modules must be present.
  * `test_the_guard_actually_catches_a_violation` — every forbidden name is fed
    in and must be reported. A guard that cannot fail is not a guard.

Copy-out procedure: `PORTABLE.md` next to the package.
"""

from __future__ import annotations

import ast
import sys
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[3] / "ai" / "knowledge"

# The named dependencies a copy-out must not have (the plan's list). The rule
# below is stronger than this list — it forbids *every* non-stdlib import — but
# these names are kept so the contract is explicit and the failure is legible.
FORBIDDEN = ("models", "services", "fastapi", "sqlalchemy", "ai.client", "core")


def _modules() -> list[Path]:
    return sorted(PACKAGE.glob("*.py"))


def _imported_modules(source: str) -> set[str]:
    """Every absolute module named by an `import` / `from ... import` here.

    Relative imports (`from .state import x`) are skipped: they are inside the
    package and cannot escape it.
    """
    names: set[str] = set()
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, ast.Import):
            names.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            names.add(node.module)
    return names


def _violations(source: str) -> list[str]:
    """Imports that would break a copy-out, sorted and de-duplicated.

    Two ways to violate, one rule each:
      * any sibling `ai.*` module — importing it runs `ai/__init__.py`, which
        pulls in the whole framework (pydantic_ai, openai, fastapi, tools);
      * anything that is not in the standard library.
    """
    out: list[str] = []
    for name in sorted(_imported_modules(source)):
        top = name.split(".")[0]
        if top == "ai":
            if not name.startswith("ai.knowledge"):
                out.append(name)
        elif top not in sys.stdlib_module_names:
            out.append(name)
    return out


def test_the_scan_actually_reads_the_package():
    # Guards against a vacuous pass: a wrong path would make every module
    # "clean" by scanning nothing.
    names = {path.name for path in _modules()}
    assert {"__init__.py", "state.py"} <= names, names


def test_package_modules_have_no_outward_imports():
    offenders = {
        path.name: _violations(path.read_text(encoding="utf-8"))
        for path in _modules()
    }
    assert offenders == {name: [] for name in offenders}, offenders


def test_the_guard_actually_catches_a_violation():
    # The plan's named list, in both import forms.
    for forbidden in FORBIDDEN:
        assert _violations(f"import {forbidden}") == [forbidden]
        assert _violations(f"from {forbidden} import thing") == [forbidden]

    # A submodule of a forbidden package is the same failure.
    assert _violations("from models.knowledge import Item") == ["models.knowledge"]

    # Any other sibling ai.* module is the same failure wearing a new name.
    assert _violations("from ai.client import AIClient") == ["ai.client"]
    assert _violations("import ai") == ["ai"]

    # A third-party import is a failure even though it is not on the list.
    assert _violations("import pydantic") == ["pydantic"]

    # And the clean cases must stay clean, or the guard would be unusable.
    assert _violations("from ai.knowledge.state import Item") == []
    assert _violations("from .state import Item") == []
    assert _violations("import dataclasses") == []
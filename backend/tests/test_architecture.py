"""Dependency direction of the course / schedule packages (rules.md 第六章).

Reads the source with `ast` (nothing is imported or executed) and checks
eight rules. A new subpackage under services/ must be registered in UNITS
with the units it may import, or test_every_subpackage_is_registered fails.

Not caught here: imports by string (importlib) and hand-written SQL touching
another module's tables. Those are left to review.
"""

import ast
from dataclasses import dataclass
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
_SKIP_DIRS = {".venv", "__pycache__", ".pytest_cache"}

# New units and the units each may import (the arrows of the plan's diagram).
UNITS: dict[str, frozenset[str]] = {
    "services.course_library": frozenset(),
    "services.schedule": frozenset(),
    "services.course_scheduling": frozenset(
        {"services.course_library", "services.schedule"}
    ),
    "services.course_builder": frozenset(
        {"services.course_library", "services.course_scheduling"}
    ),
    "services.course_deletion": frozenset(
        {"services.course_library", "services.course_scheduling"}
    ),
    "services.schedule_sources": frozenset(
        {"services.schedule", "services.course_scheduling"}
    ),
}

# Model module -> the only unit that may import it.
MODEL_OWNERS: dict[str, str] = {
    "models.course": "services.course_library",
    "models.course_knowledge": "services.course_library",
    "models.course_syllabus": "services.course_library",
    "models.schedule_task": "services.schedule",
    "models.schedule_overdue_record": "services.schedule",
    "models.course_schedule_plan": "services.course_scheduling",
}
# Exceptions written in rules.md: models/__init__.py, alembic/, scripts/,
# tests/ may import models, so only these are scanned for rule 3.
MODEL_SCAN_ROOTS = ("api", "services", "tasks", "ai", "qbank", "core", "main")

# Inside the schedule system the schedule book never imports the rules layer.
SCHEDULE_BOOK = frozenset({"services.schedule.ledger", "services.schedule.ordering"})
RULES_LAYER = frozenset(
    {"services.schedule.rules", "services.schedule.sources", "services.schedule.derived"}
)

# Pure modules: no database, no infrastructure.
PURE_MODULES = frozenset(
    {
        "services.product_params",
        "services.course_library.checks",
        "services.course_library.prerequisites",
        "services.course_library.point_ids",
        "services.course_library.derived",
        "services.schedule.ordering",
        "services.schedule.derived",
        "services.course_scheduling.periods",
        "services.course_scheduling.algorithm",
    }
)
IMPURE_PREFIXES = ("sqlalchemy", "core", "models")

# Existing packages the new units must not reach into.
FORBIDDEN_FOR_NEW = ("qbank", "tasks", "api")
AI_ALLOWED_UNITS = frozenset({"services.course_builder"})

PRODUCT_PARAMS = "services.product_params"
SECTION_OWNERS: dict[str, str] = {
    "COURSE_LIBRARY": "services.course_library",
    "SCHEDULE": "services.schedule",
    "COURSE_SCHEDULING": "services.course_scheduling",
    "COURSE_BUILDER": "services.course_builder",
    "USER": "services.user_service",
}


# ---------- reading the source ----------


@dataclass(frozen=True)
class Module:
    name: str
    is_package: bool
    tree: ast.Module


@dataclass(frozen=True)
class Import:
    target: str  # resolved module
    names: tuple[str, ...]  # names taken from it ("from target import names")
    line: int


def _module_name(path: Path) -> tuple[str, bool]:
    parts = list(path.relative_to(BACKEND).with_suffix("").parts)
    is_package = parts[-1] == "__init__"
    if is_package:
        parts = parts[:-1]
    return ".".join(parts), is_package


def load_backend() -> dict[str, Module]:
    modules: dict[str, Module] = {}
    for path in BACKEND.rglob("*.py"):
        if _SKIP_DIRS.intersection(path.relative_to(BACKEND).parts):
            continue
        name, is_package = _module_name(path)
        modules[name] = Module(name, is_package, ast.parse(path.read_text("utf-8")))
    return modules


def _base_of(module: Module, node: ast.ImportFrom) -> str:
    if not node.level:
        return node.module or ""
    package = module.name.split(".") if module.is_package else module.name.split(".")[:-1]
    base = package[: len(package) - (node.level - 1)]
    return ".".join([*base, *([node.module] if node.module else [])])


def imports_of(module: Module, known: set[str]) -> list[Import]:
    """Every import, resolved. `from pkg import sub` counts as importing the
    submodule pkg.sub when it exists."""
    out: list[Import] = []
    for node in ast.walk(module.tree):
        if isinstance(node, ast.Import):
            out.extend(Import(alias.name, (), node.lineno) for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            base = _base_of(module, node)
            plain: list[str] = []
            for alias in node.names:
                sub = f"{base}.{alias.name}"
                if sub in known:
                    out.append(Import(sub, (), node.lineno))
                else:
                    plain.append(alias.name)
            if plain:
                out.append(Import(base, tuple(plain), node.lineno))
    return out


def _unit_of(name: str) -> str | None:
    for unit in UNITS:
        if name == unit or name.startswith(unit + "."):
            return unit
    return None


def _under(name: str, prefix: str) -> bool:
    return name == prefix or name.startswith(prefix + ".")


def _scanned(modules: dict[str, Module], roots: tuple[str, ...]) -> list[Module]:
    return [m for m in modules.values() if any(_under(m.name, root) for root in roots)]


def _runtime(modules: dict[str, Module]) -> list[Module]:
    return [m for m in modules.values() if not _under(m.name, "tests")]


# ---------- the eight rules ----------


def rule_layers(modules: dict[str, Module]) -> list[str]:
    """1. A unit imports only the units it is registered to use."""
    known = set(modules)
    problems = []
    for module in modules.values():
        unit = _unit_of(module.name)
        if unit is None:
            continue
        for imp in imports_of(module, known):
            other = _unit_of(imp.target)
            if other is not None and other != unit and other not in UNITS[unit]:
                problems.append(f"{module.name}:{imp.line} imports {imp.target}")
    return problems


def rule_public_entry(modules: dict[str, Module]) -> list[str]:
    """2. Outside a unit, only its root (the package __init__) is imported."""
    known = set(modules)
    problems = []
    for module in _runtime(modules):
        for imp in imports_of(module, known):
            other = _unit_of(imp.target)
            if other is not None and other != _unit_of(module.name) and imp.target != other:
                problems.append(f"{module.name}:{imp.line} imports internal {imp.target}")
    return problems


def _model_classes(modules: dict[str, Module]) -> dict[str, str]:
    """Class name -> model module, for `from models import X`."""
    owned = {}
    for model in MODEL_OWNERS:
        if model in modules:
            for node in modules[model].tree.body:
                if isinstance(node, ast.ClassDef):
                    owned[node.name] = model
    return owned


def rule_model_ownership(modules: dict[str, Module]) -> list[str]:
    """3. Each model module is imported only by its owning unit."""
    known = set(modules)
    classes = _model_classes(modules)
    problems = []
    for module in _scanned(modules, MODEL_SCAN_ROOTS):
        unit = _unit_of(module.name)
        for imp in imports_of(module, known):
            models = (
                [imp.target]
                if imp.target in MODEL_OWNERS
                else [classes[n] for n in imp.names if imp.target == "models" and n in classes]
            )
            for model in models:
                if MODEL_OWNERS[model] != unit:
                    problems.append(f"{module.name}:{imp.line} imports {model}")
    return problems


def rule_schedule_book(modules: dict[str, Module]) -> list[str]:
    """4. The schedule book doesn't import the rules layer."""
    known = set(modules)
    problems = []
    for name in SCHEDULE_BOOK & set(modules):
        for imp in imports_of(modules[name], known):
            if imp.target in RULES_LAYER:
                problems.append(f"{name}:{imp.line} imports {imp.target}")
    return problems


def rule_pure(modules: dict[str, Module]) -> list[str]:
    """5. Pure modules import no database or infrastructure code."""
    known = set(modules)
    problems = []
    for name in PURE_MODULES & set(modules):
        for imp in imports_of(modules[name], known):
            if any(_under(imp.target, prefix) for prefix in IMPURE_PREFIXES):
                problems.append(f"{name}:{imp.line} imports {imp.target}")
    return problems


def rule_no_commit(modules: dict[str, Module]) -> list[str]:
    """6. New units never commit or roll back: transaction(db) does."""
    problems = []
    for module in modules.values():
        if _unit_of(module.name) is None:
            continue
        for node in ast.walk(module.tree):
            if (
                isinstance(node, ast.Call)
                and isinstance(node.func, ast.Attribute)
                and node.func.attr in ("commit", "rollback")
            ):
                problems.append(f"{module.name}:{node.lineno} calls .{node.func.attr}()")
    return problems


def rule_existing_code(modules: dict[str, Module]) -> list[str]:
    """7. New units don't use existing services, qbank, tasks or api; only the
    course builder may use ai."""
    known = set(modules)
    problems = []
    for module in modules.values():
        unit = _unit_of(module.name)
        if unit is None:
            continue
        for imp in imports_of(module, known):
            target = imp.target
            old_service = (
                _under(target, "services")
                and target != "services"
                and _unit_of(target) is None
                and target != PRODUCT_PARAMS
            )
            forbidden = any(_under(target, root) for root in FORBIDDEN_FOR_NEW)
            ai = _under(target, "ai") and unit not in AI_ALLOWED_UNITS
            if old_service or forbidden or ai:
                problems.append(f"{module.name}:{imp.line} imports {target}")
    return problems


def rule_product_params(modules: dict[str, Module]) -> list[str]:
    """8. Each section of product_params is imported only by its owner, by
    name (no whole-module imports)."""
    known = set(modules)
    problems = []
    for module in _runtime(modules):
        if module.name == PRODUCT_PARAMS:
            continue
        for imp in imports_of(module, known):
            if imp.target != PRODUCT_PARAMS:
                continue
            if not imp.names:
                problems.append(f"{module.name}:{imp.line} imports the whole module")
            for section in imp.names:
                owner = SECTION_OWNERS.get(section)
                if owner is None or not _under(module.name, owner):
                    problems.append(f"{module.name}:{imp.line} imports section {section}")
    return problems


RULES = [
    rule_layers,
    rule_public_entry,
    rule_model_ownership,
    rule_schedule_book,
    rule_pure,
    rule_no_commit,
    rule_existing_code,
    rule_product_params,
]


# ---------- on the real backend ----------


@pytest.fixture(scope="module")
def backend() -> dict[str, Module]:
    return load_backend()


@pytest.mark.parametrize("rule", RULES, ids=lambda rule: rule.__name__)
def test_backend_follows_rule(rule, backend: dict[str, Module]) -> None:  # noqa: ANN001
    problems = rule(backend)
    assert not problems, "\n".join(problems)


def test_every_subpackage_is_registered() -> None:
    subpackages = {
        f"services.{path.parent.name}" for path in (BACKEND / "services").glob("*/__init__.py")
    }
    assert subpackages <= set(UNITS), sorted(subpackages - set(UNITS))


def test_registries_point_at_real_modules(backend: dict[str, Module]) -> None:
    named = [*UNITS, *MODEL_OWNERS, *SCHEDULE_BOOK, *RULES_LAYER, *PURE_MODULES]
    assert [name for name in named if name not in backend] == []


# ---------- the checker catches what it should ----------


def _fake(**sources: str) -> dict[str, Module]:
    """Synthetic modules: keyword = dotted name with '__' for '.', a trailing
    '__init' marks a package."""
    out = {}
    for key, source in sources.items():
        name = key.replace("__", ".")
        is_package = name.endswith(".init")
        name = name.removesuffix(".init")
        out[name] = Module(name, is_package, ast.parse(source))
    return out


_LIB_PKG = {"services__course_library__init": "", "services__course_library__actions": ""}
_SCHED_PKG = {"services__schedule__init": "", "services__schedule__rules": ""}


def test_relative_imports_resolve() -> None:
    modules = _fake(
        services__course_library__init="",
        services__course_library__actions="from .checks import x\nfrom . import queries",
        services__course_library__checks="",
        services__course_library__queries="",
    )
    targets = {imp.target for imp in imports_of(modules["services.course_library.actions"], set(modules))}
    assert targets == {"services.course_library.checks", "services.course_library.queries"}


@pytest.mark.parametrize(
    ("rule", "sources"),
    [
        (rule_layers, {**_LIB_PKG, **_SCHED_PKG, "services__schedule__ledger": "from services import course_library"}),
        (rule_public_entry, {**_LIB_PKG, "api__v1__courses": "from services.course_library.actions import create_course"}),
        (rule_model_ownership, {**_LIB_PKG, **_SCHED_PKG, "models__course": "class Course: ...", "services__schedule__rules": "from models import Course"}),
        (rule_model_ownership, {**_LIB_PKG, "models__schedule_task": "class ScheduleTask: ...", "api__v1__courses": "from models.schedule_task import ScheduleTask"}),
        (rule_schedule_book, {**_SCHED_PKG, "services__schedule__ledger": "from services.schedule.rules import today_list"}),
        (rule_pure, {**_LIB_PKG, "services__course_library__checks": "from sqlalchemy import select"}),
        (rule_no_commit, {**_LIB_PKG, "services__course_library__actions": "async def f(db):\n    await db.commit()"}),
        (rule_existing_code, {**_LIB_PKG, "services__project_service": "", "services__course_library__actions": "from services import project_service"}),
        (rule_existing_code, {**_SCHED_PKG, "services__schedule__rules": "from ai import ai_client"}),
        (rule_product_params, {**_SCHED_PKG, "services__product_params": "", "services__schedule__rules": "from services.product_params import COURSE_BUILDER"}),
        (rule_product_params, {**_SCHED_PKG, "services__product_params": "", "services__schedule__rules": "from services import product_params"}),
    ],
)
def test_rule_catches_violation(rule, sources: dict[str, str]) -> None:  # noqa: ANN001
    assert rule(_fake(**sources))

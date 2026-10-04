"""R1 · 插件化与四要素 —— 结构性不变量。

计划 `.workbuddy/plans/method-plugin-refactor.md` §2.3 的五条，外加注册表与
runtime 的边界。这些测试检查的是**代码的形状**，不是某次调用的结果：

* 新增一个做法时它们**不需要改**（做法目录是被发现的，不是被列举的）；
* 破坏它们时会在跑测试的地方就挂掉，而不是在某个学习者身上。

三条最紧的：

* ✗ 插件不许 import 模型客户端 / 数据库 / 服务层（§2.3-1）
* ✗ `ai/coordinator/**` 全文不许出现任何做法 id（§2.3-2）
* ✓ `Behaviour` 必须是 `Restraint` 的派生视图，不是第二次手写（§2.3-3）

无数据库、无模型：做法是纯函数，需要其中任何一个的测试测的是管线。
"""

from __future__ import annotations

import importlib
import inspect
from pathlib import Path

import pytest

import ai.coordinator
import ai.methods
from ai.errors import AIConfigError
from ai.methods import METHODS, method_names, validate_methods
from ai.methods.runtime import (
    UnknownMethod as RuntimeUnknownMethod,
    catalogue,
    resolve,
    run_once,
)
from ai.methods.types import (
    NOT_APPLICABLE,
    PURPOSES,
    AppliesWhen,
    Behaviour,
    CompletionRule,
    EvidenceTarget,
    MethodInput,
    Restraint,
    completion_lines,
)

# The fixtures come from the sibling module rather than being restated: the
# learner-state block and the question are the *input* both suites test against,
# and two copies of it would let them drift into testing different things.
# Imported by module path (not relatively) because `tests/` is not a package.
from test_methods import context, direct, goal, socratic

PLUGIN_ROOT = Path(ai.methods.__file__).parent
COORDINATOR_ROOT = Path(ai.coordinator.__file__).parent
#: What a plugin class must look like for the registry to accept it. Mirrors
#: `ai/methods/__init__.py`'s `PLUGIN_ATTRS`, restated rather than imported —
#: a test that reads the constant it is testing cannot catch it being wrong.
PLUGIN_ATTRS = ("name", "display_name", "description", "execute")


def _plugin_files() -> list[Path]:
    """Every `ai/methods/<name>/method.py`, found the way the registry finds them.

    Re-derived from the filesystem rather than read off the registry: a test
    that trusts the registry to tell it what to check cannot catch the registry
    having missed something.
    """
    return sorted(PLUGIN_ROOT.glob("*/method.py"))


def _plugin_class(module) -> type | None:
    for value in vars(module).values():
        if inspect.isclass(value) and all(
            hasattr(value, attr) for attr in PLUGIN_ATTRS
        ):
            return value
    return None


# --- 插件发现 ---------------------------------------------------------------


def test_the_registry_discovers_every_plugin_directory():
    """一条目录 = 一个做法，目录数与注册表数必须相等。

    Both directions on purpose: a directory the registry skipped is a method
    that exists but can never run; a registry entry with no directory is a
    method nobody can read.
    """
    found = {p.parent.name for p in _plugin_files()}
    assert found == set(method_names()), (
        f"目录 {sorted(found)} 与注册表 {sorted(method_names())} 不一致"
    )


def test_a_methods_id_equals_its_directory_name():
    """加一个做法必须是加一个目录，不动别处。

    The registry refuses a mismatch at import; this asserts the property rather
    than the guard, so the test still says something if the guard moves.
    """
    for path in _plugin_files():
        module = importlib.import_module(f"ai.methods.{path.parent.name}.method")
        plugin = _plugin_class(module)
        assert plugin is not None, f"{path.parent.name} 没有导出插件类"
        assert plugin().name == path.parent.name


def test_the_registry_will_not_start_with_no_methods():
    """一个目录都不剩时必须报错，而不是安静地返回空。

    Otherwise the product boots "without methods" and `DEFAULT_METHOD` throws
    something unrelated on first use. Asserting the guard's text is deliberate:
    re-running discovery would mean deleting real directories.
    """
    source = (PLUGIN_ROOT / "__init__.py").read_text(encoding="utf-8")
    assert "no method plugin directories found" in source
    assert _plugin_files(), "文件系统上就没有任何做法目录"


def test_startup_refuses_a_plugin_that_declares_nothing():
    """启动期校验必须**真的会**失败，否则那句话没有意义。"""
    from ai.methods.types import MethodDirective

    class _Incomplete:
        name = "incomplete"
        display_name = "Incomplete"
        description = "缺声明"
        applies_when: AppliesWhen | None = None
        restraint: Restraint | None = None

        def execute(self, context: MethodInput) -> MethodDirective:  # pragma: no cover
            raise AssertionError("should not run")

    saved = dict(METHODS)
    try:
        METHODS["incomplete"] = _Incomplete()  # type: ignore[assignment]
        with pytest.raises(AIConfigError) as excinfo:
            validate_methods()
        assert "applies_when" in str(excinfo.value)
        assert "restraint" in str(excinfo.value)
    finally:
        METHODS.clear()
        METHODS.update(saved)


# --- 不变量 1 · 插件够不到模型与数据库 --------------------------------------


def test_plugins_cannot_reach_the_model_or_the_database():
    """✗ 不许 import `ai.client` / `core.database` / `models` / `schemas` / `services.*`。

    这是「Method 不直接调模型、不直接写库」那条边界的**结构性**保证。一个真的
    导入了客户端的插件照样能跑 —— 它只会悄悄变成第二条教学管线，而那条管线
    没有 `remember` / `record_evidence`（`ai/methods/__init__.py` 的开头写着
    为什么）。
    """
    banned_prefixes = (
        "ai.client",
        "ai.config",
        "core.database",
        "models",
        "schemas",
        "services",
    )
    for path in _plugin_files():
        for line in path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped.startswith(("import ", "from ")):
                continue
            assert not stripped.startswith("from services"), (
                f"{path.parent.name} 导入了服务层 —— 做法不认识服务层，"
                "否则它就可能开始自己安排事情"
            )
            for banned in banned_prefixes:
                assert banned not in stripped, (
                    f"{path.parent.name} 导入了 {banned} —— 做法是纯函数，"
                    "调模型与写库都不属于它"
                )


# --- 不变量 2 · 协调层不知道有哪些做法 --------------------------------------


def test_the_coordinator_package_never_names_a_method():
    """✗ `ai/coordinator/**` 全文不许出现任何做法 id。

    这条就是「新增一个做法时核心 Coordinator 不需要修改」的断言。
    `ai/coordinator/__init__.py` 的边界写着 *"no methods"*：协调层可以**接收**
    一份注入的候选名单（照 `Snapshot.available_actions` 的手法），但不能知道
    名单里有哪些 —— 一旦知道，"选做法"这件事就一半落在它身上了。
    """
    for path in sorted(COORDINATOR_ROOT.rglob("*.py")):
        text = path.read_text(encoding="utf-8")
        for name in method_names():
            assert name not in text, (
                f"{path.name} 提到了做法 {name!r} —— 协调层只能接收候选名单"
            )


# --- 不变量 3 · restraint 与 behaviour 是同一件事 ----------------------------


def test_the_restraint_and_the_behaviour_are_one_thing():
    """✓ `Behaviour` 是 `Restraint` 的视图。

    R1 之前这两个是两份独立手写：改中文纪律不改布尔，或者反过来，都不会让任何
    测试变红。现在 `behaviour` 是 property，由 `Behaviour.of(restraint)` 算出。
    """
    for name in method_names():
        directive = run_once(name, context())
        assert directive.behaviour == Behaviour.of(directive.restraint)


def test_the_two_methods_withhold_opposite_amounts():
    """**它们之间的差别，就压在这一个断言上。**

    计划 §1 说这两个做法是它们自己 docstring 里的**对照组**，存在意义就是让
    「差别来自做法而不是来自不同的输入」能被演示。那么差别必须落在**不做的事**
    上：一个不给结论，一个给。
    """
    asked_s, told_s = socratic(), direct()
    asked, told = asked_s.restraint, told_s.restraint
    assert asked.withholds_answer is True
    assert told.withholds_answer is False
    assert asked.stops_for_learner is True
    assert told.stops_for_learner is False
    # 也不许是「一个更啰嗦的另一个」。
    assert asked.max_questions == 1
    assert told.max_questions == 0
    assert asked.requires_example is not told.requires_example
    # 要素 1 也必须是相反的：苏格拉底要他做，直接讲解这一轮是 AI 做功。
    assert asked_s.applies_when.needs_learner_action is True
    assert told_s.applies_when.needs_learner_action is False


# --- 要素齐全 ---------------------------------------------------------------


def test_every_plugin_declares_all_four_elements():
    """适用条件 / 要他做的动作 / 我不做的事 / 观察什么 / 什么算完成。

    缺任何一个，它就不是一个可以被核对的做法 —— 而不能被核对的承诺只是一段
    说话的方式。
    """
    for name in method_names():
        directive = run_once(name, context())
        assert isinstance(directive.applies_when, AppliesWhen), name
        assert isinstance(directive.restraint, Restraint), name
        assert isinstance(directive.evidence_target, EvidenceTarget), name
        assert isinstance(directive.completion_rule, CompletionRule), name
        # 要素 2：主语必须是学习者 —— 缺了它就是「AI 该说什么」，还没到做法这一层。
        assert directive.learner_move.strip(), f"{name} 没要求学习者做任何事"
        assert directive.completion.strip(), f"{name} 没说什么算完成"


def test_every_evidence_target_maps_onto_the_recording_tool():
    """✓ 要素 4 必须能用 `record_evidence` 的参数表达，否则它是一句没人读的话。

    这也是 R2 存在的理由：`hint_used` 的全链路已经在库里（`evidence_entry.py:138`
    · `knowledge_service.py:634`），只差 Agent 工具的声明。若"要求独立"表达不了，
    「带着提示做对不算」这条规则就永远只是文字。
    """
    from ai.tools.declarations import RECORD_EVIDENCE, _REGISTRY

    spec = _REGISTRY[RECORD_EVIDENCE]
    params = spec.parameters["properties"]
    # 参数名对得上，且 `require_independent` 有一个能落成的地方。
    assert {"item", "verdict", "basis", "reasoning"} <= set(params)
    # tier 必须落成 basis 的枚举值 —— 否则「这条要几个独立来源」是空的。
    assert set(params["basis"]["enum"]) == {"verified", "judged"}
    for name in method_names():
        target = run_once(name, context()).evidence_target
        if target.item_hint is not None:
            assert "item" in params, f"{name} 的 item_hint 没有对应的工具参数"
        assert {"A": "verified", "B": "judged"}[target.tier] in params["basis"]["enum"]
        # 要求独立 ⇒ 工具必须能说"这一轮我帮过忙"。**这一条在 R2 之前是假的**，
        # 而它正是 R2 存在的理由：核心只认 `not hint_used`
        # （`ai/knowledge/state.py:291`），`evidence_entry.Outcome` 也有那个字段
        # （`:138`），唯独 Agent 的工具声明里没有 —— 于是正在教人的模型没有语法
        # 承认自己帮了忙。R2 加上 `hintUsed` 之后，这一行会自己变绿。
        if target.require_independent:
            assert "hintUsed" in params, (
                f"{name} 要求独立成功，但 record_evidence 没有 hintUsed 参数 —— "
                "这条断言就是 R2 的验收标准"
            )


def test_the_completion_sentence_and_the_rule_cannot_drift_apart():
    """✓ 人话判据与机器判据必须是同一个承诺的两种说法。

    界面上写着「做对两道就算过」而系统按一条去核对，比没有判据更糟：用户以为
    过了，系统认为没过。这条把两者钉在一起 —— 改了 `n` 忘了改句子（或反过来）
    在这里就挂。
    """
    for name in method_names():
        for purpose in PURPOSES:
            directive = run_once(name, context(goal=goal(purpose)))
            rule, sentence = directive.completion_rule, directive.completion
            if rule.kind == "consecutive_correct":
                # "你自己做对两道" / "你自己做对一道" —— 数必须对上。
                numeral = "两" if rule.n == 2 else "一"
                assert f"{numeral}道" in sentence, (
                    f"{name}/{purpose}: rule.n={rule.n}，但判据说的是「{sentence}」"
                )
            # 判据那句话必须真的进了纪律文本，否则模型读到的是一条不存在的标准。
            assert sentence in directive.discipline, f"{name}/{purpose}"


def test_a_not_applicable_rule_says_so_rather_than_printing_a_criterion():
    """「这一轮不设完成判据」也必须**说出来**。

    绝大多数轮次不欠任何完成判据。若那条路只是「什么都不显示」，界面上会像欠着
    一笔永远不还的账。
    """
    lines = completion_lines(context(), "（这一句不会被用上）", NOT_APPLICABLE)
    assert any("不设完成判据" in line for line in lines)
    assert not any("什么算完成" in line for line in lines)


def test_no_rule_claims_more_than_it_can_count():
    """`consecutive_correct` 的 n 至少是 1 —— 0 会变成「永远不算完成」。

    而 `n` 巨大同样危险：它会让一段在事实上永远结束不了。边界写在类型里，
    这里只是钉住它。
    """
    for name in method_names():
        for purpose in PURPOSES:
            rule = run_once(name, context(goal=goal(purpose))).completion_rule
            if rule.kind == "consecutive_correct":
                assert rule.n >= 1, f"{name}/{purpose}: n={rule.n}"


# --- runtime：执行与决策分离 ------------------------------------------------


def test_the_runtime_runs_a_plugin_and_nothing_else():
    """runtime 只做三件事：解析名字、从注册表取插件、调它。

    它不判断适用、不比对上一轮、不决定结束、不写任何东西 —— 那些是 Coordinator
    的活。这条测试盯的是**签名面**：`run_once` 只收一个名字和一个输入，没有第三
    个参数能让调用方把「要不要跑」也塞进来。
    """
    from ai.methods import runtime

    assert list(inspect.signature(runtime.run_once).parameters) == ["name", "context"]
    assert list(inspect.signature(runtime.resolve).parameters) == ["name"]


def test_the_runtime_refuses_an_unknown_name_instead_of_defaulting():
    """用另一种教法回答却不让调用方知道，是这条路径能犯的最糟的错。

    `None` 是「没人选」，合法，落默认；一个**不认识的名字**必须抛 —— 前者是一个
    合法状态，后者是 bug 或过期存储值。
    """
    assert run_once(None, context()).name == "direct_explanation"
    with pytest.raises(RuntimeUnknownMethod) as excinfo:
        run_once("no_such_method", context())
    assert excinfo.value.name == "no_such_method"


def test_the_catalogue_carries_what_each_method_withholds():
    """候选清单要能回答「它们差在哪」—— 只有一个名字和一句简介做不到。"""
    rows = {row["name"]: row for row in catalogue()}
    assert set(rows) == set(method_names())
    for row in rows.values():
        for flag in ("withholdsAnswer", "asksQuestion", "needsLearnerAction"):
            assert isinstance(row[flag], bool), f"{row['name']} 的 {flag} 不是布尔"
    assert rows["socratic"]["withholdsAnswer"] is True
    assert rows["direct_explanation"]["withholdsAnswer"] is False
    assert rows["socratic"]["needsLearnerAction"] is True
    assert rows["direct_explanation"]["needsLearnerAction"] is False


def test_resolve_returns_the_registry_instance_not_a_fresh_one():
    """每次拿到的必须是注册表里那一个。

    否则一个带内部状态的做法会在两次调用之间失忆，而它的 `execute` 是纯函数，
    失忆就说明有人往它身上挂了状态。
    """
    assert resolve("socratic") is METHODS["socratic"]
    assert resolve(None) is METHODS["direct_explanation"]

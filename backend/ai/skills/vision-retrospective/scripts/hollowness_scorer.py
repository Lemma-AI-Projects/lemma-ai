#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
hollowness_scorer.py — Vision Retrospective hollowness detector.

Scans a vision / goal / idea statement and reports how "hollow" it is:
how many vague quality adjectives it uses, and which verifiability
dimensions are missing (measurable metric, beneficiary, concrete action,
success/acceptance language).

The scorer is intentionally deterministic (pure stdlib, no ML) so the same
input always yields the same score — this is what makes Vision Retrospective
"scientific" rather than another round of hand-wavy prompting.

Usage:
    python hollowness_scorer.py --text "I want a beautiful, seamless app that helps people."
    python hollowness_scorer.py --file vision.txt
    cat vision.txt | python hollowness_scorer.py
    python hollowness_scorer.py --text "..." --json

Exit code is 0 on success. Use --fail-above N to make the process exit
non-zero when the hollowness score exceeds N (handy as a CI/quality gate).
"""

import argparse
import json
import re
import sys
from pathlib import Path

# Make stdout UTF-8 on Windows so CJK / unicode output renders cleanly.
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Hollow markers: vague quality words that *sound* like requirements but are
# not verifiable on their own. Each maps to a concrete-proxy prompt.
# ---------------------------------------------------------------------------
HOLLOW_TERMS = {
    # English
    "beautiful": "Define beauty as a measurable proxy (e.g. 'passes a 5-person aesthetic rating >= 4/5').",
    "seamless": "Name the hand-off that must be invisible (e.g. 'no more than 1 manual step between X and Y').",
    "intuitive": "Quantify learnability (e.g. 'new user completes core task in <=3 steps at >=90% success').",
    "robust": "State the failure condition it must survive (e.g. 'handles 10k req/min with <0.1% error').",
    "efficient": "Give the baseline and target (e.g. 'reduce processing time from 2h to <5min').",
    "user-friendly": "Replace with a task-level metric (e.g. 'task completion rate >= 95% without help').",
    "scalable": "State the scale point (e.g. 'supports 1M users without redesign').",
    "elegant": "Elegance is not verifiable; pick a concrete property (perf, lines, latency).",
    "powerful": "Name the specific capability or throughput it must deliver.",
    "flexible": "List the variations/configurations it must support.",
    "modern": "Name the concrete standard or version it must meet.",
    "innovative": "State the novel capability; 'innovative' alone is not a requirement.",
    "smooth": "Define the metric (e.g. '60fps', 'p95 latency < 100ms').",
    "premium": "Define premium as a measurable attribute (SLA, material, response time).",
    "next-gen": "Name the concrete leap over the current generation.",
    "world-class": "Benchmark against a named competitor/metric.",
    "best-in-class": "Cite the class and the metric that defines 'best'.",
    "cutting-edge": "Name the specific technology/technique and why it matters here.",
    "smart": "State the decision the system makes and on what data.",
    "intelligent": "Name the inference it performs and its accuracy target.",
    "sleek": "Use a measurable design token (contrast, spacing, load time).",
    "polished": "List the polish criteria (no console errors, <1s load, etc.).",
    "delightful": "Define delight as a measurable UX metric.",
    "magical": "Describe the actual mechanism; 'magical' is not implementable.",
    "revolutionary": "State the before/after delta in concrete terms.",
    "game-changing": "Quantify the change it produces.",
    "awesome": "Replace with a specific, testable property.",
    "nice": "Be specific about what 'nice' means in measurable terms.",
    "good": "Define 'good' with an acceptance threshold.",
    "better": "Better than what, by what measurable margin?",
    "simple": "Simple for whom? Measured by what (steps, time, errors)?",
    "easy": "Easy = X% of users complete Y without assistance.",
    # Chinese
    "美观": "用可度量标准定义美观（如：5 人评审平均分 >= 4/5）。",
    "流畅": "给出指标（如：60fps、p95 延迟 < 100ms）。",
    "强大": "说明必须交付的具体能力或吞吐。",
    "高效": "给出基线与目标（如：处理时间从 2h 降到 <5min）。",
    "优雅": "优雅不可验证，请选一个具体属性（性能/代码量/延迟）。",
    "易用": "用任务级指标替代（如：完成任务率 >= 95% 且无需帮助）。",
    "无缝": "指出必须无感的那次衔接（如：X 与 Y 之间手动步骤 <= 1）。",
    "智能": "说明做出的决策与依据的数据。",
    "高端": "把高端定义为可度量属性（SLA/响应时间/材质）。",
    "现代化": "说明必须满足的具体标准或版本。",
    "创新": "陈述新颖能力；仅靠“创新”不是需求。",
    "革命性": "用具体的“前/后”差值表达。",
    "完美": "定义“完美”的验收阈值。",
    "极致": "给出极致的量化边界。",
    "简单": "对谁简单？以什么度量（步骤/时间/错误率）？",
    "好用": "好用 = X% 用户无需协助完成 Y。",
    "漂亮": "用可度量设计令牌（对比度/留白/加载时间）。",
    "丝滑": "给出指标（如：60fps、p95 延迟 < 100ms）。",
    "炫酷": "说明实际机制与可度量反馈。",
    "先进": "指出具体技术与在此处的作用。",
    "世界级": "对标某竞争对手或具体指标。",
}

# Regex fragments ------------------------------------------------------------
METRIC_RE = re.compile(
    r"\d+\s?%"                                     # percentages
    r"|\d+(\.\d+)?\s?(ms|sec|secs|second|seconds|min|mins|minute|minutes|"
    r"hr|hrs|hour|hours|day|days|week|weeks|month|months|year|years)"  # time
    r"|\d+\s?(mb|gb|kb|b|kb/s|mb/s)"              # data sizes / rates
    r"|\d+\s?(yuan|rmb|\$|€|£|usd|cny)"           # money
    r"|\d+\s?(user|users|people|customer|customers|item|items|task|tasks|"
    r"request|requests|test|tests|case|cases)"     # counts
    r"|\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b"           # dates
    r"|\bQ[1-4]\b"                                # quarters
    r"|\b(NPS|KPI|ROI|API|SDK|SLA)\b"             # acronyms that imply metrics
    r"|\b(score|rating|accuracy|precision|recall)\s+of\s+\d",  # rated metrics
    re.IGNORECASE,
)

ACTOR_RE = re.compile(
    r"\b(i|we|our|my|us|me|user|users|customer|customers|client|clients|"
    r"people|reader|readers|developer|developers|team|teams|student|students|"
    r"patient|patients|employee|employees|audience|admin|admins)\b",
    re.IGNORECASE,
)

ACTION_RE = re.compile(
    r"\b(build|create|make|develop|design|implement|automate|reduce|increase|"
    r"improve|launch|ship|deploy|generate|produce|track|monitor|connect|"
    r"integrate|analyze|process|convert|schedule|notify|calculate|validate|"
    r"train|publish|organize|manage|control|optimize|sync|backup|export|"
    r"import|collect|replace|migrate|refactor|alert)\b",
    re.IGNORECASE,
)

SUCCESS_RE = re.compile(
    r"\b(success|goal|metric|measure|measurable|verify|verified|test|kpi|"
    r"criteria|criterion|done when|acceptance|benchmark|target|objective|okr|"
    r"threshold|sla)\b",
    re.IGNORECASE,
)

WORD_RE = re.compile(r"[A-Za-z\u4e00-\u9fff]+")


def _read_input(args):
    if args.file:
        return Path(args.file).read_text(encoding="utf-8")
    if args.text:
        return args.text
    if not sys.stdin.isatty():
        return sys.stdin.read()
    return ""


def analyze(text):
    text = (text or "").strip()
    if not text:
        return {"error": "empty input"}

    lower = text.lower()
    total_words = len(WORD_RE.findall(text))

    # 1. Hollow term hits
    hollow_hits = []
    for term, proxy in HOLLOW_TERMS.items():
        # word-boundary-ish match; CJK has no spaces so use simple substring
        if re.search(r"(?<![a-z])" + re.escape(term) + r"(?![a-z])", lower):
            hollow_hits.append({"term": term, "proxy": proxy})

    # 2. Dimension presence
    has_metric = bool(METRIC_RE.search(text))
    has_actor = bool(ACTOR_RE.search(text))
    has_action = bool(ACTION_RE.search(text))
    has_success = bool(SUCCESS_RE.search(text))

    missing = []
    if not has_metric:
        missing.append({
            "dimension": "measurable_metric",
            "prompt": "What number proves this is working? (%, time, count, $, latency...)",
        })
    if not has_actor:
        missing.append({
            "dimension": "beneficiary",
            "prompt": "Who specifically benefits or acts? Name the user/role.",
        })
    if not has_action:
        missing.append({
            "dimension": "concrete_action",
            "prompt": "What concrete action does this produce? (build/reduce/automate...)",
        })
    if not has_success:
        missing.append({
            "dimension": "success_language",
            "prompt": "How will we know it is DONE? Define an acceptance criterion.",
        })

    # 3. Score
    score = min(100, len(hollow_hits) * 10 + len(missing) * 12)
    # a very short statement with no metric is at least 'vague'
    if total_words < 6 and not has_metric:
        score = max(score, 45)

    if score <= 15:
        label = "Solid"
    elif score <= 35:
        label = "Specific"
    elif score <= 60:
        label = "Vague"
    elif score <= 85:
        label = "Hollow"
    else:
        label = "Fully Hollow"

    # 4. Retrospect prompts feed Phase 1 of the VR Loop
    retrospect_prompts = [m["prompt"] for m in missing]
    for h in hollow_hits:
        retrospect_prompts.append(f"Replace '{h['term']}' with: {h['proxy']}")

    return {
        "score": score,
        "label": label,
        "total_words": total_words,
        "hollow_terms": hollow_hits,
        "missing_dimensions": missing,
        "retrospect_prompts": retrospect_prompts,
    }


def render_markdown(result):
    if "error" in result:
        return f"⚠️ {result['error']}"
    lines = []
    lines.append(f"# Hollowness Report — score **{result['score']}/100** ({result['label']})")
    lines.append("")
    lines.append(f"- Words analyzed: {result['total_words']}")
    lines.append(f"- Hollow terms found: {len(result['hollow_terms'])}")
    lines.append(f"- Missing verifiability dimensions: {len(result['missing_dimensions'])}")
    lines.append("")
    if result["hollow_terms"]:
        lines.append("## Vague terms to anchor")
        for h in result["hollow_terms"]:
            lines.append(f"- **{h['term']}** → {h['proxy']}")
        lines.append("")
    if result["missing_dimensions"]:
        lines.append("## Missing dimensions")
        for m in result["missing_dimensions"]:
            lines.append(f"- *{m['dimension']}*: {m['prompt']}")
        lines.append("")
    lines.append("## Retrospect prompts (feed Phase 1)")
    for p in result["retrospect_prompts"]:
        lines.append(f"1. {p}")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description="Vision Retrospective hollowness detector")
    ap.add_argument("--text", help="Vision statement inline")
    ap.add_argument("--file", help="Path to a file containing the vision")
    ap.add_argument("--json", action="store_true", help="Emit JSON instead of markdown")
    ap.add_argument("--fail-above", type=int, default=None,
                    help="Exit non-zero if score exceeds this value")
    args = ap.parse_args()

    text = _read_input(args)
    result = analyze(text)

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(render_markdown(result))

    if args.fail_above is not None and "score" in result:
        if result["score"] > args.fail_above:
            sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()

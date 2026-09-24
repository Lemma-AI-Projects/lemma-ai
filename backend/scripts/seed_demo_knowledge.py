"""Land the demo knowledge structure (5 items, one chain) into a learn space.

This is the Learner State demo's Phase 0: a deliberately tiny structure —
矩阵基础 → 线性无关 → 特征值 → 特征向量 → 对角化 — whose only job is to make
the derivation observable. It is NOT a knowledge base; the real one comes from
a human-reviewed draft over real material (see planning/learner-state-v1-
execution-plan.md §A).

Run (from backend/):
    .venv/Scripts/python.exe scripts/seed_demo_knowledge.py --space "AI for Math"
    .venv/Scripts/python.exe scripts/seed_demo_knowledge.py --space "AI for Math" --reset
    .venv/Scripts/python.exe scripts/seed_demo_knowledge.py --space "AI for Math" \
        --reset --frontier 特征向量

--reset wipes this space's items/edges/evidence first, so the demo starts from
"nothing assessed" every time. Without it the script is idempotent (items are
matched by label, duplicate edges are skipped).

--frontier records the evidence a learner would have accumulated to arrive at
one item: every strict prerequisite of it gets one tier-A `correct` record, so
that item becomes the OUTER FRINGE. It is demo data written through the same
`record_evidence` door production uses (nothing here derives or caches state) —
the point is to be able to demonstrate a method on a state that is not "nothing
assessed yet".

Stdout is forced to UTF-8: the labels are Chinese and Windows consoles default
to a codepage that cannot encode them.
"""

import argparse
import asyncio
import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Must happen before anything prints: the default console encoding on Windows
# (GBK here) cannot encode the Chinese labels we are about to report.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")

from sqlalchemy import delete, select  # noqa: E402

from core.database import AsyncSessionLocal, engine  # noqa: E402
from models.knowledge import KnowledgeEdge, KnowledgeEvidence, KnowledgeItem  # noqa: E402
from models.project import Project  # noqa: E402
from schemas.knowledge import KnowledgeEvidenceIn, KnowledgeImportIn  # noqa: E402
from services import knowledge_service  # noqa: E402

DRAFT = Path(__file__).resolve().parent / "data" / "demo_math_structure.json"


async def _find_space(db, name: str) -> Project | None:
    return (
        await db.execute(select(Project).where(Project.name == name).limit(1))
    ).scalar_one_or_none()


def _prerequisite_labels(draft: dict, target_label: str) -> list[str]:
    """Every strict prerequisite of `target_label`, entry point first.

    Read off the draft rather than the database because the draft is the
    document being seeded and its refs are what the edges are written from. The
    demo chain is linear, but the walk is generic (it follows each item's own
    prerequisite), so it still does the right thing if the draft grows a branch.
    """
    label_of = {item["ref"]: item["label"] for item in draft["items"]}
    ref_of = {item["label"]: item["ref"] for item in draft["items"]}
    target = ref_of.get(target_label)
    if target is None:
        raise SystemExit(f"{target_label!r} is not an item in the draft")
    prerequisite_of = {edge["to"]: edge["from"] for edge in draft["edges"]}
    chain: list[str] = []
    cursor = target
    while cursor in prerequisite_of:
        cursor = prerequisite_of[cursor]
        if cursor in chain:  # a cycle would loop forever; the draft should not
            break
        chain.append(cursor)
    return [label_of[ref] for ref in reversed(chain)]


async def _reset(db, project_id: uuid.UUID) -> tuple[int, int, int]:
    """Delete this space's knowledge rows. Evidence first: it references items.

    Ordered by hand rather than relying on ON DELETE CASCADE, so the script
    says exactly what it removes even if a future migration changes a cascade.
    """
    evidence = await db.execute(
        delete(KnowledgeEvidence).where(KnowledgeEvidence.project_id == project_id)
    )
    edges = await db.execute(
        delete(KnowledgeEdge).where(KnowledgeEdge.project_id == project_id)
    )
    items = await db.execute(
        delete(KnowledgeItem).where(KnowledgeItem.project_id == project_id)
    )
    await db.commit()
    return items.rowcount, edges.rowcount, evidence.rowcount


async def main() -> int:
    parser = argparse.ArgumentParser(description="Seed the demo knowledge structure.")
    parser.add_argument("--space", default="AI for Math", help="learn space name")
    parser.add_argument("--draft", type=Path, default=DRAFT)
    parser.add_argument(
        "--reset",
        action="store_true",
        help="delete this space's items/edges/evidence first",
    )
    parser.add_argument(
        "--frontier",
        metavar="LABEL",
        help="master every prerequisite of this item so it becomes the outer fringe",
    )
    args = parser.parse_args()

    raw = json.loads(args.draft.read_text(encoding="utf-8"))
    payload = KnowledgeImportIn.model_validate(raw)

    try:
        async with AsyncSessionLocal() as db:
            project = await _find_space(db, args.space)
            if project is None:
                print(f"no learn space named {args.space!r}", file=sys.stderr)
                return 2
            print(f"space: {project.name} ({project.id})")

            if args.reset:
                items, edges, evidence = await _reset(db, project.id)
                print(
                    f"reset: removed {items} item(s), {edges} edge(s), "
                    f"{evidence} evidence row(s)"
                )

            result = await knowledge_service.import_structure(
                db, project_id=project.id, payload=payload
            )
            print(
                f"structure: {result.items_created} item(s) created, "
                f"{result.items_reused} reused, {result.edges_created} edge(s) created, "
                f"{result.edges_skipped} skipped"
            )

            # The derived state, so the structure is judged by what it produces
            # rather than by how it reads. No evidence yet ⇒ nothing is
            # mastered and the outer fringe is the structure's entry point.
            structure = await knowledge_service.build_structure_out(
                db, project_id=project.id, user_id=project.user_id
            )
            labels = {row.id: row.label for row in structure.items}
            print("\nderived state (no extra evidence):")
            for state in structure.states:
                print(
                    f"  [{state.value:13}] {state.label} "
                    f"({state.evidence_count} record(s))"
                )
            print("outer fringe :", [labels[i] for i in structure.outer_fringe])
            print("inner fringe :", [labels[i] for i in structure.inner_fringe])

            if args.frontier:
                mastered = _prerequisite_labels(raw, args.frontier)
                print(f"\nmastering the prerequisites of {args.frontier!r}: {mastered}")
                for label in mastered:
                    await knowledge_service.record_evidence(
                        db,
                        project_id=project.id,
                        user_id=project.user_id,
                        payload=KnowledgeEvidenceIn(
                            project_id=project.id,
                            item_label=label,
                            verdict="correct",
                        ),
                    )
                structure = await knowledge_service.build_structure_out(
                    db, project_id=project.id, user_id=project.user_id
                )
                labels = {row.id: row.label for row in structure.items}
                print("\nderived state (after that evidence):")
                for state in structure.states:
                    print(
                        f"  [{state.value:13}] {state.label} "
                        f"({state.evidence_count} record(s))"
                    )
                fringe = [labels[i] for i in structure.outer_fringe]
                print("outer fringe :", fringe)
                print("inner fringe :", [labels[i] for i in structure.inner_fringe])
                if args.frontier not in fringe:
                    print(
                        f"\nWARNING: {args.frontier!r} is not on the outer fringe "
                        f"({fringe}) — the structure's edges decide this, not the "
                        "script.",
                        file=sys.stderr,
                    )
            print("\nnext: open the space and ask for a question on 矩阵基础")
    finally:
        await engine.dispose()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

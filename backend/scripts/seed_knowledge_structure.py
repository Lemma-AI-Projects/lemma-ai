"""Land a reviewed knowledge-structure draft into a learn space.

Run (from backend/):
    uv run python scripts/seed_knowledge_structure.py <draft.json> \
        --project-id <uuid> [--user-id <uuid>] [--dry-run]

The draft JSON is the Phase-0 artefact: 10-20 granular topics plus prerequisite
edges, drafted by a model and **reviewed by a human** before it gets here. Its
schema is fixed by `schemas/knowledge.KnowledgeImportIn`; a worked example lives
in `planning/learner-state-v1-execution-plan.md` appendix A.

Idempotent: items are matched by label inside the space, so re-running after an
edit creates only what is new. Edges that would close a cycle are skipped and
counted rather than aborting the import.

Prints the derived state afterwards, so the draft can be judged by what it
produces -- not by how it reads. If the outer fringe is nonsense, the draft is
wrong, and that is the whole point of running this.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.database import AsyncSessionLocal, engine
from schemas.knowledge import KnowledgeImportIn
from services import knowledge_service


async def main() -> int:
    parser = argparse.ArgumentParser(description="Seed a knowledge structure.")
    parser.add_argument("draft", type=Path, help="draft JSON (see appendix A)")
    parser.add_argument("--project-id", required=True, help="target learn space")
    parser.add_argument(
        "--user-id",
        default=None,
        help="whose state to print; omit to skip the derived-state report",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="parse and validate only; write nothing",
    )
    args = parser.parse_args()

    if not args.draft.is_file():
        print(f"draft not found: {args.draft}", file=sys.stderr)
        return 2

    raw = json.loads(args.draft.read_text(encoding="utf-8"))
    payload = KnowledgeImportIn.model_validate(raw)
    print(f"draft: {len(payload.items)} item(s), {len(payload.edges)} edge(s)")

    if args.dry_run:
        print("dry run: nothing written")
        return 0

    import uuid

    project_id = uuid.UUID(args.project_id)
    try:
        async with AsyncSessionLocal() as db:
            result = await knowledge_service.import_structure(
                db, project_id=project_id, payload=payload
            )
            print(
                f"items: {result.items_created} created / {result.items_reused} reused"
            )
            print(
                f"edges: {result.edges_created} created / "
                f"{result.edges_skipped} skipped (duplicate or would-cycle)"
            )

            if args.user_id:
                user_id = uuid.UUID(args.user_id)
                structure = await knowledge_service.build_structure_out(
                    db, project_id=project_id, user_id=user_id
                )
                labels = {row.id: row.label for row in structure.items}
                for state in structure.states:
                    origin = state.origin or "-"
                    print(
                        f"  [{state.value:13}] {origin:9} "
                        f"{state.evidence_count:>2} rec  {state.label}"
                    )
                print(
                    "outer fringe:",
                    [labels.get(i, str(i)) for i in structure.outer_fringe],
                )
                print(
                    "inner fringe:",
                    [labels.get(i, str(i)) for i in structure.inner_fringe],
                )
                if structure.violations:
                    print(f"violations: {len(structure.violations)} (see /structure)")
    finally:
        await engine.dispose()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

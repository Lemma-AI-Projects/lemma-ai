# PORTABLE — how to take `ai/knowledge/` somewhere else

This directory is the **analysis core**: it decides whether a piece of evidence
counts (`admit`), derives the learner's state from a structure and its evidence
(`derive_state` / `compute_fringes`), and lets that evidence revise the
structure itself (`revise` — an edge contradicted twice is retired, unless a
person confirmed it). It is meant to be liftable into another project without
dragging Lemma along.

That is a claim, so it is enforced rather than asserted:

* `tests/ai/knowledge/test_portability.py` scans every module in this package
  and **fails** if one imports `models`, `services`, `fastapi`, `sqlalchemy`,
  `core`, any other `ai.*` sibling, or anything else outside the standard
  library.
* This file is the copy-out procedure. It has been run.

---

## 1. What to copy

| From (repo) | To (new root) | Why |
|---|---|---|
| `backend/ai/knowledge/__init__.py` | `ai/knowledge/__init__.py` | package surface |
| `backend/ai/knowledge/state.py` | `ai/knowledge/state.py` | the whole instrument |
| `backend/tests/ai/knowledge/test_state.py` | `test_state.py` | the self-test |

**And one file you must write yourself: an empty `ai/__init__.py`.**

This is the one sharp edge, so it is stated plainly: importing `ai.knowledge`
also imports its parent package `ai`, and *this repo's* `ai/__init__.py` imports
the entire framework (pydantic_ai, openai, fastapi, the tool registry). That
file is not part of the core and must not be copied. The core only needs the
parent package to exist and be empty.

## 2. Minimal dependencies

* **Python ≥ 3.11** — `enum.StrEnum` is used.
* **Nothing else.** No `pip install`, no `requirements.txt`. Only `dataclasses`,
  `enum`, `datetime`, `collections.abc` and `__future__` from the standard
  library. (There is no pydantic here; the core works on plain frozen
  dataclasses.)

## 3. Run its own self-test

POSIX shell:

```sh
tmp=$(mktemp -d)
mkdir -p "$tmp/ai"
: > "$tmp/ai/__init__.py"                                   # empty parent package
cp -r backend/ai/knowledge "$tmp/ai/knowledge"
cp backend/tests/ai/knowledge/test_state.py "$tmp/test_state.py"

cd "$tmp"
PYTHONPATH=. python -m pytest test_state.py -q
```

Windows PowerShell:

```powershell
$tmp = Join-Path $env:TEMP ("portable-core-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path "$tmp\ai" -Force | Out-Null
New-Item -ItemType File -Path "$tmp\ai\__init__.py" -Force | Out-Null
Copy-Item -Recurse "backend\ai\knowledge" "$tmp\ai\knowledge"
Copy-Item "backend\tests\ai\knowledge\test_state.py" "$tmp\test_state.py"

Set-Location $tmp
$env:PYTHONPATH = "."
python -m pytest test_state.py -q
```

Expected: the whole pure-instrument suite passes (admissibility, the two closure
rules, fringes, the lower-set invariant, structure revision — count, threshold,
idempotence, order-independence, human-review immunity — and the summarize
discipline). No network, no database, no model.

## 4. What is deliberately *not* part of the core

* The `knowledge_items` / `knowledge_edges` / `knowledge_evidence` tables and
  their SQLAlchemy models (`models/knowledge.py`) — persistence belongs to the
  host project. That includes the two columns `revise` cares about,
  `counterexample_count` and `confidence`: the core carries them as plain fields
  on `Edge` and never learns they are columns. **"Retired" is not one of them** —
  only the count is stored, and whether an edge is retired is recomputed on every
  call (`revise`), which is why adding this channel needed no migration.
* `services/knowledge_service.py` and `services/evidence_entry.py` — the
  adapters that map a host's scope (`space:<id>`) to storage and call `admit` /
  `derive_state`. They know about projects; the core does not.
* `test_portability.py` — it scans *this repo's* package path and has no meaning
  outside it. The self-test above is `test_state.py`.


---

## This is the core; it is not the whole loop

The procedure above is about keeping this directory liftable. Whether anything **calls** it is a separate question, answered in `EVIDENCE_FLOW.md` — which records that production has two entry points, and that Free Course's `CourseLessonObservation` is only ever `count()`ed, never admitted.

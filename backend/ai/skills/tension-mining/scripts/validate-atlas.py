#!/usr/bin/env python3
"""
Atlas Validation Script for Tension Mining project.

Validates cross-references, ID formats, and structural integrity
of tension-atlas.md and invariant-atlas.md in the references/ directory.

Usage:
    python scripts/validate-atlas.py
    python scripts/validate-atlas.py --atlas-dir /path/to/references

Exit codes:
    0 = all checks passed
    1 = errors found
"""

import re
import os
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# ANSI color helpers
# ---------------------------------------------------------------------------

class Color:
    RESET   = "\033[0m"
    BOLD    = "\033[1m"
    RED     = "\033[91m"
    GREEN   = "\033[92m"
    YELLOW  = "\033[93m"
    CYAN    = "\033[96m"
    DIM     = "\033[2m"


def _supports_color() -> bool:
    """Detect whether the terminal supports ANSI escape codes."""
    if os.environ.get("NO_COLOR"):
        return False
    if os.environ.get("TERM") in ("dumb", ""):
        return False
    if sys.platform == "win32":
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32
            # ENABLE_VIRTUAL_TERMINAL_PROCESSING = 0x0004
            handle = kernel32.GetStdHandle(-11)  # STD_OUTPUT_HANDLE
            mode = ctypes.c_ulong()
            kernel32.GetConsoleMode(handle, ctypes.byref(mode))
            kernel32.SetConsoleMode(handle, mode.value | 0x0004)
            return True
        except Exception:
            return False
    return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()


USE_COLOR = _supports_color()


def styled(text: str, *codes: str) -> str:
    if not USE_COLOR:
        return text
    return "".join(codes) + text + Color.RESET


def pass_msg(msg: str) -> str:
    return styled(f"  PASS  {msg}", Color.GREEN)


def fail_msg(msg: str) -> str:
    return styled(f"  FAIL  {msg}", Color.RED)


def warn_msg(msg: str) -> str:
    return styled(f"  WARN  {msg}", Color.YELLOW)


def section(title: str) -> str:
    return styled(f"\n{'=' * 60}\n  {title}\n{'=' * 60}", Color.BOLD, Color.CYAN)


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

TENSION_ID_RE = re.compile(r"(T-[A-Z]{3}-\d{3})")
INVARIANT_ID_RE = re.compile(r"(I-[A-Z]{3}-\d{3})")
TENSION_HEADER_RE = re.compile(
    r"^###\s+(T-[A-Z]{3}-\d{3})\s*:\s*(.+)$"
)
INVARIANT_HEADER_RE = re.compile(
    r"^###\s+(I-[A-Z]{3}-\d{3})\s*:\s*(.+)$"
)
MARKER_RE = re.compile(r"\[(CORE|EXPERIMENTAL)\]")
RELATED_INVARIANTS_RE = re.compile(r"Related invariants?:\s*(.+)")
RELATED_TENSIONS_RE = re.compile(r"Related tensions?:\s*(.+)")
BACKTICK_ID_RE = re.compile(r"`([TI]-[A-Z]{3}-\d{3})`")


def extract_ids_from_backticks(line: str) -> list[str]:
    """Extract all backtick-wrapped IDs from a line."""
    return BACKTICK_ID_RE.findall(line)


def parse_atlas_file(filepath: str, kind: str) -> dict:
    """
    Parse an atlas markdown file and return structured data.

    Args:
        filepath: Path to the atlas .md file.
        kind: 'tension' or 'invariant'.

    Returns:
        dict with keys:
            ids: list of all IDs found in headers
            markers: dict mapping ID -> marker ('CORE', 'EXPERIMENTAL', or None)
            references: dict mapping ID -> list of referenced IDs
            lines: raw lines of the file (for duplicate ID detection)
    """
    ids = []
    markers = {}
    references = {}
    current_id = None

    header_re = TENSION_HEADER_RE if kind == "tension" else INVARIANT_HEADER_RE
    related_re = RELATED_INVARIANTS_RE if kind == "tension" else RELATED_TENSIONS_RE

    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")

            # Check for header with ID
            m = header_re.match(line)
            if m:
                entry_id = m.group(1)
                rest = m.group(2)
                marker_match = MARKER_RE.search(rest)
                marker = f"[{marker_match.group(1)}]" if marker_match else None
                ids.append(entry_id)
                markers[entry_id] = marker
                references[entry_id] = []
                current_id = entry_id
                continue

            # Check for related references line (may start with "- **")
            if current_id:
                m = related_re.search(line)
                if m:
                    refs = extract_ids_from_backticks(m.group(1))
                    references[current_id] = refs
                    current_id = None  # only one related line per entry

    return {"ids": ids, "markers": markers, "references": references}


# ---------------------------------------------------------------------------
# Validation checks
# ---------------------------------------------------------------------------

class ValidationResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.warnings = 0

    def record(self, status: str):
        if status == "PASS":
            self.passed += 1
        elif status == "FAIL":
            self.failed += 1
        elif status == "WARN":
            self.warnings += 1

    @property
    def has_errors(self) -> bool:
        return self.failed > 0


def check_id_format(ids: list[str], kind: str, result: ValidationResult) -> None:
    """Validate that all IDs match the expected format."""
    print(styled(f"  Checking {kind} ID format ({len(ids)} IDs) ...", Color.DIM))
    pattern = TENSION_ID_RE if kind == "tension" else INVARIANT_ID_RE
    all_valid = True
    for entry_id in ids:
        if not pattern.fullmatch(entry_id):
            print(fail_msg(f"Invalid {kind} ID format: {entry_id}"))
            result.record("FAIL")
            all_valid = False
    if all_valid:
        print(pass_msg(f"All {len(ids)} {kind} IDs match expected format"))
        result.record("PASS")


def check_duplicate_ids(ids: list[str], kind: str, result: ValidationResult) -> None:
    """Check for duplicate IDs."""
    print(styled(f"  Checking for duplicate {kind} IDs ...", Color.DIM))
    seen = {}
    duplicates = []
    for entry_id in ids:
        if entry_id in seen:
            duplicates.append(entry_id)
        else:
            seen[entry_id] = True
    if duplicates:
        for dup in set(duplicates):
            print(fail_msg(f"Duplicate {kind} ID: {dup}"))
            result.record("FAIL")
    else:
        print(pass_msg(f"No duplicate {kind} IDs found"))
        result.record("PASS")


def check_cross_references(
    source_kind: str,
    source_data: dict,
    target_ids: set,
    target_kind: str,
    result: ValidationResult,
) -> None:
    """Verify that all cross-references point to existing IDs."""
    print(
        styled(
            f"  Checking {source_kind} -> {target_kind} cross-references ...",
            Color.DIM,
        )
    )
    all_valid = True
    for src_id, refs in source_data["references"].items():
        for ref_id in refs:
            if ref_id not in target_ids:
                print(
                    fail_msg(
                        f"{src_id} references {target_kind} {ref_id} which does not exist"
                    )
                )
                result.record("FAIL")
                all_valid = False
    if all_valid:
        total_refs = sum(len(v) for v in source_data["references"].values())
        print(
            pass_msg(
                f"All {total_refs} {source_kind} -> {target_kind} references are valid"
            )
        )
        result.record("PASS")


def check_markers(data: dict, kind: str, result: ValidationResult) -> None:
    """Report marker statistics."""
    core_count = sum(1 for m in data["markers"].values() if m == "[CORE]")
    exp_count = sum(1 for m in data["markers"].values() if m == "[EXPERIMENTAL]")
    unmarked = sum(1 for m in data["markers"].values() if m is None)
    total = len(data["markers"])

    print(
        styled(
            f"  {kind.capitalize()} marker summary: "
            f"{core_count} [CORE], {exp_count} [EXPERIMENTAL], {unmarked} unmarked "
            f"(total: {total})",
            Color.DIM,
        )
    )
    if unmarked > 0:
        print(warn_msg(f"{unmarked} {kind}(s) have no [CORE]/[EXPERIMENTAL] marker"))
        result.record("WARN")


def check_redundant_root_files(project_root: str, result: ValidationResult) -> None:
    """Warn if tension-atlas.md or invariant-atlas.md exist in the project root."""
    print(styled("  Checking for redundant root-level atlas files ...", Color.DIM))
    redundant = []
    for name in ("tension-atlas.md", "invariant-atlas.md"):
        candidate = os.path.join(project_root, name)
        if os.path.isfile(candidate):
            redundant.append(name)
    if redundant:
        for name in redundant:
            print(
                warn_msg(
                    f"Redundant file found: ./{name} "
                    f"(canonical version is in references/{name})"
                )
            )
            result.record("WARN")
    else:
        print(pass_msg("No redundant root-level atlas files"))
        result.record("PASS")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    project_root = Path(__file__).resolve().parent.parent
    atlas_dir = project_root / "references"

    tension_path = atlas_dir / "tension-atlas.md"
    invariant_path = atlas_dir / "invariant-atlas.md"

    # Verify files exist
    for p, name in [(tension_path, "tension-atlas.md"), (invariant_path, "invariant-atlas.md")]:
        if not p.is_file():
            print(fail_msg(f"Required file not found: {p}"))
            return 1

    result = ValidationResult()

    # Parse both atlas files
    tension_data = parse_atlas_file(str(tension_path), "tension")
    invariant_data = parse_atlas_file(str(invariant_path), "invariant")

    tension_ids = set(tension_data["ids"])
    invariant_ids = set(invariant_data["ids"])

    # --- Tension checks ---
    print(section("Tension Atlas Validation"))
    check_id_format(tension_data["ids"], "tension", result)
    check_duplicate_ids(tension_data["ids"], "tension", result)
    check_markers(tension_data, "tension", result)
    check_cross_references("tension", tension_data, invariant_ids, "invariant", result)

    # --- Invariant checks ---
    print(section("Invariant Atlas Validation"))
    check_id_format(invariant_data["ids"], "invariant", result)
    check_duplicate_ids(invariant_data["ids"], "invariant", result)
    check_markers(invariant_data, "invariant", result)
    check_cross_references("invariant", invariant_data, tension_ids, "tension", result)

    # --- Redundant file check ---
    print(section("Repository Hygiene"))
    check_redundant_root_files(str(project_root), result)

    # --- Summary ---
    print(section("Summary"))
    total = result.passed + result.failed + result.warnings
    print(
        f"  Total checks: {total}  |  "
        f"{styled(str(result.passed), Color.GREEN)} passed  |  "
        f"{styled(str(result.failed), Color.RED)} failed  |  "
        f"{styled(str(result.warnings), Color.YELLOW)} warnings"
    )

    if result.has_errors:
        print(styled("\n  VALIDATION FAILED", Color.BOLD, Color.RED))
        return 1
    else:
        print(styled("\n  ALL CHECKS PASSED", Color.BOLD, Color.GREEN))
        return 0


if __name__ == "__main__":
    sys.exit(main())

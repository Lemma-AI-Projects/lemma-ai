"""
Unit tests for scripts/validate-atlas.py.

Tests ID format validation, duplicate detection, cross-reference checking,
marker counting, and redundant file detection in isolation.
"""

import os
import sys
import tempfile
from pathlib import Path

import pytest

# Add scripts/ to the path so we can import validate_atlas
import importlib.util

# Import validate-atlas.py via importlib since it has a hyphen in the name
_SCRIPT_PATH = Path(__file__).resolve().parent.parent / "scripts" / "validate-atlas.py"
_spec = importlib.util.spec_from_file_location("validate_atlas", _SCRIPT_PATH)
va = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(va)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def result():
    """Provide a fresh ValidationResult for each test."""
    return va.ValidationResult()


# ---------------------------------------------------------------------------
# ID Format Validation
# ---------------------------------------------------------------------------

class TestIdFormat:
    def test_valid_tension_ids(self, result):
        ids = ["T-LOC-004", "T-FRE-006", "T-AUT-005", "T-EXP-001", "T-ORD-021"]
        va.check_id_format(ids, "tension", result)
        assert result.failed == 0

    def test_valid_invariant_ids(self, result):
        ids = ["I-LCG-001", "I-CRS-001", "I-GDM-001", "I-TAE-001", "I-RRR-001"]
        va.check_id_format(ids, "invariant", result)
        assert result.failed == 0

    def test_invalid_tension_ids(self, result):
        ids = [
            "T-LOC-abc",      # non-numeric suffix
            "T-LO-004",       # only 2 letter domain
            "X-LOC-004",      # wrong prefix
            "T-loc-004",      # lowercase domain
            "T-LOC-04",       # only 2 digit number
            "invalid",        # completely wrong
        ]
        va.check_id_format(ids, "tension", result)
        assert result.failed == len(ids)

    def test_invalid_invariant_ids(self, result):
        ids = ["I-123-001", "I-LCG-ABC", "X-LCG-001", "I-LCG-01"]
        va.check_id_format(ids, "invariant", result)
        assert result.failed == len(ids)

    def test_empty_ids_list(self, result):
        va.check_id_format([], "tension", result)
        assert result.failed == 0
        assert result.passed == 1


# ---------------------------------------------------------------------------
# Duplicate ID Detection
# ---------------------------------------------------------------------------

class TestDuplicateIds:
    def test_no_duplicates(self, result):
        ids = ["T-LOC-004", "T-FRE-006", "T-AUT-005"]
        va.check_duplicate_ids(ids, "tension", result)
        assert result.failed == 0

    def test_single_duplicate(self, result):
        ids = ["T-LOC-004", "T-LOC-004", "T-FRE-006"]
        va.check_duplicate_ids(ids, "tension", result)
        assert result.failed == 1

    def test_multiple_duplicates(self, result):
        ids = ["T-LOC-004", "T-LOC-004", "T-FRE-006", "T-FRE-006"]
        va.check_duplicate_ids(ids, "tension", result)
        assert result.failed == 2

    def test_empty_list(self, result):
        va.check_duplicate_ids([], "tension", result)
        assert result.failed == 0

    def test_all_unique_long_list(self, result):
        ids = [f"T-LOC-{i:03d}" for i in range(50)]
        va.check_duplicate_ids(ids, "tension", result)
        assert result.failed == 0


# ---------------------------------------------------------------------------
# Cross-Reference Validation
# ---------------------------------------------------------------------------

class TestCrossReferences:
    def test_all_references_valid(self, result):
        source_data = {
            "references": {
                "T-LOC-004": ["I-LCG-001", "I-GDM-001"],
                "T-FRE-006": ["I-IDC-001"],
            }
        }
        target_ids = {"I-LCG-001", "I-GDM-001", "I-IDC-001"}
        va.check_cross_references("tension", source_data, target_ids, "invariant", result)
        assert result.failed == 0

    def test_missing_reference(self, result):
        source_data = {
            "references": {
                "T-LOC-004": ["I-LCG-001", "I-DOES-999"],
            }
        }
        target_ids = {"I-LCG-001"}
        va.check_cross_references("tension", source_data, target_ids, "invariant", result)
        assert result.failed == 1

    def test_multiple_missing_references(self, result):
        source_data = {
            "references": {
                "T-LOC-004": ["I-MISS-001", "I-MISS-002"],
                "T-FRE-006": ["I-MISS-001"],
            }
        }
        target_ids = set()
        va.check_cross_references("tension", source_data, target_ids, "invariant", result)
        assert result.failed == 3

    def test_empty_references(self, result):
        source_data = {"references": {}}
        target_ids = {"I-LCG-001", "I-GDM-001"}
        va.check_cross_references("tension", source_data, target_ids, "invariant", result)
        assert result.failed == 0

    def test_self_reference_not_allowed(self, result):
        """Self-references should be caught as non-existent if not in target."""
        source_data = {
            "references": {
                "T-LOC-004": ["T-LOC-004"],  # self-reference as invariant
            }
        }
        target_ids = {"I-LCG-001"}
        va.check_cross_references("tension", source_data, target_ids, "invariant", result)
        assert result.failed == 1


# ---------------------------------------------------------------------------
# Marker Counting
# ---------------------------------------------------------------------------

class TestMarkers:
    def test_all_core(self, result):
        data = {"markers": {"I-A-001": "[CORE]", "I-B-002": "[CORE]"}}
        va.check_markers(data, "invariant", result)
        assert result.warnings == 0  # no unmarked

    def test_mixed_markers(self, result):
        data = {
            "markers": {
                "I-A-001": "[CORE]",
                "I-B-002": "[EXPERIMENTAL]",
                "I-C-003": None,
            }
        }
        va.check_markers(data, "invariant", result)
        assert result.warnings == 1  # one unmarked

    def test_all_experimental(self, result):
        data = {
            "markers": {"I-A-001": "[EXPERIMENTAL]", "I-B-002": "[EXPERIMENTAL]"},
        }
        va.check_markers(data, "invariant", result)
        assert result.warnings == 0

    def test_all_unmarked(self, result):
        data = {"markers": {"I-A-001": None, "I-B-002": None}}
        va.check_markers(data, "invariant", result)
        assert result.warnings == 1  # one WARN line for all unmarked

    def test_empty_markers(self, result):
        data = {"markers": {}}
        va.check_markers(data, "invariant", result)
        assert result.warnings == 0


# ---------------------------------------------------------------------------
# Redundant Root File Detection
# ---------------------------------------------------------------------------

class TestRedundantRootFiles:
    def test_no_redundant_files(self, result):
        with tempfile.TemporaryDirectory() as tmpdir:
            va.check_redundant_root_files(tmpdir, result)
        assert result.warnings == 0

    def test_redundant_tension_atlas(self, result):
        with tempfile.TemporaryDirectory() as tmpdir:
            Path(tmpdir, "tension-atlas.md").touch()
            va.check_redundant_root_files(tmpdir, result)
        assert result.warnings == 1

    def test_redundant_invariant_atlas(self, result):
        with tempfile.TemporaryDirectory() as tmpdir:
            Path(tmpdir, "invariant-atlas.md").touch()
            va.check_redundant_root_files(tmpdir, result)
        assert result.warnings == 1

    def test_both_redundant(self, result):
        with tempfile.TemporaryDirectory() as tmpdir:
            Path(tmpdir, "tension-atlas.md").touch()
            Path(tmpdir, "invariant-atlas.md").touch()
            va.check_redundant_root_files(tmpdir, result)
        assert result.warnings == 2

    def test_other_files_ignored(self, result):
        with tempfile.TemporaryDirectory() as tmpdir:
            Path(tmpdir, "README.md").touch()
            Path(tmpdir, "SKILL.md").touch()
            va.check_redundant_root_files(tmpdir, result)
        assert result.warnings == 0


# ---------------------------------------------------------------------------
# Parse Atlas File (Integration-style)
# ---------------------------------------------------------------------------

class TestParseAtlasFile:
    def test_parse_tension_file(self):
        """Parse a minimal tension atlas to verify ID extraction."""
        content = """
### T-LOC-004: Local vs Global [CORE]
- **Related invariants:** `I-LCG-001`, `I-GDM-001`

### T-FRE-006: Freedom vs Efficiency [EXPERIMENTAL]
- **Related invariants:** `I-IDC-001`
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
            f.write(content)
            tmp = f.name

        try:
            data = va.parse_atlas_file(tmp, "tension")
            assert data["ids"] == ["T-LOC-004", "T-FRE-006"]
            assert data["markers"]["T-LOC-004"] == "[CORE]"
            assert data["markers"]["T-FRE-006"] == "[EXPERIMENTAL]"
            assert data["references"]["T-LOC-004"] == ["I-LCG-001", "I-GDM-001"]
            assert data["references"]["T-FRE-006"] == ["I-IDC-001"]
        finally:
            os.unlink(tmp)

    def test_parse_invariant_file(self):
        """Parse a minimal invariant atlas to verify ID extraction."""
        content = """
### I-LCG-001: Local Rules Create Global Order [CORE]
- **Related tensions:** `T-LOC-004`, `T-CEN-011`

### I-PAF-001: Preferential Attachment [EXPERIMENTAL]
- **Related tensions:** `T-COP-015`
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
            f.write(content)
            tmp = f.name

        try:
            data = va.parse_atlas_file(tmp, "invariant")
            assert data["ids"] == ["I-LCG-001", "I-PAF-001"]
            assert data["markers"]["I-LCG-001"] == "[CORE]"
            assert data["markers"]["I-PAF-001"] == "[EXPERIMENTAL]"
            assert data["references"]["I-LCG-001"] == ["T-LOC-004", "T-CEN-011"]
            assert data["references"]["I-PAF-001"] == ["T-COP-015"]
        finally:
            os.unlink(tmp)

    def test_parse_empty_file(self):
        """An empty file should produce empty data."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
            f.write("")
            tmp = f.name

        try:
            data = va.parse_atlas_file(tmp, "tension")
            assert data["ids"] == []
            assert data["markers"] == {}
            assert data["references"] == {}
        finally:
            os.unlink(tmp)

    def test_parse_no_headers(self):
        """File with content but no headers should produce no IDs."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
            f.write("Just some text\n\nNo headers here\n")
            tmp = f.name

        try:
            data = va.parse_atlas_file(tmp, "tension")
            assert data["ids"] == []
        finally:
            os.unlink(tmp)


# ---------------------------------------------------------------------------
# ValidationResult Accumulation
# ---------------------------------------------------------------------------

class TestValidationResult:
    def test_initial_state(self):
        r = va.ValidationResult()
        assert r.passed == 0
        assert r.failed == 0
        assert r.warnings == 0
        assert not r.has_errors

    def test_record_pass(self):
        r = va.ValidationResult()
        r.record("PASS")
        assert r.passed == 1
        assert not r.has_errors

    def test_record_fail(self):
        r = va.ValidationResult()
        r.record("FAIL")
        assert r.failed == 1
        assert r.has_errors

    def test_record_warn(self):
        r = va.ValidationResult()
        r.record("WARN")
        assert r.warnings == 1
        assert not r.has_errors

    def test_mixed_records(self):
        r = va.ValidationResult()
        r.record("PASS")
        r.record("PASS")
        r.record("FAIL")
        r.record("WARN")
        assert r.passed == 2
        assert r.failed == 1
        assert r.warnings == 1
        assert r.has_errors

    def test_invalid_status(self):
        r = va.ValidationResult()
        r.record("INVALID")
        assert r.passed == 0
        assert r.failed == 0
        assert r.warnings == 0
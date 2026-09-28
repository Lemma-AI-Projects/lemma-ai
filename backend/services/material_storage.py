"""Space materials on local disk — the one module that touches the bytes.

**Local-first on purpose, and not a placeholder.** Callers hand over bytes and
get back a key; they never learn whether those bytes landed on this machine or in
an object store. `pages.storage_key` means "the key", not "a path"; the day the
materials move to the cloud, this module is replaced and nothing else moves.

Rules live here rather than at the call site, because a second upload surface
must not be able to forget them:

  - **Type whitelist.** PDF and images. Anything else is refused with a reason the
    UI can show, instead of being stored and then failing to render.
  - **Size ceiling.** 50 MB — a scanned PDF fits, and it is small enough to hold
    in memory while copying.
  - **Names are data, never paths.** The original filename is kept for the user;
    the key is generated from a UUID. A file called `../../etc/passwd` is a title,
    not a location.
"""

from __future__ import annotations

import contextlib
import uuid
from pathlib import Path

from core.config import settings


class MaterialError(Exception):
    """Something the caller can put in front of a user, in their language.

    Carries the HTTP status the API should answer with, so the mapping lives next
    to the rule that produced it instead of being re-derived from the message at
    the call site — which is how a 413 quietly turns into a 415.
    """

    def __init__(self, message: str, *, status: int = 415) -> None:
        super().__init__(message)
        self.status = status


#: Content types a learn space accepts, and the extension each is stored with.
#: Keys are what the browser declares; a lying client only hurts itself (the file
#: is served back with this same type).
ALLOWED_MIME: dict[str, str] = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

MAX_BYTES = 50 * 1024 * 1024


def root() -> Path:
    """Where materials live.

    `settings.material_storage_dir` wins when set (tests point it at a temp dir);
    otherwise `backend/var/materials`, which is gitignored — uploaded bytes are
    the user's, not the repository's.
    """
    configured = (settings.material_storage_dir or "").strip()
    base = (
        Path(configured)
        if configured
        else Path(__file__).resolve().parents[1] / "var"
    )
    return base / "materials"


def save(*, project_id: uuid.UUID, mime: str, data: bytes) -> str:
    """Write the bytes under the space's folder and return the key."""
    extension = ALLOWED_MIME.get((mime or "").split(";")[0].strip().lower())
    if extension is None:
        raise MaterialError("只支持 PDF 与图片（PNG / JPG / WebP / GIF）。")
    if not data:
        raise MaterialError("这个文件是空的。")
    if len(data) > MAX_BYTES:
        raise MaterialError("文件超过 50 MB。", status=413)

    key = f"{project_id}/{uuid.uuid4().hex}{extension}"
    path = root() / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return key


def path_of(key: str) -> Path:
    """Absolute path for a key, refusing anything that escapes the root."""
    base = root().resolve()
    candidate = (base / key).resolve()
    if not candidate.is_relative_to(base):
        raise MaterialError("这个文件不在资料库里。")
    return candidate


def delete(key: str | None) -> None:
    """Remove the bytes, and the space's folder if that emptied it.

    Best-effort throughout: a file that is already gone is the goal, not an
    error. The `rmdir` is what makes a *refused* upload leave no trace at all —
    otherwise a rejected cross-tenant attempt would still have created a folder
    named after somebody else's space.
    """
    if not key:
        return
    try:
        path = path_of(key)
        path.unlink(missing_ok=True)
        with contextlib.suppress(OSError):
            path.parent.rmdir()  # only succeeds while empty
    except (OSError, MaterialError):
        pass

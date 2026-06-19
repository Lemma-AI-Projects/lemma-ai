"""Supabase Storage boundary — the only module that imports boto3 / supabase.

One private bucket, two protocols (Supabase exposes both S3 and REST over the
same objects):

- WRITE / DELETE go through boto3 against the Supabase S3-compatible endpoint.
  ``upload_file`` with a ``TransferConfig`` does automatic multipart — the only
  reliable way to move a 0.5-1.5 GB lecture. The SDK's own ``.upload()`` is a
  single PUT (officially recommended only <=6 MB) and must NEVER carry a video.
  Celery tasks build their OWN boto3 client (per-task discipline, mirroring
  ai/native/gemini_video.py) — never reuse one across tasks/loops.
- SIGN (download / playback) goes through the supabase SDK ``create_signed_url``:
  the native, CDN-backed path a browser can range/seek and CORS against. The SDK
  is synchronous, so the API request path wraps it in ``anyio.to_thread`` (same
  pattern core/security.py uses for JWT decode).

Credentials are split on purpose: S3 access keys authorize writes/deletes, the
service-role key authorizes signing. Nothing here reaches the frontend — callers
only ever hand out short-lived signed URLs.
"""

from __future__ import annotations

import logging
from typing import Any

import anyio
import boto3
from boto3.s3.transfer import TransferConfig
from botocore.config import Config as BotoConfig
from supabase import Client, create_client

from core.config import settings

logger = logging.getLogger(__name__)


class StorageError(Exception):
    """A storage operation could not complete (config missing or API failure)."""


# Multipart so no single part rides a giant request; parts upload in parallel.
_TRANSFER_CONFIG = TransferConfig(
    multipart_threshold=8 * 1024 * 1024,
    multipart_chunksize=8 * 1024 * 1024,
    max_concurrency=max(1, settings.video_download_concurrency),
    use_threads=True,
)

# Supabase's S3 endpoint needs path-style addressing (like MinIO), not the
# virtual-hosted style boto3 defaults to.
_BOTO_CONFIG = BotoConfig(s3={"addressing_style": "path"})

# Shared sync SDK client for the web process (signing only). Celery does not
# sign, so it never touches this.
_signing_client: Client | None = None


def build_s3_client() -> Any:
    """A fresh boto3 S3 client for the Supabase endpoint (Celery: one per task)."""
    if not settings.supabase_s3_endpoint:
        raise StorageError("SUPABASE_S3_ENDPOINT is not configured")
    return boto3.client(
        "s3",
        endpoint_url=settings.supabase_s3_endpoint,
        region_name=settings.supabase_s3_region,
        aws_access_key_id=settings.supabase_s3_access_key_id,
        aws_secret_access_key=settings.supabase_s3_secret_access_key,
        config=_BOTO_CONFIG,
    )


def upload_file(client: Any, *, local_path: str, key: str, content_type: str) -> None:
    """Multipart-upload a local file into the private bucket under ``key``."""
    client.upload_file(
        local_path,
        settings.supabase_storage_bucket,
        key,
        ExtraArgs={"ContentType": content_type},
        Config=_TRANSFER_CONFIG,
    )


def delete_objects(client: Any, *, keys: list[str]) -> None:
    """Best-effort delete by key — one missing/odd key never blocks the rest."""
    for key in keys:
        try:
            client.delete_object(Bucket=settings.supabase_storage_bucket, Key=key)
        except Exception:  # noqa: BLE001 — cleanup must tolerate a bad/gone key
            logger.exception("failed to delete storage object %s", key)


def _get_signing_client() -> Client:
    global _signing_client
    if _signing_client is None:
        if not settings.supabase_service_role_key:
            raise StorageError("SUPABASE_SERVICE_ROLE_KEY is not configured")
        _signing_client = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )
    return _signing_client


def _create_signed_url_sync(key: str, expires_in: int) -> str:
    bucket = _get_signing_client().storage.from_(settings.supabase_storage_bucket)
    response = bucket.create_signed_url(key, expires_in)
    url = response.get("signedURL") or response.get("signedUrl")
    if not url:
        raise StorageError(f"storage returned no signed url for {key}")
    return url


async def create_signed_url(key: str, *, expires_in: int) -> str:
    """Mint a short-lived signed playback URL (runs the sync SDK off the loop)."""
    return await anyio.to_thread.run_sync(_create_signed_url_sync, key, expires_in)


def _ensure_bucket_sync() -> None:
    client = _get_signing_client()
    bucket = settings.supabase_storage_bucket
    try:
        client.storage.get_bucket(bucket)
        return
    except Exception:  # noqa: BLE001 — not found / transient: fall through to create
        pass
    try:
        client.storage.create_bucket(bucket, options={"public": False})
    except Exception as exc:  # noqa: BLE001
        if "exist" in str(exc).lower():
            return  # created concurrently — fine
        raise StorageError(f"could not ensure bucket '{bucket}': {exc}") from exc


async def ensure_bucket() -> None:
    """Create the PRIVATE bucket if missing (idempotent). Provisioning helper for
    setup scripts / smoke only — never call this from the request path."""
    await anyio.to_thread.run_sync(_ensure_bucket_sync)

"""Volcengine (字节火山) voice provider — STT (ASR) + TTS.

Implements the openspeech RESTful API with its HMAC-SHA256 request signing.
Two auth layers are required by Volcengine:
  1. HTTP Authorization header — signed with access_key / secret_key.
  2. request-body `app.token` — the app resource token (separate credential).

NOTE: the exact signing scope / cluster / model names are taken from the
openspeech docs and MUST be validated live with real credentials. The
*structure* (signing helper + swappable provider) is the reusable part; the
field values are the only thing that may need a tweak once a key is in hand.
"""

import base64
import hashlib
import hmac
import json
import time
import uuid

import httpx

from voice.errors import VoiceProviderError

_VOLC_HOST = "openspeech.bytedance.com"
_VOLC_REGION = "cn-north-1"
_VOLC_SERVICE = "openspeech"
_VOLC_ASR_URL = f"https://{_VOLC_HOST}/api/v1/asr"
_VOLC_TTS_URL = f"https://{_VOLC_HOST}/api/v1/tts"

# openspeech success codes (documented).
_ASR_OK = 1000
_TTS_OK = 3000


def _hmac_sha256(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def _sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class _VolcAuth:
    """HMAC-SHA256 request signing for Volcengine openspeech (SignV4-style)."""

    def __init__(self, access_key: str, secret_key: str) -> None:
        self._access_key = access_key
        self._secret_key = secret_key.encode("utf-8")

    def signed_headers(self, method: str, path: str, body: bytes) -> dict[str, str]:
        date_stamp = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
        payload_hash = _sha256_hex(body)
        signed_names = ["host", "x-content-sha256", "x-date"]
        canonical_headers = (
            f"host:{_VOLC_HOST}\n"
            f"x-content-sha256:{payload_hash}\n"
            f"x-date:{date_stamp}\n"
        )
        canonical_request = "\n".join(
            [
                method,
                path,
                "",  # canonical query string (none)
                canonical_headers,
                ";".join(signed_names),
                payload_hash,
            ]
        )
        scope = f"{date_stamp[:8]}/{_VOLC_REGION}/{_VOLC_SERVICE}/request"
        string_to_sign = "\n".join(
            [
                "HMAC-SHA256",
                date_stamp,
                scope,
                _sha256_hex(canonical_request.encode("utf-8")),
            ]
        )
        k_date = _hmac_sha256(self._secret_key, date_stamp[:8])
        k_region = _hmac_sha256(k_date, _VOLC_REGION)
        k_service = _hmac_sha256(k_region, _VOLC_SERVICE)
        k_signing = _hmac_sha256(k_service, "request")
        signature = hmac.new(
            k_signing, string_to_sign.encode("utf-8"), hashlib.sha256
        ).hexdigest()
        authorization = (
            f"HMAC-SHA256 Credential={self._access_key}/{scope}, "
            f"SignedHeaders={';'.join(signed_names)}, Signature={signature}"
        )
        return {
            "X-Date": date_stamp,
            "X-Content-Sha256": payload_hash,
            "Authorization": authorization,
            "Content-Type": "application/json",
        }


class VolcengineSTT:
    """One-shot ASR. `audio_format` maps to the openspeech `audio.format`
    field (e.g. "wav", "mp3", "pcm")."""

    def __init__(
        self,
        app_id: str,
        access_key: str,
        secret_key: str,
        token: str,
        *,
        cluster: str = "volcano_asr",
        model_name: str = "bigmodel",
        timeout_s: float = 30,
    ) -> None:
        self._app_id = app_id
        self._token = token
        self._cluster = cluster
        self._model_name = model_name
        self._timeout = timeout_s
        self._auth = _VolcAuth(access_key, secret_key)

    async def transcribe(self, audio: bytes, *, audio_format: str) -> str:
        body = {
            "app": {
                "appid": self._app_id,
                "token": self._token,
                "cluster": self._cluster,
            },
            "user": {"uid": "lemma-voice-spike"},
            "audio": {
                "format": audio_format,
                "data": base64.b64encode(audio).decode("ascii"),
            },
            "request": {"model_name": self._model_name, "enable_itn": True},
        }
        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers = self._auth.signed_headers("POST", "/api/v1/asr", payload)
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(
                    _VOLC_ASR_URL, content=payload, headers=headers
                )
        except httpx.HTTPError as exc:
            raise VoiceProviderError(f"Volcengine ASR request failed: {exc}") from exc

        data = resp.json()
        if data.get("code") != _ASR_OK:
            raise VoiceProviderError(
                f"Volcengine ASR error {data.get('code')}: {data.get('message')}"
            )
        return (data.get("result") or "").strip()


class VolcengineTTS:
    """Text-to-speech. Returns MP3 audio bytes."""

    def __init__(
        self,
        app_id: str,
        access_key: str,
        secret_key: str,
        token: str,
        *,
        cluster: str = "volcano_tts",
        timeout_s: float = 30,
    ) -> None:
        self._app_id = app_id
        self._token = token
        self._cluster = cluster
        self._timeout = timeout_s
        self._auth = _VolcAuth(access_key, secret_key)

    async def synthesize(self, text: str, *, voice_type: str) -> bytes:
        body = {
            "app": {
                "appid": self._app_id,
                "token": self._token,
                "cluster": self._cluster,
            },
            "user": {"uid": "lemma-voice-spike"},
            "audio": {
                "voice_type": voice_type,
                "encoding": "mp3",
                "speed_ratio": 1.0,
            },
            "request": {
                "reqid": str(uuid.uuid4()),
                "text": text,
                "operation": "query",
            },
        }
        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers = self._auth.signed_headers("POST", "/api/v1/tts", payload)
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(
                    _VOLC_TTS_URL, content=payload, headers=headers
                )
        except httpx.HTTPError as exc:
            raise VoiceProviderError(f"Volcengine TTS request failed: {exc}") from exc

        data = resp.json()
        if data.get("code") != _TTS_OK:
            raise VoiceProviderError(
                f"Volcengine TTS error {data.get('code')}: {data.get('message')}"
            )
        b64_audio = data.get("data")
        if not b64_audio:
            raise VoiceProviderError("Volcengine TTS returned empty audio")
        return base64.b64decode(b64_audio)

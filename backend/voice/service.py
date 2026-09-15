"""Voice turn orchestration (P0 spike).

Pipeline:  audio bytes
         -> [ffmpeg transcode if needed] -> STT (Volcengine ASR)
         -> brain (existing ai_client.chat, COURSE_COMPANION — zero brain changes)
         -> TTS (Volcengine TTS)
         -> audio bytes

Single-turn for the spike (no conversation history yet — that's v2). All
credentials / gating come from core.config.settings.
"""

import asyncio
from dataclasses import dataclass

from ai import AIUseCase, ChatMessage, ai_client
from core.config import settings

from voice.errors import VoiceConfigError, VoiceProviderError
from voice.providers.volc import VolcengineSTT, VolcengineTTS

# content-type -> Volcengine ASR `audio.format`, no transcode needed.
_DIRECT_FORMAT: dict[str, str] = {
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/wave": "wav",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/pcm": "pcm",
    "audio/x-pcm": "pcm",
}


@dataclass
class VoiceTurnResult:
    transcript: str
    reply_text: str
    audio: bytes
    audio_mime: str = "audio/mpeg"


class VoiceTurnService:
    def __init__(self) -> None:
        s = settings
        if not s.voice_enabled:
            raise VoiceConfigError("voice_enabled is False")
        missing = [
            name
            for name in (
                "volc_app_id",
                "volc_access_key",
                "volc_secret_key",
                "volc_app_token",
            )
            if not getattr(s, name)
        ]
        if missing:
            raise VoiceConfigError(
                f"missing Volcengine credentials: {', '.join(missing)}"
            )
        self._stt = VolcengineSTT(
            s.volc_app_id, s.volc_access_key, s.volc_secret_key, s.volc_app_token
        )
        self._tts = VolcengineTTS(
            s.volc_app_id, s.volc_access_key, s.volc_secret_key, s.volc_app_token
        )
        self._voice_type = s.volc_tts_voice_type

    async def run_turn(
        self, audio: bytes, *, content_type: str, user_id: str | None
    ) -> VoiceTurnResult:
        # 1) STT (transcode browser webm/ogg/mp4 -> 16k mono wav first).
        if content_type in _DIRECT_FORMAT:
            stt_format = _DIRECT_FORMAT[content_type]
        else:
            audio = await self._transcode_to_wav(audio)
            stt_format = "wav"

        transcript = await self._stt.transcribe(audio, audio_format=stt_format)
        if not transcript:
            raise VoiceProviderError("STT returned no transcript")

        # 2) Brain — existing facade, no changes to the course companion.
        reply = await ai_client.chat(
            AIUseCase.COURSE_COMPANION,
            [ChatMessage(role="user", content=transcript)],
            user_id=user_id,
        )
        reply_text = (reply.text or "").strip()
        if not reply_text:
            raise VoiceProviderError("brain returned empty reply")

        # 3) TTS.
        audio_out = await self._tts.synthesize(
            reply_text, voice_type=self._voice_type
        )
        return VoiceTurnResult(
            transcript=transcript, reply_text=reply_text, audio=audio_out
        )

    async def _transcode_to_wav(self, audio: bytes) -> bytes:
        """Convert arbitrary browser audio to 16k mono WAV via ffmpeg.

        MediaRecorder emits webm/opus or ogg/opus, which Volcengine's one-shot
        ASR does not reliably accept — WAV (raw PCM) is the safe target.
        """
        try:
            proc = await asyncio.create_subprocess_exec(
                settings.ffmpeg_path,
                "-i",
                "pipe:0",
                "-ar",
                "16000",
                "-ac",
                "1",
                "-f",
                "wav",
                "pipe:1",
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except FileNotFoundError as exc:
            raise VoiceProviderError(
                f"ffmpeg not found at '{settings.ffmpeg_path}'"
            ) from exc

        out, err = await proc.communicate(audio)
        if proc.returncode != 0:
            raise VoiceProviderError(
                f"ffmpeg transcode failed: {err.decode('utf-8', 'replace')[:200]}"
            )
        if not out:
            raise VoiceProviderError("ffmpeg produced empty output")
        return out

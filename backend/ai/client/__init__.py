"""AIClient — the only door services/ may use to reach any LLM (rules 第八章).

chat()        -> AIResponse                      (non-streaming text)
stream_chat() -> AsyncIterator[AIChunk]          (typed streaming events)
ask_video()   -> AIResponse                      (video Q&A, engine-switched)

One flow for everything: render prompt -> resolve route -> convert types ->
run engine -> map errors -> account usage. Framework objects never escape.

Implementation split (P0 modularity) across mixins in this package:
  _core         route resolution + `_prepare` (shared by every entry point)
  _chat         chat / generate / generate_with_response
  _stream       stream_chat (plain + tool-enabled FC loop)
  _structured   stream_generate (structured, reasoning-track streamed)
  _video        ask_video / stream_ask_video / stream_tool_chat
The facade signature is unchanged: services/ and ai/ keep importing
`AIClient` / `ai_client` from `ai.client` exactly as before.
"""

from ai.client._chat import ChatMixin
from ai.client._core import _PrepareMixin
from ai.client._stream import StreamMixin
from ai.client._structured import StructuredMixin
from ai.client._video import VideoMixin


class AIClient(
    _PrepareMixin,
    ChatMixin,
    StreamMixin,
    StructuredMixin,
    VideoMixin,
):
    """Facade over the mixins above; see the module docstring for the contract."""


ai_client = AIClient()

__all__ = ["AIClient", "ai_client"]

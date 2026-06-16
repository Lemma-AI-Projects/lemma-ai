"""Search-layer errors.

Reuses the existing AI error family (ai/errors.py): rate limits, timeouts and
provider errors are shared vocabulary. The one addition is SearchProviderError
for *non-retryable* provider rejections (bad input / auth / not found): it
subclasses AIProviderError so it stays inside the AI error family, but the
routing layer treats it as terminal (no fallback — retrying elsewhere only
burns money).
"""

from ai.errors import AIProviderError


class SearchProviderError(AIProviderError):
    code = "search_provider_error"

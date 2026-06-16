from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# Default routing table: AiHubMix primary, OpenRouter backup (one fallback chain
# per use case, lower priority wins). Schema and validation live in ai/config.py.
_DEFAULT_AI_ROUTES_JSON = (
    '{"text_chat": ['
    '{"platform": "aihubmix", "adapter": "openai_compatible",'
    ' "model": "gemini-2.5-flash", "priority": 0, "timeout_s": 30},'
    ' {"platform": "openrouter", "adapter": "openrouter",'
    ' "model": "google/gemini-2.5-flash", "priority": 1, "timeout_s": 30}'
    '], "video_qa": ['
    '{"platform": "aihubmix", "adapter": "gemini_video",'
    ' "model": "gemini-2.5-flash", "priority": 0, "timeout_s": 90}'
    '], "video_summary": ['
    '{"platform": "aihubmix", "adapter": "gemini_video",'
    ' "model": "gemini-2.5-flash", "priority": 0, "timeout_s": 90}'
    '], "video_locate": ['
    '{"platform": "aihubmix", "adapter": "gemini_video",'
    ' "model": "gemini-2.5-pro", "priority": 0, "timeout_s": 90}'
    "]}"
)

# Default video-search routing table: one Apify provider per platform (lower
# priority wins, multiple entries form a fallback chain). Schema and startup
# validation live in ai/search/config.py. Actor IDs live here (config = truth),
# never hardcoded in provider code. max_total_charge_usd caps pay-per-event
# cost, max_items caps per-result cost.
_DEFAULT_SEARCH_ROUTES_JSON = (
    '{"youtube": [{"provider": "apify_youtube", "actor_id": "h7sDV53CddomktSi5",'
    ' "max_items": 20, "max_total_charge_usd": 0.3, "timeout_s": 120, "priority": 0}],'
    ' "bilibili": [{"provider": "apify_bilibili", "actor_id": "hQpkxbmfApbahVZ2B",'
    ' "max_items": 20, "max_total_charge_usd": 0.3, "timeout_s": 120, "priority": 0}]}'
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5173"

    supabase_url: str
    supabase_jwt_audience: str = "authenticated"

    database_url: str

    openrouter_api_key: str
    aihubmix_api_key: str
    aihubmix_openai_base_url: str = "https://aihubmix.com/v1"
    aihubmix_gemini_base_url: str = "https://aihubmix.com/gemini"
    ai_default_timeout_seconds: float = 30
    # native | pydantic_ai — stays native until probes 3-6 all pass (终稿 8.2).
    ai_video_engine: str = "native"
    ai_routes_json: str = _DEFAULT_AI_ROUTES_JSON

    redis_url: str = "redis://localhost:6379/0"
    # Netscape-format cookie file for yt-dlp. B站 risk control (HTTP 412)
    # requires real browser cookies; without this only direct file URLs and
    # cookie-free sites can be ingested.
    ytdlp_cookie_file: str | None = None

    # --- Video search (Apify) ---
    # Default empty so the app boots and the offline smoke runs without a key;
    # video search isn't on the web request path. Real value goes in backend/.env.
    apify_api_token: str = ""
    search_routes_json: str = _DEFAULT_SEARCH_ROUTES_JSON

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def supabase_jwt_issuer(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1"

    @property
    def supabase_jwks_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

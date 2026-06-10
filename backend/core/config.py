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
    "]}"
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
    ai_default_timeout_seconds: float = 30
    ai_routes_json: str = _DEFAULT_AI_ROUTES_JSON

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

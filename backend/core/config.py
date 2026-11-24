from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# Default routing table: AiHubMix primary, OpenRouter backup (one fallback chain
# per use case, lower priority wins). Schema and validation live in ai/config.py.
_DEFAULT_AI_ROUTES_JSON = (
    '{"text_chat": ['
    '{"platform": "aihubmix", "adapter": "openai_compatible",'
    ' "model": "gemini-3.1-flash-lite", "priority": 0, "timeout_s": 30},'
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
    supabase_jwt_secret: str = ""

    database_url: str

    openrouter_api_key: str
    aihubmix_api_key: str
    aihubmix_openai_base_url: str = "https://aihubmix.com/v1"
    ai_default_timeout_seconds: float = 30
    ai_routes_json: str = _DEFAULT_AI_ROUTES_JSON

    redis_url: str = "redis://localhost:6379/0"

    # --- Supabase Storage (core/storage.py) ---
    # Two credentials by design (see core/storage.py): the service-role key
    # signs short-lived download URLs; the S3 access keys authorize boto3
    # multipart uploads/deletes. All default empty so the app boots without
    # storage configured.
    supabase_service_role_key: str = ""
    supabase_s3_endpoint: str = ""
    supabase_s3_region: str = "us-east-1"
    supabase_s3_access_key_id: str = ""
    supabase_s3_secret_access_key: str = ""
    supabase_storage_bucket: str = "lemma-files"
    # boto3 multipart parallelism (parts downloaded concurrently per file).
    storage_download_concurrency: int = 4

    # --- Question bank (学科网 XOP) ---
    # Credentials default empty so the app boots without an account; the http
    # provider refuses to run until they are set.
    xkw_app_id: str = ""
    xkw_secret: str = ""
    xkw_base_url: str = "https://openapi.xkw.com"
    # 1 = documented sha1 scheme (Xop-Sign); 2 = hmac-sha256 (Xop-Sign-V2),
    # only present in the official Java client — verify with a real account.
    xkw_sign_version: int = 1
    xkw_timeout_seconds: float = 15
    # fixture | http. fixture serves the doc samples offline and never bills.
    qbank_xkw_provider: str = "fixture"
    # Master switch for building question sets (every build may cost money).
    qbank_xkw_enabled: bool = True
    qbank_max_calls_per_set: int = 2
    qbank_global_daily_call_cap: int = 200
    # Comma-separated profile UUIDs allowed to use the developer entry points.
    qbank_admin_user_ids: str = ""
    # Salt for the client_user_id sent to XKW (never the raw user UUID).
    qbank_client_user_salt: str = ""

    @property
    def qbank_admin_user_id_set(self) -> frozenset[str]:
        return frozenset(
            part.strip().lower()
            for part in self.qbank_admin_user_ids.split(",")
            if part.strip()
        )

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

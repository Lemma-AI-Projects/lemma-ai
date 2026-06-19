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
    '], "course_plan_intro": ['
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
    '], "course_intake": ['
    '{"platform": "aihubmix", "adapter": "openai_compatible",'
    ' "model": "gemini-2.5-flash", "priority": 0, "timeout_s": 60},'
    ' {"platform": "openrouter", "adapter": "openrouter",'
    ' "model": "google/gemini-2.5-flash", "priority": 1, "timeout_s": 60}'
    '], "course_outline": ['
    '{"platform": "aihubmix", "adapter": "openai_compatible",'
    ' "model": "gemini-2.5-flash", "priority": 0, "timeout_s": 60},'
    ' {"platform": "openrouter", "adapter": "openrouter",'
    ' "model": "google/gemini-2.5-flash", "priority": 1, "timeout_s": 60}'
    '], "chapter_query": ['
    '{"platform": "aihubmix", "adapter": "openai_compatible",'
    ' "model": "gemini-2.5-flash", "priority": 0, "timeout_s": 60},'
    ' {"platform": "openrouter", "adapter": "openrouter",'
    ' "model": "google/gemini-2.5-flash", "priority": 1, "timeout_s": 60}'
    '], "video_select": ['
    '{"platform": "aihubmix", "adapter": "openai_compatible",'
    ' "model": "gemini-2.5-flash", "priority": 0, "timeout_s": 60},'
    ' {"platform": "openrouter", "adapter": "openrouter",'
    ' "model": "google/gemini-2.5-flash", "priority": 1, "timeout_s": 60}'
    '], "topic_search": ['
    '{"platform": "aihubmix", "adapter": "openai_compatible",'
    ' "model": "gemini-2.5-flash", "priority": 0, "timeout_s": 60},'
    ' {"platform": "openrouter", "adapter": "openrouter",'
    ' "model": "google/gemini-2.5-flash", "priority": 1, "timeout_s": 60}'
    '], "course_compose": ['
    '{"platform": "aihubmix", "adapter": "openai_compatible",'
    ' "model": "gemini-2.5-flash", "priority": 0, "timeout_s": 90},'
    ' {"platform": "openrouter", "adapter": "openrouter",'
    ' "model": "google/gemini-2.5-flash", "priority": 1, "timeout_s": 90}'
    "]}"
)

# Default video-search routing table: self-built, FREE providers only (no Apify,
# no APIFY token needed). youtube -> yt-dlp ytsearch, bilibili -> official Web
# search. Lower priority wins; add an apify_* route at a higher priority number
# to opt into a paid fallback (see backend/.env.example). Schema + startup
# validation live in ai/search/config.py. Per-provider knobs go in `extra`
# (full_extract for yt-dlp, wbi signing for bilibili — both off by default).
_DEFAULT_SEARCH_ROUTES_JSON = (
    '{"youtube": [{"provider": "ytdlp_youtube", "max_items": 20,'
    ' "timeout_s": 60, "priority": 0, "extra": {"full_extract": false}}],'
    ' "bilibili": [{"provider": "bili_search", "max_items": 20,'
    ' "timeout_s": 30, "priority": 0, "extra": {"wbi": false}}]}'
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

    # --- Course video assets (Supabase Storage) ---
    # Two credentials by design (see core/storage.py): the service-role key
    # signs short-lived playback URLs; the S3 access keys authorize boto3
    # multipart uploads/deletes. All default empty so the app/smoke boot without
    # storage configured — only the video pipeline needs them.
    supabase_service_role_key: str = ""
    supabase_s3_endpoint: str = ""
    supabase_s3_region: str = "us-east-1"
    supabase_s3_access_key_id: str = ""
    supabase_s3_secret_access_key: str = ""
    supabase_storage_bucket: str = "course-videos"
    # Sliding expiry: assets untouched this long are swept (lazy re-download on
    # next access). Signed URLs are short-lived and re-minted on every fetch.
    video_asset_ttl_days: int = 30
    # 6h: must comfortably exceed a full lecture so playback never outlives its
    # URL mid-watch; the client re-fetches to re-mint anyway.
    video_signed_url_ttl_seconds: int = 21600
    # boto3 multipart parallelism (parts uploaded concurrently per file).
    video_download_concurrency: int = 4

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

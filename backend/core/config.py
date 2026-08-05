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
    # 视频伴学 (AI 伴学): native gemini_video channel; media_resolution=medium
    # (决策⑨ clarity/cost balance) + thinking on. Single route — video Q&A has
    # no OpenRouter fallback (the file reference is Gemini Files API specific).
    '], "course_companion": ['
    '{"platform": "aihubmix", "adapter": "gemini_video",'
    ' "model": "gemini-2.5-flash", "priority": 0, "timeout_s": 90,'
    ' "extra": {"media_resolution": "medium", "include_thoughts": true}}'
    # 章节概述: same native gemini_video channel as companion so both share the
    # one chapter_gemini_files upload (零重传). media_resolution=medium (决策⑨)
    # + thinking on; a longer timeout — it writes a full study note, not a turn.
    # thinking_budget caps the pre-answer reasoning (observed 620-3635 thought
    # tokens): a long think delays the first output byte and flirts with the
    # gateway's ~60s stream cutoff (7-3 事故) for zero overview-quality gain.
    '], "course_overview": ['
    '{"platform": "aihubmix", "adapter": "gemini_video",'
    ' "model": "gemini-2.5-flash", "priority": 0, "timeout_s": 120,'
    ' "extra": {"media_resolution": "medium", "include_thoughts": true,'
    ' "thinking_budget": 1024}}'
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

# Default worker-side video-download routing. YouTube remains yt-dlp. Bilibili
# prefers BBDown TV API and keeps yt-dlp (with Bili headers) as the 480P fallback.
_DEFAULT_VIDEO_DOWNLOAD_ROUTES_JSON = (
    '{"youtube": ["ytdlp"],'
    ' "bilibili": ["bbdown", "ytdlp-fallback"],'
    ' "default": ["ytdlp"]}'
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
    aihubmix_gemini_base_url: str = "https://aihubmix.com/gemini"
    ai_default_timeout_seconds: float = 30
    # native | pydantic_ai — stays native until probes 3-6 all pass (终稿 8.2).
    ai_video_engine: str = "native"
    ai_routes_json: str = _DEFAULT_AI_ROUTES_JSON

    redis_url: str = "redis://localhost:6379/0"
    # Netscape-format cookie file for yt-dlp. B站 risk control (HTTP 412)
    # can still affect the yt-dlp fallback path. Primary anonymous B站 chapter
    # downloads use BBDown TV API instead.
    ytdlp_cookie_file: str | None = None
    ytdlp_socket_timeout_seconds: int = 30

    # --- Worker video download backends ---
    # URL -> local mp4 routing for Celery tasks. Schema is intentionally simple:
    # platform -> ordered backend names. Parsing/execution lives in tasks/.
    video_download_routes_json: str = _DEFAULT_VIDEO_DOWNLOAD_ROUTES_JSON
    video_download_timeout_seconds: int = 1800
    ffmpeg_path: str = "ffmpeg"
    bbdown_binary_path: str = ""
    bbdown_use_tv_api: bool = True
    bbdown_quality_priority: str = "720P 高清,480P 清晰"
    bbdown_encoding_priority: str = "avc,hevc,av1"
    # Reserved for a future logged-in 1080P path. Keep empty for anonymous mode.
    bbdown_cookie: str = ""

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

    # ── LemmaHermes engine integration (monorepo contract) ─────────────────
    # Inert until the engine package lands in the monorepo; these flags gate
    # the adapter layer (injection / tools / tasks / learner tables) so the
    # product ships with zero engine behavior until explicitly enabled.
    lemma_hermes_enabled: bool = False
    lemma_hermes_engine_package: str = "lemma_hermes"
    # Empty => learner state lives in the main database (PG); once the engine
    # lands this may point at a dedicated learner URL if we ever split it out.
    lemma_hermes_learner_db_url: str = ""

    # ── Dev dashboard (/admindev) ──────────────────────────────────────────
    # Developer-only ops panel (monitor / component control / live architecture
    # / dev message board). MUST stay off in production: control endpoints
    # start and stop local processes.
    dev_dashboard_enabled: bool = False
    # Comma-separated "username:password" pairs for the two developers,
    # e.g. "ceaser:lemma123,syk:lemma123". Secrets live in env, never in code.
    dev_dashboard_users: str = ""
    # Secret used to sign dev-dashboard session tokens (HMAC).
    dev_dashboard_token_secret: str = ""

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

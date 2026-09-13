"""LTI 1.3 launch verification and identity resolution.

Scope of this first slice: **verify an incoming launch and resolve it to a
Lemma user, class and enrolment**. Pulling a full roster (NRPS) and pushing
grades (AGS) come later; both need our own signing key and a platform to talk
to.

Flow implemented here (LTI 1.3 third-party initiated login):

1. `build_login_redirect` — the LMS sends the user to our /lti/login with
   iss / login_hint / client_id / deployment_id; we mint state + nonce and
   redirect to the platform's OIDC endpoint.
2. `verify_launch` — the platform POSTs an id_token back; we verify signature
   against its JWKS, then iss / aud / exp / nonce, and return typed claims.
3. `apply_launch` — upsert class, profile, external identity and enrolment.

JWT verification deliberately uses the same PyJWT stack as Supabase token
validation (core/security.py) rather than a second JOSE dependency.
"""

import asyncio
import hashlib
import logging
import secrets
import time
import uuid
from dataclasses import dataclass, field
from urllib.parse import urlencode

import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from supabase import create_client

from core.config import settings
from models.profile import Profile
from models.roster import (
    ClassGroup,
    Enrollment,
    ExternalIdentity,
    RosterIntegration,
)

logger = logging.getLogger("lemma.roster.lti")

PROVIDER = "lti"

# LIS v2 role URNs → our three roles. A launch may carry several; the most
# privileged wins (a teacher is also "member").
_ROLE_MAP = {
    "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator": "admin",
    "http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator": "admin",
    "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor": "teacher",
    "http://purl.imsglobal.org/vocab/lis/v2/membership#ContentDeveloper": "teacher",
    "http://purl.imsglobal.org/vocab/lis/v2/membership#TeachingAssistant": "teacher",
    "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner": "student",
}
_ROLE_RANK = {"student": 0, "teacher": 1, "admin": 2}


class LtiError(RuntimeError):
    """Any failure that should be surfaced as a rejected launch."""


@dataclass
class LaunchClaims:
    """The subset of an LTI id_token we act on."""

    issuer: str
    subject: str
    client_id: str
    deployment_id: str
    role: str
    display_name: str | None = None
    email: str | None = None
    context_id: str | None = None
    context_title: str | None = None
    message_type: str | None = None
    raw: dict = field(default_factory=dict)


# ── state/nonce store ───────────────────────────────────────────────────────
# Single-process store: fine for one worker, MUST move to Redis before the app
# runs on more than one instance (same constraint the organize event publisher
# documents). Stores state -> (nonce, expiry).
_STATE_TTL = lambda: settings.lti_state_ttl_seconds  # noqa: E731
_pending_states: dict[str, tuple[str, float]] = {}


def _prune_states() -> None:
    now = time.time()
    for state in [s for s, (_, exp) in _pending_states.items() if exp < now]:
        _pending_states.pop(state, None)


def mint_state() -> tuple[str, str]:
    """Create a state/nonce pair to carry through the platform round-trip."""
    _prune_states()
    state = secrets.token_urlsafe(24)
    nonce = secrets.token_urlsafe(24)
    _pending_states[state] = (nonce, time.time() + _STATE_TTL())
    return state, nonce


def consume_state(state: str) -> str:
    """Pop the nonce for `state`; raises when unknown or expired."""
    _prune_states()
    entry = _pending_states.pop(state, None)
    if entry is None:
        raise LtiError("unknown or expired state")
    nonce, expiry = entry
    if expiry < time.time():
        raise LtiError("state expired")
    return nonce


def launch_url() -> str:
    return f"{settings.lti_tool_base_url.rstrip('/')}/api/v1/lti/launch"


def jwks_url() -> str:
    return f"{settings.lti_tool_base_url.rstrip('/')}/api/v1/lti/jwks"


def build_login_redirect(
    integration: RosterIntegration,
    *,
    login_hint: str | None,
    lti_message_hint: str | None,
    target_link_uri: str | None,
) -> str:
    """Build the platform OIDC redirect for step 1 of the launch."""
    if not integration.lti_oidc_auth_url or not integration.lti_client_id:
        raise LtiError("integration has no OIDC endpoint or client id")
    state, nonce = mint_state()
    params = {
        "scope": "openid",
        "response_type": "id_token",
        "response_mode": "form_post",
        "prompt": "none",
        "client_id": integration.lti_client_id,
        "redirect_uri": launch_url(),
        "state": state,
        "nonce": nonce,
    }
    if login_hint:
        params["login_hint"] = login_hint
    if lti_message_hint:
        params["lti_message_hint"] = lti_message_hint
    if target_link_uri:
        params["target_link_uri"] = target_link_uri
    return f"{integration.lti_oidc_auth_url}?{urlencode(params)}"


# ── verification ────────────────────────────────────────────────────────────
_jwks_cache: dict[str, tuple[jwt.PyJWKSet, float]] = {}
_JWKS_TTL_SECONDS = 3600


def platform_jwks(integration: RosterIntegration) -> jwt.PyJWKSet:
    """Fetch (and briefly cache) the platform's signing keys.

    Split out as a module function so the offline smoke can inject a locally
    generated JWKS instead of reaching out to a real LMS.
    """
    url = integration.lti_platform_jwks_url
    if not url:
        raise LtiError("integration has no platform JWKS url")
    cached = _jwks_cache.get(url)
    now = time.time()
    if cached and cached[1] > now:
        return cached[0]
    try:
        keys = jwt.PyJWKSet.from_url(url)
    except Exception as exc:  # noqa: BLE001 — network/parse failures alike
        raise LtiError(f"cannot fetch platform JWKS: {exc}") from exc
    _jwks_cache[url] = (keys, now + _JWKS_TTL_SECONDS)
    return keys


def _select_key(keys: jwt.PyJWKSet, kid: str | None):
    if kid is None and len(keys.keys) == 1:
        return keys.keys[0]
    for key in keys.keys:
        if key.key_id == kid:
            return key
    raise LtiError(f"no matching key for kid={kid!r}")


def map_roles(roles: list[str] | str | None) -> str:
    """Map LIS role URNs to one of our three roles; default to the least
    privileged (a launch we cannot classify must not become a teacher)."""
    if roles is None:
        return "student"
    if isinstance(roles, str):
        roles = [roles]
    best = "student"
    for role in roles:
        mapped = _ROLE_MAP.get(role)
        if mapped and _ROLE_RANK[mapped] > _ROLE_RANK[best]:
            best = mapped
    return best


def verify_launch(
    id_token: str, integration: RosterIntegration, *, nonce: str
) -> LaunchClaims:
    """Verify an id_token and return the claims we act on.

    Checks, in one pass: signature (platform JWKS), issuer, audience (our client
    id), expiry/issued-at with leeway, and nonce binding.
    """
    if not integration.lti_client_id:
        raise LtiError("integration has no client id")

    header = jwt.get_unverified_header(id_token)
    key = _select_key(platform_jwks(integration), header.get("kid"))

    try:
        claims = jwt.decode(
            id_token,
            key=key.key,
            algorithms=[header.get("alg", "RS256")],
            audience=integration.lti_client_id,
            issuer=integration.external_issuer,
            leeway=settings.lti_jwt_leeway_seconds,
            options={
                "require": ["exp", "iat", "iss", "aud", "sub"],
                "verify_aud": True,
                "verify_iss": True,
            },
        )
    except jwt.PyJWTError as exc:
        raise LtiError(f"id_token rejected: {exc}") from exc

    if claims.get("nonce") != nonce:
        raise LtiError("nonce mismatch")

    deployment = claims.get(
        "https://purl.imsglobal.org/spec/lti/claim/deployment_id"
    )
    if integration.lti_deployment_id and deployment != integration.lti_deployment_id:
        raise LtiError("deployment_id mismatch")

    context = claims.get("https://purl.imsglobal.org/spec/lti/claim/context") or {}
    return LaunchClaims(
        issuer=claims["iss"],
        subject=claims["sub"],
        client_id=claims["aud"]
        if isinstance(claims["aud"], str)
        else claims["aud"][0],
        deployment_id=deployment or "",
        role=map_roles(
            claims.get("https://purl.imsglobal.org/spec/lti/claim/roles")
        ),
        display_name=claims.get("name"),
        email=claims.get("email"),
        context_id=context.get("id"),
        context_title=context.get("title") or context.get("label"),
        message_type=claims.get("https://purl.imsglobal.org/spec/lti/claim/message_type"),
        raw=claims,
    )


# ── applying a verified launch ──────────────────────────────────────────────
async def apply_launch(
    db: AsyncSession,
    integration: RosterIntegration,
    claims: LaunchClaims,
) -> tuple[uuid.UUID, uuid.UUID | None, str]:
    """Upsert the launch into our model; returns (user_id, class_id, role).

    Idempotent: the same `sub` launching twice reuses its identity row and its
    profile, so a student clicking the link every lesson never creates a second
    account. The caller owns the commit.
    """
    identity = await db.scalar(
        select(ExternalIdentity).where(
            ExternalIdentity.provider == PROVIDER,
            ExternalIdentity.integration_id == integration.id,
            ExternalIdentity.external_user_id == claims.subject,
        )
    )

    if identity is None:
        profile = await _resolve_profile(db, claims)
        identity = ExternalIdentity(
            provider=PROVIDER,
            integration_id=integration.id,
            external_user_id=claims.subject,
            user_id=profile.id,
            display_name=claims.display_name,
            email=claims.email,
        )
        db.add(identity)
    else:
        identity.display_name = claims.display_name or identity.display_name
        identity.email = claims.email or identity.email

    class_id: uuid.UUID | None = None
    if claims.context_id:
        class_row = await db.scalar(
            select(ClassGroup).where(
                ClassGroup.provider == PROVIDER,
                ClassGroup.external_class_id == claims.context_id,
            )
        )
        if class_row is None:
            class_row = ClassGroup(
                org_id=integration.org_id,
                name=claims.context_title or claims.context_id,
                provider=PROVIDER,
                external_class_id=claims.context_id,
            )
            db.add(class_row)
            await db.flush()
        class_id = class_row.id

        enrollment = await db.scalar(
            select(Enrollment).where(
                Enrollment.class_id == class_id,
                Enrollment.user_id == identity.user_id,
            )
        )
        if enrollment is None:
            db.add(
                Enrollment(
                    class_id=class_id, user_id=identity.user_id, role=claims.role
                )
            )
        elif _ROLE_RANK[claims.role] > _ROLE_RANK[enrollment.role]:
            # A role can be upgraded (aide becomes instructor) but never
            # silently downgraded by a single launch.
            enrollment.role = claims.role

    return identity.user_id, class_id, claims.role


async def _resolve_profile(db: AsyncSession, claims: LaunchClaims) -> Profile:
    """Find the Lemma account these claims belong to, provisioning on first launch.

    Email is only a *hint* for an existing account; the identity row's key stays
    (provider, sub), so a changed email never forks the account. A brand-new
    person gets a Supabase auth user + Profile created via the Admin API (service
    role key). LTI launches without an email cannot be provisioned — Supabase
    auth requires one — so we reject loudly instead of writing a half-user.
    """
    if claims.email:
        existing = await db.scalar(
            select(Profile).where(Profile.email == claims.email)
        )
        if existing is not None:
            return existing
        return await provision_lms_user(db, claims)
    raise LtiError(
        "lti_email_required: this launch carried no email, cannot provision a Lemma account"
    )


# ── Supabase admin client (server-side only) ──────────────────────────────────
_admin_client = None


def _supabase_admin():
    """Cached Supabase client authenticated with the service-role key.

    This key can bypass RLS and manage auth users — it must NEVER reach the
    browser. We only use it here, server-side, to provision an LMS user and to
    mint a passwordless sign-in link.
    """
    global _admin_client
    if _admin_client is None:
        if not settings.supabase_service_role_key:
            raise LtiError(
                "supabase_service_role_key not configured; cannot provision LMS users"
            )
        _admin_client = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )
    return _admin_client


def _avatar_color(claims: LaunchClaims) -> str:
    """Deterministic, non-null avatar colour (Profile.avatar_color is NOT NULL)."""
    seed = (claims.email or claims.subject or claims.display_name or "lemma").encode()
    return f"#{hashlib.sha256(seed).hexdigest()[:6]}"


async def provision_lms_user(db: AsyncSession, claims: LaunchClaims) -> Profile:
    """Create the Supabase auth user + Lemma Profile for a first-time LMS user.

    The Profile.id IS the Supabase auth user id, so we create the auth user
    first, then the profile row that points at it. The external identity and
    enrolment are written by apply_launch after this returns.
    """
    admin = _supabase_admin()
    try:
        auth_user = await asyncio.to_thread(
            lambda: admin.auth.admin.create_user(
                {
                    "email": claims.email,
                    "email_confirm": True,
                    "user_metadata": {"full_name": claims.display_name or claims.email},
                }
            )
        )
    except Exception as exc:  # noqa: BLE001 — surface as a rejected launch
        raise LtiError(f"supabase user provisioning failed: {exc}") from exc

    user_id = uuid.UUID(auth_user.user.id)
    profile = Profile(
        id=user_id,
        email=claims.email,
        nickname=claims.display_name,
        avatar_color=_avatar_color(claims),
    )
    db.add(profile)
    await db.flush()
    return profile


async def issue_session_redirect(email: str, redirect_to: str) -> "RedirectResponse":
    """Hand a browser a Supabase session via a one-time passwordless sign-in link.

    We generate a magic-link action_link for the (already provisioned) user and
    redirect the browser to it. Supabase redeems the link, sets the session, and
    forwards to `redirect_to`. The frontend's supabase-js (detectSessionInUrl, on
    by default) picks the session up with no frontend code changes.
    """
    from fastapi.responses import RedirectResponse

    admin = _supabase_admin()
    try:
        link = await asyncio.to_thread(
            lambda: admin.auth.admin.generate_link(
                {"type": "magiclink", "email": email, "redirect_to": redirect_to}
            )
        )
    except Exception as exc:  # noqa: BLE001 — surface as a rejected launch
        raise LtiError(f"supabase sign-in link failed: {exc}") from exc

    # The SDK returns a model; older callers/shape may hand back a dict.
    action_link = getattr(link, "action_link", None)
    if not action_link and isinstance(link, dict):
        action_link = (link.get("action_link") or (link.get("properties") or {}).get("action_link"))
    if not action_link:
        raise LtiError("supabase generate_link returned no action_link")
    return RedirectResponse(action_link, status_code=302)


async def find_integration(
    db: AsyncSession, *, issuer: str, client_id: str, deployment_id: str | None
) -> RosterIntegration | None:
    """Look up the deployment an incoming launch claims to come from."""
    stmt = select(RosterIntegration).where(
        RosterIntegration.provider == PROVIDER,
        RosterIntegration.external_issuer == issuer,
        RosterIntegration.lti_client_id == client_id,
    )
    if deployment_id:
        stmt = stmt.where(RosterIntegration.lti_deployment_id == deployment_id)
    return await db.scalar(stmt)

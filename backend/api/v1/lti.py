"""LTI 1.3 endpoints: platform-initiated login, launch, and our public JWKS.

These are called by the *LMS*, not by our own frontend, so they carry no
Supabase auth. Trust comes from the signed id_token and from looking the
deployment up by (issuer, client_id, deployment_id) before anything else
happens.
"""

import logging

from urllib.parse import parse_qs

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from schemas.roster import LaunchResponse
from services.roster import lti as lti_service
from services.roster.lti import LtiError

logger = logging.getLogger("lemma.api.lti")
router = APIRouter(prefix="/lti", tags=["lti"])


@router.get("/login")
async def lti_login(
    iss: str = Query(...),
    client_id: str = Query(...),
    login_hint: str | None = Query(None),
    lti_deployment_id: str | None = Query(None),
    lti_message_hint: str | None = Query(None),
    target_link_uri: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Step 1 of the LTI launch: redirect the user back to the platform's
    OIDC endpoint with our state/nonce."""
    integration = await lti_service.find_integration(
        db, issuer=iss, client_id=client_id, deployment_id=lti_deployment_id
    )
    if integration is None:
        raise HTTPException(status_code=404, detail="unknown_lti_deployment")
    try:
        redirect_url = lti_service.build_login_redirect(
            integration,
            login_hint=login_hint,
            lti_message_hint=lti_message_hint,
            target_link_uri=target_link_uri,
        )
    except LtiError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return RedirectResponse(redirect_url, status_code=302)


@router.post("/launch", response_model=LaunchResponse)
async def lti_launch(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> LaunchResponse:
    """Step 2: verify the platform's id_token and resolve it to a Lemma user.

    The form body is parsed by hand: LTI uses form_post, and pulling in
    python-multipart for two fields is not worth the extra dependency.
    """
    form = parse_qs((await request.body()).decode("utf-8"))
    id_token = (form.get("id_token") or [""])[0]
    state = (form.get("state") or [""])[0]
    if not id_token or not state:
        raise HTTPException(status_code=400, detail="missing_id_token_or_state")

    try:
        nonce = lti_service.consume_state(state)
    except LtiError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Identify the deployment from the token's own (unverified) claims first.
    # Nothing is trusted until verify_launch checks the signature below; this
    # read only decides *which* set of keys to check against.
    unverified = lti_service.jwt.decode(id_token, options={"verify_signature": False})
    audience = unverified.get("aud")
    integration = await lti_service.find_integration(
        db,
        issuer=str(unverified.get("iss", "")),
        client_id=str(audience[0] if isinstance(audience, list) else audience or ""),
        deployment_id=unverified.get(
            "https://purl.imsglobal.org/spec/lti/claim/deployment_id"
        ),
    )
    if integration is None:
        raise HTTPException(status_code=404, detail="unknown_lti_deployment")

    try:
        claims = lti_service.verify_launch(id_token, integration, nonce=nonce)
    except LtiError as exc:
        logger.warning("lti launch rejected: %s", exc)
        raise HTTPException(status_code=401, detail="invalid_lti_launch") from exc

    try:
        user_id, class_id, role = await lti_service.apply_launch(
            db, integration, claims
        )
    except LtiError as exc:
        # A verified launch from a person we cannot map yet (no Lemma account
        # and, in particular, no way to provision a Supabase auth user). Loud
        # and typed rather than silently creating a half-user.
        if "provisioning_required" in str(exc):
            raise HTTPException(
                status_code=409, detail="profile_provisioning_required"
            ) from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    await db.commit()

    return LaunchResponse(
        user_id=user_id,
        class_id=class_id,
        role=role,
        display_name=claims.display_name,
        context_title=claims.context_title,
    )


@router.get("/jwks")
async def lti_jwks() -> dict:
    """Our public keys, for platforms verifying messages we send (NRPS / AGS).

    Returns an empty set until `lti_tool_private_key` is configured — the
    endpoints above never need it, so a deployment without outbound LTI still
    works.
    """
    if not settings.lti_tool_private_key:
        return {"keys": []}
    import json

    key = json.loads(settings.lti_tool_private_key)
    return {"keys": [{**key, "kid": settings.lti_tool_kid, "use": "sig"}]}

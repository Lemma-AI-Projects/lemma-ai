"""Register an LMS deployment as a Lemma LTI 1.3 integration.

This is the "install" step that makes a real LMS able to launch into Lemma:
without a matching `roster_integrations` row, every incoming launch 404s with
`unknown_lti_deployment`. The values come from the platform's LTI tool
registration (the same ones you paste into the LMS when adding Lemma).

Idempotent: re-running with the same (issuer, client_id, deployment_id) updates
the endpoints instead of creating a second row.

Run from backend/:
    .venv/Scripts/python.exe scripts/register_lti_integration.py \
        --issuer https://your-lms.example.com \
        --client-id lemma-client-abc \
        --deployment-id deploy-1 \
        --oidc-auth-url https://your-lms.example.com/mod/lti/auth.php \
        --jwks-url https://your-lms.example.com/jwks.json \
        --token-url https://your-lms.example.com/token.php \
        --label "Springfield High - Canvas"
"""

import argparse
import asyncio
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select  # noqa: E402

from core.database import AsyncSessionLocal  # noqa: E402
from models.roster import RosterIntegration  # noqa: E402


async def register(args: argparse.Namespace) -> uuid.UUID:
    async with AsyncSessionLocal() as db:
        existing = await db.scalar(
            select(RosterIntegration).where(
                RosterIntegration.provider == "lti",
                RosterIntegration.external_issuer == args.issuer,
                RosterIntegration.lti_client_id == args.client_id,
                RosterIntegration.lti_deployment_id == args.deployment_id,
            )
        )
        if existing is not None:
            integration = existing
            verb = "UPDATED"
        else:
            integration = RosterIntegration(provider="lti")
            verb = "CREATED"
            db.add(integration)

        integration.external_issuer = args.issuer
        integration.lti_client_id = args.client_id
        integration.lti_deployment_id = args.deployment_id
        integration.lti_oidc_auth_url = args.oidc_auth_url
        integration.lti_platform_jwks_url = args.jwks_url
        integration.lti_platform_token_url = args.token_url
        integration.label = args.label
        if args.org_id:
            integration.org_id = uuid.UUID(args.org_id)

        await db.commit()
        await db.refresh(integration)
        print(f"{verb} RosterIntegration id={integration.id}")
        print(f"  issuer           = {integration.external_issuer}")
        print(f"  client_id        = {integration.lti_client_id}")
        print(f"  deployment_id    = {integration.lti_deployment_id}")
        print(f"  oidc_auth_url    = {integration.lti_oidc_auth_url}")
        print(f"  platform_jwks    = {integration.lti_platform_jwks_url}")
        print(f"  platform_token   = {integration.lti_platform_token_url}")
        return integration.id


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--issuer", required=True, help="LMS issuer URL")
    parser.add_argument("--client-id", required=True, help="LTI client id")
    parser.add_argument("--deployment-id", default=None, help="LTI deployment id")
    parser.add_argument("--oidc-auth-url", required=True, help="Platform OIDC login endpoint")
    parser.add_argument("--jwks-url", required=True, help="Platform JWKS endpoint")
    parser.add_argument("--token-url", default=None, help="Platform OAuth token endpoint")
    parser.add_argument("--label", default=None, help="Human-readable label")
    parser.add_argument("--org-id", default=None, help="Optional organization UUID")
    args = parser.parse_args()
    asyncio.run(register(args))


if __name__ == "__main__":
    main()

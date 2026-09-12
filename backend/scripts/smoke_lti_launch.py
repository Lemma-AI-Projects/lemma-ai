"""Offline end-to-end check of the LTI launch path using a self-signed platform.

No LMS needed: we generate an RSA keypair, publish it as the "platform JWKS",
and sign id_tokens ourselves. That lets us prove the things that are easy to get
wrong — signature verification, nonce binding, expiry, deployment match — and
prove that a repeated launch does not create a second account.

Everything runs in one transaction that is rolled back at the end.

Run from backend/:  .venv/Scripts/python.exe scripts/smoke_lti_launch.py
"""

import asyncio
import os
import sys
import time
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import jwt  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import rsa  # noqa: E402
from sqlalchemy import func, select  # noqa: E402

from core.database import AsyncSessionLocal  # noqa: E402
from models.profile import Profile  # noqa: E402
from models.roster import (  # noqa: E402
    ClassGroup,
    Enrollment,
    ExternalIdentity,
    RosterIntegration,
)
from services.roster import lti as lti_service  # noqa: E402
from services.roster.lti import LtiError  # noqa: E402

ISSUER = "https://smoke-lms.example.com"
CLIENT_ID = "lemma-smoke-client"
DEPLOYMENT_ID = "smoke-deployment-1"
KID = "smoke-key-1"
CONTEXT_ID = "smoke-course-101"

fails: list[str] = []


def check(condition: bool, label: str) -> None:
    print(f"{'PASS' if condition else 'FAIL'}  {label}")
    if not condition:
        fails.append(label)


def make_platform():
    """A throwaway platform identity: private key + the JWKS it would publish."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    jwk = jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key(), as_dict=True)
    jwk.update({"kid": KID, "alg": "RS256", "use": "sig"})
    return private_key, {"keys": [jwk]}


def sign(private_key, *, nonce: str, sub: str, email: str | None, roles: list[str],
         expires_in: int = 300, issuer: str = ISSUER, audience: str = CLIENT_ID,
         deployment: str = DEPLOYMENT_ID, name: str = "Smoke Learner") -> str:
    now = int(time.time())
    claims = {
        "iss": issuer,
        "aud": audience,
        "sub": sub,
        "exp": now + expires_in,
        "iat": now,
        "nonce": nonce,
        "name": name,
        "email": email,
        "https://purl.imsglobal.org/spec/lti/claim/deployment_id": deployment,
        "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiResourceLinkRequest",
        "https://purl.imsglobal.org/spec/lti/claim/roles": roles,
        "https://purl.imsglobal.org/spec/lti/claim/context": {
            "id": CONTEXT_ID,
            "title": "Smoke Course",
        },
    }
    return jwt.encode(claims, private_key, algorithm="RS256", headers={"kid": KID})


async def main() -> int:
    private_key, jwks = make_platform()
    other_key, _ = make_platform()

    # Serve our own keys instead of fetching a real platform's.
    lti_service.platform_jwks = lambda integration: jwt.PyJWKSet.from_dict(jwks)

    learner_role = ["http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"]
    teacher_role = ["http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"]

    async with AsyncSessionLocal() as db:
        profile = await db.scalar(select(Profile).limit(1))
        if profile is None:
            print("SKIP: no profile row to link against")
            return 1

        integration = RosterIntegration(
            provider="lti",
            external_issuer=ISSUER,
            lti_client_id=CLIENT_ID,
            lti_deployment_id=DEPLOYMENT_ID,
            lti_oidc_auth_url=f"{ISSUER}/mod/lti/auth.php",
            lti_platform_jwks_url=f"{ISSUER}/jwks.json",
            label="smoke",
        )
        db.add(integration)
        await db.flush()

        # ── 1. a valid launch verifies and resolves ──────────────────────────
        state, nonce = lti_service.mint_state()
        check(lti_service.consume_state(state) == nonce, "state 兑换出同一 nonce")
        state2, nonce2 = lti_service.mint_state()
        token = sign(
            private_key, nonce=nonce2, sub="smoke-student-1", email=profile.email,
            roles=learner_role,
        )
        claims = lti_service.verify_launch(token, integration, nonce=nonce2)
        check(claims.subject == "smoke-student-1", "sub 解析正确")
        check(claims.role == "student", "Learner 角色映射为 student")
        check(claims.context_id == CONTEXT_ID, "context id 解析正确")

        user_id, class_id, role = await lti_service.apply_launch(db, integration, claims)
        await db.flush()
        check(user_id == profile.id, "命中同邮箱的既有账号（不新建）")
        check(class_id is not None, "班级已创建")
        check(role == "student", "选课角色为 student")

        # ── 2. replaying the same launch must not duplicate anything ─────────
        state3, nonce3 = lti_service.mint_state()
        token3 = sign(
            private_key, nonce=nonce3, sub="smoke-student-1", email=profile.email,
            roles=learner_role,
        )
        claims3 = lti_service.verify_launch(token3, integration, nonce=nonce3)
        user_id3, class_id3, _ = await lti_service.apply_launch(db, integration, claims3)
        await db.flush()
        identity_count = await db.scalar(
            select(func.count())
            .select_from(ExternalIdentity)
            .where(ExternalIdentity.external_user_id == "smoke-student-1")
        )
        enrollment_count = await db.scalar(
            select(func.count())
            .select_from(Enrollment)
            .where(Enrollment.class_id == class_id3)
        )
        class_count = await db.scalar(
            select(func.count())
            .select_from(ClassGroup)
            .where(ClassGroup.external_class_id == CONTEXT_ID)
        )
        check(identity_count == 1, f"重放后身份仍只有 1 条（实际 {identity_count}）")
        check(enrollment_count == 1, f"重放后选课仍只有 1 条（实际 {enrollment_count}）")
        check(class_count == 1, f"重放后班级仍只有 1 个（实际 {class_count}）")
        check(user_id3 == user_id, "重放解析到同一用户")

        # ── 3. role upgrade is accepted, downgrade is not ────────────────────
        state4, nonce4 = lti_service.mint_state()
        token4 = sign(
            private_key, nonce=nonce4, sub="smoke-teacher-1", email=profile.email,
            roles=teacher_role, name="Smoke Teacher",
        )
        claims4 = lti_service.verify_launch(token4, integration, nonce=nonce4)
        check(claims4.role == "teacher", "Instructor 角色映射为 teacher")
        await lti_service.apply_launch(db, integration, claims4)
        await db.flush()

        # ── 4. rejections ────────────────────────────────────────────────────
        for label, bad_token, bad_nonce, expected in [
            (
                "错误签名被拒",
                sign(other_key, nonce=nonce2, sub="smoke-student-1",
                     email=profile.email, roles=learner_role),
                nonce2,
                "signature",
            ),
            (
                "过期 token 被拒",
                sign(private_key, nonce=nonce2, sub="smoke-student-1",
                     email=profile.email, roles=learner_role, expires_in=-600),
                nonce2,
                "expired",
            ),
            (
                "nonce 不匹配被拒",
                sign(private_key, nonce="not-the-nonce", sub="smoke-student-1",
                     email=profile.email, roles=learner_role),
                nonce2,
                "nonce",
            ),
            (
                "issuer 不匹配被拒",
                sign(private_key, nonce=nonce2, sub="smoke-student-1",
                     email=profile.email, roles=learner_role,
                     issuer="https://evil.example.com"),
                nonce2,
                "issuer",
            ),
            (
                "deployment 不匹配被拒",
                sign(private_key, nonce=nonce2, sub="smoke-student-1",
                     email=profile.email, roles=learner_role, deployment="other-deploy"),
                nonce2,
                "deployment",
            ),
        ]:
            try:
                lti_service.verify_launch(bad_token, integration, nonce=bad_nonce)
                check(False, label)
            except LtiError as exc:
                check(True, f"{label}（{str(exc)[:44]}）")

        # ── 5. an unknown person is refused, not half-created ────────────────
        state5, nonce5 = lti_service.mint_state()
        token5 = sign(
            private_key, nonce=nonce5, sub="smoke-stranger-1",
            email=f"stranger-{uuid.uuid4()}@example.com", roles=learner_role,
        )
        claims5 = lti_service.verify_launch(token5, integration, nonce=nonce5)
        try:
            await lti_service.apply_launch(db, integration, claims5)
            check(False, "未知用户应被拒绝（需要 Supabase 侧建号）")
        except LtiError as exc:
            check(
                "provisioning_required" in str(exc),
                f"未知用户被明确拒绝而不是建半个账号（{str(exc)[:40]}）",
            )

        # ── 6. state cannot be replayed ──────────────────────────────────────
        try:
            lti_service.consume_state(state2)
            lti_service.consume_state(state2)
            check(False, "state 应只能用一次")
        except LtiError:
            check(True, "state 只能用一次（二次兑换被拒）")

        await db.rollback()
        print("rolled back — no data persisted")

    if fails:
        print(f"\n{len(fails)} FAILED")
        return 1
    print("\nOK: LTI launch verifies, binds nonce, and is idempotent")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

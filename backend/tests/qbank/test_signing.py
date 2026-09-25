import base64
import hashlib
import hmac

from qbank.xkw.signing import (
    HEADER_SIGN_V1,
    HEADER_SIGN_V2,
    build_signed_headers,
    canonical_string,
    serialize_body,
    sign_v1,
    sign_v2,
)

# 接入指引/02 worked example (GET /xopqbm/textbooks, secret=test).
_DOC_PARAMS = {
    "Xop-App-Id": "test",
    "Xop-Nonce": "01e7bd52ee7b45328630fe39d7f295ad",
    "Xop-Timestamp": "1645151617",
    "course_id": "27",
    "grade_id": "",
    "page_index": "1",
    "page_size": "10",
    "version_id": "",
    "xop_url": "/xopqbm/textbooks",
}
_DOC_CANONICAL = (
    "Xop-App-Id=test&Xop-Nonce=01e7bd52ee7b45328630fe39d7f295ad"
    "&Xop-Timestamp=1645151617&course_id=27&grade_id=&page_index=1"
    "&page_size=10&version_id=&xop_url=/xopqbm/textbooks"
)
_DOC_BASE64 = (
    "WG9wLUFwcC1JZD10ZXN0JlhvcC1Ob25jZT0wMWU3YmQ1MmVlN2I0NTMyODYzMGZlMzlkN2Yy"
    "OTVhZCZYb3AtVGltZXN0YW1wPTE2NDUxNTE2MTcmY291cnNlX2lkPTI3JmdyYWRlX2lkPSZw"
    "YWdlX2luZGV4PTEmcGFnZV9zaXplPTEwJnZlcnNpb25faWQ9JnhvcF91cmw9L3hvcHFibS90"
    "ZXh0Ym9va3Mmc2VjcmV0PXRlc3Q="
)
_DOC_SIGN = "c23660f8b2167639b12731acabeb111fb7f8fc25"


def test_canonical_string_matches_doc() -> None:
    assert canonical_string(_DOC_PARAMS) == _DOC_CANONICAL


def test_base64_matches_doc() -> None:
    raw = f"{_DOC_CANONICAL}&secret=test"
    assert base64.b64encode(raw.encode()).decode() == _DOC_BASE64


def test_v1_signature_matches_doc() -> None:
    assert sign_v1(_DOC_PARAMS, "test") == _DOC_SIGN


def test_build_signed_headers_v1_reproduces_doc() -> None:
    signed = build_signed_headers(
        app_id="test",
        secret="test",
        url_path="/xopqbm/textbooks",
        query={
            "course_id": 27,
            "grade_id": "",
            "page_index": 1,
            "page_size": 10,
            "version_id": "",
        },
        timestamp=1645151617,
        nonce="01e7bd52ee7b45328630fe39d7f295ad",
    )
    assert signed.headers[HEADER_SIGN_V1] == _DOC_SIGN
    assert HEADER_SIGN_V2 not in signed.headers


def test_post_body_joins_sorted_map() -> None:
    body = serialize_body({"course_id": 1, "kpoint_ids": [], "page_index": 2})
    canonical = canonical_string(
        {
            "Xop-App-Id": "test",
            "Xop-Nonce": "n",
            "Xop-Timestamp": "1",
            "xop_body": body,
            "xop_url": "/xopqbm/questions",
        }
    )
    assert canonical == (
        'Xop-App-Id=test&Xop-Nonce=n&Xop-Timestamp=1'
        '&xop_body={"course_id":1,"kpoint_ids":[],"page_index":2}'
        "&xop_url=/xopqbm/questions"
    )


def test_serialize_body_uses_gson_html_escapes() -> None:
    assert serialize_body({"text": "a<b>&c='d'"}) == (
        '{"text":"a\\u003cb\\u003e\\u0026c\\u003d\\u0027d\\u0027"}'
    )
    assert serialize_body({"text": "中文"}) == '{"text":"中文"}'


def test_v2_signature_is_hmac_sha256_over_base64() -> None:
    encoded = base64.b64encode(_DOC_CANONICAL.encode())
    expected = hmac.new(b"test", encoded, hashlib.sha256).hexdigest()
    assert sign_v2(_DOC_PARAMS, "test") == expected


def test_build_signed_headers_v2_uses_v2_header() -> None:
    signed = build_signed_headers(
        app_id="test",
        secret="test",
        url_path="/xopqbm/textbooks",
        version=2,
        timestamp=1,
        nonce="n",
    )
    assert HEADER_SIGN_V2 in signed.headers
    assert HEADER_SIGN_V1 not in signed.headers

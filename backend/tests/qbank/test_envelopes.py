"""Envelope normalization + the signed client against a mocked gateway."""

import json

import httpx
import pytest

from qbank.usage import UsageRecord
from qbank.xkw import envelopes
from qbank.xkw.client import XkwClient
from qbank.xkw.errors import (
    XKW_AUTH,
    XKW_BAD_REQUEST,
    XKW_FORBIDDEN,
    XKW_MALFORMED,
    XKW_NOT_CONFIGURED,
    XKW_SERVER,
    XKW_TIMEOUT,
    XkwError,
)
from qbank.xkw.fixture_provider import FixtureXkwProvider
from qbank.xkw.provider import HttpXkwProvider
from qbank.xkw.signing import HEADER_SIGN_V1, build_signed_headers, sign_v1
from qbank.xkw.types import CallContext, QuestionQuery, XkwQuestionRaw

CTX = CallContext(use_case="test", trace_id="t1")


# --- envelopes (shapes taken from the doc examples) ---


def test_push_envelope_with_session_id() -> None:
    result = envelopes.normalize(
        {"msg": "", "code": 0, "data": [{"id": "1", "stem": "s"}], "session_id": "abc"}
    )
    assert result.items == [{"id": "1", "stem": "s"}]
    assert result.session_id == "abc" and result.billable


def test_success_code_2000000() -> None:
    assert envelopes.normalize({"code": 2000000, "msg": "OK", "data": [1]}).items == [1]


def test_bare_array_envelope() -> None:
    assert envelopes.normalize([{"id": "q"}]).items == [{"id": "q"}]


def test_keyword_search_page_envelope() -> None:
    result = envelopes.normalize(
        {"page_index": 1, "total_page": 3, "total_size": 25, "items": [{"id": "a"}], "page_size": 10}
    )
    assert result.items == [{"id": "a"}] and result.total_page == 3


def test_paper_detail_object_envelope() -> None:
    result = envelopes.normalize({"id": "p1", "questions": [], "paper_struct_html": ""})
    assert result.items == [{"id": "p1", "questions": [], "paper_struct_html": ""}]


def test_empty_not_billed() -> None:
    result = envelopes.normalize({"code": 900161214, "msg": "empty", "data": None})
    assert result.items == [] and result.billable is False


@pytest.mark.parametrize(
    ("code", "expected"),
    [
        (900161401, XKW_AUTH),
        (4010002, XKW_AUTH),
        (900161403, XKW_FORBIDDEN),
        (900161400, XKW_BAD_REQUEST),
        (900161500, XKW_SERVER),
        (5000001, XKW_SERVER),
        (4030001, XKW_MALFORMED),
    ],
)
def test_error_codes(code: int, expected: str) -> None:
    with pytest.raises(XkwError) as info:
        envelopes.normalize({"code": code, "msg": "x"})
    assert info.value.code == expected and info.value.raw_code == code


def test_http_error_without_body_code() -> None:
    with pytest.raises(XkwError) as info:
        envelopes.normalize(None, http_status=503)
    assert info.value.code == XKW_SERVER


def test_camel_case_question_payload() -> None:
    raw = XkwQuestionRaw.from_payload(
        {"id": "2807078157803520", "courseId": 1, "typeId": "0101", "kpointIds": [1], "stem": "<div/>"}
    )
    assert raw.course_id == 1 and raw.type_id == "0101"
    assert raw.extra == {"kpointIds": [1]}


# --- client ---


class _Recorder:
    def __init__(self) -> None:
        self.records: list[UsageRecord] = []

    async def __call__(self, record: UsageRecord) -> None:
        self.records.append(record)


def _client(handler, recorder: _Recorder) -> XkwClient:  # noqa: ANN001
    return XkwClient(
        app_id="test",
        secret="test",
        base_url="https://openapi.xkw.com",
        http=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
        recorder=recorder,
        backoff_base_s=0,
    )


async def test_client_signs_exactly_what_it_sends() -> None:
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["request"] = request
        return httpx.Response(200, json={"code": 2000000, "data": [], "session_id": "s1"})

    recorder = _Recorder()
    client = _client(handler, recorder)
    query = QuestionQuery(course_id=27, kpoint_ids=[1, 2], count=5)
    await HttpXkwProvider(client).fetch_questions(query, ctx=CTX)

    request = seen["request"]
    body = request.content.decode("utf-8")
    params = {
        "Xop-App-Id": "test",
        "Xop-Nonce": request.headers["Xop-Nonce"],
        "Xop-Timestamp": request.headers["Xop-Timestamp"],
        "xop_url": "/xopqbm/questions",
        "xop_body": body,
    }
    assert request.headers[HEADER_SIGN_V1] == sign_v1(params, "test")
    assert json.loads(body)["kpoint_ids"] == [1, 2]
    assert request.url.path == "/xopqbm/questions"
    assert len(recorder.records) == 1 and recorder.records[0].success
    assert recorder.records[0].request_id == request.headers["X-Request-Id"]


async def test_client_signs_query_params() -> None:
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["request"] = request
        return httpx.Response(200, json={"code": 2000000, "data": []})

    client = _client(handler, _Recorder())
    await HttpXkwProvider(client).question_types(27, ctx=CTX)
    request = seen["request"]
    expected = build_signed_headers(
        app_id="test",
        secret="test",
        url_path="/xopqbm/question-types",
        query={"course_id": "27"},
        timestamp=int(request.headers["Xop-Timestamp"]),
        nonce=request.headers["Xop-Nonce"],
    )
    assert request.headers[HEADER_SIGN_V1] == expected.headers[HEADER_SIGN_V1]
    assert request.url.params["course_id"] == "27"


async def test_client_retries_server_errors_then_succeeds() -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] < 3:
            return httpx.Response(200, json={"code": 900161500, "msg": "boom"})
        return httpx.Response(200, json={"code": 2000000, "data": [{"id": "q1", "stem": "s"}]})

    recorder = _Recorder()
    page = await HttpXkwProvider(_client(handler, recorder)).fetch_questions(
        QuestionQuery(course_id=1), ctx=CTX
    )
    assert [q.id for q in page.questions] == ["q1"]
    assert calls["n"] == 3
    assert [r.success for r in recorder.records] == [False, False, True]
    assert recorder.records[0].error_type == XKW_SERVER


async def test_client_gives_up_after_two_retries() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("slow", request=request)

    recorder = _Recorder()
    with pytest.raises(XkwError) as info:
        await HttpXkwProvider(_client(handler, recorder)).list_courses(ctx=CTX)
    assert info.value.code == XKW_TIMEOUT
    assert len(recorder.records) == 3


async def test_client_does_not_retry_forbidden() -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return httpx.Response(200, json={"code": 900161403, "msg": "trial quota"})

    recorder = _Recorder()
    with pytest.raises(XkwError) as info:
        await HttpXkwProvider(_client(handler, recorder)).list_courses(ctx=CTX)
    assert info.value.code == XKW_FORBIDDEN and calls["n"] == 1
    assert recorder.records[0].billable is False


async def test_empty_result_is_not_billable() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"code": 900161214, "msg": "empty"})

    recorder = _Recorder()
    page = await HttpXkwProvider(_client(handler, recorder)).fetch_questions(
        QuestionQuery(course_id=1), ctx=CTX
    )
    assert page.questions == [] and recorder.records[0].billable is False


def test_client_requires_credentials() -> None:
    with pytest.raises(XkwError) as info:
        XkwClient(app_id="", secret="", base_url="https://x")
    assert info.value.code == XKW_NOT_CONFIGURED


# --- fixture provider ---


async def test_fixture_provider_serves_doc_samples_with_session_dedupe() -> None:
    recorder = _Recorder()
    provider = FixtureXkwProvider(recorder=recorder)
    first = await provider.fetch_questions(QuestionQuery(course_id=0, count=5), ctx=CTX)
    second = await provider.fetch_questions(
        QuestionQuery(course_id=0, count=10, session_id=first.session_id), ctx=CTX
    )
    first_ids = {q.id for q in first.questions}
    assert len(first_ids) == 5
    assert first_ids.isdisjoint(q.id for q in second.questions)
    assert len(first.questions) + len(second.questions) == 12
    assert all(not record.billable for record in recorder.records)
    english = await provider.fetch_questions(QuestionQuery(course_id=202, count=10), ctx=CTX)
    assert {q.course_name for q in english.questions} == {"初中英语"}
    types = await provider.question_types(202, ctx=CTX)
    assert {t["name"]: t["objective"] for t in types}["阅读理解"] is True

"""Desmos graph contracts: the AI payload VERDICT + the graphs API (camelCase).

Three descriptions of the graph parameters exist by design, each with its own
job (FC schema 是提示、skill 是教材、这里是法律): the loose FunctionDeclaration
schema hints the shape to the model, the desmos-graphing skill teaches the
rules, and `DesmosGraphPayload` below is the only enforcement — every payload
the model produces is validated here before anything is persisted (compose 的
零信任 LLM 同款纪律). Validation failures go back to the model as structured
errors so it can self-correct within the tool loop.
"""

import re
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel

# Hard caps: keep a single graph bounded (prompt/DB/render sanity).
MAX_EXPRESSIONS = 20
MAX_LATEX_CHARS = 500
MAX_LABEL_CHARS = 100
MAX_AXIS_LABEL_CHARS = 50
MAX_DOMAIN_CHARS = 50
# getState() blobs are normally a few KB; 200KB tolerates big user edits while
# blocking abuse (images are disabled in the calculator config, so nothing
# legitimate approaches this).
MAX_STATE_JSON_BYTES = 200_000

_ID_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]*$")

# Desmos default palette names -> hex (frontend translator mirrors this map).
COLOR_NAMES = ("RED", "BLUE", "GREEN", "PURPLE", "ORANGE", "BLACK")
LINE_STYLES = ("SOLID", "DASHED", "DOTTED")


class DomainIn(BaseModel):
    """A {min,max} LaTeX-string pair (sliderBounds / parametricDomain / polarDomain)."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    min: str = Field(min_length=1, max_length=MAX_DOMAIN_CHARS)
    max: str = Field(min_length=1, max_length=MAX_DOMAIN_CHARS)


class SliderBoundsIn(DomainIn):
    # "" = continuously adjustable (official semantics).
    step: str = Field(default="", max_length=MAX_DOMAIN_CHARS)


class ExpressionIn(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, extra="forbid"
    )

    latex: str = Field(min_length=1, max_length=MAX_LATEX_CHARS)
    id: str | None = Field(default=None, max_length=64)
    color: str | None = None
    line_style: str | None = None
    hidden: bool | None = None
    label: str | None = Field(default=None, min_length=1, max_length=MAX_LABEL_CHARS)
    slider_bounds: SliderBoundsIn | None = None
    parametric_domain: DomainIn | None = None
    polar_domain: DomainIn | None = None

    @field_validator("id")
    @classmethod
    def id_shape(cls, value: str | None) -> str | None:
        if value is not None and not _ID_RE.match(value):
            raise ValueError(
                "id must match ^[A-Za-z][A-Za-z0-9_]*$ (English letters/digits/_)"
            )
        return value

    @field_validator("color")
    @classmethod
    def color_in_palette(cls, value: str | None) -> str | None:
        if value is not None and value not in COLOR_NAMES:
            raise ValueError(f"color must be one of {', '.join(COLOR_NAMES)}")
        return value

    @field_validator("line_style")
    @classmethod
    def line_style_known(cls, value: str | None) -> str | None:
        if value is not None and value not in LINE_STYLES:
            raise ValueError(f"lineStyle must be one of {', '.join(LINE_STYLES)}")
        return value


class MathBoundsIn(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    left: float
    right: float
    bottom: float
    top: float

    @model_validator(mode="after")
    def bounds_ordered(self) -> "MathBoundsIn":
        if self.right <= self.left:
            raise ValueError("mathBounds requires left < right")
        if self.top <= self.bottom:
            raise ValueError("mathBounds requires bottom < top")
        return self


class DesmosGraphPayload(BaseModel):
    """The validated render_desmos_graph payload — the single verdict."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, extra="forbid"
    )

    expressions: list[ExpressionIn] = Field(min_length=1, max_length=MAX_EXPRESSIONS)
    math_bounds: MathBoundsIn | None = None
    degree_mode: bool | None = None
    polar_mode: bool | None = None
    x_axis_label: str | None = Field(default=None, max_length=MAX_AXIS_LABEL_CHARS)
    y_axis_label: str | None = Field(default=None, max_length=MAX_AXIS_LABEL_CHARS)

    @model_validator(mode="after")
    def ids_unique(self) -> "DesmosGraphPayload":
        seen: set[str] = set()
        for expression in self.expressions:
            if expression.id is None:
                continue
            if expression.id in seen:
                raise ValueError(f"duplicate expression id '{expression.id}'")
            seen.add(expression.id)
        return self


# --- graphs API contracts ---


class DesmosGraphOut(BaseModel):
    """Card hydrate: the AI spec (reset anchor) + the user-edit state if any."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    ai_params: dict[str, Any] = Field(validation_alias="ai_params_json")
    state: dict[str, Any] | None = Field(default=None, validation_alias="state_json")
    updated_at: datetime


class DesmosGraphPatchIn(BaseModel):
    """Save a user edit: the opaque calculator state + the readable expression
    snapshot extracted alongside it (read_current_graph's data source)."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    state: dict[str, Any]
    expressions: list[dict[str, Any]] = Field(default_factory=list, max_length=200)

    @field_validator("state")
    @classmethod
    def state_size_cap(cls, value: dict[str, Any]) -> dict[str, Any]:
        import json

        if len(json.dumps(value, ensure_ascii=False)) > MAX_STATE_JSON_BYTES:
            raise ValueError("state too large")
        return value

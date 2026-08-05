import type {
  DesmosConstructorOptions,
  DesmosExpressionState,
  DesmosGraphSettings,
  DesmosMathBounds,
} from './desmosTypes'

/**
 * Pure translation: the AI's validated graph params -> Desmos API call inputs.
 *
 * The AI never produces the opaque calculator state (officially forbidden to
 * hand-build); it produces our 13-field spec, and this module turns it into
 * the setExpressions / updateSettings / setMathBounds arguments. Kept as pure
 * functions so the mapping is unit-testable without a calculator instance.
 */

// Wire shapes of desmos_graphs.ai_params_json (validated by schemas/desmos.py).

interface AiExpressionBase {
  latex: string
  id?: string
  color?: string
  lineStyle?: string
  hidden?: boolean
  label?: string
  sliderBounds?: { min: string; max: string; step?: string }
}

export interface AiGraphExpression extends AiExpressionBase {
  parametricDomain?: { min: string; max: string }
  polarDomain?: { min: string; max: string }
}

export interface AiGraph3DExpression extends AiExpressionBase {
  parametricDomain?: { min: string; max: string }
  parametricDomainU?: { min: string; max: string }
  parametricDomainV?: { min: string; max: string }
}

export interface AiGraphParams {
  expressions: AiGraphExpression[]
  mathBounds?: DesmosMathBounds
  degreeMode?: boolean
  polarMode?: boolean
  xAxisLabel?: string
  yAxisLabel?: string
}

export interface AiGraph3DParams {
  expressions: AiGraph3DExpression[]
  degreeMode?: boolean
  xAxisLabel?: string
  yAxisLabel?: string
}

/** Desmos default palette (Colors section of the official docs). */
const COLOR_HEX: Record<string, string> = {
  RED: '#c74440',
  BLUE: '#2d70b3',
  GREEN: '#388c46',
  PURPLE: '#6042a6',
  ORANGE: '#fa7e19',
  BLACK: '#000000',
}

/**
 * Fixed instance configuration (product decisions, not per-graph):
 * user editing stays enabled (expressions list visible), images/folders/notes
 * off to keep the list lean and the persisted state small, expression size
 * capped, reset button shown (setDefaultState anchors it to the AI original).
 */
export const CALCULATOR_OPTIONS: DesmosConstructorOptions = {
  border: false,
  images: false,
  folders: false,
  notes: false,
  capExpressionSize: true,
  keypad: true,
  keypadActivated: false,
  showResetButtonOnGraphpaper: true,
}

export function toGraphSettings(params: AiGraphParams): DesmosGraphSettings {
  const settings: DesmosGraphSettings = {}
  if (params.degreeMode !== undefined) settings.degreeMode = params.degreeMode
  if (params.polarMode !== undefined) settings.polarMode = params.polarMode
  if (params.xAxisLabel) settings.xAxisLabel = params.xAxisLabel
  if (params.yAxisLabel) settings.yAxisLabel = params.yAxisLabel
  return settings
}

export function toMathBounds(params: AiGraphParams): DesmosMathBounds | null {
  const bounds = params.mathBounds
  if (!bounds) return null
  // Defensive: invalid bounds are a silent no-op in Desmos, but they should
  // have been rejected server-side — skip rather than call with garbage.
  if (bounds.right <= bounds.left || bounds.top <= bounds.bottom) return null
  return bounds
}

function baseExpressionState(
  expression: AiExpressionBase,
  index: number
): DesmosExpressionState {
  const state: DesmosExpressionState = {
    // AI ids are validated server-side; fall back to a positional id so
    // every expression stays addressable.
    id: expression.id ?? `expr_${index}`,
    latex: expression.latex,
  }
  if (expression.color && COLOR_HEX[expression.color]) {
    state.color = COLOR_HEX[expression.color]
  }
  if (expression.lineStyle) state.lineStyle = expression.lineStyle
  if (expression.hidden !== undefined) state.hidden = expression.hidden
  if (expression.label) {
    state.label = expression.label
    // Desmos hides labels unless showLabel is set — "given a label" always
    // means "show it" in our schema, so the flag is applied here.
    state.showLabel = true
  }
  if (expression.sliderBounds) {
    state.sliderBounds = {
      min: expression.sliderBounds.min,
      max: expression.sliderBounds.max,
      step: expression.sliderBounds.step ?? '',
    }
  }
  return state
}

export function toExpressionStates(
  params: AiGraphParams
): DesmosExpressionState[] {
  return params.expressions.map((expression, index) => {
    const state = baseExpressionState(expression, index)
    if (expression.parametricDomain) {
      state.parametricDomain = expression.parametricDomain
    }
    if (expression.polarDomain) state.polarDomain = expression.polarDomain
    return state
  })
}

// --- 3D variants ---

export function toGraphSettings3D(params: AiGraph3DParams): DesmosGraphSettings {
  const settings: DesmosGraphSettings = {}
  if (params.degreeMode !== undefined) settings.degreeMode = params.degreeMode
  if (params.xAxisLabel) settings.xAxisLabel = params.xAxisLabel
  if (params.yAxisLabel) settings.yAxisLabel = params.yAxisLabel
  return settings
}

export function toExpressionStates3D(
  params: AiGraph3DParams
): DesmosExpressionState[] {
  return params.expressions.map((expression, index) => {
    const state = baseExpressionState(expression, index)
    if (expression.parametricDomain) {
      state.parametricDomain = expression.parametricDomain
    }
    // Surface u/v domains: undocumented property names, verified in-browser
    // via getExpressions() on a Calculator3D instance (2026-07-09).
    if (expression.parametricDomainU) {
      state.parametricDomain3Du = expression.parametricDomainU
    }
    if (expression.parametricDomainV) {
      state.parametricDomain3Dv = expression.parametricDomainV
    }
    return state
  })
}

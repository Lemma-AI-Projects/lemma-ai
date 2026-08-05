/**
 * Minimal typings for the slice of the Desmos API v1.12 we actually use.
 * (Desmos ships no official TS types; `unknown` is used for opaque values —
 * calculator states must never be constructed or inspected by us.)
 */

export interface DesmosExpressionState {
  id?: string
  latex?: string
  color?: string
  lineStyle?: string
  hidden?: boolean
  label?: string
  showLabel?: boolean
  sliderBounds?: { min: string; max: string; step?: string }
  parametricDomain?: { min: string; max: string }
  polarDomain?: { min: string; max: string }
  // 3D parametric-surface domains. Not in the official API docs; names
  // verified in-browser via getExpressions() on a Calculator3D (2026-07-09).
  parametricDomain3Du?: { min: string; max: string }
  parametricDomain3Dv?: { min: string; max: string }
  [key: string]: unknown
}

export interface DesmosGraphSettings {
  degreeMode?: boolean
  polarMode?: boolean
  // 3D settings expose only x/y labels (verified in-browser — no zAxisLabel).
  xAxisLabel?: string
  yAxisLabel?: string
}

export interface DesmosMathBounds {
  left: number
  right: number
  bottom: number
  top: number
}

export interface DesmosCalculator {
  setExpressions(states: DesmosExpressionState[]): void
  getExpressions(): DesmosExpressionState[]
  updateSettings(settings: DesmosGraphSettings): void
  setMathBounds(bounds: DesmosMathBounds): void
  getState(): unknown
  setState(state: unknown): void
  setDefaultState(state: unknown): void
  observeEvent(
    event: string,
    callback: (eventName: string, event: { isUserInitiated: boolean }) => void
  ): void
  unobserveEvent(event: string): void
  destroy(): void
}

export interface DesmosConstructorOptions {
  border?: boolean
  images?: boolean
  folders?: boolean
  notes?: boolean
  capExpressionSize?: boolean
  keypad?: boolean
  keypadActivated?: boolean
  showResetButtonOnGraphpaper?: boolean
  [key: string]: unknown
}

export interface DesmosNamespace {
  GraphingCalculator(
    element: HTMLElement,
    options?: DesmosConstructorOptions
  ): DesmosCalculator
  // Built on top of the graphing calculator, shares its API surface (official
  // 3D docs); availability depends on the API key's enabled features.
  Calculator3D(
    element: HTMLElement,
    options?: DesmosConstructorOptions
  ): DesmosCalculator
}

declare global {
  interface Window {
    Desmos?: DesmosNamespace
  }
}

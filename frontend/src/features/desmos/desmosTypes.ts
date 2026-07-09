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
  [key: string]: unknown
}

export interface DesmosGraphSettings {
  degreeMode?: boolean
  polarMode?: boolean
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
}

declare global {
  interface Window {
    Desmos?: DesmosNamespace
  }
}

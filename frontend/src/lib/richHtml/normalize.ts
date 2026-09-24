import type { Element, ElementContent, Properties, Root, RootContent } from 'hast'

export interface NormalizeOptions {
  /** 含有这些 class 的元素整块移除（例如后端本应剥离、却残留的题号）。 */
  dropClassNames?: readonly string[]
}

// 只保留排版语义；颜色、字体、字号一律交给我们自己的样式体系。
const KEPT_STYLE_PROPERTIES = new Set([
  'text-align',
  'text-indent',
  'font-style',
  'font-weight',
  'vertical-align',
  'width',
  'height',
  'border-collapse',
  'border-width',
  'border-style',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
])

// 边框简写里只留下宽度与线型，颜色由主题接管。
const BORDER_SHORTHANDS = new Set([
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
])
const BORDER_TOKEN =
  /^(?:\d*\.?\d+(?:px|pt|em|rem)?|thin|medium|thick|none|hidden|solid|dashed|dotted|double|groove|ridge|inset|outset)$/i
const UNSAFE_STYLE_VALUE = /url\s*\(|expression\s*\(|javascript:|@import|\\/i

// 学科网装饰属性（span[wave] / span[em] / span[u]）→ data-decor。
const DECOR_ATTRIBUTES = ['wave', 'em', 'u'] as const

export function filterStyle(style: string): { style: string; underline: boolean } {
  const kept: string[] = []
  let underline = false

  for (const declaration of style.split(';')) {
    const colon = declaration.indexOf(':')
    if (colon === -1) continue
    const property = declaration.slice(0, colon).trim().toLowerCase()
    const value = declaration.slice(colon + 1).trim()
    if (!property || !value || UNSAFE_STYLE_VALUE.test(value)) continue

    if (property.startsWith('text-decoration') && /\bunderline\b/i.test(value)) {
      underline = true
      continue
    }
    if (KEPT_STYLE_PROPERTIES.has(property)) {
      kept.push(`${property}: ${value}`)
      continue
    }
    if (BORDER_SHORTHANDS.has(property)) {
      const tokens = value.split(/\s+/).filter((token) => BORDER_TOKEN.test(token))
      if (tokens.length > 0) kept.push(`${property}: ${tokens.join(' ')}`)
    }
  }

  return { style: kept.join('; '), underline }
}

function classNamesOf(properties: Properties): string[] {
  const value = properties.className
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') return value.split(/\s+/).filter(Boolean)
  return []
}

function normalizeElement(element: Element, options: NormalizeOptions): Element | null {
  const classNames = classNamesOf(element.properties)
  if (options.dropClassNames?.some((name) => classNames.includes(name))) {
    return null
  }

  const properties: Properties = { ...element.properties }
  const decor: string[] = []

  for (const attribute of DECOR_ATTRIBUTES) {
    if (attribute in properties) {
      decor.push(attribute)
      delete properties[attribute]
    }
  }

  const isBlank = classNames.includes('qml-bk')
  if (typeof properties.style === 'string') {
    const { style, underline } = filterStyle(properties.style)
    if (underline && !isBlank && !decor.includes('u')) decor.push('u')
    if (style) properties.style = style
    else delete properties.style
  }

  if ('qml-space-size' in properties) {
    properties.dataSpace = String(properties['qml-space-size'])
    delete properties['qml-space-size']
  }

  if (classNames.includes('slash-1')) {
    properties.dataCell = 'slash'
  }
  const keptClassNames = classNames.filter((name) => name !== 'slash-1')
  if (keptClassNames.length > 0) properties.className = keptClassNames
  else delete properties.className

  if (element.tagName === 'table' && typeof properties.align === 'string') {
    properties.dataAlign = properties.align
    delete properties.align
  }

  delete properties.dataCopyright

  if (decor.length > 0) {
    properties.dataDecor = decor.join(' ')
  }

  return {
    ...element,
    // 关键词搜题用 <em> 标高亮，不是着重号（着重号是 span[em]），降级为普通 span。
    tagName: element.tagName === 'em' ? 'span' : element.tagName,
    properties,
    children: normalizeChildren(element.children, options),
  }
}

function normalizeChildren(
  children: readonly (ElementContent | RootContent)[],
  options: NormalizeOptions
): ElementContent[] {
  const result: ElementContent[] = []
  for (const child of children) {
    if (child.type === 'element') {
      const element = normalizeElement(child, options)
      if (element) result.push(element)
    } else if (child.type === 'text') {
      result.push(child)
    }
  }
  return result
}

/** 纯函数：样式归一化、装饰属性映射、丢弃噪音属性。清洗交给 sanitize。 */
export function normalizeTree(tree: Root, options: NormalizeOptions = {}): Root {
  return { ...tree, children: normalizeChildren(tree.children, options) }
}

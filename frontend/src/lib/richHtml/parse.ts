import type { Element, ElementContent, Root } from 'hast'
import { fromHtml } from 'hast-util-from-html'
import { sanitize } from 'hast-util-sanitize'

import { normalizeTree, type NormalizeOptions } from './normalize'
import { richHtmlSchema, richHtmlTagNames } from './schema'

export interface ParsedRichHtml {
  tree: Root
  /** data-*-id 锚点：属性名（如 data-slot-id）→ 出现顺序的 id 列表 */
  anchors: ReadonlyMap<string, readonly string[]>
  /** 被白名单过滤掉的标签/属性，开发态用来发现新词汇 */
  warnings: readonly string[]
}

const CACHE_LIMIT = 300
const cache = new Map<string, ParsedRichHtml>()

const allowedTagNames = new Set(richHtmlTagNames)
const strippedTagNames = new Set(richHtmlSchema.strip ?? [])

function allowedPropertyNames(tagName: string): Set<string> {
  const attributes = richHtmlSchema.attributes ?? {}
  const names = [...(attributes['*'] ?? []), ...(attributes[tagName] ?? [])]
  return new Set(names.map((entry) => (typeof entry === 'string' ? entry : entry[0])))
}

function isElement(node: ElementContent): node is Element {
  return node.type === 'element'
}

function collectDisallowed(nodes: readonly ElementContent[], warnings: Set<string>) {
  for (const node of nodes.filter(isElement)) {
    if (strippedTagNames.has(node.tagName)) {
      warnings.add(`removed <${node.tagName}>`)
      continue
    }
    if (!allowedTagNames.has(node.tagName)) {
      warnings.add(`unwrapped <${node.tagName}>`)
    }
    const allowed = allowedPropertyNames(node.tagName)
    for (const key of Object.keys(node.properties)) {
      if (key.startsWith('data') || allowed.has(key)) continue
      warnings.add(`dropped <${node.tagName}> ${key}`)
    }
    collectDisallowed(node.children, warnings)
  }
}

function toDataAttribute(propertyName: string): string {
  return `data${propertyName.slice(4).replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`
}

function collectAnchors(nodes: readonly ElementContent[], anchors: Map<string, string[]>) {
  for (const node of nodes.filter(isElement)) {
    for (const [key, value] of Object.entries(node.properties)) {
      if (!/^data[A-Z].*Id$/.test(key) || typeof value !== 'string') continue
      const attribute = toDataAttribute(key)
      const ids = anchors.get(attribute) ?? []
      ids.push(value)
      anchors.set(attribute, ids)
    }
    collectAnchors(node.children, anchors)
  }
}

/**
 * 受限 HTML → 已清洗的 hast 树。管线：fromHtml(fragment) → normalizeTree →
 * sanitize(richHtmlSchema)。结果按 html 字串缓存，同一片段反复渲染只解析一次。
 */
export function parseRichHtml(html: string, options: NormalizeOptions = {}): ParsedRichHtml {
  const key = `${options.dropClassNames?.join(' ') ?? ''}\u0000${html}`
  const cached = cache.get(key)
  if (cached) return cached

  const normalized = normalizeTree(fromHtml(html, { fragment: true }), options)
  const warnings = new Set<string>()
  collectDisallowed(normalized.children as ElementContent[], warnings)

  const sanitized = sanitize(normalized, richHtmlSchema)
  const tree: Root = sanitized.type === 'root' ? sanitized : { type: 'root', children: [] }
  const anchors = new Map<string, string[]>()
  collectAnchors(tree.children as ElementContent[], anchors)

  const parsed: ParsedRichHtml = { tree, anchors, warnings: [...warnings] }
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, parsed)
  return parsed
}

/** 片段里是否存在某个锚点（例如 data-slot-id="x"）。 */
export function hasRichHtmlAnchor(html: string, attribute: string, id: string): boolean {
  return parseRichHtml(html).anchors.get(attribute)?.includes(id) ?? false
}

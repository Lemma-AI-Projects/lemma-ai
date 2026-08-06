import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type TLBaseShape,
  type TLIndicatorPath,
} from 'tldraw'

/**
 * Board 自定义 shape 原型（执行计划 E0.2）
 * - KnowledgeCard：知识卡片（文本 + KaTeX 公式 + 掌握度状态点）
 * - ConceptNode：概念节点（圆形 + 标签 + 掌握度三态色）
 * 基于 tldraw v5 class API：shape 类型用 TLBaseShape<type, props>，
 * static props 为普通对象映射（含 w/h），指示线用 getIndicatorPath（Path2D）。
 */

export type Mastery = 'known' | 'learning' | 'due'

export const MASTERY_COLORS: Record<
  Mastery,
  { bg: string; border: string; label: string }
> = {
  known: { bg: '#eaf3de', border: '#3b6d11', label: '已掌握' },
  learning: { bg: '#e6f1fb', border: '#185fa5', label: '学习中' },
  due: { bg: '#fcebeb', border: '#a32d2d', label: '待复习' },
}

// ── KnowledgeCard ─────────────────────────────────────────────

export interface KnowledgeCardProps {
  w: number
  h: number
  text: string
  formula: string
  mastery: Mastery
}

export type KnowledgeCardShape = TLBaseShape<'knowledgeCard', KnowledgeCardProps>

export class KnowledgeCardShapeUtil extends BaseBoxShapeUtil<KnowledgeCardShape> {
  static type = 'knowledgeCard' as const

  static props = {
    w: T.number,
    h: T.number,
    text: T.string,
    formula: T.string,
    mastery: T.literalEnum(['known', 'learning', 'due']),
  }

  getDefaultProps(): KnowledgeCardShape['props'] {
    return { w: 240, h: 120, text: '新知识点', formula: '', mastery: 'learning' }
  }

  component(shape: KnowledgeCardShape) {
    const m = MASTERY_COLORS[shape.props.mastery]
    const html = shape.props.formula
      ? { __html: katex.renderToString(shape.props.formula, { throwOnError: false }) }
      : undefined
    return (
      <HTMLContainer style={{ overflow: 'hidden', pointerEvents: 'all' }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            borderRadius: 10,
            border: `2px solid ${m.border}`,
            background: m.bg,
            padding: '10px 12px',
            fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)',
            fontSize: 13,
            lineHeight: 1.5,
            color: '#1a1a1a',
          }}
        >
          <div style={{ fontWeight: 500, paddingRight: 18 }}>{shape.props.text}</div>
          {html && <div style={{ marginTop: 6 }} dangerouslySetInnerHTML={html} />}
          <div
            title={m.label}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: m.border,
            }}
          />
        </div>
      </HTMLContainer>
    )
  }

  getIndicatorPath(shape: KnowledgeCardShape): TLIndicatorPath {
    const { w, h } = shape.props
    const path = new Path2D()
    path.roundRect(0, 0, w, h, 10)
    return path
  }

  canEdit() {
    return true
  }
}

// ── ConceptNode ───────────────────────────────────────────────

export interface ConceptNodeProps {
  w: number
  h: number
  label: string
  mastery: Mastery
}

export type ConceptNodeShape = TLBaseShape<'conceptNode', ConceptNodeProps>

export class ConceptNodeShapeUtil extends BaseBoxShapeUtil<ConceptNodeShape> {
  static type = 'conceptNode' as const

  static props = {
    w: T.number,
    h: T.number,
    label: T.string,
    mastery: T.literalEnum(['known', 'learning', 'due']),
  }

  getDefaultProps(): ConceptNodeShape['props'] {
    return { w: 140, h: 140, label: '新概念', mastery: 'learning' }
  }

  component(shape: ConceptNodeShape) {
    const m = MASTERY_COLORS[shape.props.mastery]
    return (
      <HTMLContainer style={{ overflow: 'visible', pointerEvents: 'all' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              border: `3px solid ${m.border}`,
              background: m.bg,
              boxShadow: '0 0 0 4px rgba(0,0,0,0.04)',
            }}
          />
          <div
            style={{
              maxWidth: 130,
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 500,
              color: '#1a1a1a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {shape.props.label}
          </div>
        </div>
      </HTMLContainer>
    )
  }

  getIndicatorPath(shape: ConceptNodeShape): TLIndicatorPath {
    const { w, h } = shape.props
    const path = new Path2D()
    path.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
    return path
  }

  canEdit() {
    return true
  }
}

// ── 注册表 ────────────────────────────────────────────────────

export const boardShapeUtils = [
  KnowledgeCardShapeUtil,
  ConceptNodeShapeUtil,
] as const

// ── 类型注册（v5 要求）────────────────────────────────────────
// Custom shapes 通过 augment TLGlobalShapePropsMap 进入 TLShape 联合，
// BaseBoxShapeUtil 的泛型约束（extends TLBaseBoxShape）才得以满足。

declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    knowledgeCard: KnowledgeCardProps
    conceptNode: ConceptNodeProps
  }
}

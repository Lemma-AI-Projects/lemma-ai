import type { Schema } from 'hast-util-sanitize'

// 受限 HTML 的白名单。属性用 hast 的属性名（className、colSpan、dataSlotId…），
// 不是 HTML 属性名。不在 tagNames 里的元素会被解包（保留子节点）；strip 里的
// 元素连同内容一起删除。

const HTML_TAG_NAMES = [
  'p', 'br', 'span', 'div', 'sup', 'sub', 'b', 'i', 'u', 'strong',
  'img', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'colgroup', 'col',
  'audio', 'video', 'source',
]

// MathML Core 子集。
const MATHML_TAG_NAMES = [
  'math', 'mrow', 'mi', 'mn', 'mo', 'msup', 'msub', 'msubsup', 'mfrac', 'msqrt',
  'mroot', 'mtable', 'mtr', 'mtd', 'mtext', 'mspace', 'mover', 'munder',
  'munderover', 'mstyle', 'mpadded', 'mphantom', 'semantics', 'annotation',
]

const MATHML_TOKEN_ATTRIBUTES = ['mathvariant']
const MATHML_TABLE_ATTRIBUTES = ['columnalign', 'rowalign', 'columnspacing', 'rowspacing']

export const richHtmlTagNames: readonly string[] = [
  ...HTML_TAG_NAMES,
  ...MATHML_TAG_NAMES,
]

export const richHtmlSchema: Schema = {
  tagNames: [...richHtmlTagNames],
  attributes: {
    '*': [['className', /^qml-[a-z_-]+$/, 'xkw-math-img'], 'style', 'data*'],
    img: ['src', 'width', 'height', 'alt'],
    audio: ['src', 'controls', 'preload', 'title'],
    video: ['src', 'poster', 'controls', 'preload', 'title'],
    source: ['src', 'type'],
    td: ['colSpan', 'rowSpan'],
    th: ['colSpan', 'rowSpan'],
    col: ['span'],
    colgroup: ['span'],
    math: ['display', 'latex'],
    mi: MATHML_TOKEN_ATTRIBUTES,
    mn: MATHML_TOKEN_ATTRIBUTES,
    mo: [...MATHML_TOKEN_ATTRIBUTES, 'stretchy', 'fence', 'separator', 'lspace', 'rspace'],
    mtext: MATHML_TOKEN_ATTRIBUTES,
    mstyle: [...MATHML_TOKEN_ATTRIBUTES, 'displaystyle', 'scriptlevel'],
    mfrac: ['linethickness'],
    mspace: ['width', 'height', 'depth'],
    mpadded: ['width', 'height', 'depth', 'lspace', 'voffset'],
    mover: ['accent'],
    munder: ['accentunder'],
    munderover: ['accent', 'accentunder'],
    mtable: MATHML_TABLE_ATTRIBUTES,
    mtr: MATHML_TABLE_ATTRIBUTES,
    mtd: [...MATHML_TABLE_ATTRIBUTES, 'columnspan', 'rowspan'],
    annotation: ['encoding'],
  },
  protocols: {
    src: ['http', 'https'],
    poster: ['http', 'https'],
  },
  strip: [
    'script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base',
    'form', 'input', 'textarea', 'select', 'button', 'noscript', 'template',
    'svg', 'canvas',
  ],
  ancestors: {},
  required: {},
  clobber: [],
  clobberPrefix: '',
  allowComments: false,
  allowDoctypes: false,
}

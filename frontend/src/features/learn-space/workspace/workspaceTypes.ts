/** 画布上的一个节点。目前只有「对话」一种，位置是画布态、不落库。 */
export interface WorkspaceNode {
  id: string
  /** 空标题 = 尚未产生内容的占位节点（参考稿里的 conversation name）。 */
  title: string
  /** 有 href 才能打开；占位节点只可拖动。 */
  href?: string
  /** 初始位置（px，相对画布左上角，未缩放坐标系）。 */
  x: number
  y: number
}

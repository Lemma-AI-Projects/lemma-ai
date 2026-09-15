import type { ImportSelectionCount, ImportTreeNode } from './types'

/**
 * 目录树勾选的纯逻辑。抽出来的理由：这里的三态判定（选中 / 半选 / 未选）
 * 和「勾文件夹要不要连带子孙」是整条导入流程最容易出错的地方，
 * 放在纯函数里可以被断言直接打，不用起浏览器。
 */

export type CheckState = 'checked' | 'indeterminate' | 'unchecked'

/** 自身 + 全部后代 id。 */
export function nodeIds(node: ImportTreeNode): string[] {
  if (!node.children?.length) return [node.id]
  return [node.id, ...node.children.flatMap(nodeIds)]
}

/** 整棵树的全部 id。 */
export function collectIds(tree: ImportTreeNode[]): string[] {
  return tree.flatMap(nodeIds)
}

/** 勾上/取消一个节点：文件夹连带全部子孙一起去。 */
export function expandSelection(
  selected: ReadonlySet<string>,
  node: ImportTreeNode,
  on: boolean
): Set<string> {
  const next = new Set(selected)
  for (const id of nodeIds(node)) {
    if (on) next.add(id)
    else next.delete(id)
  }
  return next
}

/** 三态：全中 = checked，一个不中 = unchecked，其余 = indeterminate。 */
export function checkState(
  selected: ReadonlySet<string>,
  node: ImportTreeNode
): CheckState {
  const ids = nodeIds(node)
  let hit = 0
  for (const id of ids) if (selected.has(id)) hit += 1
  if (hit === 0) return 'unchecked'
  if (hit === ids.length) return 'checked'
  return 'indeterminate'
}

/** 全选 / 清空：只动树里的节点，不接受外部 id。 */
export function selectAll(tree: ImportTreeNode[]): Set<string> {
  return new Set(collectIds(tree))
}

/** 已选计数：显式勾中的才计（祖先不因为「有子孙被选」自动算上）。 */
export function countSelection(
  selected: ReadonlySet<string>,
  tree: ImportTreeNode[]
): ImportSelectionCount {
  let files = 0
  let folders = 0
  const walk = (nodes: ImportTreeNode[]) => {
    for (const node of nodes) {
      if (selected.has(node.id)) {
        if (node.kind === 'file') files += 1
        else folders += 1
      }
      if (node.children) walk(node.children)
    }
  }
  walk(tree)
  return { files, folders }
}

/** 按名字过滤的节点数（文件），结果页/计数提示用。 */
export function countFiles(nodes: ImportTreeNode[]): number {
  let n = 0
  const walk = (list: ImportTreeNode[]) => {
    for (const node of list) {
      if (node.kind === 'file') n += 1
      if (node.children) walk(node.children)
    }
  }
  walk(nodes)
  return n
}

/**
 * 搜索过滤：命中自身 → **整棵子树保留**（用户要找的是这个文件夹，
 * 应该能接着往里挑）；只在子孙里命中 → 保留路径上的骨架。
 * 反之被剪掉。
 */
export function filterTree(
  tree: ImportTreeNode[],
  query: string
): ImportTreeNode[] {
  const q = query.trim().toLowerCase()
  if (!q) return tree
  const walk = (nodes: ImportTreeNode[]): ImportTreeNode[] => {
    const out: ImportTreeNode[] = []
    for (const node of nodes) {
      if (node.name.toLowerCase().includes(q)) {
        out.push(node)
        continue
      }
      if (node.children?.length) {
        const kids = walk(node.children)
        if (kids.length) out.push({ ...node, children: kids })
      }
    }
    return out
  }
  return walk(tree)
}

/** 过滤结果里所有节点的 id —— 搜索时用来强制展开，否则结果藏在下钻里看不见。 */
export function treeIds(nodes: ImportTreeNode[]): string[] {
  return nodes.flatMap(nodeIds)
}

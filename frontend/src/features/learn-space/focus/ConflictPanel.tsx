/**
 * 409 冲突时的那块琥珀色面板 —— **MVP 里唯一会丢字**的路径。
 *
 * 它以前是 `FocusView` 里的一坨内联 JSX：只有真的撞上 409 才会第一次跑到，而
 * "真丢字的时候才是这段代码第一次跑"正是 MVP 里最不能留的赌。抽出来单独一个
 * 组件，是为了让离屏 harness 能直接渲染它、把三句话与三个出口钉住（`focus_conflict_render.tsx`），
 * 而不是等下一次丢字来验它。
 *
 * 三个出口各有各的语义，措辞刻意说死：
 * - 「看差异」只说"服务器上现在长什么样"，不动任何一边；
 * - 「用我的覆盖」= 拿服务器的版本号重发一次，把我的版本写回去；
 * - 「用服务器上的（丢掉我的）」= 明说会丢，不留余地的委婉。
 */
export interface ConflictPanelProps {
  onShowDiff: () => void
  onOverwrite: () => void
  onUseServer: () => void
}

export function ConflictPanel({
  onShowDiff,
  onOverwrite,
  onUseServer,
}: ConflictPanelProps) {
  const secondary =
    'rounded border border-amber-300 px-2 py-1 text-xs hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900'

  return (
    <div
      data-focus-conflict
      className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
    >
      <p>
        这份资料在别处被改过，<strong>你手上的这一版还没落</strong>。
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={onShowDiff} className={secondary}>
          看差异
        </button>
        <button
          type="button"
          onClick={onOverwrite}
          className="rounded bg-amber-600 px-2 py-1 text-xs text-white hover:bg-amber-700"
        >
          用我的覆盖
        </button>
        <button type="button" onClick={onUseServer} className={secondary}>
          用服务器上的（丢掉我的）
        </button>
      </div>
    </div>
  )
}
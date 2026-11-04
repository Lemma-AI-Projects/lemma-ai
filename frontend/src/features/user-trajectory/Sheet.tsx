import { refOf } from './data'
import { truncate } from './kit'
import { Label, Quiet, TextAction } from './parts'
import type { Store } from './store'

/**
 * 暂存面板。按需打开，不占常驻空间。
 *
 * 原来这里是一个常驻的 340px 抽屉 + 一个全屏对比弹窗。现在只剩这一块：
 * 存进来的东西、一句话、移走、以及「提出为理解」。
 * 对比搬到了主区域（`CompareView`），因为它需要宽度，而弹窗会盖住它要对比的内容。
 */
export function CollectionSheet({ s }: { s: Store }) {
  if (!s.sheet) return null
  const objectCount = s.savedObjects.length

  return (
    <div className="fixed inset-0 z-40" onClick={() => s.setSheet(false)}>
      <div className="absolute inset-x-0 top-11 bottom-0 bg-foreground/[0.06]" />
      <aside
        className="absolute top-11 right-0 bottom-0 flex w-[368px] max-w-[86vw] flex-col border-l border-border bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-baseline justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] text-foreground">暂存</span>
            <span className="text-[10px] tabular-nums text-muted-foreground/60">{s.collection.length}</span>
          </div>
          <button type="button" onClick={() => s.setSheet(false)} className="text-[10px] text-muted-foreground hover:text-foreground">
            关闭
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {s.collection.length === 0 ? (
            <Quiet>
              空着。
              <br />
              在任何一条记录上点「暂存」，它就落在这儿。
              <br />
              这只是这一次探索的临时结构，不动底下任何记录。
            </Quiet>
          ) : (
            <div className="space-y-4">
              {s.collection.map((c) => {
                const ref = refOf(c.refId)
                return (
                  <div key={c.key}>
                    <div className="flex items-baseline gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          s.select(c.refId, c.refType)
                          s.setSheet(false)
                        }}
                        className="min-w-0 flex-1 truncate text-left text-[12px] text-foreground hover:underline"
                      >
                        {truncate(ref?.label ?? c.refId, 28)}
                      </button>
                      <span className="shrink-0 text-[9px] text-muted-foreground/60">
                        {c.promoted ? '已提成假设' : ''}
                      </span>
                    </div>
                    <input
                      value={c.note}
                      onChange={(e) => s.setItemNote(c.refId, e.target.value)}
                      placeholder="加一句话"
                      className="mt-0.5 w-full border-b border-transparent bg-transparent py-0.5 text-[11px] outline-none placeholder:text-muted-foreground/40 hover:border-border/70 focus:border-foreground/40"
                    />
                    <div className="mt-1.5 flex items-baseline gap-3">
                      <TextAction muted onClick={() => s.promoteItem(c.refId)}>
                        提出为理解
                      </TextAction>
                      <TextAction muted onClick={() => s.removeFromCollection(c.refId)}>
                        移走
                      </TextAction>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-4 py-2.5">
          <div className="flex items-baseline justify-between">
            <Label>对比</Label>
            {objectCount >= 2 ? (
              <TextAction
                onClick={() => {
                  s.setComparing(true)
                  s.setSheet(false)
                }}
              >
                并排看这 {Math.min(objectCount, 3)} 个对象 →
              </TextAction>
            ) : (
              <span className="text-[10px] text-muted-foreground/60">存两个以上的对象才能并排</span>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}

import { refOf } from './data'
import { FLOAT, truncate } from './kit'
import { IconClose } from './marks'
import { Label, Quiet, TextAction } from './parts'
import type { Store } from './store'

/**
 * 暂存面板。按需打开，不占常驻空间。
 *
 * 它是一层浮在纸上的板子：遮罩是墨色半透明 + 极轻的模糊，板子自己有 1px 边和一层很浅的阴影。
 * 这是全页唯一一处"抬起来"的地方 —— 只有它需要，别的地方都不该有阴影。
 */
export function CollectionSheet({ s }: { s: Store }) {
  if (!s.sheet) return null
  const objectCount = s.savedObjects.length

  return (
    <div className="fixed inset-0 z-40" onClick={() => s.setSheet(false)}>
      <div className="absolute inset-x-0 top-[54px] bottom-0 bg-zinc-900/20 dark:bg-zinc-100/20 backdrop-blur-[1.5px]" />
      <aside
        className={`absolute top-[66px] right-3 bottom-3 flex w-[380px] max-w-[88vw] flex-col animate-in slide-in-from-right-2 duration-150 ${FLOAT}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-5 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] text-zinc-950 dark:text-zinc-50">暂存</span>
            <span className="text-[9.5px] tabular-nums text-zinc-500 dark:text-zinc-400">
              {String(s.collection.length).padStart(2, '0')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => s.setSheet(false)}
            aria-label="关闭"
            className="text-zinc-400 dark:text-zinc-500 transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
          >
            <IconClose />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {s.collection.length === 0 ? (
            <Quiet>
              空着。
              <br />
              在任何一条记录上点「暂存」，它就落在这儿。
              <br />
              这只是这一次探索的临时结构，不动底下任何记录。
            </Quiet>
          ) : (
            <div className="space-y-5">
              {s.collection.map((c) => {
                const ref = refOf(c.refId)
                return (
                  <div key={c.key} className="border-l border-zinc-200 dark:border-zinc-800 pl-3">
                    <div className="flex items-baseline gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          s.select(c.refId, c.refType)
                          s.setSheet(false)
                        }}
                        className="min-w-0 flex-1 truncate text-left text-[12px] text-zinc-950 dark:text-zinc-50 hover:underline hover:decoration-zinc-400/60 dark:hover:decoration-zinc-500/60"
                      >
                        {truncate(ref?.label ?? c.refId, 30)}
                      </button>
                      {c.promoted ? <span className="shrink-0 text-[9px] text-amber-700 dark:text-amber-400">已提成假设</span> : null}
                    </div>
                    <input
                      value={c.note}
                      onChange={(e) => s.setItemNote(c.refId, e.target.value)}
                      placeholder="加一句话"
                      className="mt-1 w-full border-b border-transparent bg-transparent py-1 text-[11px] text-zinc-950 dark:text-zinc-50 outline-none transition-colors placeholder:text-zinc-400 dark:text-zinc-500/60 hover:border-zinc-200 dark:hover:border-zinc-800 focus:border-zinc-900 dark:focus:border-zinc-100"
                    />
                    <div className="mt-2 flex items-baseline gap-4">
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

        <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 px-5 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label plain>对比</Label>
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
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500/70">存 2 个对象才能并排</span>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}

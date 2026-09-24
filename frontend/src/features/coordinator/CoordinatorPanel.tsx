import { useState } from 'react'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useKnowledgeStructureQuery } from '@/features/learn-space/brief/briefApi'
import { useProjectsQuery } from '@/features/project/projectApi'
import { cn } from '@/lib/utils'
import {
  useCoordinatorDecisionsQuery,
  useCoordinatorExplanationQuery,
  useRecordEvidenceMutation,
} from './coordinatorApi'
import type {
  CoordinatorAction,
  CoordinatorDecision,
  CoordinatorDecisionRecord,
} from './types'

/**
 * The Coordinator's dev panel: watch one event become one decision.
 *
 * It exists because the chain the brief asks to *see* — a learning action, the
 * state changing, the Coordinator firing, the decision appearing, the next thing
 * happening — is invisible otherwise: it happens server-side, inside an evidence
 * write, and the only trace is a log row. So the panel fires the real write and
 * then shows the real record.
 *
 * Everything here is real: the evidence goes through `POST /knowledge/evidence`
 * (the same door the Global Agent's tool uses), the state is re-derived, the
 * decision is the one the backend actually made. The one thing the panel *does*
 * choose is the item to record against — because a human is standing in for the
 * learner.
 *
 * The dry run above the buttons is the "Input Snapshot" half of the brief: the
 * state the Coordinator reads and the decision it would make, with nothing
 * executed and nothing recorded (the API has no side effects on that route).
 */

const ACTION_STYLE: Record<CoordinatorAction, string> = {
  NO_ACTION: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  CONTINUE: 'bg-sky-50 text-sky-700 border-sky-200',
  REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  INTRODUCE: 'bg-violet-50 text-violet-700 border-violet-200',
  NOTIFY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

/** What the executor did, in words a person reads. */
function effectLabel(effect: string): string {
  if (effect === 'nothing_to_do') return '没有执行（决定就是不行动）'
  if (effect === 'handed_to_global_agent') return '已交给对话（Global Agent 执行）'
  if (effect.startsWith('notification_sent:')) return '已发出通知（Feed）'
  if (effect.startsWith('notification_failed:')) return '通知发送失败'
  return effect
}

function ActionBadge({ action }: { action: CoordinatorAction }) {
  return (
    <span
      className={cn(
        'rounded-sm border px-1 py-[1px] text-[10px] font-semibold',
        ACTION_STYLE[action]
      )}
    >
      {action}
    </span>
  )
}

function DecisionBody({ decision }: { decision: CoordinatorDecision }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <ActionBadge action={decision.action} />
        {decision.target && (
          <span className="truncate text-[10px] font-medium text-zinc-800">
            → {decision.target}
          </span>
        )}
        <span className="ml-auto shrink-0 text-[10px] text-zinc-400">
          {decision.urgency}
        </span>
      </div>
      <p className="text-[10px] leading-4 text-zinc-500">{decision.reason}</p>
    </div>
  )
}

function LogRow({ record }: { record: CoordinatorDecisionRecord }) {
  const verdict = String(record.eventPayload.verdict ?? '')
  const item = String(record.eventPayload.itemLabel ?? '')
  return (
    <div className="rounded-sm border border-zinc-200 bg-white p-1.5">
      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
        <span className="font-medium text-zinc-500">{record.eventType}</span>
        <span className="truncate">
          {item} {verdict}
        </span>
        <span className="ml-auto shrink-0 tabular-nums">
          {new Date(record.createdAt).toLocaleTimeString()}
        </span>
      </div>
      <DecisionBody
        decision={{
          action: record.action,
          target: record.target,
          reason: record.reason,
          urgency: record.urgency,
          payload: {},
        }}
      />
      <p className="mt-0.5 text-[10px] text-zinc-400">
        {effectLabel(record.effect)}
      </p>
    </div>
  )
}

export function CoordinatorPanel({
  defaultOpen = false,
}: {
  /** Start expanded. The Today column is narrow, so the panel ships collapsed;
   *  the layout-review page opens it to show the whole thing at once. */
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [spaceId, setSpaceId] = useState('')
  const [itemId, setItemId] = useState('')
  const [tier, setTier] = useState<'A' | 'B'>('A')

  const { data: spaces = [] } = useProjectsQuery()
  const activeSpaceId = spaceId || spaces[0]?.id || ''
  // The Learner State inspector's own query: same derivation as the brief, so
  // the panel can never show a state the rest of the product disagrees with.
  const { structure } = useKnowledgeStructureQuery(activeSpaceId || undefined)
  const items = structure?.items?.filter((item) => item.status === 'active') ?? []
  const activeItemId = itemId || items[0]?.id || ''

  const explanation = useCoordinatorExplanationQuery(
    activeSpaceId || undefined,
    activeItemId || undefined,
    'api'
  )
  const { data: decisions = [] } = useCoordinatorDecisionsQuery(
    activeSpaceId || undefined
  )
  const record = useRecordEvidenceMutation()

  function submit(verdict: 'correct' | 'incorrect') {
    if (!activeSpaceId || !activeItemId) return
    record.mutate({
      projectId: activeSpaceId,
      itemId: activeItemId,
      verdict,
      tier,
      reasoning:
        tier === 'A'
          ? 'dev panel: 手动记录的确定性判定'
          : 'dev panel: 手动记录的判定（需要两条才定案）',
    })
  }

  const snapshot = explanation.data?.snapshot

  return (
    <div className="rounded-md border border-dashed border-zinc-300 p-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-500"
      >
        {open ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
        Coordinator
        <span className="ml-auto font-normal normal-case text-zinc-400">
          {decisions.length} 条决策
        </span>
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-1.5">
          <Select value={activeSpaceId} onValueChange={setSpaceId}>
            <SelectTrigger size="sm" className="w-full text-[10px] shadow-none">
              <SelectValue placeholder="选择空间" />
            </SelectTrigger>
            <SelectContent>
              {spaces.map((space) => (
                <SelectItem key={space.id} value={space.id}>
                  {space.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={activeItemId} onValueChange={setItemId}>
            <SelectTrigger size="sm" className="w-full text-[10px] shadow-none">
              <SelectValue placeholder="选择知识点" />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Select value={tier} onValueChange={(value) => setTier(value as 'A' | 'B')}>
              <SelectTrigger size="sm" className="w-full text-[10px] shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">verified（一条定案）</SelectItem>
                <SelectItem value="B">judged（两条定案）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="xs"
              className="flex-1"
              disabled={record.isPending || !activeItemId}
              onClick={() => submit('correct')}
            >
              {record.isPending && <Loader2 className="animate-spin" />}
              答对 ✓
            </Button>
            <Button
              size="xs"
              variant="outline"
              className="flex-1"
              disabled={record.isPending || !activeItemId}
              onClick={() => submit('incorrect')}
            >
              答错 ✗
            </Button>
          </div>
          {record.isError && (
            <p className="text-[10px] text-red-600">
              写入失败（状态未变）：证据没有被接受。
            </p>
          )}

          {/* Input Snapshot + Decision, as a dry run. */}
          <div className="rounded-sm border border-zinc-200 bg-zinc-50 p-1.5">
            <p className="text-[10px] font-medium text-zinc-400">
              干跑（不执行、不入日志）
            </p>
            {snapshot ? (
              <>
                <p className="mt-0.5 text-[10px] leading-4 text-zinc-500">
                  已具备：{snapshot.mastered.join('、') || '（无）'}
                </p>
                <p className="text-[10px] leading-4 text-zinc-500">
                  接下来可学：{snapshot.ready.join('、') || '（无）'}
                </p>
                {snapshot.focus && (
                  <p className="text-[10px] leading-4 text-zinc-500">
                    焦点：{snapshot.focus.label} · {snapshot.focus.value}（此前{' '}
                    {snapshot.focus.previousValue}）
                  </p>
                )}
                {explanation.data && (
                  <div className="mt-1 border-t border-dashed border-zinc-200 pt-1">
                    <DecisionBody decision={explanation.data.decision} />
                  </div>
                )}
              </>
            ) : (
              <p className="mt-0.5 text-[10px] text-zinc-400">
                {explanation.isError ? '读不到（未登录或接口未开）' : '读取中…'}
              </p>
            )}
          </div>

          {/* The decision the last real write produced — the log's newest row. */}
          {decisions.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-medium text-zinc-400">
                最近一次真实事件
              </p>
              <LogRow record={decisions[0]} />
              {decisions.length > 1 && (
                <details>
                  <summary className="cursor-pointer text-[10px] text-zinc-400">
                    更早的 {decisions.length - 1} 条
                  </summary>
                  <div className="mt-1 flex flex-col gap-1">
                    {decisions.slice(1, 6).map((row) => (
                      <LogRow key={row.id} record={row} />
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

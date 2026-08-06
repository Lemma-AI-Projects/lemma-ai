import { type FormEvent, useRef, useState } from 'react'
import { Bot, RefreshCw, Sparkles, X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCreateProjectMutation } from '@/features/project/projectApi'
import { useAgentDraftMutation } from './learnSpaceApi'

/**
 * Learn space onboarding v1（轻度自定义版）
 * 两步：①起名（"你想学什么？"）②AI 生成伴学 agent 草稿 → 轻编辑 → 创建。
 * 技术路径：agent 草稿 = AIClient 结构化生成（后端 /learn-spaces/agent-draft，
 * 不落库）；空间创建仍走现有 projects API（数据层升级在 E1.1）。
 * 硬菜（伙伴工坊五步仪式）留待后续版本。
 */
export function LearnSpaceOnboardingDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [spaceName, setSpaceName] = useState('')
  const [agentName, setAgentName] = useState('')
  const draftMutation = useAgentDraftMutation()
  const createMutation = useCreateProjectMutation()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const draft = draftMutation.data

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep(1)
      setSpaceName('')
      setAgentName('')
      draftMutation.reset()
      createMutation.reset()
    }
    onOpenChange(nextOpen)
  }

  const handleNext = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = spaceName.trim()
    if (!trimmed || draftMutation.isPending) return
    draftMutation.mutate(
      { spaceName: trimmed },
      { onSuccess: (data) => setAgentName(data.agentName) }
    )
    setStep(2)
  }

  const handleCreate = () => {
    const trimmed = spaceName.trim()
    if (!trimmed || createMutation.isPending || !draft) return
    // 把（可能被用户编辑过的）agent 档案随创建一并落库
    createMutation.mutate(
      {
        name: trimmed,
        agent: {
          agentName: agentName.trim() || draft.agentName,
          personality: draft.personality,
          teachingStyle: draft.teachingStyle,
          welcomeMessage: draft.welcomeMessage,
        },
      },
      {
        onSuccess: (created) => {
          handleOpenChange(false)
          // 闭环：创建成功后直接进入新空间（带着它的老师）
          navigate(`/project/${created.id}`)
        },
      }
    )
  }

  const isGenerating = draftMutation.isPending
  const generateFailed = draftMutation.isError

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            inputRef.current?.focus()
          }}
          aria-describedby={undefined}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-background shadow-xl outline-hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          {/* Header */}
          <div className="flex min-h-14 items-start gap-2 p-2 ps-4">
            <div className="mt-1 flex max-w-[calc(100%-100px)] flex-col">
              <DialogPrimitive.Title className="text-lg font-normal text-foreground">
                {step === 1 ? '创建一个 Learn Space' : '你的伴学老师'}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-muted-foreground">
                {step === 1
                  ? '一个学习空间 = 一个领域 + 一位专属伴学 agent'
                  : `TA 将陪你学习「${spaceName}」`}
              </DialogPrimitive.Description>
            </div>
            <div className="grow" />
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="关闭"
                className="rounded-full"
              >
                <X className="size-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {step === 1 ? (
            /* ── Step 1 · 起名 ─────────────────────────── */
            <form onSubmit={handleNext}>
              <div className="flex-1 px-4 pt-1">
                <label
                  htmlFor="learn-space-name"
                  className="mb-2 block text-sm text-foreground"
                >
                  你想学什么？
                </label>
                <input
                  ref={inputRef}
                  id="learn-space-name"
                  type="text"
                  autoComplete="off"
                  placeholder="TOEFL 备考 / AP 微积分 / 和声学…"
                  value={spaceName}
                  onChange={(event) => setSpaceName(event.target.value)}
                  className="h-10 w-full rounded-md border border-zinc-200 bg-background px-3 text-sm text-foreground outline-none placeholder:text-zinc-400"
                />
                {generateFailed && (
                  <p className="mt-2 text-xs text-destructive">
                    生成失败，请检查网络后重试
                  </p>
                )}
              </div>
              <div className="flex items-center justify-end px-3 pb-3 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row-reverse">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={spaceName.trim().length === 0 || isGenerating}
                    className="-translate-x-px -translate-y-px rounded-full"
                  >
                    {isGenerating ? 'TA 正在自我介绍…' : '下一步'}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            /* ── Step 2 · agent 轻编辑 ─────────────────── */
            <div className="flex flex-col gap-4 px-4 pb-3 pt-1">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50 py-10">
                  <Sparkles className="size-6 animate-pulse text-zinc-400" />
                  <p className="text-sm text-zinc-500">正在为你设计这位老师…</p>
                </div>
              ) : generateFailed ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50 py-10">
                  <p className="text-sm text-zinc-500">生成失败了</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() =>
                      draftMutation.mutate(
                        { spaceName: spaceName.trim() },
                        {
                          onSuccess: (data) => {
                            setAgentName(data.agentName)
                            setStep(2)
                          },
                        }
                      )
                    }
                  >
                    重试
                  </Button>
                </div>
              ) : (
                draft && (
                  <>
                    {/* 名字（可编辑） */}
                    <div>
                      <label
                        htmlFor="agent-name"
                        className="mb-2 block text-sm text-foreground"
                      >
                        名字（可改）
                      </label>
                      <input
                        id="agent-name"
                        type="text"
                        value={agentName}
                        onChange={(event) => setAgentName(event.target.value)}
                        className="h-10 w-full rounded-md border border-zinc-200 bg-background px-3 text-sm text-foreground outline-none"
                      />
                    </div>

                    {/* 性格 / 教学风格 */}
                    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50 p-3">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{agentName || draft.agentName}</span>
                        <span className="text-muted-foreground"> · {draft.personality}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{draft.teachingStyle}</p>
                    </div>

                    {/* 欢迎语 */}
                    <div className="flex gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50 p-3">
                      <Bot className="mt-0.5 size-4 shrink-0 text-zinc-400" />
                      <p className="text-sm leading-relaxed text-foreground">
                        {draft.welcomeMessage}
                      </p>
                    </div>
                  </>
                )
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setStep(1)}
                  disabled={isGenerating}
                >
                  返回
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() =>
                      draftMutation.mutate(
                        { spaceName: spaceName.trim() },
                        {
                          onSuccess: (data) => setAgentName(data.agentName),
                        }
                      )
                    }
                    disabled={isGenerating}
                  >
                    <RefreshCw className="size-3.5" />
                    重新生成
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full"
                    disabled={!draft || createMutation.isPending}
                    onClick={handleCreate}
                  >
                    {createMutation.isPending ? '创建中…' : '创建空间'}
                  </Button>
                </div>
              </div>
              {createMutation.isError && (
                <p className="text-center text-xs text-destructive">
                  创建失败，请重试
                </p>
              )}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

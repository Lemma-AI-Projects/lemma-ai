import { type FormEvent, useRef, useState } from 'react'
import { Bot, RefreshCw, Sparkles, Wand2, X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCreateProjectMutation } from '@/features/project/projectApi'
import { useTranslation } from 'react-i18next'
import {
  AGENT_TEMPLATES,
  PERSONALITY_PRESETS,
  STRICTNESS_LEVELS,
  TEACHING_STYLE_PRESETS,
  buildSoulMd,
} from './agentTemplates'
import { useAgentDraftMutation, type AgentDraft } from './learnSpaceApi'

type DraftMode = 'custom' | 'template'

/**
 * Learn space onboarding v2 —— 伙伴自定义（主动创造，不是被动接收）：
 * ①起名（你想学什么）②塑造伙伴：自己捏（名字+性格）或一键选模板 →
 * AI 生成欢迎语 → 预览确认 → 创建空间（agent 档案落库）。
 * 硬菜（伙伴工坊五步仪式）留待后续版本。
 */
export function LearnSpaceOnboardingDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const [step, setStep] = useState<1 | 2>(1)
  const [spaceName, setSpaceName] = useState('')
  // ── 塑造态 ──
  const [draftMode, setDraftMode] = useState<DraftMode>('template')
  const [customName, setCustomName] = useState('')
  const [personalityPreset, setPersonalityPreset] = useState<string | null>(null)
  const [teachingStylePreset, setTeachingStylePreset] = useState<string | null>(
    null
  )
  const [strictness, setStrictness] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  // ── 预览态 ──
  const [agentName, setAgentName] = useState('')
  const [soulMd, setSoulMd] = useState('')
  const [soulEditorOpen, setSoulEditorOpen] = useState(false)

  const draftMutation = useAgentDraftMutation()
  const createMutation = useCreateProjectMutation()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const draft = draftMutation.data
  const isGenerating = draftMutation.isPending
  const generateFailed = draftMutation.isError

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep(1)
      setSpaceName('')
      setDraftMode('template')
      setCustomName('')
      setPersonalityPreset(null)
      setTeachingStylePreset(null)
      setStrictness(null)
      setSelectedTemplateId(null)
      setAgentName('')
      setSoulMd('')
      setSoulEditorOpen(false)
      draftMutation.reset()
      createMutation.reset()
    }
    onOpenChange(nextOpen)
  }

  /** 生成成功：记录名字 + 生成可编辑的 SOUL.md 草稿 */
  const handleDraftSuccess = (data: AgentDraft) => {
    setAgentName(data.agentName)
    const trimmed = spaceName.trim()
    if (trimmed) {
      setSoulMd(buildSoulMd(trimmed, data))
      setSoulEditorOpen(false)
    }
  }

  const handleNext = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = spaceName.trim()
    if (!trimmed || isGenerating) return
    setStep(2)
  }

  /** 按当前塑造态生成（自定义 or 模板），偏好透传给 AI。 */
  const generate = () => {
    const trimmed = spaceName.trim()
    if (!trimmed || isGenerating) return
    if (draftMode === 'template') {
      const tpl = AGENT_TEMPLATES.find((t) => t.id === selectedTemplateId)
      draftMutation.mutate(
        {
          spaceName: trimmed,
          ...(tpl
            ? {
                agentName: tpl.name,
                personality: tpl.personality,
                teachingStyle: tpl.teachingStyle,
              }
            : {}),
        },
        { onSuccess: handleDraftSuccess }
      )
    } else {
      // 自定义：名字 + 性格 + 教学风格 + 严厉程度（严厉度并入性格描述）
      const personalityParts = [personalityPreset, strictness].filter(Boolean)
      draftMutation.mutate(
        {
          spaceName: trimmed,
          ...(customName.trim() ? { agentName: customName.trim() } : {}),
          ...(personalityParts.length
            ? { personality: personalityParts.join('，') }
            : {}),
          ...(teachingStylePreset ? { teachingStyle: teachingStylePreset } : {}),
        },
        { onSuccess: handleDraftSuccess }
      )
    }
  }

  const handleCreate = () => {
    const trimmed = spaceName.trim()
    if (!trimmed || createMutation.isPending || !draft) return
    createMutation.mutate(
      {
        name: trimmed,
        agent: {
          agentName: agentName.trim() || draft.agentName,
          personality: draft.personality,
          teachingStyle: draft.teachingStyle,
          welcomeMessage: draft.welcomeMessage,
          ...(soulMd.trim() ? { soulMd: soulMd.trim() } : {}),
        },
      },
      {
        onSuccess: (created) => {
          handleOpenChange(false)
          navigate(`/project/${created.id}`)
        },
      }
    )
  }

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
                {step === 1
                  ? t('learnSpace.createTitle')
                  : t('learnSpace.partnerTitle')}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-muted-foreground">
                {step === 1
                  ? t('learnSpace.definition')
                  : t('learnSpace.partnerDesc', { name: spaceName })}
              </DialogPrimitive.Description>
            </div>
            <div className="grow" />
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('learnSpace.close')}
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
                  {t('learnSpace.whatToLearn')}
                </label>
                <input
                  ref={inputRef}
                  id="learn-space-name"
                  type="text"
                  autoComplete="off"
                  placeholder={t('learnSpace.placeholder')}
                  value={spaceName}
                  onChange={(event) => setSpaceName(event.target.value)}
                  className="h-10 w-full rounded-md border border-zinc-200 bg-background px-3 text-sm text-foreground outline-none placeholder:text-zinc-400"
                />
              </div>
              <div className="flex items-center justify-end px-3 pb-3 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row-reverse">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={spaceName.trim().length === 0}
                    className="-translate-x-px -translate-y-px rounded-full"
                  >
                    {t('learnSpace.next')}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            /* ── Step 2 · 塑造伙伴 ─────────────────────── */
            <div className="flex flex-col gap-4 px-4 pb-3 pt-1">
              {/* 分段：自定义 / 模板 */}
              <div className="flex rounded-full border border-zinc-200 bg-zinc-50 p-1">
                {(
                  [
                    { value: 'custom', label: t('learnSpace.custom'), icon: Wand2 },
                    {
                      value: 'template',
                      label: t('learnSpace.template'),
                      icon: Sparkles,
                    },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => {
                      setDraftMode(mode.value)
                      draftMutation.reset()
                    }}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-sm transition-colors',
                      draftMode === mode.value
                        ? 'bg-background font-medium text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <mode.icon className="size-3.5" />
                    {mode.label}
                  </button>
                ))}
              </div>

              {draftMode === 'custom' ? (
                /* 自定义：名字 + 性格 + 教学风格 + 严厉程度 */
                <div className="flex flex-col gap-4">
                  <div>
                    <label
                      htmlFor="agent-name"
                      className="mb-2 block text-sm text-foreground"
                    >
                      {t('learnSpace.agentName')}
                    </label>
                    <input
                      id="agent-name"
                      type="text"
                      placeholder={t('learnSpace.agentNamePlaceholder')}
                      value={customName}
                      onChange={(event) => setCustomName(event.target.value)}
                      className="h-10 w-full rounded-md border border-zinc-200 bg-background px-3 text-sm text-foreground outline-none placeholder:text-zinc-400"
                    />
                  </div>
                  <div>
                    <span className="mb-2 block text-sm text-foreground">
                      {t('learnSpace.personality')}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {PERSONALITY_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => {
                            setPersonalityPreset(
                              personalityPreset === preset.value
                                ? null
                                : preset.value
                            )
                            draftMutation.reset()
                          }}
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-xs transition-colors',
                            personalityPreset === preset.value
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="mb-2 block text-sm text-foreground">
                      {t('learnSpace.teachingStyle')}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {TEACHING_STYLE_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => {
                            setTeachingStylePreset(
                              teachingStylePreset === preset.value
                                ? null
                                : preset.value
                            )
                            draftMutation.reset()
                          }}
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-xs transition-colors',
                            teachingStylePreset === preset.value
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="mb-2 block text-sm text-foreground">
                      {t('learnSpace.strictness')}
                    </span>
                    <div className="flex rounded-full border border-zinc-200 bg-zinc-50 p-1">
                      {STRICTNESS_LEVELS.map((level) => (
                        <button
                          key={level.value}
                          type="button"
                          title={level.hint}
                          onClick={() => {
                            setStrictness(
                              strictness === level.value ? null : level.value
                            )
                            draftMutation.reset()
                          }}
                          className={cn(
                            'flex-1 rounded-full py-1.5 text-xs transition-colors',
                            strictness === level.value
                              ? 'bg-background font-medium text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {level.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="self-end rounded-full"
                    disabled={isGenerating}
                    onClick={generate}
                  >
                    {isGenerating
                      ? t('learnSpace.generating')
                      : t('learnSpace.generate')}
                  </Button>
                </div>
              ) : (
                /* 模板：卡片网格 */
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    {AGENT_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setSelectedTemplateId(tpl.id)
                          draftMutation.reset()
                        }}
                        className={cn(
                          'flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors',
                          selectedTemplateId === tpl.id
                            ? 'border-foreground bg-zinc-100'
                            : 'border-zinc-200 hover:border-zinc-400'
                        )}
                      >
                        <span className="text-sm font-medium text-foreground">
                          {tpl.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {tpl.tagline}
                        </span>
                      </button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="self-end rounded-full"
                    disabled={isGenerating || !selectedTemplateId}
                    onClick={generate}
                  >
                    {isGenerating
                      ? t('learnSpace.generating')
                      : t('learnSpace.useTemplate')}
                  </Button>
                </div>
              )}

              {generateFailed && (
                <p className="text-center text-xs text-destructive">
                  {t('learnSpace.generateFailed')}
                </p>
              )}

              {/* 预览态 */}
              {draft && (
                <>
                  <div className="flex flex-col gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">
                          {agentName.trim() || draft.agentName}
                        </span>
                        <span className="text-muted-foreground">
                          {' '}
                          · {draft.personality}
                        </span>
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('learnSpace.regenerate')}
                        className="rounded-full"
                        onClick={generate}
                        disabled={isGenerating}
                      >
                        <RefreshCw className="size-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {draft.teachingStyle}
                    </p>
                    <div className="flex gap-2 rounded-lg bg-background p-2.5">
                      <Bot className="mt-0.5 size-4 shrink-0 text-zinc-400" />
                      <p className="text-sm leading-relaxed text-foreground">
                        {draft.welcomeMessage}
                      </p>
                    </div>
                  </div>

                  {/* 直接编辑 SOUL.md（高级入口） */}
                  <div className="rounded-xl border border-zinc-200/80">
                    <button
                      type="button"
                      onClick={() => setSoulEditorOpen((open) => !open)}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <span className="font-medium">
                        {t('learnSpace.soulMd')}
                      </span>
                      <span>
                        {soulEditorOpen
                          ? t('learnSpace.soulMdCollapse')
                          : t('learnSpace.soulMdExpand')}
                      </span>
                    </button>
                    {soulEditorOpen && (
                      <textarea
                        value={soulMd}
                        onChange={(event) => setSoulMd(event.target.value)}
                        spellCheck={false}
                        className="h-56 w-full resize-none rounded-b-xl border-t border-zinc-200/80 bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-800 outline-none"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                      onClick={() => setStep(1)}
                      disabled={isGenerating}
                    >
                      {t('learnSpace.back')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-full"
                      disabled={createMutation.isPending}
                      onClick={handleCreate}
                    >
                      {createMutation.isPending
                        ? t('learnSpace.creating')
                        : t('learnSpace.create')}
                    </Button>
                  </div>
                  {createMutation.isError && (
                    <p className="text-center text-xs text-destructive">
                      {t('learnSpace.createFailed')}
                    </p>
                  )}
                </>
              )}

              {/* 未生成时的底部导航 */}
              {!draft && (
                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setStep(1)}
                    disabled={isGenerating}
                  >
                    {t('learnSpace.back')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/**
 * 个人资料（`/me`）— the page for the layer that follows the learner between
 * spaces.
 *
 * It starts from the person: identity first, then what Lemma remembers about
 * them, and every proposal sits in the block it is going to land in. The page
 * never names itself — "个人资料" is what the *entries* say, not what the page
 * says, because a noun here would turn it back into a system module.
 *
 * Six bands, top to bottom:
 *
 *   1. **身份** — avatar, name (edited in place, where it is shown), email, plan.
 *      Three of these come from `useCurrentUser()`; the name lives in `profiles`
 *      and is the one identity field with a write endpoint.
 *   2. **它是什么** — one sentence about the consequence, not the mechanism.
 *   3. **关于我** — language and background: the two single-valued facts this
 *      layer owns. "称呼" is NOT here; it belongs where it is displayed.
 *   4. **长期关注** — long-term directions, one tag each.
 *   5. **你希望我怎么讲** — how they want to be taught, everywhere, one
 *      sentence each. A one-off 「这次讲详细一点」 is not one of these.
 *   6. **页尾** — "想让 Lemma 记住你什么？" plus the boundary line that keeps a
 *      one-off request from being mistaken for a long-term preference.
 *
 * Proposals are not a card at the top: an interest proposal renders inside band
 * 4, a preference proposal inside band 5, with a small dot next to the section
 * title saying something is waiting. Nothing here uses internal vocabulary — no
 * "profile", no "field", no "data" — because the mental model the learner needs
 * is "what Lemma remembers about me".
 */

import { useState } from 'react'
import { Check, Pencil, Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useCurrentUser } from '@/features/auth/useCurrentUser'
import { SUPPORTED_LANGS } from '@/i18n'
import { cn } from '@/lib/utils'
import { SuggestionsInbox } from './SuggestionsInbox'
import {
  useAddHomeItemMutation,
  useDeleteHomeItemMutation,
  useUpdateAboutMutation,
  useUpdateHomeItemMutation,
  useUpdateNicknameMutation,
  useUserHomeQuery,
} from './userHomeApi'
import type { HomeItemKind, UserHomeItem } from './types'

function languageLabel(value: string | null): string | null {
  if (!value) return null
  return SUPPORTED_LANGS.find((lang) => lang.code === value)?.label ?? value
}

/**
 * A Chinese small heading, with an optional dot meaning "something is waiting
 * here". The dot is a 6px amber mark instead of a card: this page has exactly
 * one loud thing (the identity band) and a pending proposal is not it.
 */
function SectionTitle({
  children,
  pending = false,
  onPendingClick,
}: {
  children: string
  pending?: boolean
  /** Opens the inbox. The dot has to be clickable: it says "this section has
   *  something of yours left to answer", and a dot that cannot be pressed is
   *  decoration pretending to be a control. */
  onPendingClick?: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-[15px] font-medium text-zinc-900">{children}</h2>
      {pending ? (
        <button
          type="button"
          onClick={onPendingClick}
          aria-label={`${children}：有待你确认的建议`}
          title="有待你确认的建议，点开审核"
          className="size-1.5 rounded-full bg-amber-400 transition-transform hover:scale-125"
        />
      ) : null}
    </div>
  )
}

/**
 * The identity avatar — display only. `UserAvatar` is a `<button>` (it is a
 * menu trigger everywhere else it is used); the identity band must not put a
 * clickable box around a face that opens nothing.
 */
function AvatarBadge({
  name,
  color,
  size = 64,
}: {
  name: string
  color: string
  size?: number
}) {
  const label = Array.from(name.trim())[0]?.toUpperCase() ?? 'U'

  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: color }}
    >
      <span
        className="font-bold leading-none text-white/90"
        style={{ fontSize: Math.round(size / 2.4) }}
      >
        {label}
      </span>
    </div>
  )
}

/** The big name, editable where it is displayed. */
function NameEditor({
  value,
  onSave,
}: {
  value: string | null
  onSave: (next: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const shown = value?.trim()

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={draft}
          maxLength={60}
          placeholder="怎么称呼你"
          className="h-10 w-[220px] rounded-lg text-[18px]"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onSave(draft.trim())
              setEditing(false)
            }
            if (event.key === 'Escape') setEditing(false)
          }}
        />
        <Button
          type="button"
          size="sm"
          className="h-8 shrink-0 rounded-full px-3.5 text-[13px] font-normal"
          onClick={() => {
            onSave(draft.trim())
            setEditing(false)
          }}
        >
          <Check className="size-3.5" />
          保存
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 shrink-0 rounded-full px-3 text-[13px] font-normal text-zinc-500"
          onClick={() => setEditing(false)}
        >
          取消
        </Button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value ?? '')
        setEditing(true)
      }}
      className="group flex max-w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-zinc-100"
    >
      <span
        className={cn(
          'truncate text-[26px] font-semibold leading-9 tracking-tight',
          shown ? 'text-zinc-950' : 'text-zinc-400'
        )}
      >
        {shown || '还没起名字'}
      </span>
      <Pencil className="size-4 shrink-0 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}

/** A row of 关于我: label on the left, value on the right, edit in place. */
function AboutRow({
  label,
  value,
  display,
  placeholder,
  onSave,
  options,
}: {
  label: string
  /** The stored value; what an editor starts from. */
  value: string | null
  /** What the closed row shows. Defaults to `value`; the language row passes a label. */
  display?: string | null
  placeholder: string
  onSave: (next: string) => void
  /** When present the row offers these instead of free text (language). */
  options?: { value: string; label: string }[]
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const shown = display ?? value

  const start = () => {
    setDraft(value ?? '')
    setEditing(true)
  }

  return (
    <div className="flex min-h-[52px] items-center gap-4">
      <span className="w-[92px] shrink-0 text-[15px] text-zinc-500">{label}</span>

      {editing ? (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {options ? (
            <div className="flex gap-1.5">
              {options.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={draft === option.value ? 'default' : 'outline'}
                  className="h-8 rounded-full px-3.5 text-[13px] font-normal"
                  onClick={() => setDraft(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          ) : (
            <Input
              autoFocus
              value={draft}
              maxLength={200}
              placeholder={placeholder}
              className="h-9 rounded-lg text-[14px]"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onSave(draft.trim())
                  setEditing(false)
                }
                if (event.key === 'Escape') setEditing(false)
              }}
            />
          )}
          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0 rounded-full px-3.5 text-[13px] font-normal"
            onClick={() => {
              onSave(draft.trim())
              setEditing(false)
            }}
          >
            <Check className="size-3.5" />
            保存
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 shrink-0 rounded-full px-3 text-[13px] font-normal text-zinc-500"
            onClick={() => setEditing(false)}
          >
            取消
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-zinc-100"
        >
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-[15px]',
              shown ? 'text-zinc-900' : 'text-zinc-400'
            )}
          >
            {shown || placeholder}
          </span>
          <Pencil className="size-3.5 shrink-0 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      )}
    </div>
  )
}

/** One line of 你希望我怎么讲 — a sentence, edit in place, remove. */
function SentenceRow({
  item,
  onEdit,
  onDelete,
}: {
  item: UserHomeItem
  onEdit: (text: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.text)

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <Input
          autoFocus
          value={draft}
          maxLength={280}
          className="h-9 rounded-lg text-[14px]"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && draft.trim()) {
              onEdit(draft.trim())
              setEditing(false)
            }
            if (event.key === 'Escape') setEditing(false)
          }}
        />
        <Button
          type="button"
          size="sm"
          className="h-8 rounded-full px-3.5 text-[13px] font-normal"
          onClick={() => {
            if (draft.trim()) {
              onEdit(draft.trim())
              setEditing(false)
            }
          }}
        >
          保存
        </Button>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-2 py-1.5">
      <span className="min-w-0 flex-1 text-[15px] leading-6 text-zinc-900">
        {item.text}
      </span>
      {item.origin === 'agent' ? (
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500">
          Lemma 提议
        </span>
      ) : null}
      <button
        type="button"
        aria-label="编辑"
        onClick={() => {
          setDraft(item.text)
          setEditing(true)
        }}
        className="shrink-0 rounded-full p-1.5 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-700"
      >
        <Pencil className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label="删除"
        onClick={onDelete}
        className="shrink-0 rounded-full p-1.5 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-700"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

/** One tag of 长期关注 — a direction, not a sentence. Edit/remove ride inside. */
function InterestTag({
  item,
  onEdit,
  onDelete,
}: {
  item: UserHomeItem
  onEdit: (text: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.text)

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Input
          autoFocus
          value={draft}
          maxLength={60}
          className="h-8 w-[160px] rounded-full text-[14px]"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && draft.trim()) {
              onEdit(draft.trim())
              setEditing(false)
            }
            if (event.key === 'Escape') setEditing(false)
          }}
          onBlur={() => {
            if (draft.trim() && draft.trim() !== item.text) onEdit(draft.trim())
            setEditing(false)
          }}
        />
      </span>
    )
  }

  return (
    <span className="group inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white py-1 pl-3 pr-1 text-[14px] text-zinc-900">
      {item.text}
      {item.origin === 'agent' ? (
        <span className="text-[11px] text-zinc-400">Lemma 提议</span>
      ) : null}
      <button
        type="button"
        aria-label="编辑"
        onClick={() => {
          setDraft(item.text)
          setEditing(true)
        }}
        className="shrink-0 rounded-full p-1 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-700"
      >
        <Pencil className="size-3" />
      </button>
      <button
        type="button"
        aria-label="删除"
        onClick={onDelete}
        className="shrink-0 rounded-full p-1 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-700"
      >
        <X className="size-3" />
      </button>
    </span>
  )
}

/** The bottom "add a line" control, shared by both list sections. */
function AddLine({
  placeholder,
  onSubmit,
  shape = 'line',
}: {
  placeholder: string
  onSubmit: (text: string) => void
  /** `tag` matches the tag list it feeds; `line` matches the sentence list. */
  shape?: 'line' | 'tag'
}) {
  const [draft, setDraft] = useState('')

  const submit = () => {
    const text = draft.trim()
    if (!text) return
    onSubmit(text)
    setDraft('')
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <Input
        value={draft}
        maxLength={280}
        placeholder={placeholder}
        className={cn(
          'h-9 text-[14px]',
          shape === 'tag' ? 'max-w-[280px] rounded-full' : 'rounded-lg'
        )}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit()
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!draft.trim()}
        className="h-9 shrink-0 rounded-full px-3.5 text-[13px] font-normal"
        onClick={submit}
      >
        <Plus className="size-3.5" />
        添加
      </Button>
    </div>
  )
}

/**
 * A proposal, drawn in the shape of the block it will land in: a tag for 长期关注,
 * a sentence row for 你希望我怎么讲. Dashed border instead of the old amber card —
 * it reads as "not a fact yet" without competing with the identity band.
 */

export function UserHomePage() {
  const { data, isPending, isError } = useUserHomeQuery()
  const { data: currentUser } = useCurrentUser()
  const updateAbout = useUpdateAboutMutation()
  const updateNickname = useUpdateNicknameMutation()
  const addItem = useAddHomeItemMutation()
  const updateItem = useUpdateHomeItemMutation()
  const deleteItem = useDeleteHomeItemMutation()
  const [note, setNote] = useState<string | null>(null)

  const interests = data?.interests ?? []
  const preferences = data?.preferences ?? []
  const aboutItems = data?.about ?? []
  const candidates = data?.candidates ?? []
  // A proposal stands next to the facts it would join, not in a card of its own.
  const interestProposals = candidates.filter((item) => item.kind === 'interest')
  const preferenceProposals = candidates.filter(
    (item) => item.kind === 'preference'
  )
  const aboutProposals = candidates.filter((item) => item.kind === 'about')
  const [inboxOpen, setInboxOpen] = useState(false)

  const displayName = data?.nickname ?? currentUser?.nickname ?? null
  const email = currentUser?.email ?? null
  const plan = currentUser?.subscriptionPlan ?? null
  const avatarColor = currentUser?.avatarColor ?? '#71717a'

  const add = (kind: HomeItemKind) => (text: string) => {
    setNote(null)
    addItem.mutate(
      { kind, text },
      { onError: () => setNote('这一条已经在这里了。') }
    )
  }

  return (
    <div className="scrollbar-fade h-full min-h-0 overflow-y-auto bg-zinc-50">
      <div className="mx-auto w-full max-w-[680px] px-10 pt-14 pb-20">
        {/* 1 · 身份 */}
        <section className="flex items-center gap-5">
          <AvatarBadge name={displayName ?? ''} color={avatarColor} />

          <div className="min-w-0 flex-1">
            <NameEditor
              value={displayName}
              onSave={(next) => updateNickname.mutate(next)}
            />
            <div className="mt-1 flex items-center gap-2.5 pl-1">
              {email ? (
                <span className="truncate text-[14px] text-zinc-500">
                  {email}
                </span>
              ) : null}
              {plan ? (
                <span className="shrink-0 rounded-full border border-zinc-200 px-2 py-0.5 text-[12px] text-zinc-500">
                  {plan}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        {/* 2 · 它是什么 + 建议入口 */}
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <p className="max-w-[520px] text-[15px] leading-7 text-zinc-500">
            这一页跟着你走。你在一个学习空间里说过的话、定过的偏好，
            换到别的学习空间，Lemma 读到的还是这一份。
          </p>
          {/*
            建议的入口只有一个，而且刻意做得不显眼：审核不该变成这个页面的主题，
            它是一次性的动作，不是一种浏览方式。数量为 0 时整个按钮消失 ——
            一个写着「0 条建议」的按钮只会让人多点一次。
          */}
          {candidates.length > 0 ? (
            <button
              type="button"
              onClick={() => setInboxOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[13px] text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900"
            >
              <span className="size-1.5 rounded-full bg-zinc-400" aria-hidden />
              {candidates.length} 条待确认的建议
            </button>
          ) : null}
        </div>

        {isError ? (
          <p className="mt-8 text-[14px] text-zinc-500">读不到，请刷新重试。</p>
        ) : null}
        {isPending ? (
          <p className="mt-8 text-[13px] text-zinc-400">正在读取…</p>
        ) : null}

        {/* 3 · 关于我 */}
        <section className="mt-12">
          <SectionTitle
            pending={aboutProposals.length > 0}
            onPendingClick={() => setInboxOpen(true)}
          >关于我</SectionTitle>
          <p className="mt-1.5 text-[13px] text-zinc-400">
            你的背景、现在的角色、以及你想让 Lemma 知道的事。
          </p>
          <div className="mt-2">
            <AboutRow
              label="语言"
              value={data?.language ?? null}
              display={languageLabel(data?.language ?? null)}
              placeholder="用哪种语言给你讲"
              options={SUPPORTED_LANGS.map((lang) => ({
                value: lang.code as string,
                label: lang.label,
              }))}
              // The stored value is the CODE, not the label: the prompt reads it
              // and this page renders the label from it (`languageLabel`). The
              // editor hands back the code it was given.
              onSave={(code) => updateAbout.mutate({ language: code })}
            />
            <Separator className="bg-zinc-200" />
            <AboutRow
              label="背景"
              value={data?.background ?? null}
              placeholder="例如：本科·计算机，转行做前端"
              onSave={(next) => updateAbout.mutate({ background: next })}
            />
          </div>
          {/*
            `background` above is one paragraph, written once. These are the
            statements the user can add, edit and delete one at a time — they are
            NOT merged into it, because merging makes one of them the other's
            edit target, and then a page about "your context" turns into one
            generated biography nobody can edit locally.
          */}
          <div className="mt-4 space-y-1.5">
            {aboutItems.map((item) => (
              <SentenceRow
                key={item.id}
                item={item}
                onEdit={(text) => updateItem.mutate({ id: item.id, text })}
                onDelete={() => deleteItem.mutate(item.id)}
              />
            ))}
          </div>
          <AddLine
            placeholder="例如：两年后想转去做产品"
            onSubmit={add('about')}
          />
        </section>

        {/* 4 · 长期关注 — 方向，所以是标签 */}
        <section className="mt-11">
          <SectionTitle
            pending={interestProposals.length > 0}
            onPendingClick={() => setInboxOpen(true)}
          >
            长期关注
          </SectionTitle>
          <p className="mt-1.5 text-[13px] text-zinc-400">
            你长期关注的方向 —— 不是某一次想问的问题。
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {interests.map((item) => (
              <InterestTag
                key={item.id}
                item={item}
                onEdit={(text) => updateItem.mutate({ id: item.id, text })}
                onDelete={() => deleteItem.mutate(item.id)}
              />
            ))}
            {/*
              Proposals are no longer inlined here. They used to be — a dashed
              chip sitting among the facts, per section — and the reason that
              stopped is in `SuggestionsInbox`: "what does Lemma think I am" is
              a question that spans all three sections, so reviewing it one
              dashed row at a time inside each section answered it three times
              over. The pending dot on the section title stays, because that is
              a fact about *this* section.
            */}
          </div>
          <AddLine
            shape="tag"
            placeholder="例如：认知科学"
            onSubmit={add('interest')}
          />
        </section>

        {/* 5 · 你希望我怎么讲 — 说明，所以是句子 */}
        <section className="mt-11">
          <SectionTitle
            pending={preferenceProposals.length > 0}
            onPendingClick={() => setInboxOpen(true)}
          >
            你希望我怎么讲
          </SectionTitle>
          <p className="mt-1.5 text-[13px] text-zinc-400">
            你希望 Lemma 怎么给你讲 —— 这里写的，每个学习空间都照做。
          </p>
          <div className="mt-2">
            {preferences.map((item) => (
              <SentenceRow
                key={item.id}
                item={item}
                onEdit={(text) => updateItem.mutate({ id: item.id, text })}
                onDelete={() => deleteItem.mutate(item.id)}
              />
            ))}
          </div>
          <AddLine
            placeholder="例如：回答尽量简洁"
            onSubmit={add('preference')}
          />
        </section>

        {/* 6 · 页尾 */}
        <Separator className="mt-12 bg-zinc-200" />

        <section className="mt-8">
          <h2 className="text-[16px] font-medium text-zinc-900">
            想让 Lemma 记住你什么？
          </h2>
          <p className="mt-1.5 max-w-[560px] text-[13px] leading-6 text-zinc-400">
            写在这里的是长期有效的。只是这一次的要求（「这次讲详细一点」）
            不用写进来 —— 那句话本来只对当前这次对话生效，也不会自己跑进这一页。
          </p>
          <div className="mt-3">
            <AddLine
              placeholder="例如：先给例子，再讲抽象"
              onSubmit={add('preference')}
            />
          </div>
          {note ? (
            <p className="mt-2 text-[12.5px] text-zinc-500" data-home-note>
              {note}
            </p>
          ) : null}
        </section>
      </div>

      {/*
        One inbox, mounted once. `acceptEdited` writes the text **and** confirms in
        a single request — the alternative (confirm first, then edit) would put a
        sentence the user has not agreed with into their profile for as long as it
        took them to notice it and fix it.
      */}
      <SuggestionsInbox
        open={inboxOpen}
        onOpenChange={setInboxOpen}
        candidates={candidates}
        onAccept={(item) =>
          updateItem.mutate({ id: item.id, status: 'confirmed' })
        }
        onAcceptEdited={(item, text) =>
          updateItem.mutate({ id: item.id, text, status: 'confirmed' })
        }
        onDismiss={(item) => deleteItem.mutate(item.id)}
      />
    </div>
  )
}

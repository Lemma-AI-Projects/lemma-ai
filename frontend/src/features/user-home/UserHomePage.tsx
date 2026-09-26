/**
 * Home — the page for the layer that follows the learner between spaces.
 *
 * Three sections, and the split is the product's own scope rule:
 *
 *   - **About me** — who this person is, stable across spaces. The name is shown
 *     here but lives in `profiles`; the language and background are the two
 *     single-valued facts Home owns.
 *   - **Interests** — long-term directions, one line each.
 *   - **How I work** — how they want to be taught, everywhere. A one-off "explain
 *     this in detail" is NOT one of these, and the copy at the bottom says so.
 *
 * The page is deliberately plain about what it is: a place the learner owns and
 * every Learn Space's agent reads. There is no schema vocabulary here — no
 * "profile", no "field", no "data" — because the mental model the user needs is
 * "what Lemma remembers about me", not "what rows exist".
 */

import { useState } from 'react'
import { Check, Pencil, Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { SUPPORTED_LANGS } from '@/i18n'
import { cn } from '@/lib/utils'
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

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="text-[11px] font-medium tracking-[0.08em] text-zinc-400 uppercase">
      {children}
    </h2>
  )
}

/** A row of About Me: label on the left, value on the right, edit in place. */
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

/** One line of Interests or How I work — text, edit in place, remove. */
function ItemRow({
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

/** The bottom "add a line" control, shared by both list sections. */
function AddLine({
  placeholder,
  onSubmit,
}: {
  placeholder: string
  onSubmit: (text: string) => void
}) {
  const [draft, setDraft] = useState('')

  const submit = () => {
    const text = draft.trim()
    if (!text) return
    onSubmit(text)
    setDraft('')
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <Input
        value={draft}
        maxLength={280}
        placeholder={placeholder}
        className="h-9 rounded-lg text-[14px]"
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

export function UserHomePage() {
  const { data, isPending, isError } = useUserHomeQuery()
  const updateAbout = useUpdateAboutMutation()
  const updateNickname = useUpdateNicknameMutation()
  const addItem = useAddHomeItemMutation()
  const updateItem = useUpdateHomeItemMutation()
  const deleteItem = useDeleteHomeItemMutation()
  const [note, setNote] = useState<string | null>(null)

  const add = (kind: HomeItemKind) => (text: string) => {
    setNote(null)
    addItem.mutate(
      { kind, text },
      {
        onError: () => setNote('这一条已经在 Home 里了。'),
      }
    )
  }

  return (
    <div className="scrollbar-fade h-full min-h-0 overflow-y-auto bg-zinc-50">
      <div className="mx-auto w-full max-w-[720px] px-10 pt-14 pb-20">
        <h1 className="text-[26px] font-semibold leading-9 tracking-tight text-zinc-950">
          Home
        </h1>
        <p className="mt-2 max-w-[560px] text-[15px] leading-7 text-zinc-500">
          这一页跟着你走。你在一个学习空间里说过的话、定过的偏好，
          换到别的学习空间，Lemma 读到的还是这一份。
        </p>

        {isError ? (
          <p className="mt-8 text-[14px] text-zinc-500">读不到 Home，请刷新重试。</p>
        ) : null}

        {data && data.candidates.length > 0 ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[13px] font-medium text-amber-900">
              Lemma 想记住这些，需要你先确认
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {data.candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center gap-3 rounded-lg bg-white/70 px-3 py-2"
                >
                  <span className="min-w-0 flex-1 text-[14.5px] text-zinc-800">
                    {candidate.text}
                  </span>
                  <span className="shrink-0 text-[11px] text-zinc-400">
                    {candidate.kind === 'interest' ? '兴趣' : '偏好'}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 shrink-0 rounded-full px-3.5 text-[13px] font-normal"
                    onClick={() =>
                      updateItem.mutate({ id: candidate.id, status: 'confirmed' })
                    }
                  >
                    保存到 Home
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 shrink-0 rounded-full px-3 text-[13px] font-normal text-zinc-500"
                    onClick={() => deleteItem.mutate(candidate.id)}
                  >
                    忽略
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <section className="mt-10">
          <SectionTitle>About me</SectionTitle>
          <div className="mt-2">
            <AboutRow
              label="称呼"
              value={data?.nickname ?? null}
              placeholder="怎么称呼你"
              onSave={(next) => updateNickname.mutate(next)}
            />
            <Separator className="bg-zinc-200" />
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
        </section>

        <section className="mt-10">
          <SectionTitle>Interests</SectionTitle>
          <p className="mt-1.5 text-[13px] text-zinc-400">
            你长期关注的方向 —— 不是某一次想问的问题。
          </p>
          <div className="mt-2">
            {(data?.interests ?? []).map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onEdit={(text) => updateItem.mutate({ id: item.id, text })}
                onDelete={() => deleteItem.mutate(item.id)}
              />
            ))}
          </div>
          <AddLine placeholder="例如：认知科学" onSubmit={add('interest')} />
        </section>

        <section className="mt-10">
          <SectionTitle>How I work</SectionTitle>
          <p className="mt-1.5 text-[13px] text-zinc-400">
            你希望 Lemma 怎么给你讲 —— 这里写的，每个学习空间都照做。
          </p>
          <div className="mt-2">
            {(data?.preferences ?? []).map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onEdit={(text) => updateItem.mutate({ id: item.id, text })}
                onDelete={() => deleteItem.mutate(item.id)}
              />
            ))}
          </div>
          <AddLine placeholder="例如：回答尽量简洁" onSubmit={add('preference')} />
        </section>

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
          {isPending ? (
            <p className="mt-3 text-[13px] text-zinc-400">正在读取…</p>
          ) : null}
        </section>
      </div>
    </div>
  )
}

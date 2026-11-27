import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { AnimatedHeight } from '@/components/AnimatedHeight'
import { cn } from '@/lib/utils'
import {
  countAnsweredQuestions,
  getAnswer,
  listAnswerTexts,
  type QuestionnaireDraft,
  type QuestionnaireQuestion,
} from './questionnaire'

// 选项卡片：和题目里的选项是同一种长相——细边框的圆角卡片，行首一个圆形指示器，
// 选中时边框加深、垫一层浅灰。问卷在输入区里，所以比题目里的小一号。
const OPTION_CARD_CLASS_NAME =
  'flex min-h-[44px] w-full items-center gap-3 rounded-[12px] border px-3.5 py-2 text-left text-[15px] leading-6 text-zinc-900 outline-none transition-[border-color,background-color] duration-150 ease-out'
const OPTION_CARD_IDLE_CLASS_NAME =
  'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100/60'
const OPTION_CARD_SELECTED_CLASS_NAME = 'border-zinc-500 bg-zinc-100'

// 单选题点了选项之后，先让选中的样子停留这么久再翻到下一题：
// 立刻翻走的话，看不到自己选了什么，点选项就像点了个链接。
const AUTO_ADVANCE_DELAY = 160

// 第 N 个选项的字母：A、B、C……也是它的快捷键。
function optionLetter(index: number) {
  return String.fromCharCode(65 + index)
}

// 选项行首的圆形指示器：选中是实心黑底加一个白点。
function OptionIndicator({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-150',
        selected ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-300'
      )}
    >
      {selected && <span className="size-2 rounded-full bg-white" />}
    </span>
  )
}

// 页眉里的翻题箭头。
function PagerButton({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-zinc-500 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:pointer-events-none disabled:text-zinc-300',
        className
      )}
    />
  )
}

// 问卷面板：助手发来问卷时，它顶替聊天输入框出现在同一个位置，一次只问一道题。
// 面板自己不带外壳，放在对话布局输入区的那张白卡片里（ConversationLayout 的 inputOverride）。
//
// 作答时只做一件事，所以这里没有聊天输入框、也没有加号：
// - 选项是整张卡片可点，按卡片上的字母键也行；
// - 没有合适的选项，就在最后一行「其他」里自己写。它是选项里的一行，写了字就算选了它；
// - 单选：点一个选项就记下并翻到下一题；多选：点一下选上、再点一下去掉；
// - 右下角的按钮往前走：这道题答了才能点「下一题」，页眉的箭头可以不答直接翻过去；
//   最后一题上是「提交」，整份问卷至少答了一道就能点。在「其他」里按回车等于点它；
// - 想先问点别的，点左下角「先聊点别的」回到聊天，问卷留在消息里，答过的都还在。
export function ConversationQuestionnairePanel({
  draft,
  index,
  onIndexChange,
  onLeave,
  onOtherChange,
  onSubmit,
  onToggleOption,
  questions,
}: {
  draft: QuestionnaireDraft
  index: number
  onIndexChange: (index: number) => void
  // 暂时离开问卷，回到聊天。
  onLeave: () => void
  // 在当前这道题的「其他」里写了字。
  onOtherChange: (text: string) => void
  onSubmit: () => void
  // 在当前这道题上点了一个预设选项。
  onToggleOption: (option: string) => void
  questions: QuestionnaireQuestion[]
}) {
  const titleId = useId()
  const rootRef = useRef<HTMLElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const advanceTimerRef = useRef<number | undefined>(undefined)

  const question = questions[index]
  const isLast = index === questions.length - 1
  const multiple = question.multiple === true
  const answer = getAnswer(draft, question)
  const otherFilled = answer.other.trim() !== ''
  const canProceed = isLast
    ? countAnsweredQuestions(questions, draft) > 0
    : listAnswerTexts(answer).length > 0

  const proceed = () => {
    if (isLast) {
      onSubmit()
    } else {
      onIndexChange(index + 1)
    }
  }

  const chooseOption = (option: string) => {
    onToggleOption(option)
    if (!multiple && !isLast) {
      window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = window.setTimeout(
        () => onIndexChange(index + 1),
        AUTO_ADVANCE_DELAY
      )
    }
  }

  const handleOtherKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    // 输入法还在选字时，回车是给输入法用的。
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault()
      if (canProceed) {
        proceed()
      }
    }
  }

  // 换了题（或面板收起）就取消还没到点的自动翻题。
  useEffect(() => () => window.clearTimeout(advanceTimerRef.current), [question.id])

  // 换题之后，刚才点的那个选项已经随上一题消失，焦点会掉到页面上。
  // 把它接到新一题的选项区：键盘可以接着操作，读屏也会读到新的题干。
  const previousQuestionIdRef = useRef(question.id)
  useLayoutEffect(() => {
    if (previousQuestionIdRef.current === question.id) {
      return
    }
    previousQuestionIdRef.current = question.id
    if (document.activeElement === document.body) {
      optionsRef.current?.focus()
    }
  }, [question.id])

  // 选项上的字母是真的快捷键：按一下等于点那张卡片。
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.key.length !== 1
      ) {
        return
      }
      const target = event.target
      if (!(target instanceof HTMLElement)) {
        return
      }
      // 在「其他」里打字时，字母就是字母。
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }
      // 只认焦点在问卷里、或者哪儿都不在的时候；别处弹出的菜单、对话框里按键不算。
      if (target !== document.body && !rootRef.current?.contains(target)) {
        return
      }
      const optionIndex = event.key.toUpperCase().charCodeAt(0) - 65
      const card = optionsRef.current?.querySelector<HTMLButtonElement>(
        `[data-option-index="${optionIndex}"]`
      )
      if (card) {
        event.preventDefault()
        card.click()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <section
      ref={rootRef}
      aria-label="问卷"
      className="flex animate-in flex-col duration-200 fade-in-0"
    >
      <header className="flex items-start gap-3 pt-3.5 pr-2.5 pl-4">
        <h3
          id={titleId}
          aria-live="polite"
          className="min-w-0 flex-1 py-0.5 text-[15.5px] leading-6 font-medium text-zinc-950"
        >
          {/* 按题目 id 换一个新的节点，换题时题干和下面的选项一起淡入。 */}
          <span key={question.id} className="animate-in duration-200 fade-in-0">
            {question.title}
            {multiple && <span className="font-normal text-zinc-500">（可多选）</span>}
          </span>
        </h3>
        <div className="flex shrink-0 items-center">
          <PagerButton
            aria-label="上一题"
            disabled={index === 0}
            onClick={() => onIndexChange(index - 1)}
          >
            <ChevronLeft className="size-4" />
          </PagerButton>
          <span className="min-w-9 text-center text-[13px] text-zinc-500 tabular-nums">
            {index + 1} / {questions.length}
          </span>
          <PagerButton
            aria-label="下一题"
            disabled={isLast}
            onClick={() => onIndexChange(index + 1)}
          >
            <ChevronRight className="size-4" />
          </PagerButton>
        </div>
      </header>

      {/* 每道题的选项数不一样，换题时高度平滑过渡。 */}
      <AnimatedHeight animateKey={question.id}>
        {/* 按题目 id 换一棵新的子树：上一题的选项整体卸载，新一题淡入。 */}
        <div
          key={question.id}
          ref={optionsRef}
          tabIndex={-1}
          role={multiple ? 'group' : 'radiogroup'}
          aria-labelledby={titleId}
          className="scrollbar-hidden flex max-h-[min(26rem,50vh)] animate-in flex-col gap-2 overflow-y-auto overscroll-contain px-3 pt-2.5 pb-0.5 outline-none duration-200 fade-in-0"
        >
          {question.options.map((option, optionIndex) => {
            const selected = answer.options.includes(option)

            return (
              <button
                key={option}
                type="button"
                role={multiple ? 'checkbox' : 'radio'}
                aria-checked={selected}
                aria-keyshortcuts={optionLetter(optionIndex)}
                data-option-index={optionIndex}
                onClick={() => chooseOption(option)}
                className={cn(
                  OPTION_CARD_CLASS_NAME,
                  'focus-visible:ring-2 focus-visible:ring-zinc-300',
                  selected ? OPTION_CARD_SELECTED_CLASS_NAME : OPTION_CARD_IDLE_CLASS_NAME
                )}
              >
                <OptionIndicator selected={selected} />
                <span className="flex min-w-0 items-baseline gap-2">
                  <span aria-hidden className="shrink-0 text-zinc-500">
                    {optionLetter(optionIndex)}.
                  </span>
                  <span className="min-w-0">{option}</span>
                </span>
              </button>
            )
          })}

          {/* 「其他」：选项里的最后一行，整张卡片点哪儿都是在里面写字。写了字就算选了它。 */}
          <label
            className={cn(
              OPTION_CARD_CLASS_NAME,
              'cursor-text',
              otherFilled
                ? OPTION_CARD_SELECTED_CLASS_NAME
                : cn(OPTION_CARD_IDLE_CLASS_NAME, 'focus-within:border-zinc-400')
            )}
          >
            <OptionIndicator selected={otherFilled} />
            <input
              type="text"
              value={answer.other}
              onChange={(event) => onOtherChange(event.target.value)}
              onKeyDown={handleOtherKeyDown}
              placeholder="其他，写下你的回答"
              aria-label="其他回答"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[15px] leading-6 text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </label>
        </div>
      </AnimatedHeight>

      <footer className="flex items-center justify-between gap-3 p-3">
        <button
          type="button"
          onClick={onLeave}
          className="inline-flex h-[33px] items-center rounded-full px-3 text-[14px] text-zinc-500 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-300"
        >
          先聊点别的
        </button>
        <button
          type="button"
          disabled={!canProceed}
          onClick={proceed}
          className="inline-flex h-[33px] items-center rounded-full bg-zinc-950 px-3.5 text-[14px] text-white outline-none transition-colors hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 disabled:bg-zinc-200 disabled:text-zinc-400"
        >
          {isLast ? '提交' : '下一题'}
        </button>
      </footer>
    </section>
  )
}

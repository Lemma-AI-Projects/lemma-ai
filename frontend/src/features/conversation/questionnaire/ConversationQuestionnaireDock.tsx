import { useEffect, useId, useLayoutEffect, useRef, type ComponentProps } from 'react'
import { Check, ChevronLeft, ChevronRight, Minus, PenLine } from 'lucide-react'

import { AnimatedHeight } from '@/components/AnimatedHeight'
import { cn } from '@/lib/utils'
import {
  countAnsweredQuestions,
  getCustomAnswers,
  getQuestionAnswers,
  type QuestionnaireDraft,
  type QuestionnaireQuestion,
} from './questionnaire'

// 选项行：整行可点。面板垫在浅灰托盘上，选中的行是白片（和输入框菜单里选中的资料同一种做法）。
const OPTION_ROW_CLASS_NAME =
  'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[14.5px] leading-[22px] text-zinc-900 outline-none transition-colors hover:bg-black/[0.045] focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-inset'
const OPTION_ROW_SELECTED_CLASS_NAME = 'bg-white hover:bg-white'

// 单选选项行首的小方块：预设选项放快捷键字母，自己写的回答放一支笔。
const OPTION_BADGE_CLASS_NAME =
  'mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-[6px] bg-zinc-200/80 text-[11px] leading-none font-medium text-zinc-600'

// 第 N 个选项的快捷键字母：A、B、C……
function optionLetter(index: number) {
  return String.fromCharCode(65 + index)
}

// 页眉里的图标按钮：上一题、下一题、收起。
function HeaderButton({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-zinc-500 outline-none transition-colors hover:bg-black/[0.05] hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:pointer-events-none disabled:text-zinc-300',
        className
      )}
    />
  )
}

// 多选选项行首的方形复选框。
function OptionCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'mt-[3px] inline-flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
        checked ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 bg-white'
      )}
    >
      {checked && <Check className="size-3" strokeWidth={3} />}
    </span>
  )
}

// 问卷面板：贴在聊天输入框上方，一次只问一道题。
//
// 页眉左边是题干，右边是上一题、题号、下一题和收起。下面是选项，整行可点：
// - 单选：行首是字母，点一下就记下并翻到下一题；按对应的字母键也一样；
// - 多选：行首是复选框，点一下勾上或去掉，勾了至少一项才能点右下角的「下一题」；
// - 页眉的前后箭头只管翻题，没答的题可以直接翻过去；
// - 最后一题不管单选多选都不会一点就交，右下角固定是「提交」，至少答了一道题就能点。
// 用户在下面的聊天输入框里发来的文字会记成当前这道题的回答，显示成选项里的一行
// （那部分在页面里接线，这里只负责把它画出来）。
//
// 面板自己不带底色：外面由对话布局的浅灰托盘把它和输入框包在一起。
export function ConversationQuestionnaireDock({
  draft,
  index,
  onAnswer,
  onIndexChange,
  onMinimize,
  onSubmit,
  questions,
}: {
  draft: QuestionnaireDraft
  index: number
  onAnswer: (value: string) => void
  onIndexChange: (index: number) => void
  onMinimize: () => void
  onSubmit: () => void
  questions: QuestionnaireQuestion[]
}) {
  const titleId = useId()
  const rootRef = useRef<HTMLElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)

  const question = questions[index]
  const isLast = index === questions.length - 1
  const multiple = question.multiple === true
  const answers = getQuestionAnswers(draft, question)
  const customAnswers = getCustomAnswers(question, answers)
  // 单选题在翻题之前不需要按钮；多选题和最后一题右下角有一个。
  const hasFooter = multiple || isLast
  const canProceed = isLast
    ? countAnsweredQuestions(questions, draft) > 0
    : answers.length > 0

  // 出现时从输入框上沿升起来。
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined
    }
    const animation = root.animate(
      [
        { height: '0px', opacity: 0 },
        { height: `${root.getBoundingClientRect().height}px`, opacity: 1 },
      ],
      { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    )
    return () => animation.cancel()
  }, [])

  // 换题之后，刚才点的那个选项或按钮已经随上一题消失，焦点会掉到页面上。
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

  // 单选题的字母是真的快捷键。只在焦点不在任何输入框里时生效，
  // 这样在下面的聊天框里打字不会被当成选了某个选项。
  useEffect(() => {
    if (multiple) {
      return undefined
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return
      }
      const target = event.target
      const inQuestionnaire =
        target === document.body ||
        (target instanceof Node && rootRef.current?.contains(target))
      if (!inQuestionnaire) {
        return
      }
      const option =
        event.key.length === 1
          ? question.options[event.key.toUpperCase().charCodeAt(0) - 65]
          : undefined
      if (option !== undefined) {
        event.preventDefault()
        onAnswer(option)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [multiple, onAnswer, question.options])

  return (
    <section ref={rootRef} aria-label="问卷" className="overflow-hidden">
      <div className="pt-3 pb-2.5">
        <header className="flex items-start gap-3 pr-2.5 pl-4">
          <h3
            id={titleId}
            aria-live="polite"
            className="min-w-0 flex-1 py-0.5 text-[15px] leading-6 font-medium text-zinc-950"
          >
            {question.title}
          </h3>
          <div className="flex shrink-0 items-center">
            <HeaderButton
              aria-label="上一题"
              disabled={index === 0}
              onClick={() => onIndexChange(index - 1)}
            >
              <ChevronLeft className="size-4" />
            </HeaderButton>
            <span className="min-w-9 text-center text-[13px] text-zinc-500 tabular-nums">
              {index + 1} / {questions.length}
            </span>
            <HeaderButton
              aria-label="下一题"
              disabled={isLast}
              onClick={() => onIndexChange(index + 1)}
            >
              <ChevronRight className="size-4" />
            </HeaderButton>
            <HeaderButton
              aria-label="收起问卷"
              title="收起问卷"
              className="ml-1"
              onClick={onMinimize}
            >
              <Minus className="size-4" />
            </HeaderButton>
          </div>
        </header>

        {/* 每道题的选项数不一样，换题、多出一条自己写的回答时高度平滑过渡。 */}
        <AnimatedHeight animateKey={`${question.id}:${customAnswers.length}`}>
          {/* 按题目 id 换一棵新的子树：上一题的选项和按钮整体卸载，新一题淡入。 */}
          <div key={question.id} className="animate-in duration-200 fade-in-0">
            <div
              ref={optionsRef}
              tabIndex={-1}
              role={multiple ? 'group' : 'radiogroup'}
              aria-labelledby={titleId}
              className="scrollbar-hidden flex max-h-[min(22rem,45vh)] flex-col gap-0.5 overflow-y-auto overscroll-contain px-1.5 pt-2 outline-none"
            >
              {question.options.map((option, optionIndex) => {
                const selected = answers.includes(option)

                return multiple ? (
                  <button
                    key={option}
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    onClick={() => onAnswer(option)}
                    className={cn(
                      OPTION_ROW_CLASS_NAME,
                      selected && OPTION_ROW_SELECTED_CLASS_NAME
                    )}
                  >
                    <OptionCheckbox checked={selected} />
                    <span className="min-w-0 flex-1">{option}</span>
                  </button>
                ) : (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-keyshortcuts={optionLetter(optionIndex)}
                    onClick={() => onAnswer(option)}
                    className={cn(
                      OPTION_ROW_CLASS_NAME,
                      selected && OPTION_ROW_SELECTED_CLASS_NAME
                    )}
                  >
                    <span aria-hidden className={OPTION_BADGE_CLASS_NAME}>
                      {optionLetter(optionIndex)}
                    </span>
                    <span className="min-w-0 flex-1">{option}</span>
                    {selected && (
                      <Check className="mt-[3px] size-4 shrink-0 text-zinc-950" />
                    )}
                  </button>
                )
              })}

              {/* 用户自己写的回答排在预设选项后面，始终是选中的；
                  多选题里再点一下就去掉，单选题里选了别的选项它就消失。 */}
              {customAnswers.map((answer) =>
                multiple ? (
                  <button
                    key={answer}
                    type="button"
                    role="checkbox"
                    aria-checked
                    onClick={() => onAnswer(answer)}
                    className={cn(OPTION_ROW_CLASS_NAME, OPTION_ROW_SELECTED_CLASS_NAME)}
                  >
                    <OptionCheckbox checked />
                    <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                      {answer}
                    </span>
                  </button>
                ) : (
                  <button
                    key={answer}
                    type="button"
                    role="radio"
                    aria-checked
                    onClick={() => onAnswer(answer)}
                    className={cn(OPTION_ROW_CLASS_NAME, OPTION_ROW_SELECTED_CLASS_NAME)}
                  >
                    <span aria-hidden className={OPTION_BADGE_CLASS_NAME}>
                      <PenLine className="size-3" />
                    </span>
                    <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                      {answer}
                    </span>
                    <Check className="mt-[3px] size-4 shrink-0 text-zinc-950" />
                  </button>
                )
              )}
            </div>

            {hasFooter && (
              <div className="flex justify-end px-2.5 pt-2">
                <button
                  type="button"
                  disabled={!canProceed}
                  onClick={isLast ? onSubmit : () => onIndexChange(index + 1)}
                  className="inline-flex h-[33px] items-center rounded-full bg-zinc-950 px-3.5 text-[14px] text-white outline-none transition-colors hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100 disabled:bg-zinc-200 disabled:text-zinc-400"
                >
                  {isLast ? '提交' : '下一题'}
                </button>
              </div>
            )}
          </div>
        </AnimatedHeight>
      </div>
    </section>
  )
}

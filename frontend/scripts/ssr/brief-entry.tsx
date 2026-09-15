import { renderToStaticMarkup } from 'react-dom/server'

import i18n from '@/i18n'
import { LearningBriefPanel } from '@/features/learn-space/brief/LearningBriefPanel'
import type { LearningBrief } from '@/features/learn-space/brief/types'
import { learningBriefMocks } from '@/mock/learningBrief'

/** 语言包是否已就绪（SSR 下 init 是异步的，渲染前要等等）。 */
export function translationsReady(): boolean {
  return i18n.t('workspace.briefTitle') !== 'workspace.briefTitle'
}

export function renderPanel(brief: LearningBrief | null): string {
  return renderToStaticMarkup(
    <LearningBriefPanel
      brief={brief}
      onClose={() => {}}
      onOpenStep={() => {}}
      onStartConversation={() => {}}
    />
  )
}

export function renderVariant(variant: keyof typeof learningBriefMocks): string {
  return renderPanel(learningBriefMocks[variant])
}

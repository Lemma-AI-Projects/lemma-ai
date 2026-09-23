import type { useAppTranslation } from '@/i18n'
import type { FreeBuildStepKey } from './types'

// Step labels are shared by both progress surfaces — the build card in the
// conversation and the single-lesson generation inside the runtime. Kept in a
// .ts file (no JSX) so the component file next to it can export only components,
// which is what react-refresh requires.

export function buildStepLabel(
  t: ReturnType<typeof useAppTranslation>['t'],
  step: FreeBuildStepKey
): string {
  switch (step) {
    case 'intent':
      return t('freeCourse.step.intent')
    case 'map':
      return t('freeCourse.step.map')
    case 'path':
      return t('freeCourse.step.path')
    case 'blueprint':
      return t('freeCourse.step.blueprint')
    case 'content':
      return t('freeCourse.step.content')
  }
}

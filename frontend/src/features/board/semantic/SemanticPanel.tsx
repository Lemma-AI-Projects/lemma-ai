import { useRef } from 'react'
import { Wand2, X, Undo2, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { BoardAnalysisResult } from './types'
import type { LayoutSuggestion } from './types'

interface SemanticPanelProps {
  result: BoardAnalysisResult
  appliedSuggestionId: string | null
  onApply: (suggestion: LayoutSuggestion) => void
  onUndo: () => void
  onClose: () => void
}

function qualityLabel(score: number): string {
  if (score >= 80) return '良好'
  if (score >= 60) return '一般'
  return '需要整理'
}

function severityLabel(severity: 'critical' | 'major' | 'minor'): string {
  if (severity === 'critical') return '严重'
  if (severity === 'major') return '主要'
  return '轻微'
}

/**
 * 语义整理结果面板（S2.4）——浮动卡片，右上角显示。
 * 展示：布局质量分 + 问题清单 + 建议列表 + [应用] [撤销] [关闭]。
 * 红线：绝不自动应用——一切整理必须显式 [应用]，[撤销] 一键还原。
 */
export function SemanticPanel({
  result,
  appliedSuggestionId,
  onApply,
  onUndo,
  onClose,
}: SemanticPanelProps) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={panelRef}
      className="pointer-events-auto absolute right-3 top-3 z-[100] w-80 rounded-xl border border-zinc-200/80 bg-white shadow-lg"
    >
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Wand2 className="size-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-900">
            {t('board.semanticPanelTitle', '语义整理')}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('board.semanticClose', '关闭')}
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
        {/* 质量分 */}
        <div className="mb-3 flex items-center gap-3">
          <div
            className={cn(
              'flex size-14 shrink-0 items-center justify-center rounded-full border-2 text-lg font-semibold',
              result.quality.overallScore >= 80
                ? 'border-emerald-500 text-emerald-700'
                : result.quality.overallScore >= 60
                  ? 'border-amber-500 text-amber-700'
                  : 'border-red-500 text-red-700'
            )}
          >
            {result.quality.overallScore}
          </div>
          <div>
            <div className="text-sm font-medium text-zinc-900">
              {t('board.semanticQuality', '布局质量')}
            </div>
            <div className="text-xs text-zinc-500">
              {qualityLabel(result.quality.overallScore)}
            </div>
          </div>
        </div>

        {/* 问题清单 */}
        {result.quality.issues.length > 0 ? (
          <div className="mb-3">
            <div className="mb-1.5 text-xs font-medium text-zinc-500">
              {t('board.semanticIssues', '发现的问题')}
            </div>
            <ul className="space-y-1">
              {result.quality.issues.map((issue, i) => (
                <li
                  key={`${issue.type}-${i}`}
                  className="flex items-start gap-2 text-xs text-zinc-600"
                >
                  <span
                    className={cn(
                      'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
                      issue.severity === 'critical'
                        ? 'bg-red-50 text-red-600'
                        : issue.severity === 'major'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-zinc-100 text-zinc-500'
                    )}
                  >
                    {severityLabel(issue.severity)}
                  </span>
                  <span className="leading-relaxed">{issue.description}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mb-3 text-xs text-zinc-400">
            {t('board.semanticNoIssues', '布局整洁，没有问题')}
          </p>
        )}

        {/* 建议列表 */}
        {result.suggestions.length > 0 ? (
          <div>
            <div className="mb-1.5 text-xs font-medium text-zinc-500">
              {t('board.semanticSuggestions', '整理建议')}
            </div>
            <ul className="space-y-2">
              {result.suggestions.map((suggestion) => {
                const applied = appliedSuggestionId === suggestion.id
                return (
                  <li
                    key={suggestion.id}
                    className={cn(
                      'rounded-lg border p-2.5',
                      applied
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-zinc-200 bg-zinc-50'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-medium text-zinc-900">
                          {suggestion.title}
                        </div>
                        <div className="mt-0.5 text-[11px] text-zinc-500">
                          {suggestion.description}
                        </div>
                      </div>
                      {applied ? (
                        <span className="shrink-0 text-[10px] font-medium text-emerald-600">
                          {t('board.semanticApplied', '已应用')}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 rounded-md px-2 py-1 text-[11px]"
                          onClick={() => onApply(suggestion)}
                        >
                          <Check className="mr-1 size-3" />
                          {t('board.semanticApply', '应用')}
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-zinc-400">
            {t('board.semanticNoSuggestions', '当前布局无需整理')}
          </p>
        )}
      </div>

      {/* 底部：撤销（有已应用的建议时显示） */}
      {appliedSuggestionId ? (
        <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2.5">
          <Button
            size="sm"
            variant="ghost"
            className="rounded-md text-xs text-zinc-600"
            onClick={onUndo}
          >
            <Undo2 className="mr-1.5 size-3.5" />
            {t('board.semanticUndo', '撤销整理')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

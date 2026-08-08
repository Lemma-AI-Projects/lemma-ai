import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  useCompleteOnboarding,
  useOnboardingStatus,
} from '@/features/onboarding/onboardingApi'

/**
 * 容量首屏（onboarding v0.3 第 [1]+[2] 步合页）。
 *
 * 设计红线：
 * - 不摆目录：没有学科网格、没有 chips，只有一个开放输入框 —— 容量语义从
 *   第一天兑现（占星术？可以。仿生学？可以。古希腊语？可以。）
 * - 非功利基调：为好奇而学，不为考试/分数 —— 宣言与按钮文案都带这个价值观。
 * - 可跳过、可回看、不绑架：底部「先跳过」随时可走。
 */
export function OnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const completeMutation = useCompleteOnboarding()
  const { data: statusData, isLoading: statusLoading } = useOnboardingStatus()

  const [interests, setInterests] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  // 占位符滚动：容量演示（展示"什么都能装下"），不是目录。
  const rotating = t('onboarding.rotatingPlaceholders', {
    returnObjects: true,
  }) as string[]
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [placeholderVisible, setPlaceholderVisible] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  // 占位符缓慢轮换：每次淡出 → 换词 → 淡入，形成"缓缓滚动"的容量演示。
  useEffect(() => {
    if (rotating.length < 2) {
      return
    }
    const interval = window.setInterval(() => {
      setPlaceholderVisible(false)
      window.setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % rotating.length)
        setPlaceholderVisible(true)
      }, 400)
    }, 3200)
    return () => {
      window.clearInterval(interval)
      // 防抖换词用的 timeout 无需清理（组件卸载即丢弃）
    }
  }, [rotating.length])

  function handleComplete() {
    setErrorMessage('')
    completeMutation.mutate(
      // 自由表达：空输入也允许（"暂时没想好"同样被接纳），提交原话。
      interests.trim() || null,
      {
        onSuccess: () => navigate('/home', { replace: true }),
        onError: () => setErrorMessage(t('onboarding.error')),
      }
    )
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !completeMutation.isPending) {
      event.preventDefault()
      handleComplete()
    }
  }

  // 已完成 onboarding 的用户手动访问 /onboarding：直接送回主应用。
  if (!statusLoading && statusData?.hasCompletedOnboarding) {
    return <Navigate to="/home" replace />
  }

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <p className="text-sm font-medium tracking-wide text-neutral-500">
          {t('onboarding.eyebrow')}
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-neutral-900 md:text-5xl">
          {t('onboarding.title')}
        </h1>
        <p className="mt-4 text-lg text-neutral-500">
          {t('onboarding.subtitle')}
        </p>

        <div className="mt-10">
          <label htmlFor="onboarding-interests" className="sr-only">
            {t('onboarding.inputPlaceholder')}
          </label>
          <input
            ref={inputRef}
            id="onboarding-interests"
            type="text"
            value={interests}
            onChange={(event) => setInterests(event.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className={`w-full rounded-xl border border-neutral-200 bg-white px-5 py-4 text-lg text-neutral-900 shadow-xs outline-none transition-all duration-300 placeholder:text-neutral-400 focus:border-neutral-400 focus:shadow-md ${
              placeholderVisible ? 'opacity-100' : 'opacity-0'
            }`}
            placeholder={rotating[placeholderIndex] ?? t('onboarding.inputPlaceholder')}
          />
          <p className="mt-3 text-left text-sm text-neutral-400">
            {t('onboarding.inputPlaceholder')}
          </p>
        </div>

        {errorMessage ? (
          <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
        ) : null}

        <div className="mt-8 flex flex-col items-center gap-4">
          <Button
            type="button"
            size="lg"
            disabled={completeMutation.isPending}
            onClick={handleComplete}
            className="w-full max-w-xs rounded-xl bg-black text-[#fafafa] hover:bg-black/90"
          >
            {completeMutation.isPending
              ? t('onboarding.skipping')
              : t('onboarding.submit')}
          </Button>
          <button
            type="button"
            disabled={completeMutation.isPending}
            onClick={handleComplete}
            className="text-sm text-neutral-400 underline-offset-4 hover:text-neutral-600 hover:underline disabled:opacity-50"
          >
            {t('onboarding.skip')}
          </button>
        </div>

        <p className="mt-12 text-xs text-neutral-400">
          {t('onboarding.footer')}
        </p>
      </div>
    </div>
  )
}

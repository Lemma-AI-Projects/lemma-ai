import { useState, type ComponentProps, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabaseClient'

interface LoginFormProps extends ComponentProps<'div'> {
  onSuccess: () => void
}

type Mode = 'signin' | 'signup'

export function LoginForm({
  className,
  onSuccess,
  ...props
}: LoginFormProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setErrorMessage('')
    setInfoMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setInfoMessage('')
    setIsSubmitting(true)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      setIsSubmitting(false)
      if (error) {
        setErrorMessage(error.message)
        return
      }
      onSuccess()
      return
    }

    // signup
    const { data, error } = await supabase.auth.signUp({ email, password })
    setIsSubmitting(false)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    if (data.session) {
      // 项目未开启“确认邮箱”时，注册即登录
      onSuccess()
      return
    }
    setInfoMessage(t('auth.signupSuccess'))
  }

  async function handleGoogle() {
    setErrorMessage('')
    setInfoMessage('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setErrorMessage(error.message)
    }
  }

  const isSignup = mode === 'signup'

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="rounded-[14px] border-[#e5e5e5] text-black">
        <CardHeader>
          <CardTitle>{isSignup ? t('auth.signUpTitle') : t('auth.signInTitle')}</CardTitle>
          <CardDescription className="text-[#737373]">
            {isSignup ? t('auth.signUpDesc') : t('auth.signInDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field className="gap-3">
                <FieldLabel htmlFor="email">{t('auth.email')}</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="!block rounded-[8px] border-[#e5e5e5] shadow-xs placeholder:text-[#737373]"
                  required
                />
              </Field>
              <Field className="gap-3">
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">{t('auth.password')}</FieldLabel>
                  {!isSignup && (
                    <a
                      href="#"
                      onClick={(event) => event.preventDefault()}
                      className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                      {t('auth.forgotPassword')}
                    </a>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="!block rounded-[8px] border-[#e5e5e5] shadow-xs"
                  required
                  minLength={6}
                />
              </Field>
              <Field className="gap-3">
                {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
                {infoMessage ? (
                  <FieldDescription className="!text-green-600">
                    {infoMessage}
                  </FieldDescription>
                ) : null}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-[8px] bg-black text-[#fafafa] hover:bg-black/90"
                >
                  {isSubmitting
                    ? isSignup
                      ? t('auth.signingUp')
                      : t('auth.signingIn')
                    : isSignup
                      ? t('auth.signUp')
                      : t('auth.signIn')}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleGoogle}
                  className="rounded-[8px] border-[#e5e5e5] bg-white text-black shadow-xs hover:bg-[#f5f5f5] hover:text-black"
                >
                  {t('auth.google')}
                </Button>
                <FieldDescription className="text-center text-[#737373]">
                  {isSignup ? (
                    <>
                      {t('auth.hasAccount')}{' '}
                      <a
                        href="#"
                        onClick={(event) => {
                          event.preventDefault()
                          switchMode('signin')
                        }}
                      >
                        {t('auth.signInLink')}
                      </a>
                    </>
                  ) : (
                    <>
                      {t('auth.noAccount')}{' '}
                      <a
                        href="#"
                        onClick={(event) => {
                          event.preventDefault()
                          switchMode('signup')
                        }}
                      >
                        {t('auth.signUpLink')}
                      </a>
                    </>
                  )}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

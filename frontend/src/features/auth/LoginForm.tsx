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
    setInfoMessage('注册成功！请前往邮箱查收确认邮件，确认后即可登录。')
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
          <CardTitle>{isSignup ? '注册 Lemma' : '登录 Lemma'}</CardTitle>
          <CardDescription className="text-[#737373]">
            {isSignup
              ? '创建账号以开始使用 Lemma'
              : '输入邮箱和密码登录你的 Lemma 账号'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field className="gap-3">
                <FieldLabel htmlFor="email">邮箱</FieldLabel>
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
                  <FieldLabel htmlFor="password">密码</FieldLabel>
                  {!isSignup && (
                    <a
                      href="#"
                      onClick={(event) => event.preventDefault()}
                      className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                      忘记密码？
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
                      ? '注册中...'
                      : '登录中...'
                    : isSignup
                      ? '注册'
                      : '登录'}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleGoogle}
                  className="rounded-[8px] border-[#e5e5e5] bg-white text-black shadow-xs hover:bg-[#f5f5f5] hover:text-black"
                >
                  使用 Google 登录
                </Button>
                <FieldDescription className="text-center text-[#737373]">
                  {isSignup ? (
                    <>
                      已经有账号？{' '}
                      <a
                        href="#"
                        onClick={(event) => {
                          event.preventDefault()
                          switchMode('signin')
                        }}
                      >
                        登录
                      </a>
                    </>
                  ) : (
                    <>
                      还没有账号？{' '}
                      <a
                        href="#"
                        onClick={(event) => {
                          event.preventDefault()
                          switchMode('signup')
                        }}
                      >
                        注册
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

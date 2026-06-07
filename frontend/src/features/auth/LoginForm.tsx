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

export function LoginForm({
  className,
  onSuccess,
  ...props
}: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

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
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="rounded-[14px] border-[#e5e5e5] text-black">
        <CardHeader>
          <CardTitle>登录 Lemma</CardTitle>
          <CardDescription className="text-[#737373]">
            输入邮箱和密码登录你的 Lemma 账号
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
                  <a
                    href="#"
                    onClick={(event) => event.preventDefault()}
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    忘记密码？
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="!block rounded-[8px] border-[#e5e5e5] shadow-xs"
                  required
                />
              </Field>
              <Field className="gap-3">
                {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-[8px] bg-black text-[#fafafa] hover:bg-black/90"
                >
                  {isSubmitting ? '登录中...' : '登录'}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  className="rounded-[8px] border-[#e5e5e5] bg-white text-black shadow-xs hover:bg-[#f5f5f5] hover:text-black"
                >
                  使用 Google 登录
                </Button>
                <FieldDescription className="text-center text-[#737373]">
                  还没有账号？{' '}
                  <a href="#" onClick={(event) => event.preventDefault()}>
                    注册
                  </a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Mail, MailCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { AuthLayout, IconField } from '@/features/auth/components/AuthLayout'
import { RESET_TOKEN_TTL_MINUTES, maskEmail, requestPasswordReset } from '@/lib/services/authService'

const RESEND_COOLDOWN_SECONDS = 30

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
})

type FormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const { notify } = useToast()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [demoToken, setDemoToken] = useState<string | undefined>()
  const [cooldown, setCooldown] = useState(0)
  const [isResending, setIsResending] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '' } })

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function send(email: string) {
    const { demoToken: token } = await requestPasswordReset(email)
    setSentTo(email)
    setDemoToken(token)
    setCooldown(RESEND_COOLDOWN_SECONDS)
  }

  async function onSubmit(values: FormValues) {
    await send(values.email)
  }

  async function handleResend() {
    if (!sentTo) return
    setIsResending(true)
    await send(sentTo)
    setIsResending(false)
    notify({ title: 'Reset link sent again', description: 'Any earlier links have been deactivated.', tone: 'success' })
  }

  return (
    <AuthLayout>
      {sentTo ? (
        <div>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MailCheck className="size-6" />
          </div>
          <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight">Check your email</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            If an account exists for <span className="font-medium text-foreground">{maskEmail(sentTo)}</span>, we&apos;ve sent a link to reset your password. The
            link expires in {RESET_TOKEN_TTL_MINUTES} minutes.
          </p>

          <div className="mt-6 space-y-3">
            <Button variant="secondary" className="w-full" onClick={handleResend} isLoading={isResending} disabled={cooldown > 0}>
              {cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend link'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Didn&apos;t get it? Check your spam folder, or{' '}
              <button type="button" onClick={() => setSentTo(null)} className="font-medium text-primary hover:underline">
                use a different email
              </button>
              .
            </p>
          </div>

          {demoToken && (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demo Mode</p>
              <p className="mt-1 text-xs text-muted-foreground">No email is sent in this demo. Open the reset link directly:</p>
              <Link
                to={`/reset-password?token=${demoToken}`}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                Open reset link <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Forgot your password?</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Enter the email address linked to your account and we&apos;ll send you a link to reset it.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold tracking-tight">
                Email Address
              </label>
              <IconField id="email" icon={Mail} type="email" autoFocus placeholder="Enter your email address" error={errors.email?.message} {...register('email')} />
            </div>

            <Button type="submit" className="w-full" isLoading={isSubmitting} icon={<ArrowRight className="size-4" />}>
              Send Reset Link
            </Button>
          </form>
        </div>
      )}

      <Link to="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to login
      </Link>
    </AuthLayout>
  )
}

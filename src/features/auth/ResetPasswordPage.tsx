import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Check, CircleCheck, Eye, EyeOff, KeyRound, LinkIcon, Loader2, Lock, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { AuthLayout, IconField } from '@/features/auth/components/AuthLayout'
import { PASSWORD_RULES, maskEmail, passwordStrength, resetPassword, verifyResetToken, type ResetTokenStatus } from '@/lib/services/authService'
import { cn } from '@/lib/utils/cn'

const schema = z
  .object({
    password: z.string().min(1, 'New password is required'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .superRefine((values, ctx) => {
    if (values.password && passwordStrength(values.password) < PASSWORD_RULES.length) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: 'Password does not meet all the requirements below' })
    }
    if (values.confirmPassword && values.password !== values.confirmPassword) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match' })
    }
  })

type FormValues = z.infer<typeof schema>

const STRENGTH = [
  { label: 'Too weak', bar: 'bg-danger', text: 'text-danger' },
  { label: 'Weak', bar: 'bg-danger', text: 'text-danger' },
  { label: 'Fair', bar: 'bg-warning', text: 'text-warning' },
  { label: 'Good', bar: 'bg-primary', text: 'text-primary' },
  { label: 'Strong', bar: 'bg-success', text: 'text-success' },
]

const INVALID_COPY: Record<'expired' | 'used' | 'invalid', { title: string; body: string }> = {
  expired: { title: 'This link has expired', body: 'Password reset links are only valid for a limited time. Request a new one to continue.' },
  used: { title: 'This link was already used', body: 'For your security, each reset link works only once, and requesting a new link deactivates older ones.' },
  invalid: { title: 'Invalid reset link', body: 'This link is incomplete or not recognized. Make sure you opened the full link from your email, or request a new one.' },
}

function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="text-muted-foreground transition-colors hover:text-foreground" aria-label={shown ? 'Hide password' : 'Show password'}>
      {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  )
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const navigate = useNavigate()
  const [status, setStatus] = useState<ResetTokenStatus | null>(null)
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { password: '', confirmPassword: '' } })

  useEffect(() => {
    let active = true
    verifyResetToken(token).then((result) => active && setStatus(result))
    return () => {
      active = false
    }
  }, [token])

  const password = watch('password')
  const strength = passwordStrength(password)

  async function onSubmit(values: FormValues) {
    if (!token) return
    setFormError(null)
    const result = await resetPassword(token, values.password)
    if (result.ok) setDone(true)
    else setFormError(result.error)
  }

  let content: React.ReactNode
  if (!status) {
    content = (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
      </div>
    )
  } else if (done) {
    content = (
      <div>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-success/10 text-success">
          <CircleCheck className="size-6" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight">Password updated</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Your password has been reset successfully. You can now log in with your new password.
        </p>
        <Button className="mt-6 w-full" icon={<ArrowRight className="size-4" />} onClick={() => navigate('/login', { replace: true })}>
          Continue to Log In
        </Button>
      </div>
    )
  } else if (status.state !== 'valid') {
    const copy = INVALID_COPY[status.state]
    content = (
      <div>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <LinkIcon className="size-6" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight">{copy.title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
        <Button className="mt-6 w-full" icon={<ArrowRight className="size-4" />} onClick={() => navigate('/forgot-password')}>
          Request a New Link
        </Button>
      </div>
    )
  } else {
    content = (
      <div>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <KeyRound className="size-6" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight">Set a new password</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          For <span className="font-medium text-foreground">{maskEmail(status.email)}</span>. Choose a strong password you haven&apos;t used before.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-semibold tracking-tight">
              New Password
            </label>
            <IconField
              id="password"
              icon={Lock}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              placeholder="Enter a new password"
              error={errors.password?.message}
              trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />}
              {...register('password')}
            />

            <div className="mt-2.5">
              <div className="flex gap-1">
                {PASSWORD_RULES.map((_, i) => (
                  <div key={i} className={cn('h-1 flex-1 rounded-full bg-muted transition-colors', password && i < strength && STRENGTH[strength].bar)} />
                ))}
              </div>
              {password && <p className={cn('mt-1 text-[11px] font-medium', STRENGTH[strength].text)}>{STRENGTH[strength].label}</p>}
            </div>

            <ul className="mt-2.5 space-y-1">
              {PASSWORD_RULES.map((rule) => {
                const met = rule.test(password)
                return (
                  <li key={rule.label} className={cn('flex items-center gap-1.5 text-xs', met ? 'text-success' : 'text-muted-foreground')}>
                    {met ? <Check className="size-3.5" /> : <X className="size-3.5 opacity-60" />}
                    {rule.label}
                  </li>
                )
              })}
            </ul>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-semibold tracking-tight">
              Confirm New Password
            </label>
            <IconField
              id="confirmPassword"
              icon={Lock}
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter your new password"
              error={errors.confirmPassword?.message}
              trailing={<PasswordToggle shown={showConfirm} onToggle={() => setShowConfirm((s) => !s)} />}
              {...register('confirmPassword')}
            />
          </div>

          {formError && <p className="text-xs text-danger">{formError}</p>}

          <Button type="submit" className="w-full" isLoading={isSubmitting} icon={<ArrowRight className="size-4" />}>
            Reset Password
          </Button>
        </form>
      </div>
    )
  }

  return (
    <AuthLayout>
      {content}
      {!done && (
        <Link to="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to login
        </Link>
      )}
    </AuthLayout>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { useToast } from '@/components/ui/Toast'
import { AuthLayout, IconField } from '@/features/auth/components/AuthLayout'
import { useSession } from '@/hooks/useSession'
import { DEMO_ACCOUNTS } from '@/lib/auth/mockSession'
import type { Role } from '@/types/domain'

/** Employees only hold `ess.view` (see lib/rbac/permissions.ts) — /dashboard would 403 them, so route by role. */
const LANDING_ROUTE_BY_ROLE: Record<Role, string> = {
  super_admin: '/dashboard',
  company_admin: '/dashboard',
  hr_admin: '/dashboard',
  payroll_admin: '/dashboard',
  manager: '/dashboard',
  employee: '/ess',
}

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  keepSignedIn: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useSession()
  const { notify } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '', keepSignedIn: true } })

  function onSubmit(values: FormValues) {
    setFormError(null)
    const user = login(values.email, values.password)
    if (!user) {
      setFormError('Invalid email or password. Try one of the demo logins below.')
      return
    }
    navigate(LANDING_ROUTE_BY_ROLE[user.role])
  }

  function onDemoLogin(email: string, password: string) {
    setValue('email', email)
    setValue('password', password)
    setFormError(null)
    const user = login(email, password)
    if (user) {
      navigate(LANDING_ROUTE_BY_ROLE[user.role])
    }
  }

  return (
    <AuthLayout>
      <h2 className="font-display text-2xl font-semibold tracking-tight">Welcome Back!</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">Log in to your FBS Payroll account to continue.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-semibold tracking-tight">
            Email Address
          </label>
          <IconField id="email" icon={Mail} type="email" placeholder="Enter your email address" error={errors.email?.message} {...register('email')} />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-semibold tracking-tight">
            Password
          </label>
          <IconField
            id="password"
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            error={errors.password?.message}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
            {...register('password')}
          />
        </div>

        {formError && <p className="text-xs text-danger">{formError}</p>}

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 text-sm">
            <Controller control={control} name="keepSignedIn" render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />} />
            Keep me signed in
          </label>
          <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" isLoading={isSubmitting} icon={<ArrowRight className="size-4" />}>
          Log In
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button variant="secondary" className="w-full" onClick={() => notify({ title: 'Microsoft sign-in is not available in this demo', tone: 'default' })}>
        Sign in with Microsoft
      </Button>

      <div className="mt-7 rounded-xl border border-dashed border-border bg-muted/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick Demo Login</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => onDemoLogin(account.email, account.password)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              {account.roleLabel}
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  )
}

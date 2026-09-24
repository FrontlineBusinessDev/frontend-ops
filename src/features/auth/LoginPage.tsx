import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowRight,
  Banknote,
  Cloud,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Receipt,
  ShieldCheck,
  Timer,
  UsersRound,
} from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { DEMO_ACCOUNTS } from '@/lib/auth/mockSession'
import { cn } from '@/lib/utils/cn'
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

const FEATURE_BADGES = [
  { icon: ShieldCheck, label: 'Secure Access' },
  { icon: Timer, label: 'Accurate Records' },
  { icon: UsersRound, label: 'Compliant with PH Labor Laws' },
  { icon: Cloud, label: 'Cloud-Based & Accessible' },
]

function IconField({
  icon: Icon,
  trailing,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: typeof Mail; trailing?: React.ReactNode; error?: string }) {
  return (
    <div>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className={cn(
            'w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground',
            'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            error && 'border-danger focus-visible:ring-danger',
          )}
          {...props}
        />
        {trailing && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  )
}

function BrandingHero() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-50 to-background px-10 py-12 dark:from-brand-950 dark:to-background lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-24 -top-24 size-72 rounded-full bg-brand-100/70 blur-2xl dark:bg-brand-800/30" />
      <div className="absolute bottom-0 left-1/3 size-64 rounded-full bg-brand-200/50 blur-2xl dark:bg-brand-900/40" />

      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-brand-600 shadow-soft">
            <Banknote className="size-5 text-white" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold leading-tight tracking-tight">FBS Payroll</p>
            <p className="text-xs text-muted-foreground">Simple. Accurate. On Time.</p>
          </div>
        </div>

        <h1 className="mt-10 max-w-md font-display text-4xl font-semibold leading-[1.1] tracking-tight text-foreground">
          Empowering Your People, Every Pay Cycle
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
          A reliable payroll system for a more organized and productive workplace.
        </p>
      </div>

      <div className="relative my-10 flex items-center justify-center">
        <div className="w-full max-w-xs rounded-2xl border border-border bg-card p-4 shadow-soft-lg">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payslip</p>
            <div className="flex size-6 items-center justify-center rounded-full bg-brand-600">
              <Receipt className="size-3 text-white" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-2 w-3/4 rounded-full bg-muted" />
            <div className="h-2 w-1/2 rounded-full bg-muted" />
            <div className="h-2 w-2/3 rounded-full bg-muted" />
          </div>
        </div>

        <div className="absolute -bottom-4 -left-4 flex size-14 items-center justify-center rounded-2xl border border-border bg-card shadow-soft">
          <UsersRound className="size-5 text-brand-600" />
        </div>
        <div className="absolute -top-6 right-2 flex size-12 items-center justify-center rounded-full border border-border bg-card shadow-soft">
          <ShieldCheck className="size-4 text-brand-600" />
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-4">
        {FEATURE_BADGES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-start gap-2">
            <Icon className="mt-0.5 size-4 shrink-0 text-brand-600" />
            <span className="text-xs leading-snug text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

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
    <div className="grid min-h-screen w-full bg-background lg:grid-cols-2">
      <BrandingHero />

      <div className="relative flex flex-col items-center justify-center px-6 py-12 sm:px-10">
        <span className="absolute right-5 top-5 text-xs text-muted-foreground">v1.0.0</span>

        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand-600">
              <Banknote className="size-4 text-white" />
            </div>
            <div>
              <p className="font-display text-base font-semibold tracking-tight">FBS Payroll</p>
              <p className="text-xs text-muted-foreground">Simple. Accurate. On Time.</p>
            </div>
          </div>

          <h2 className="font-display text-2xl font-semibold tracking-tight">Welcome Back!</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Log in to your FBS Payroll account to continue.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold tracking-tight">
                Email Address
              </label>
              <IconField
                id="email"
                icon={Mail}
                type="email"
                placeholder="Enter your email address"
                error={errors.email?.message}
                {...register('email')}
              />
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
                <Controller
                  control={control}
                  name="keepSignedIn"
                  render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
                />
                Keep me signed in
              </label>
              <button
                type="button"
                onClick={() => notify({ title: 'Password reset is not available in this demo', tone: 'default' })}
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot password?
              </button>
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

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => notify({ title: 'Microsoft sign-in is not available in this demo', tone: 'default' })}
          >
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

          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Your data is safe with us.
          </p>
        </div>
      </div>
    </div>
  )
}

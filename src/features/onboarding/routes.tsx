import { Check, ChevronRight, PartyPopper } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useOnboardingChecklist } from '@/features/onboarding/hooks/useOnboardingChecklist'
import { cn } from '@/lib/utils/cn'

export function OnboardingPage() {
  const steps = useOnboardingChecklist()
  const completed = steps.filter((s) => s.done).length
  const allDone = steps.length > 0 && completed === steps.length

  return (
    <div className="space-y-5">
      <PageHeader
        title="SaaS Company Onboarding"
        description="Everything needed before this company workspace is ready to run payroll."
        actions={
          allDone ? (
            <Badge tone="success" className="gap-1.5 px-3 py-1 text-sm">
              <PartyPopper className="size-3.5" />
              Ready for Payroll
            </Badge>
          ) : (
            <Badge tone="warning" className="px-3 py-1 text-sm">
              {completed} of {steps.length} complete
            </Badge>
          )
        }
      />

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${steps.length ? (completed / steps.length) * 100 : 0}%` }}
        />
      </div>

      <div className="space-y-3">
        {steps.map((step, idx) => (
          <Link key={step.id} to={step.link}>
            <Card
              className={cn(
                'flex items-center gap-4 p-4 transition-shadow hover:shadow-soft-lg',
                step.done && 'border-success/30 bg-success/5',
              )}
            >
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  step.done ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {step.done ? <Check className="size-4" /> : idx + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

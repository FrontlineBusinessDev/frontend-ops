import { Pencil, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { updateCompensationType } from '@/lib/services/payrollSettingsService'
import { formatCurrency } from '@/lib/utils/format'
import type { CompensationType } from '@/types/domain'
import { CompensationTypeDialog } from '@/features/company-settings/components/payroll/CompensationTypeDialog'

const KIND_LABEL: Record<CompensationType['kind'], string> = {
  monthly_rate: 'Monthly Rate',
  semi_monthly_rate: 'Semi-Monthly Rate',
  daily_rate: 'Daily Rate',
  hourly_rate: 'Hourly Rate',
  output_based: 'Output-Based / Piece-Rate',
  commission_based: 'Commission-Based',
  mixed: 'Mixed Compensation',
}

function ConfigSummary({ compensationType: c }: { compensationType: CompensationType }) {
  switch (c.kind) {
    case 'monthly_rate':
    case 'semi_monthly_rate':
    case 'daily_rate':
    case 'hourly_rate':
      return <p className="text-sm font-medium">{formatCurrency(c.config.basicRate ?? 0)}</p>
    case 'output_based':
      return (
        <div className="flex flex-wrap gap-1.5">
          {c.config.outputRates?.map((r) => (
            <Badge key={r.label} tone="neutral">
              {r.label}: {formatCurrency(r.ratePerUnit)}/{r.unit}
            </Badge>
          ))}
        </div>
      )
    case 'commission_based':
      return (
        <p className="text-sm font-medium">
          {c.config.commissionType === 'percentage' ? `${c.config.commissionValue}%` : formatCurrency(c.config.commissionValue ?? 0)} of{' '}
          {c.config.commissionBasis}
        </p>
      )
    case 'mixed':
      return <p className="text-sm font-medium">{c.config.mixedComponents?.join(' + ')}</p>
    default:
      return null
  }
}

export function CompensationTypesSection({
  compensationTypes,
  canEdit,
  onRefetch,
}: {
  compensationTypes: CompensationType[]
  canEdit: boolean
  onRefetch: () => void
}) {
  const { user } = useSession()
  const { notify } = useToast()

  async function toggleActive(comp: CompensationType) {
    await updateCompensationType(user, comp.id, { isActive: !comp.isActive })
    notify({ title: comp.isActive ? 'Compensation type deactivated' : 'Compensation type activated', tone: 'success' })
    onRefetch()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Pay Types & Compensation</p>
          <p className="text-xs text-muted-foreground">How each employee's earnings are calculated.</p>
        </div>
        {canEdit && <CompensationTypeDialog onSaved={onRefetch} />}
      </div>

      {compensationTypes.length === 0 ? (
        <EmptyState title="No compensation types yet" icon={Wallet} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {compensationTypes.map((comp) => (
            <Card key={comp.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-sm font-semibold tracking-tight">{comp.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{KIND_LABEL[comp.kind]}</p>
                </div>
                {canEdit && <Switch checked={comp.isActive} onCheckedChange={() => toggleActive(comp)} />}
              </div>
              <div className="mt-3">
                <ConfigSummary compensationType={comp} />
              </div>
              {canEdit && (
                <div className="mt-4 flex justify-end border-t border-border pt-3">
                  <CompensationTypeDialog
                    compensationType={comp}
                    onSaved={onRefetch}
                    trigger={
                      <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />}>
                        Edit
                      </Button>
                    }
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

import { Pencil, Power, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { LoanTypeDialog } from '@/features/loans-deductions/components/LoanTypeDialog'
import { useDeductionConfigs, useLoanTypes } from '@/features/loans-deductions/hooks/useBenefitsDeductions'
import { useLoans } from '@/features/loans-deductions/hooks/useLoans'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from '@/hooks/useSession'
import { loanConfigNameFor } from '@/lib/payroll/payFrequency'
import { deleteLoanType, updateLoanType } from '@/lib/services/loanTypeService'
import { formatCurrency } from '@/lib/utils/format'
import type { DeductionConfig, LoanTypeConfig } from '@/types/domain'

function allocationLabel(config: DeductionConfig | undefined): string {
  if (!config) return 'Equal split across pay runs'
  if (config.allocationMethod === 'specific_cutoff') return `Full amount on pay period ${config.specificCutoffPeriod ?? 1}`
  if (config.allocationMethod === 'custom') return `Custom split (${(config.customSplitPercentages ?? []).join('% / ')}%)`
  return 'Equal split across pay runs'
}

const PROVIDER_TONE = { SSS: 'brand', 'Pag-IBIG': 'warning', Company: 'neutral', Other: 'neutral' } as const

/** The loan types an employee loan can be filed under. Built-in types can be edited or deactivated; the company can add its own. */
export function LoanTypesView() {
  const { loans } = useLoans()
  const { types, refetch } = useLoanTypes()
  const configs = useDeductionConfigs()
  const canManage = usePermission('loans.manage')
  const { user } = useSession()
  const { notify } = useToast()

  async function toggle(type: LoanTypeConfig) {
    await updateLoanType(user, type.id, { isActive: !type.isActive })
    notify({ title: type.isActive ? `${type.label} deactivated` : `${type.label} reactivated`, description: type.isActive ? 'It can no longer be picked for new loans. Existing loans are unaffected.' : undefined, tone: 'success' })
    refetch()
  }

  async function remove(type: LoanTypeConfig) {
    if (await deleteLoanType(user, type.id)) {
      notify({ title: `${type.label} deleted`, tone: 'success' })
      refetch()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Loan Types</p>
          <p className="max-w-3xl text-xs text-muted-foreground">
            The types you can choose when adding an employee loan. Each is deducted per its entry in Company &amp; Payroll Settings → Deductions (how the monthly amount is split across a month’s pay runs); types you add are collected like a Company Loan.
          </p>
        </div>
        {canManage && <LoanTypeDialog existing={types} onSaved={refetch} />}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Loan Type</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Typical Terms</TableHead>
            <TableHead>Collected In Payroll</TableHead>
            <TableHead>Active Loans</TableHead>
            <TableHead>Outstanding Balance</TableHead>
            <TableHead>Status</TableHead>
            {canManage && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {types.map((type) => {
            const ofType = loans.filter((l) => l.type === type.key)
            const active = ofType.filter((l) => l.status === 'active')
            const settingName = loanConfigNameFor(type.key)
            const config = configs.find((c) => c.name === settingName)
            return (
              <TableRow key={type.id} className={type.isActive ? undefined : 'opacity-60'}>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{type.label}</span>
                    {!type.builtIn && <Badge tone="neutral">Custom</Badge>}
                  </div>
                  <p className="max-w-xs text-xs text-muted-foreground">{type.description}</p>
                </TableCell>
                <TableCell>
                  <Badge tone={PROVIDER_TONE[type.provider]}>{type.provider}</Badge>
                </TableCell>
                <TableCell>
                  <p>{type.typicalTerm}</p>
                  <p className="text-xs text-muted-foreground">{type.typicalAmount}</p>
                </TableCell>
                <TableCell>
                  <p>{allocationLabel(config)}</p>
                  <p className="text-xs text-muted-foreground">Setting: {settingName}</p>
                </TableCell>
                <TableCell>{active.length}</TableCell>
                <TableCell>{active.length > 0 ? formatCurrency(active.reduce((sum, l) => sum + l.balance, 0)) : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <Badge tone={type.isActive ? 'success' : 'neutral'}>{type.isActive ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <LoanTypeDialog
                        type={type}
                        existing={types}
                        onSaved={refetch}
                        trigger={
                          <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />}>
                            Edit
                          </Button>
                        }
                      />
                      <Button size="sm" variant="ghost" icon={<Power className="size-3.5" />} onClick={() => toggle(type)}>
                        {type.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      {!type.builtIn && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Trash2 className="size-3.5" />}
                          disabled={ofType.length > 0}
                          title={ofType.length > 0 ? 'Loans use this type — deactivate it instead.' : undefined}
                          onClick={() => remove(type)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

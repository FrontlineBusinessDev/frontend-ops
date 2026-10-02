import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { usePayrollGroups } from '@/features/company-settings/hooks/usePayrollGroups'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useShiftTemplates } from '@/features/schedules/hooks/useSchedules'
import { payrollTemplateFor } from '@/lib/schedule/roster'
import { findEmployeePayrollGroup } from '@/lib/payroll/groupAssignment'
import { periodsPerCycleForFrequency, periodsPerMonthFor, workingDaysPerMonthFor } from '@/lib/payroll/payFrequency'
import { monthlyStatutoryFor } from '@/lib/services/payrollService'
import { formatCurrency } from '@/lib/utils/format'
import type { PayrollFrequency, StatutoryConfig } from '@/types/domain'

const FREQUENCY_LABEL: Record<PayrollFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  semi_monthly: 'Semi-monthly',
  monthly: 'Monthly',
  custom: 'Custom',
}

function Money({ value, muted }: { value: number; muted?: boolean }) {
  return <span className={muted ? 'tabular-nums text-muted-foreground' : 'tabular-nums'}>{formatCurrency(value)}</span>
}

/**
 * Every active employee's statutory contributions under the current configuration — computed by the
 * same function the payroll engine uses, so these figures always match Payroll Runs and payslips and
 * update immediately when the brackets/rates on the other tabs are edited.
 */
export function EmployeeContributionsTable({ config }: { config: StatutoryConfig }) {
  const { employees, isLoading } = useEmployees()
  const { groups } = usePayrollGroups()
  const { templates } = useShiftTemplates()
  const [search, setSearch] = useState('')

  const rows = useMemo(
    () =>
      employees
        .filter((e) => e.employment.status === 'active')
        .map((employee) => {
          const group = findEmployeePayrollGroup(groups, employee.id)
          const frequency: PayrollFrequency = group?.frequency ?? 'semi_monthly'
          const workSchedule = payrollTemplateFor(employee.id, templates)
          const workingDays = workingDaysPerMonthFor(workSchedule)
          // Split divisor: ÷1 monthly, ÷2 semi-monthly, ÷4 weekly, ÷22/26 daily, periods-in-month for bi-weekly/custom.
          const periodsPerMonth = periodsPerCycleForFrequency(frequency, periodsPerMonthFor(frequency, group, workSchedule), workingDays)
          const m = monthlyStatutoryFor(config, employee)
          const employeeTotal = m.sssEmployee + m.philhealthEmployee + m.pagibigEmployee + m.withholdingTax
          return {
            employee,
            groupName: group?.name,
            frequency,
            periodsPerMonth,
            m,
            employeeTotal,
            employerTotal: m.sssEmployer + m.philhealthEmployer + m.pagibigEmployer,
            perCutoff: Math.round((employeeTotal / periodsPerMonth) * 100) / 100,
          }
        })
        .sort((a, b) => a.employee.personal.lastName.localeCompare(b.employee.personal.lastName)),
    [employees, groups, templates, config],
  )

  const query = search.trim().toLowerCase()
  const visible = rows.filter(
    (r) => !query || `${r.employee.personal.firstName} ${r.employee.personal.lastName} ${r.employee.employeeNumber} ${r.employee.employment.department}`.toLowerCase().includes(query),
  )
  const totals = visible.reduce(
    (acc, r) => ({
      sssEe: acc.sssEe + r.m.sssEmployee,
      sssEr: acc.sssEr + r.m.sssEmployer,
      phEe: acc.phEe + r.m.philhealthEmployee,
      phEr: acc.phEr + r.m.philhealthEmployer,
      hdmfEe: acc.hdmfEe + r.m.pagibigEmployee,
      hdmfEr: acc.hdmfEr + r.m.pagibigEmployer,
      tax: acc.tax + r.m.withholdingTax,
    }),
    { sssEe: 0, sssEr: 0, phEe: 0, phEr: 0, hdmfEe: 0, hdmfEr: 0, tax: 0 },
  )

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-base font-semibold tracking-tight">Employee Contributions</p>
          <p className="text-xs text-muted-foreground">
            Monthly SSS, PhilHealth, Pag-IBIG and withholding tax per employee, and what is deducted each cutoff for their payroll group&apos;s pay frequency.
            Employer SSS includes the EC premium.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee…" className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <Table className="whitespace-nowrap">
          <TableHeader>
            <TableRow>
              <TableHead rowSpan={2} className="align-bottom">
                Employee
              </TableHead>
              <TableHead rowSpan={2} className="align-bottom">
                Pay Frequency
              </TableHead>
              <TableHead rowSpan={2} className="text-right align-bottom">
                Monthly Basis
              </TableHead>
              <TableHead colSpan={3} className="border-l border-border text-center">
                SSS
              </TableHead>
              <TableHead colSpan={2} className="border-l border-border text-center">
                PhilHealth
              </TableHead>
              <TableHead colSpan={2} className="border-l border-border text-center">
                Pag-IBIG
              </TableHead>
              <TableHead rowSpan={2} className="border-l border-border text-right align-bottom">
                Withholding Tax
              </TableHead>
              <TableHead rowSpan={2} className="border-l border-border text-right align-bottom">
                Deducted per Cutoff
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="border-l border-border text-right">MSC</TableHead>
              <TableHead className="text-right">EE</TableHead>
              <TableHead className="text-right">ER + EC</TableHead>
              <TableHead className="border-l border-border text-right">EE</TableHead>
              <TableHead className="text-right">ER</TableHead>
              <TableHead className="border-l border-border text-right">EE</TableHead>
              <TableHead className="text-right">ER</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r) => (
              <TableRow key={r.employee.id}>
                <TableCell>
                  <p className="font-medium">
                    {r.employee.personal.firstName} {r.employee.personal.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.employee.employeeNumber} · {r.employee.employment.department}
                  </p>
                </TableCell>
                <TableCell>
                  <p>{FREQUENCY_LABEL[r.frequency]}</p>
                  <p className="text-xs text-muted-foreground">{r.groupName ?? 'No payroll group (semi-monthly)'}</p>
                </TableCell>
                <TableCell className="text-right">
                  <Money value={r.m.monthlyBasis} />
                </TableCell>
                <TableCell className="border-l border-border text-right">
                  <Money value={r.m.sssMsc} muted />
                </TableCell>
                <TableCell className="text-right">
                  <Money value={r.m.sssEmployee} />
                </TableCell>
                <TableCell className="text-right">
                  <Money value={r.m.sssEmployer} />
                </TableCell>
                <TableCell className="border-l border-border text-right">
                  <Money value={r.m.philhealthEmployee} />
                </TableCell>
                <TableCell className="text-right">
                  <Money value={r.m.philhealthEmployer} />
                </TableCell>
                <TableCell className="border-l border-border text-right">
                  <Money value={r.m.pagibigEmployee} />
                </TableCell>
                <TableCell className="text-right">
                  <Money value={r.m.pagibigEmployer} />
                </TableCell>
                <TableCell className="border-l border-border text-right">
                  <Money value={r.m.withholdingTax} />
                </TableCell>
                <TableCell className="border-l border-border text-right">
                  <p className="font-medium tabular-nums">
                    {formatCurrency(r.perCutoff)}
                    {r.frequency === 'biweekly' && ` / ${formatCurrency(Math.round((r.employeeTotal / 3) * 100) / 100)}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(r.employeeTotal)} ÷ {r.frequency === 'biweekly' ? '2 or 3 (periods in month)' : r.frequency === 'daily' ? `${r.periodsPerMonth} working days` : r.periodsPerMonth}
                  </p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <tfoot className="border-t-2 border-border bg-muted/50 font-semibold">
            <tr>
              <td className="px-4 py-3" colSpan={4}>
                Total ({visible.length} employees, monthly)
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totals.sssEe)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totals.sssEr)}</td>
              <td className="border-l border-border px-4 py-3 text-right tabular-nums">{formatCurrency(totals.phEe)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totals.phEr)}</td>
              <td className="border-l border-border px-4 py-3 text-right tabular-nums">{formatCurrency(totals.hdmfEe)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totals.hdmfEr)}</td>
              <td className="border-l border-border px-4 py-3 text-right tabular-nums">{formatCurrency(totals.tax)}</td>
              <td className="border-l border-border px-4 py-3" />
            </tr>
          </tfoot>
        </Table>
      )}
    </Card>
  )
}

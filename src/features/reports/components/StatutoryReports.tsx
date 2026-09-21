import { useMemo, useState } from 'react'
import { EmployeeCombobox } from '@/components/ui/EmployeeCombobox'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { downloadCsv, FilterLabel, ReportFilterBar, ReportViewShell, StatTile, toCsv } from '@/features/reports/components/shared'
import { useAllPayrollLines } from '@/features/reports/hooks/useReports'
import { formatCurrency } from '@/lib/utils/format'

function fullName(personal: { firstName: string; lastName: string }) {
  return `${personal.firstName} ${personal.lastName}`
}

type ContributionType = 'sss' | 'philhealth' | 'pagibig'

const CONTRIBUTION_META: Record<ContributionType, { title: string; formLabel: string; description: string }> = {
  sss: { title: 'SSS Contribution Report', formLabel: 'SSS R-3 / R-5', description: 'Monthly SSS contribution remittance summary (R3/R5).' },
  philhealth: { title: 'PhilHealth Contribution Report', formLabel: 'PhilHealth ER2 / RF-1', description: 'Monthly PhilHealth premium remittance report (ER2/RF-1).' },
  pagibig: { title: 'Pag-IBIG Contribution Report', formLabel: 'Pag-IBIG MCRF', description: 'Monthly Pag-IBIG contribution remittance report (MCRF).' },
}

function shareFor(type: ContributionType, line: { sssEmployeeShare: number; sssEmployerShare: number; philhealthEmployeeShare: number; philhealthEmployerShare: number; pagibigEmployeeShare: number; pagibigEmployerShare: number }) {
  if (type === 'sss') return { ee: line.sssEmployeeShare, er: line.sssEmployerShare }
  if (type === 'philhealth') return { ee: line.philhealthEmployeeShare, er: line.philhealthEmployerShare }
  return { ee: line.pagibigEmployeeShare, er: line.pagibigEmployerShare }
}

export function StatutoryContributionReport({ type }: { type: ContributionType }) {
  const meta = CONTRIBUTION_META[type]
  const { rows, isLoading } = useAllPayrollLines()
  const periods = useMemo(() => {
    const seen = new Map<string, (typeof rows)[number]['period']>()
    for (const r of rows) seen.set(r.period.id, r.period)
    return [...seen.values()].sort((a, b) => b.startDate.localeCompare(a.startDate))
  }, [rows])
  const [periodId, setPeriodId] = useState<string | undefined>(undefined)
  const activePeriodId = periodId ?? periods[0]?.id
  const periodRows = rows.filter((r) => r.period.id === activePeriodId)

  const totals = periodRows.reduce(
    (acc, r) => {
      const { ee, er } = shareFor(type, r.line)
      return { ee: acc.ee + ee, er: acc.er + er }
    },
    { ee: 0, er: 0 },
  )

  function onExport() {
    const period = periods.find((p) => p.id === activePeriodId)
    const header = ['Employee', 'Employee Share', 'Employer Share', 'Total Remittance']
    const dataRows = periodRows.map((r) => {
      const { ee, er } = shareFor(type, r.line)
      return [fullName(r.employee.personal), String(ee), String(er), String(ee + er)]
    })
    downloadCsv(`${type}-contribution-${period?.label ?? 'period'}.csv`, toCsv([header, ...dataRows]))
  }

  return (
    <ReportViewShell title={meta.title} description={meta.description} onExportCsv={periodRows.length > 0 ? onExport : undefined}>
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : periods.length === 0 ? (
        <EmptyState title="No payroll periods yet" />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <div className="max-w-xs">
              <Select value={activePeriodId} onValueChange={setPeriodId} options={periods.map((p) => ({ value: p.id, label: p.label }))} />
            </div>
          </div>

          {periodRows.length === 0 ? (
            <EmptyState title="This period hasn't been run yet" />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatTile label="Employee Share" value={formatCurrency(totals.ee)} />
                <StatTile label="Employer Share" value={formatCurrency(totals.er)} />
                <StatTile label={`Total Remitted (${meta.formLabel})`} value={formatCurrency(totals.ee + totals.er)} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Employee Share</TableHead>
                    <TableHead>Employer Share</TableHead>
                    <TableHead>Total Remittance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodRows.map((r) => {
                    const { ee, er } = shareFor(type, r.line)
                    return (
                      <TableRow key={r.employee.id}>
                        <TableCell className="font-medium">{fullName(r.employee.personal)}</TableCell>
                        <TableCell>{formatCurrency(ee)}</TableCell>
                        <TableCell>{formatCurrency(er)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(ee + er)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      )}
    </ReportViewShell>
  )
}

export function Bir2316Report() {
  const { employees, isLoading: employeesLoading } = useEmployees()
  const { rows, isLoading } = useAllPayrollLines()
  const [employeeId, setEmployeeId] = useState<string | undefined>(undefined)

  const years = useMemo(() => {
    const set = new Set(rows.map((r) => r.period.startDate.slice(0, 4)))
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [rows])
  const [year, setYear] = useState<string | undefined>(undefined)
  const activeYear = year ?? years[0]
  const activeEmployeeId = employeeId ?? employees[0]?.id

  const employeeRows = rows.filter((r) => r.employee.id === activeEmployeeId && r.period.startDate.slice(0, 4) === activeYear)
  const totals = employeeRows.reduce(
    (acc, r) => ({
      compensation: acc.compensation + r.line.grossPay,
      tax: acc.tax + r.line.withholdingTax,
      sss: acc.sss + r.line.sssEmployeeShare,
      philhealth: acc.philhealth + r.line.philhealthEmployeeShare,
      pagibig: acc.pagibig + r.line.pagibigEmployeeShare,
    }),
    { compensation: 0, tax: 0, sss: 0, philhealth: 0, pagibig: 0 },
  )
  const employee = employees.find((e) => e.id === activeEmployeeId)

  return (
    <ReportViewShell
      title="BIR Form 2316"
      description="Annual Certificate of Compensation Payment / Tax Withheld, per employee."
    >
      {employeesLoading || isLoading ? (
        <Skeleton className="h-64" />
      ) : employees.length === 0 || years.length === 0 ? (
        <EmptyState title="No payroll history yet" description="Run at least one payroll period to generate this certificate." />
      ) : (
        <div className="space-y-4">
          <ReportFilterBar>
            <FilterLabel label="Employee" className="w-64">
              <EmployeeCombobox
                employees={employees.map((e) => ({ id: e.id, name: fullName(e.personal), employeeNumber: e.employeeNumber, department: e.employment.department }))}
                value={activeEmployeeId}
                onChange={setEmployeeId}
              />
            </FilterLabel>
            <FilterLabel label="Year" className="w-32">
              <Select value={activeYear} onValueChange={setYear} options={years.map((y) => ({ value: y, label: y }))} />
            </FilterLabel>
          </ReportFilterBar>

          {employeeRows.length === 0 ? (
            <EmptyState title="No payroll runs for this employee in this year" />
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-semibold">{employee ? fullName(employee.personal) : ''}</p>
                <p className="text-xs text-muted-foreground">
                  {employee?.employeeNumber} · TIN {employee?.government.tinNo ?? '—'} · {employee?.employment.position}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Calendar Year {activeYear}</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Total Gross Compensation</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(totals.compensation)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>SSS Contributions Withheld</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.sss)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>PhilHealth Contributions Withheld</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.philhealth)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Pag-IBIG Contributions Withheld</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.pagibig)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>Total Tax Withheld for the Year</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.tax)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </ReportViewShell>
  )
}

export function Bir1601CReport() {
  const { rows, isLoading } = useAllPayrollLines()

  const months = useMemo(() => {
    const set = new Set(rows.map((r) => r.period.payDate.slice(0, 7)))
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [rows])
  const [month, setMonth] = useState<string | undefined>(undefined)
  const activeMonth = month ?? months[0]
  const monthRows = rows.filter((r) => r.period.payDate.slice(0, 7) === activeMonth)

  const totals = monthRows.reduce(
    (acc, r) => ({ compensation: acc.compensation + r.line.grossPay, tax: acc.tax + r.line.withholdingTax }),
    { compensation: 0, tax: 0 },
  )
  const employeeCount = new Set(monthRows.map((r) => r.employee.id)).size

  function onExport() {
    const header = ['Employee', 'Gross Compensation', 'Tax Withheld']
    const dataRows = monthRows.map((r) => [fullName(r.employee.personal), String(r.line.grossPay), String(r.line.withholdingTax)])
    downloadCsv(`bir-1601c-${activeMonth}.csv`, toCsv([header, ...dataRows]))
  }

  return (
    <ReportViewShell
      title="BIR Form 1601-C"
      description="Monthly Remittance Return of Income Taxes Withheld on Compensation."
      onExportCsv={monthRows.length > 0 ? onExport : undefined}
    >
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : months.length === 0 ? (
        <EmptyState title="No payroll history yet" />
      ) : (
        <div className="space-y-4">
          <div className="max-w-xs print:hidden">
            <Select value={activeMonth} onValueChange={setMonth} options={months.map((m) => ({ value: m, label: m }))} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label="Employees Paid" value={String(employeeCount)} />
            <StatTile label="Total Gross Compensation" value={formatCurrency(totals.compensation)} />
            <StatTile label="Total Tax Withheld" value={formatCurrency(totals.tax)} />
          </div>

          {monthRows.length === 0 ? (
            <EmptyState title="No payroll lines for this month" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Gross Compensation</TableHead>
                  <TableHead>Tax Withheld</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthRows.map((r) => (
                  <TableRow key={`${r.period.id}-${r.employee.id}`}>
                    <TableCell className="font-medium">{fullName(r.employee.personal)}</TableCell>
                    <TableCell>{formatCurrency(r.line.grossPay)}</TableCell>
                    <TableCell>{formatCurrency(r.line.withholdingTax)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </ReportViewShell>
  )
}

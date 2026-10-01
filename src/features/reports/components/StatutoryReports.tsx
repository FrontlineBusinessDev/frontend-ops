import { Info, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmployeeCombobox } from '@/components/ui/EmployeeCombobox'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { FilterLabel, ReportFilterBar, ReportScopePicker, ReportViewShell, StatTile } from '@/features/reports/components/shared'
import { defaultScope, inScope, scopeLabel, type ReportScope } from '@/features/reports/payrollAggregates'
import type { ExcelExport } from '@/features/reports/reportExport'
import { useAllPayrollLines, useStatutoryContributionData } from '@/features/reports/hooks/useReports'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/format'
import type { Employee } from '@/types/domain'

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
  const [scopeState, setScope] = useState<ReportScope | undefined>(undefined)
  const scope = scopeState ?? defaultScope(periods)
  const activePeriodId = periodId ?? periods[0]?.id

  // One run, or each employee's shares summed across every run in the chosen month / year / date range.
  const periodRows = useMemo(() => {
    const byEmployee = new Map<string, { employee: (typeof rows)[number]['employee']; ee: number; er: number }>()
    for (const r of rows) {
      if (scope.basis === 'run' ? r.period.id !== activePeriodId : !inScope(r.period, scope)) continue
      const { ee, er } = shareFor(type, r.line)
      const prev = byEmployee.get(r.employee.id)
      byEmployee.set(r.employee.id, { employee: r.employee, ee: (prev?.ee ?? 0) + ee, er: (prev?.er ?? 0) + er })
    }
    return [...byEmployee.values()]
  }, [rows, scope, activePeriodId, type])

  const totals = periodRows.reduce((acc, r) => ({ ee: acc.ee + r.ee, er: acc.er + r.er }), { ee: 0, er: 0 })

  const activePeriod = periods.find((p) => p.id === activePeriodId)

  function onExport(): ExcelExport {
    const header = ['Employee', 'Employee Share', 'Employer Share', 'Total Remittance']
    const dataRows = periodRows.map((r) => [fullName(r.employee.personal), r.ee, r.er, r.ee + r.er])
    const suffix = scope.basis === 'run' ? (activePeriod?.label ?? 'period') : scopeLabel(scope).replace(/\s+/g, '-').toLowerCase()
    return { filename: `${type}-contribution-${suffix}`, rows: [header, ...dataRows], sumFooter: true }
  }

  return (
    <ReportViewShell
      title={meta.title}
      description={meta.description}
      meta={
        scope.basis !== 'run'
          ? [{ label: 'Report Period', value: scopeLabel(scope) }, { label: 'Form', value: meta.formLabel }]
          : activePeriod
            ? [{ label: 'Payroll Period', value: activePeriod.label }, { label: 'Form', value: meta.formLabel }]
            : []
      }
      onExportExcel={periodRows.length > 0 ? onExport : undefined}
    >
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : periods.length === 0 ? (
        <EmptyState title="No payroll periods yet" />
      ) : (
        <div className="space-y-4">
          <ReportFilterBar>
            <ReportScopePicker scope={scope} onChange={setScope} periods={periods} />
            {scope.basis === 'run' && (
              <FilterLabel label="Payroll Run" className="w-72">
                <Select value={activePeriodId} onValueChange={setPeriodId} options={periods.map((p) => ({ value: p.id, label: p.label }))} />
              </FilterLabel>
            )}
          </ReportFilterBar>

          {periodRows.length === 0 ? (
            <EmptyState title={scope.basis === 'run' ? "This period hasn't been run yet" : 'No payroll runs in this report period'} />
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
                  {periodRows.map((r) => (
                    <TableRow key={r.employee.id}>
                      <TableCell className="font-medium">{fullName(r.employee.personal)}</TableCell>
                      <TableCell>{formatCurrency(r.ee)}</TableCell>
                      <TableCell>{formatCurrency(r.er)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(r.ee + r.er)}</TableCell>
                    </TableRow>
                  ))}
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
      meta={[
        ...(employee ? [{ label: 'Employee', value: `${fullName(employee.personal)} (${employee.employeeNumber})` }] : []),
        ...(activeYear ? [{ label: 'Tax Year', value: activeYear }] : []),
      ]}
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

  function onExport(): ExcelExport {
    const header = ['Employee', 'Payroll Period', 'Gross Compensation', 'Tax Withheld']
    const dataRows = monthRows.map((r) => [fullName(r.employee.personal), r.period.label, r.line.grossPay, r.line.withholdingTax])
    return { filename: `bir-1601c-${activeMonth}`, rows: [header, ...dataRows], sumFooter: true }
  }

  return (
    <ReportViewShell
      title="BIR Form 1601-C"
      description="Monthly Remittance Return of Income Taxes Withheld on Compensation."
      meta={activeMonth ? [{ label: 'Month', value: monthLabel(activeMonth) }] : []}
      onExportExcel={monthRows.length > 0 ? onExport : undefined}
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

interface ContributionTotals {
  sssEe: number
  sssEr: number
  phEe: number
  phEr: number
  hdmfEe: number
  hdmfEr: number
  tax: number
}

interface ConsolidatedRow extends ContributionTotals {
  employee: Employee
  periodLabel: string
}

const ZERO_TOTALS: ContributionTotals = { sssEe: 0, sssEr: 0, phEe: 0, phEr: 0, hdmfEe: 0, hdmfEr: 0, tax: 0 }

function addTotals(a: ContributionTotals, b: ContributionTotals): ContributionTotals {
  return {
    sssEe: a.sssEe + b.sssEe,
    sssEr: a.sssEr + b.sssEr,
    phEe: a.phEe + b.phEe,
    phEr: a.phEr + b.phEr,
    hdmfEe: a.hdmfEe + b.hdmfEe,
    hdmfEr: a.hdmfEr + b.hdmfEr,
    tax: a.tax + b.tax,
  }
}

/** Employee-side statutory deductions include withholding tax; the employer side is contributions only. */
function employeeTotal(t: ContributionTotals) {
  return t.sssEe + t.phEe + t.hdmfEe + t.tax
}

function employerTotal(t: ContributionTotals) {
  return t.sssEr + t.phEr + t.hdmfEr
}

function monthLabel(yearMonth: string) {
  return new Date(`${yearMonth}-01T00:00:00`).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

const VIEW_OPTIONS = [
  { value: 'period', label: 'Payroll Period' },
  { value: 'month', label: 'Month' },
]

const AGENCY_GROUPS = [
  { label: 'SSS', ee: 'sssEe', er: 'sssEr' },
  { label: 'PhilHealth', ee: 'phEe', er: 'phEr' },
  { label: 'Pag-IBIG', ee: 'hdmfEe', er: 'hdmfEr' },
] as const

function MoneyCell({ value, className }: { value: number; className?: string }) {
  return <TableCell className={cn('whitespace-nowrap text-right tabular-nums', className)}>{formatCurrency(value)}</TableCell>
}

function ContributionCells({ t, strong }: { t: ContributionTotals; strong?: boolean }) {
  const emphasis = strong ? 'font-semibold' : 'font-medium'
  return (
    <>
      {AGENCY_GROUPS.map((g) => (
        <GroupCells key={g.label} ee={t[g.ee]} er={t[g.er]} emphasis={emphasis} />
      ))}
      <MoneyCell value={t.tax} className="border-l border-border" />
      <MoneyCell value={employeeTotal(t)} className={cn('border-l border-border', emphasis)} />
      <MoneyCell value={employerTotal(t)} className={emphasis} />
    </>
  )
}

function GroupCells({ ee, er, emphasis }: { ee: number; er: number; emphasis: string }) {
  return (
    <>
      <MoneyCell value={ee} className="border-l border-border" />
      <MoneyCell value={er} />
      <MoneyCell value={ee + er} className={emphasis} />
    </>
  )
}

/** SSS, PhilHealth, Pag-IBIG and withholding tax side by side per employee, for one payroll period or a whole month. */
export function ConsolidatedStatutoryReport() {
  const { rows, isSample, isLoading } = useStatutoryContributionData()
  const [view, setView] = useState<'period' | 'month'>('period')
  const [periodId, setPeriodId] = useState<string | undefined>(undefined)
  const [month, setMonth] = useState<string | undefined>(undefined)
  const [department, setDepartment] = useState('all')
  const [search, setSearch] = useState('')

  const periods = useMemo(() => {
    const seen = new Map<string, (typeof rows)[number]['period']>()
    for (const r of rows) seen.set(r.period.id, r.period)
    return [...seen.values()].sort((a, b) => b.startDate.localeCompare(a.startDate))
  }, [rows])
  const months = useMemo(() => [...new Set(periods.map((p) => p.startDate.slice(0, 7)))].sort((a, b) => b.localeCompare(a)), [periods])
  const departments = useMemo(() => [...new Set(rows.map((r) => r.employee.employment.department))].sort(), [rows])

  const activePeriod = periods.find((p) => p.id === periodId) ?? periods[0]
  const activeMonth = month ?? months[0]
  const scopeLabel = view === 'period' ? (activePeriod?.label ?? '') : activeMonth ? monthLabel(activeMonth) : ''

  const tableRows = useMemo(() => {
    const inScope = rows.filter((r) => (view === 'period' ? r.period.id === activePeriod?.id : r.period.startDate.slice(0, 7) === activeMonth))
    const byEmployee = new Map<string, ConsolidatedRow>()
    for (const { employee, line } of inScope) {
      const current = byEmployee.get(employee.id) ?? { employee, periodLabel: scopeLabel, ...ZERO_TOTALS }
      byEmployee.set(employee.id, {
        ...current,
        ...addTotals(current, {
          sssEe: line.sssEmployeeShare,
          sssEr: line.sssEmployerShare,
          phEe: line.philhealthEmployeeShare,
          phEr: line.philhealthEmployerShare,
          hdmfEe: line.pagibigEmployeeShare,
          hdmfEr: line.pagibigEmployerShare,
          tax: line.withholdingTax,
        }),
      })
    }
    const query = search.trim().toLowerCase()
    return [...byEmployee.values()]
      .filter((r) => department === 'all' || r.employee.employment.department === department)
      .filter((r) => !query || `${fullName(r.employee.personal)} ${r.employee.employeeNumber}`.toLowerCase().includes(query))
      .sort((a, b) => a.employee.personal.lastName.localeCompare(b.employee.personal.lastName))
  }, [rows, view, activePeriod?.id, activeMonth, scopeLabel, department, search])

  const totals = tableRows.reduce<ContributionTotals>((acc, r) => addTotals(acc, r), ZERO_TOTALS)
  const hasExtraFilters = department !== 'all' || search.trim().length > 0

  function clearFilters() {
    setDepartment('all')
    setSearch('')
  }

  function onExport(): ExcelExport {
    const header = [
      'Employee ID',
      'Employee Name',
      view === 'period' ? 'Payroll Period' : 'Month',
      ...AGENCY_GROUPS.flatMap((g) => [`${g.label} EE`, `${g.label} ER`, `${g.label} Total`]),
      'Withholding Tax',
      'Total Employee Deductions',
      'Total Employer Contributions',
    ]
    const toCells = (t: ContributionTotals) =>
      [...AGENCY_GROUPS.flatMap((g) => [t[g.ee], t[g.er], t[g.ee] + t[g.er]]), t.tax, employeeTotal(t), employerTotal(t)].map((n) => Math.round(n * 100) / 100)
    const body = tableRows.map((r) => [r.employee.employeeNumber, fullName(r.employee.personal), r.periodLabel, ...toCells(r)])
    const footer = ['TOTAL', `${tableRows.length} employees`, scopeLabel, ...toCells(totals)]
    const slug = scopeLabel.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
    return { filename: `consolidated-statutory-${slug}${isSample ? '-sample' : ''}`, rows: [header, ...body], footer }
  }

  const reportMeta = [
    { label: view === 'period' ? 'Payroll Period' : 'Month', value: scopeLabel },
    { label: 'Department', value: department === 'all' ? 'All' : department },
    ...(search.trim() ? [{ label: 'Employee Search', value: `“${search.trim()}”` }] : []),
    ...(isSample ? [{ label: 'Data', value: 'Sample (payroll not yet run)' }] : []),
  ]

  return (
    <ReportViewShell
      title="Overall Statutory Contribution Report"
      description="Unified summary of SSS, PhilHealth, Pag-IBIG, and Tax deductions per employee."
      meta={periods.length > 0 ? reportMeta : []}
      orientation="landscape"
      onExportExcel={tableRows.length > 0 ? onExport : undefined}
    >
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : periods.length === 0 ? (
        <EmptyState title="No payroll history yet" description="Run at least one payroll period to generate this report." />
      ) : (
        <div className="space-y-4">
          {isSample && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs">
              <Info className="mt-0.5 size-3.5 shrink-0 text-warning" />
              <p className="text-foreground">
                <span className="font-semibold">Sample data.</span> No payroll has been run yet, so these figures are computed by the payroll
                engine for the last {periods.length} cutoffs and aren&apos;t saved. Run a payroll period to see actual contributions.
              </p>
            </div>
          )}

          <ReportFilterBar onClear={hasExtraFilters ? clearFilters : undefined}>
            <FilterLabel label="View By" className="w-40">
              <Select value={view} onValueChange={(v) => setView(v as 'period' | 'month')} options={VIEW_OPTIONS} />
            </FilterLabel>
            {view === 'period' ? (
              <FilterLabel label="Payroll Period" className="w-56">
                <Select value={activePeriod?.id} onValueChange={setPeriodId} options={periods.map((p) => ({ value: p.id, label: p.label }))} />
              </FilterLabel>
            ) : (
              <FilterLabel label="Month" className="w-48">
                <Select value={activeMonth} onValueChange={setMonth} options={months.map((m) => ({ value: m, label: monthLabel(m) }))} />
              </FilterLabel>
            )}
            <FilterLabel label="Department" className="w-44">
              <Select
                value={department}
                onValueChange={setDepartment}
                options={[{ value: 'all', label: 'All Departments' }, ...departments.map((d) => ({ value: d, label: d }))]}
              />
            </FilterLabel>
            <FilterLabel label="Employee" className="w-56">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or ID…" className="pl-9" />
              </div>
            </FilterLabel>
          </ReportFilterBar>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Employees" value={String(tableRows.length)} />
            <StatTile label="Total Employee Deductions" value={formatCurrency(employeeTotal(totals))} />
            <StatTile label="Total Employer Contributions" value={formatCurrency(employerTotal(totals))} />
            <StatTile label="Total Remittance (EE + ER)" value={formatCurrency(employeeTotal(totals) + employerTotal(totals))} />
            <StatTile label="SSS (EE + ER)" value={formatCurrency(totals.sssEe + totals.sssEr)} />
            <StatTile label="PhilHealth (EE + ER)" value={formatCurrency(totals.phEe + totals.phEr)} />
            <StatTile label="Pag-IBIG (EE + ER)" value={formatCurrency(totals.hdmfEe + totals.hdmfEr)} />
            <StatTile label="Withholding Tax (BIR)" value={formatCurrency(totals.tax)} />
          </div>

          {tableRows.length === 0 ? (
            <EmptyState title="No employees match these filters" description="Try another department or clear the search." />
          ) : (
            <Table className="print:text-[9px]">
              <TableHeader>
                <TableRow>
                  <TableHead rowSpan={2} className="align-bottom">
                    Employee
                  </TableHead>
                  <TableHead rowSpan={2} className="align-bottom">
                    {view === 'period' ? 'Period' : 'Month'}
                  </TableHead>
                  {AGENCY_GROUPS.map((g) => (
                    <TableHead key={g.label} colSpan={3} className="border-l border-border text-center">
                      {g.label}
                    </TableHead>
                  ))}
                  <TableHead rowSpan={2} className="border-l border-border text-right align-bottom">
                    Withholding Tax
                  </TableHead>
                  <TableHead colSpan={2} className="border-l border-border text-center">
                    Total Statutory
                  </TableHead>
                </TableRow>
                <TableRow>
                  {AGENCY_GROUPS.flatMap((g) => [
                    <TableHead key={`${g.label}-ee`} className="border-l border-border pt-0 text-right">
                      Employee
                    </TableHead>,
                    <TableHead key={`${g.label}-er`} className="pt-0 text-right">
                      Employer
                    </TableHead>,
                    <TableHead key={`${g.label}-total`} className="pt-0 text-right">
                      Total
                    </TableHead>,
                  ])}
                  <TableHead className="border-l border-border pt-0 text-right">Employee</TableHead>
                  <TableHead className="pt-0 text-right">Employer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.map((r) => (
                  <TableRow key={r.employee.id}>
                    <TableCell className="whitespace-nowrap">
                      <p className="text-sm font-medium leading-tight">{fullName(r.employee.personal)}</p>
                      <p className="text-xs leading-tight text-muted-foreground">{r.employee.employeeNumber}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{r.periodLabel}</TableCell>
                    <ContributionCells t={r} />
                  </TableRow>
                ))}
              </TableBody>
              <tfoot className="border-t-2 border-border bg-muted/50">
                <TableRow>
                  <TableCell className="whitespace-nowrap font-semibold">Total ({tableRows.length})</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{scopeLabel}</TableCell>
                  <ContributionCells t={totals} strong />
                </TableRow>
              </tfoot>
            </Table>
          )}
        </div>
      )}
    </ReportViewShell>
  )
}

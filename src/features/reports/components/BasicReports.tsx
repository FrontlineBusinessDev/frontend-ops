import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmployeeCombobox } from '@/components/ui/EmployeeCombobox'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { usePayrollGroups } from '@/features/company-settings/hooks/usePayrollGroups'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useOvertimeRecords } from '@/features/overtime/hooks/useOvertime'
import { useLoans } from '@/features/loans-deductions/hooks/useLoans'
import { FilterLabel, ReportFilterBar, ReportViewShell, StatTile } from '@/features/reports/components/shared'
import { parseCsv, type ExcelExport, type ReportMetaItem } from '@/features/reports/reportExport'
import {
  useAllPayrollLines,
  useEmployeeMasterlist,
  usePayrollPeriodOptions,
  usePayrollRegister,
} from '@/features/reports/hooks/useReports'
import { useSession } from '@/hooks/useSession'
import { useTenant } from '@/hooks/useTenant'
import { findEmployeePayrollGroup } from '@/lib/payroll/groupAssignment'
import { PAY_RATE_TYPE_LABEL, formatBaseRateShort } from '@/lib/payroll/payRate'
import { hourlyRateFor } from '@/lib/payroll/rateBasis'
import { exportEmployeeMasterlistCsv } from '@/lib/services/integrationService'
import { getDeductionConfigs } from '@/lib/services/payrollSettingsService'
import { exportOvertimeSummaryCsv } from '@/lib/services/overtimeService'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { DeductionConfig, Employee, PayrollGroup } from '@/types/domain'

function fullName(personal: { firstName: string; lastName: string }) {
  return `${personal.firstName} ${personal.lastName}`
}

/** Department / Branch / Employee filter context for the export header. */
function employeeFilterMeta(
  { employeeIds, department, branchId }: { employeeIds: string[]; department: string; branchId: string },
  branches: { id: string; name: string }[],
): ReportMetaItem[] {
  return [
    { label: 'Department', value: department === 'all' ? 'All' : department },
    { label: 'Branch', value: branchId === 'all' ? 'All' : (branches.find((b) => b.id === branchId)?.name ?? branchId) },
    ...(employeeIds.length > 0 ? [{ label: 'Employees', value: `${employeeIds.length} selected` }] : []),
  ]
}

/** Keep only the CSV rows (after the header) whose `column` value belongs to the on-screen, filtered employees. */
function filterCsvRows(rows: string[][], column: string, allowed: Set<string>): string[][] {
  const [header = [], ...body] = rows
  const index = header.indexOf(column)
  return index < 0 ? rows : [header, ...body.filter((r) => allowed.has(r[index]))]
}

function comboboxOptions(employees: Employee[]) {
  return employees.map((e) => ({ id: e.id, name: fullName(e.personal), employeeNumber: e.employeeNumber, department: e.employment.department }))
}

const FREQUENCY_LABEL: Record<PayrollGroup['frequency'], string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  semi_monthly: 'Semi-monthly',
  monthly: 'Monthly',
  custom: 'Custom',
}

export function EmployeeMasterListReport() {
  const { employees, isLoading } = useEmployeeMasterlist()
  const { branches } = useTenant()
  const { user } = useSession()
  const { notify } = useToast()

  const [employeeIds, setEmployeeIds] = useState<string[]>([])
  const [department, setDepartment] = useState('all')
  const [branchId, setBranchId] = useState('all')

  const departmentOptions = useMemo(() => {
    const unique = Array.from(new Set(employees.map((e) => e.employment.department))).sort()
    return [{ value: 'all', label: 'All Departments' }, ...unique.map((d) => ({ value: d, label: d }))]
  }, [employees])
  const branchOptions = useMemo(
    () => [{ value: 'all', label: 'All Branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))],
    [branches],
  )

  const filteredEmployees = employees.filter(
    (e) =>
      (employeeIds.length === 0 || employeeIds.includes(e.id)) &&
      (department === 'all' || e.employment.department === department) &&
      (branchId === 'all' || e.branchId === branchId),
  )

  const hasActiveFilters = employeeIds.length > 0 || department !== 'all' || branchId !== 'all'
  function clearFilters() {
    setEmployeeIds([])
    setDepartment('all')
    setBranchId('all')
  }

  async function onExport(): Promise<ExcelExport> {
    const rows = parseCsv(await exportEmployeeMasterlistCsv(user))
    notify({ title: 'Employee masterlist exported', tone: 'success' })
    return { filename: 'employee-masterlist', rows: filterCsvRows(rows, 'Employee #', new Set(filteredEmployees.map((e) => e.employeeNumber))) }
  }

  return (
    <ReportViewShell
      title="Employee Master List"
      description="Full profile and demographic export for every employee."
      meta={employeeFilterMeta({ employeeIds, department, branchId }, branches)}
      onExportExcel={onExport}
    >
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : employees.length === 0 ? (
        <EmptyState title="No employees yet" />
      ) : (
        <div className="space-y-4">
          <ReportFilterBar onClear={hasActiveFilters ? clearFilters : undefined}>
            <FilterLabel label="Employee" className="w-64">
              <EmployeeCombobox multiple employees={comboboxOptions(employees)} value={employeeIds} onChange={setEmployeeIds} />
            </FilterLabel>
            <FilterLabel label="Department" className="w-44">
              <Select value={department} onValueChange={setDepartment} options={departmentOptions} />
            </FilterLabel>
            <FilterLabel label="Branch" className="w-44">
              <Select value={branchId} onValueChange={setBranchId} options={branchOptions} />
            </FilterLabel>
          </ReportFilterBar>

          {filteredEmployees.length === 0 ? (
            <EmptyState title="No matching employee records found" description="Try adjusting or clearing the filters above." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Date Hired</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.employeeNumber}</TableCell>
                    <TableCell className="font-medium">{fullName(e.personal)}</TableCell>
                    <TableCell>{e.employment.department}</TableCell>
                    <TableCell>{e.employment.position}</TableCell>
                    <TableCell>{formatDate(e.employment.dateHired)}</TableCell>
                    <TableCell className="capitalize">{e.employment.status}</TableCell>
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

export function EmployeeCompensationReport() {
  const { employees, isLoading } = useEmployees()
  const { groups } = usePayrollGroups()

  function onExport(): ExcelExport {
    const header = ['Employee', 'Position', 'Pay Rate Type', 'Base Rate', 'Allowances', 'Pay Frequency']
    const rows = employees.map((e) => {
      const group = findEmployeePayrollGroup(groups, e.id)
      const allowances = e.compensation.allowances.reduce((s, a) => s + a.amount, 0)
      return [
        fullName(e.personal),
        e.employment.position,
        PAY_RATE_TYPE_LABEL[e.compensation.payType],
        formatBaseRateShort(e.compensation.payType, e.compensation.basicPay, e.compensation.outputUnit),
        allowances,
        group ? FREQUENCY_LABEL[group.frequency] : '',
      ]
    })
    return { filename: 'employee-compensation-report', rows: [header, ...rows], columnTypes: { Allowances: 'currency' } }
  }

  return (
    <ReportViewShell
      title="Employee Compensation Report"
      description="Breakdown of basic rates, allowances, and pay frequency per employee."
      meta={[{ label: 'Employees', value: `All (${employees.length})` }]}
      onExportExcel={onExport}
    >
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : employees.length === 0 ? (
        <EmptyState title="No employees yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Pay Rate Type</TableHead>
              <TableHead>Base Rate</TableHead>
              <TableHead>Allowances</TableHead>
              <TableHead>Pay Frequency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((e) => {
              const group = findEmployeePayrollGroup(groups, e.id)
              const allowances = e.compensation.allowances.reduce((s, a) => s + a.amount, 0)
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{fullName(e.personal)}</TableCell>
                  <TableCell>{e.employment.position}</TableCell>
                  <TableCell>{PAY_RATE_TYPE_LABEL[e.compensation.payType]}</TableCell>
                  <TableCell>{formatBaseRateShort(e.compensation.payType, e.compensation.basicPay, e.compensation.outputUnit)}</TableCell>
                  <TableCell>{formatCurrency(allowances)}</TableCell>
                  <TableCell>{group ? FREQUENCY_LABEL[group.frequency] : '—'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </ReportViewShell>
  )
}

export function PayrollRegisterReport() {
  const { periods, isLoading: periodsLoading } = usePayrollPeriodOptions()
  const [periodId, setPeriodId] = useState<string | undefined>(undefined)
  const { report, isLoading } = usePayrollRegister(periodId ?? periods[0]?.id)

  function onExport(): ExcelExport {
    const header = ['Employee', 'Gross Pay', 'SSS', 'PhilHealth', 'Pag-IBIG', 'Withholding Tax', 'Total Deductions', 'Net Pay']
    const rows = (report?.rows ?? []).map((r) => [
      fullName(r.employee.personal),
      r.grossPay,
      r.sssEmployeeShare,
      r.philhealthEmployeeShare,
      r.pagibigEmployeeShare,
      r.withholdingTax,
      r.totalDeductions,
      r.netPay,
    ])
    return {
      filename: `payroll-register-${report?.period?.label ?? 'period'}`,
      rows: [header, ...rows],
      sumFooter: true,
      columnTypes: { SSS: 'currency', PhilHealth: 'currency', 'Pag-IBIG': 'currency' },
    }
  }

  return (
    <ReportViewShell
      title="Payroll Register"
      description="Detailed payroll breakdown per employee for a pay period."
      meta={
        report?.period
          ? [
              { label: 'Payroll Period', value: report.period.label },
              { label: 'Pay Date', value: formatDate(report.period.payDate) },
            ]
          : []
      }
      onExportExcel={report ? onExport : undefined}
    >
      {periodsLoading ? (
        <Skeleton className="h-72" />
      ) : periods.length === 0 ? (
        <EmptyState title="No payroll periods yet" description="Run a payroll period first to see the register here." />
      ) : (
        <div className="space-y-4">
          <div className="max-w-xs print:hidden">
            <Select value={periodId ?? periods[0]?.id} onValueChange={setPeriodId} options={periods.map((p) => ({ value: p.id, label: p.label }))} />
          </div>

          {isLoading || !report ? (
            <Skeleton className="h-72" />
          ) : report.rows.length === 0 ? (
            <EmptyState title="No payroll lines" description="This period hasn't been run yet." />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatTile label="Gross Pay" value={formatCurrency(report.totals.grossPay)} />
                <StatTile label="Total Deductions" value={formatCurrency(report.totals.totalDeductions)} />
                <StatTile label="Net Pay" value={formatCurrency(report.totals.netPay)} />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Gross Pay</TableHead>
                    <TableHead>SSS</TableHead>
                    <TableHead>PhilHealth</TableHead>
                    <TableHead>Pag-IBIG</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Total Deductions</TableHead>
                    <TableHead>Net Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.map((row) => (
                    <TableRow key={row.employee.id}>
                      <TableCell className="font-medium">{fullName(row.employee.personal)}</TableCell>
                      <TableCell>{formatCurrency(row.grossPay)}</TableCell>
                      <TableCell>{formatCurrency(row.sssEmployeeShare)}</TableCell>
                      <TableCell>{formatCurrency(row.philhealthEmployeeShare)}</TableCell>
                      <TableCell>{formatCurrency(row.pagibigEmployeeShare)}</TableCell>
                      <TableCell>{formatCurrency(row.withholdingTax)}</TableCell>
                      <TableCell>{formatCurrency(row.totalDeductions)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(row.netPay)}</TableCell>
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

export function PayrollSummaryReport() {
  const { rows, isLoading } = useAllPayrollLines()

  const byPeriod = useMemo(() => {
    const map = new Map<string, { period: (typeof rows)[number]['period']; employees: number; gross: number; deductions: number; net: number }>()
    for (const { period, line } of rows) {
      const bucket = map.get(period.id) ?? { period, employees: 0, gross: 0, deductions: 0, net: 0 }
      bucket.employees += 1
      bucket.gross += line.grossPay
      bucket.deductions += line.totalDeductions
      bucket.net += line.netPay
      map.set(period.id, bucket)
    }
    return [...map.values()].sort((a, b) => b.period.startDate.localeCompare(a.period.startDate))
  }, [rows])

  const grandTotal = byPeriod.reduce(
    (acc, p) => ({ gross: acc.gross + p.gross, deductions: acc.deductions + p.deductions, net: acc.net + p.net }),
    { gross: 0, deductions: 0, net: 0 },
  )

  function onExport(): ExcelExport {
    const header = ['Period', 'Pay Date', 'Status', 'Employees', 'Gross Pay', 'Total Deductions', 'Net Pay']
    const dataRows = byPeriod.map((p) => [p.period.label, p.period.payDate, p.period.status, p.employees, p.gross, p.deductions, p.net])
    return { filename: 'payroll-summary', rows: [header, ...dataRows], sumFooter: true }
  }

  return (
    <ReportViewShell
      title="Payroll Summary"
      description="High-level payroll totals for every period."
      meta={[{ label: 'Coverage', value: `All payroll periods (${byPeriod.length})` }]}
      onExportExcel={byPeriod.length > 0 ? onExport : undefined}
    >
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : byPeriod.length === 0 ? (
        <EmptyState title="No payroll periods run yet" />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label="Gross Pay (All Periods)" value={formatCurrency(grandTotal.gross)} />
            <StatTile label="Total Deductions" value={formatCurrency(grandTotal.deductions)} />
            <StatTile label="Net Pay" value={formatCurrency(grandTotal.net)} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Pay Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byPeriod.map((p) => (
                <TableRow key={p.period.id}>
                  <TableCell className="font-medium">{p.period.label}</TableCell>
                  <TableCell>{formatDate(p.period.payDate)}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.period.status} />
                  </TableCell>
                  <TableCell>{p.employees}</TableCell>
                  <TableCell>{formatCurrency(p.gross)}</TableCell>
                  <TableCell>{formatCurrency(p.deductions)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(p.net)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ReportViewShell>
  )
}

export function PayrollSummaryPerEmployeeReport() {
  const { employees, isLoading: employeesLoading } = useEmployees()
  const { rows, isLoading } = useAllPayrollLines()
  const [employeeId, setEmployeeId] = useState<string | undefined>(undefined)

  const activeEmployeeId = employeeId ?? employees[0]?.id
  const employeeRows = rows.filter((r) => r.employee.id === activeEmployeeId).sort((a, b) => a.period.startDate.localeCompare(b.period.startDate))

  const activeEmployee = employees.find((e) => e.id === activeEmployeeId)

  function onExport(): ExcelExport {
    const header = ['Period', 'Pay Date', 'Gross Pay', 'Total Deductions', 'Net Pay']
    const dataRows = employeeRows.map((r) => [r.period.label, r.period.payDate, r.line.grossPay, r.line.totalDeductions, r.line.netPay])
    return { filename: `payroll-summary-${activeEmployee?.employeeNumber ?? 'employee'}`, rows: [header, ...dataRows], sumFooter: true }
  }

  return (
    <ReportViewShell
      title="Payroll Summary per Employee"
      description="Compare one employee's pay across every period they've been run in."
      meta={
        activeEmployee
          ? [
              { label: 'Employee', value: `${fullName(activeEmployee.personal)} (${activeEmployee.employeeNumber})` },
              { label: 'Department', value: activeEmployee.employment.department },
            ]
          : []
      }
      onExportExcel={employeeRows.length > 0 ? onExport : undefined}
    >
      {employeesLoading || isLoading ? (
        <Skeleton className="h-64" />
      ) : employees.length === 0 ? (
        <EmptyState title="No employees yet" />
      ) : (
        <div className="space-y-4">
          <ReportFilterBar>
            <FilterLabel label="Employee" className="w-64">
              <EmployeeCombobox employees={comboboxOptions(employees)} value={activeEmployeeId} onChange={setEmployeeId} />
            </FilterLabel>
          </ReportFilterBar>
          {employeeRows.length === 0 ? (
            <EmptyState title="No payroll history for this employee" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Total Deductions</TableHead>
                  <TableHead>Net Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeRows.map((r) => (
                  <TableRow key={r.period.id}>
                    <TableCell className="font-medium">{r.period.label}</TableCell>
                    <TableCell>{formatDate(r.period.payDate)}</TableCell>
                    <TableCell>{formatCurrency(r.line.grossPay)}</TableCell>
                    <TableCell>{formatCurrency(r.line.totalDeductions)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(r.line.netPay)}</TableCell>
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

export function PayslipReportView() {
  const { periods, isLoading } = usePayrollPeriodOptions()
  const { employees, isLoading: employeesLoading } = useEmployees()
  const { rows, isLoading: rowsLoading } = useAllPayrollLines()
  const { branches } = useTenant()
  const finalized = periods.filter((p) => p.status === 'finalized')

  const [employeeId, setEmployeeId] = useState<string | undefined>(undefined)
  const [department, setDepartment] = useState('all')
  const [branchId, setBranchId] = useState('all')

  const departmentOptions = useMemo(() => {
    const unique = Array.from(new Set(employees.map((e) => e.employment.department))).sort()
    return [{ value: 'all', label: 'All Departments' }, ...unique.map((d) => ({ value: d, label: d }))]
  }, [employees])
  const branchOptions = useMemo(
    () => [{ value: 'all', label: 'All Branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))],
    [branches],
  )

  const matchingRowsByPeriod = useMemo(() => {
    const map = new Map<string, (typeof rows)[number]>()
    for (const r of rows) {
      if (employeeId && r.employee.id !== employeeId) continue
      if (department !== 'all' && r.employee.employment.department !== department) continue
      if (branchId !== 'all' && r.employee.branchId !== branchId) continue
      map.set(r.period.id, r)
    }
    return map
  }, [rows, employeeId, department, branchId])

  const hasActiveFilters = !!employeeId || department !== 'all' || branchId !== 'all'
  const filteredPeriods = hasActiveFilters ? finalized.filter((p) => matchingRowsByPeriod.has(p.id)) : finalized

  function clearFilters() {
    setEmployeeId(undefined)
    setDepartment('all')
    setBranchId('all')
  }

  return (
    <ReportViewShell title="Payslip Report" description="Every finalized period's payslips — open a period to view or print each employee's payslip.">
      {isLoading || employeesLoading || rowsLoading ? (
        <Skeleton className="h-64" />
      ) : finalized.length === 0 ? (
        <EmptyState title="No finalized periods yet" description="Payslips become available once a payroll period is finalized." />
      ) : (
        <div className="space-y-4">
          <ReportFilterBar onClear={hasActiveFilters ? clearFilters : undefined}>
            <FilterLabel label="Employee" className="w-64">
              <EmployeeCombobox employees={comboboxOptions(employees)} value={employeeId} onChange={setEmployeeId} />
            </FilterLabel>
            <FilterLabel label="Department" className="w-44">
              <Select value={department} onValueChange={setDepartment} options={departmentOptions} />
            </FilterLabel>
            <FilterLabel label="Branch" className="w-44">
              <Select value={branchId} onValueChange={setBranchId} options={branchOptions} />
            </FilterLabel>
          </ReportFilterBar>

          {filteredPeriods.length === 0 ? (
            <EmptyState title="No matching employee records found" description="Try adjusting or clearing the filters above." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPeriods.map((p) => {
                  const matchingLine = employeeId ? matchingRowsByPeriod.get(p.id) : undefined
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.label}</TableCell>
                      <TableCell>{formatDate(p.payDate)}</TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-right print:hidden">
                        <Button size="sm" variant="secondary" asChild>
                          <Link to={matchingLine ? `/payslips/${matchingLine.line.id}` : '/payslips'}>
                            {matchingLine ? 'View Payslip' : 'View Payslips'}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </ReportViewShell>
  )
}



export function OvertimeReportView() {
  const { records, isLoading: recordsLoading } = useOvertimeRecords()
  const { employees, isLoading: employeesLoading } = useEmployees()
  const { branches } = useTenant()
  const { user } = useSession()
  const { notify } = useToast()

  const [employeeIds, setEmployeeIds] = useState<string[]>([])
  const [department, setDepartment] = useState('all')
  const [branchId, setBranchId] = useState('all')

  const departmentOptions = useMemo(() => {
    const unique = Array.from(new Set(employees.map((e) => e.employment.department))).sort()
    return [{ value: 'all', label: 'All Departments' }, ...unique.map((d) => ({ value: d, label: d }))]
  }, [employees])
  const branchOptions = useMemo(
    () => [{ value: 'all', label: 'All Branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))],
    [branches],
  )

  const rows = useMemo(() => {
    const employeeById = new Map(employees.map((e) => [e.id, e]))
    const byEmployee = new Map<string, { employee: (typeof employees)[number]; regular: number; nightDiff: number; restDay: number; cost: number }>()
    for (const r of records) {
      if (r.status === 'rejected') continue
      const employee = employeeById.get(r.employeeId)
      if (!employee) continue
      const bucket = byEmployee.get(employee.id) ?? { employee, regular: 0, nightDiff: 0, restDay: 0, cost: 0 }
      if (r.type === 'regular') bucket.regular += r.hours
      else if (r.type === 'night_diff') bucket.nightDiff += r.hours
      else bucket.restDay += r.hours
      // Same basis as the payroll engine: hourly rate × the record's own OT rate multiplier.
      bucket.cost += r.hours * hourlyRateFor(employee) * r.multiplier
      byEmployee.set(employee.id, bucket)
    }
    return [...byEmployee.values()].sort((a, b) => a.employee.personal.lastName.localeCompare(b.employee.personal.lastName))
  }, [records, employees])

  const filteredRows = rows.filter(
    (row) =>
      (employeeIds.length === 0 || employeeIds.includes(row.employee.id)) &&
      (department === 'all' || row.employee.employment.department === department) &&
      (branchId === 'all' || row.employee.branchId === branchId),
  )

  const hasActiveFilters = employeeIds.length > 0 || department !== 'all' || branchId !== 'all'
  function clearFilters() {
    setEmployeeIds([])
    setDepartment('all')
    setBranchId('all')
  }

  async function onExport(): Promise<ExcelExport> {
    const rows = parseCsv(await exportOvertimeSummaryCsv(user))
    notify({ title: 'Overtime report exported', tone: 'success' })
    return {
      filename: 'overtime-report',
      rows: filterCsvRows(rows, 'Employee ID', new Set(filteredRows.map((r) => r.employee.employeeNumber))),
      sumFooter: true,
      columnTypes: { Hours: 'number' },
    }
  }

  return (
    <ReportViewShell
      title="Overtime Report"
      description="Overtime and night differential hours & estimated cost per employee."
      meta={employeeFilterMeta({ employeeIds, department, branchId }, branches)}
      onExportExcel={onExport}
    >
      {recordsLoading || employeesLoading ? (
        <Skeleton className="h-64" />
      ) : rows.length === 0 ? (
        <EmptyState title="No overtime recorded yet" />
      ) : (
        <div className="space-y-4">
          <ReportFilterBar onClear={hasActiveFilters ? clearFilters : undefined}>
            <FilterLabel label="Employee" className="w-64">
              <EmployeeCombobox multiple employees={comboboxOptions(employees)} value={employeeIds} onChange={setEmployeeIds} />
            </FilterLabel>
            <FilterLabel label="Department" className="w-44">
              <Select value={department} onValueChange={setDepartment} options={departmentOptions} />
            </FilterLabel>
            <FilterLabel label="Branch" className="w-44">
              <Select value={branchId} onValueChange={setBranchId} options={branchOptions} />
            </FilterLabel>
          </ReportFilterBar>

          {filteredRows.length === 0 ? (
            <EmptyState title="No matching employee records found" description="Try adjusting or clearing the filters above." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Regular OT Hours</TableHead>
                  <TableHead>Night Diff Hours</TableHead>
                  <TableHead>Rest Day / Holiday Hours</TableHead>
                  <TableHead>Estimated Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.employee.id}>
                    <TableCell className="font-medium">{fullName(row.employee.personal)}</TableCell>
                    <TableCell>{row.employee.employment.department}</TableCell>
                    <TableCell>{row.regular.toFixed(1)}</TableCell>
                    <TableCell>{row.nightDiff.toFixed(1)}</TableCell>
                    <TableCell>{row.restDay.toFixed(1)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(Math.round(row.cost))}</TableCell>
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

export function LoansDeductionsReportView() {
  const { loans, isLoading: loansLoading } = useLoans()
  const { employees, isLoading: employeesLoading } = useEmployees()
  const { user } = useSession()
  const [deductionConfigs, setDeductionConfigs] = useState<DeductionConfig[]>([])

  useEffect(() => {
    getDeductionConfigs(user).then(setDeductionConfigs)
  }, [user])

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])
  const activeLoans = loans.filter((l) => l.status === 'active')

  function onExport(): ExcelExport {
    const header = ['Employee', 'Loan Type', 'Label', 'Principal', 'Balance', 'Monthly Deduction', 'Status']
    const rows = loans.map((l) => {
      const employee = employeeById.get(l.employeeId)
      return [employee ? fullName(employee.personal) : l.employeeId, l.type, l.label, l.principal, l.balance, l.monthlyDeduction, l.status]
    })
    return { filename: 'loans-deductions-report', rows: [header, ...rows], sumFooter: true }
  }

  return (
    <ReportViewShell
      title="Loans & Deductions Report"
      description="Active company loans and recurring deduction configuration."
      meta={[{ label: 'Loans', value: `${loans.length} total · ${activeLoans.length} active` }]}
      onExportExcel={onExport}
    >
      {loansLoading || employeesLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Active Loans ({activeLoans.length})
            </p>
            {activeLoans.length === 0 ? (
              <EmptyState title="No active loans" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Monthly Deduction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeLoans.map((l) => {
                    const employee = employeeById.get(l.employeeId)
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{employee ? fullName(employee.personal) : '—'}</TableCell>
                        <TableCell>{l.label}</TableCell>
                        <TableCell>{formatCurrency(l.principal)}</TableCell>
                        <TableCell>{formatCurrency(l.balance)}</TableCell>
                        <TableCell>{formatCurrency(l.monthlyDeduction)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recurring Company Deductions</p>
            {deductionConfigs.length === 0 ? (
              <EmptyState title="No deduction configs set up" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Recurrence</TableHead>
                    <TableHead>Allocation</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductionConfigs.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="capitalize">{d.category}</TableCell>
                      <TableCell className="capitalize">{d.recurrence.replace('_', ' ')}</TableCell>
                      <TableCell className="capitalize">{d.allocationMethod?.replace('_', ' ') ?? '—'}</TableCell>
                      <TableCell>{d.isActive ? 'Active' : 'Inactive'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}
    </ReportViewShell>
  )
}

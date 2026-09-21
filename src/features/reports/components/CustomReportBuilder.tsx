import { Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { downloadCsv, ReportViewShell, toCsv } from '@/features/reports/components/shared'
import { useAllPayrollLines } from '@/features/reports/hooks/useReports'
import { useTenant } from '@/hooks/useTenant'
import { PAY_RATE_TYPE_LABEL, formatBaseRateShort } from '@/lib/payroll/payRate'
import { formatCurrency } from '@/lib/utils/format'
import type { Employee } from '@/types/domain'

interface ColumnDef {
  key: string
  label: string
  value: (row: BuilderRow) => string
}

interface BuilderRow {
  employee: Employee
  latestGrossPay?: number
  latestNetPay?: number
}

const COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Employee Name', value: (r) => `${r.employee.personal.firstName} ${r.employee.personal.lastName}` },
  { key: 'employeeNumber', label: 'Employee ID', value: (r) => r.employee.employeeNumber },
  { key: 'department', label: 'Department', value: (r) => r.employee.employment.department },
  { key: 'position', label: 'Position', value: (r) => r.employee.employment.position },
  { key: 'status', label: 'Status', value: (r) => r.employee.employment.status },
  {
    key: 'payRateType',
    label: 'Pay Rate Type',
    value: (r) => PAY_RATE_TYPE_LABEL[r.employee.compensation.payType],
  },
  {
    key: 'baseRate',
    label: 'Base Rate',
    value: (r) => formatBaseRateShort(r.employee.compensation.payType, r.employee.compensation.basicPay, r.employee.compensation.outputUnit),
  },
  { key: 'latestGrossPay', label: 'Latest Gross Pay', value: (r) => (r.latestGrossPay !== undefined ? formatCurrency(r.latestGrossPay) : '—') },
  { key: 'latestNetPay', label: 'Latest Net Pay', value: (r) => (r.latestNetPay !== undefined ? formatCurrency(r.latestNetPay) : '—') },
]

const DEFAULT_COLUMNS = ['name', 'employeeNumber', 'department', 'payRateType', 'baseRate', 'latestNetPay']

interface SavedTemplate {
  name: string
  columns: string[]
  department: string
  branchId: string
  status: string
}

const TEMPLATES_STORAGE_KEY = 'fbs-ops-custom-report-templates'

function loadTemplates(): SavedTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATES_STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function CustomReportBuilder() {
  const { employees, isLoading: employeesLoading } = useEmployees()
  const { rows: payrollRows, isLoading: payrollLoading } = useAllPayrollLines()
  const { branches } = useTenant()
  const { notify } = useToast()

  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_COLUMNS)
  const [department, setDepartment] = useState('all')
  const [branchId, setBranchId] = useState('all')
  const [status, setStatus] = useState('all')
  const [templates, setTemplates] = useState<SavedTemplate[]>([])
  const [templateName, setTemplateName] = useState('')

  useEffect(() => {
    setTemplates(loadTemplates())
  }, [])

  const departmentOptions = useMemo(() => {
    const unique = Array.from(new Set(employees.map((e) => e.employment.department))).sort()
    return [{ value: 'all', label: 'All Departments' }, ...unique.map((d) => ({ value: d, label: d }))]
  }, [employees])
  const branchOptions = useMemo(
    () => [{ value: 'all', label: 'All Branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))],
    [branches],
  )

  const rows: BuilderRow[] = useMemo(() => {
    const latestByEmployee = new Map<string, { grossPay: number; netPay: number; startDate: string }>()
    for (const { employee, period, line } of payrollRows) {
      const existing = latestByEmployee.get(employee.id)
      if (!existing || period.startDate > existing.startDate) {
        latestByEmployee.set(employee.id, { grossPay: line.grossPay, netPay: line.netPay, startDate: period.startDate })
      }
    }
    return employees
      .filter((e) => (department === 'all' || e.employment.department === department) && (branchId === 'all' || e.branchId === branchId) && (status === 'all' || e.employment.status === status))
      .map((employee) => {
        const latest = latestByEmployee.get(employee.id)
        return { employee, latestGrossPay: latest?.grossPay, latestNetPay: latest?.netPay }
      })
  }, [employees, payrollRows, department, branchId, status])

  const activeColumns = COLUMNS.filter((c) => selectedColumns.includes(c.key))

  function toggleColumn(key: string) {
    setSelectedColumns((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  function onExportCsv() {
    const header = activeColumns.map((c) => c.label)
    const dataRows = rows.map((r) => activeColumns.map((c) => c.value(r)))
    downloadCsv('custom-report.csv', toCsv([header, ...dataRows]))
  }

  function saveTemplate() {
    if (!templateName.trim()) return
    const next = [...templates.filter((t) => t.name !== templateName.trim()), { name: templateName.trim(), columns: selectedColumns, department, branchId, status }]
    setTemplates(next)
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // localStorage may be unavailable — the template just won't persist across sessions.
    }
    notify({ title: `Template "${templateName.trim()}" saved`, tone: 'success' })
    setTemplateName('')
  }

  function applyTemplate(t: SavedTemplate) {
    setSelectedColumns(t.columns)
    setDepartment(t.department)
    setBranchId(t.branchId)
    setStatus(t.status)
  }

  function deleteTemplate(name: string) {
    const next = templates.filter((t) => t.name !== name)
    setTemplates(next)
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // localStorage may be unavailable.
    }
  }

  return (
    <ReportViewShell
      title="Custom Report Builder"
      description="Choose columns and filters, save the combination as a template, then export."
      onExportCsv={onExportCsv}
    >
      {employeesLoading || payrollLoading ? (
        <Skeleton className="h-72" />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3 print:hidden">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Department</p>
              <Select value={department} onValueChange={setDepartment} options={departmentOptions} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Branch</p>
              <Select value={branchId} onValueChange={setBranchId} options={branchOptions} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Status</p>
              <Select
                value={status}
                onValueChange={setStatus}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
          </div>

          <div className="print:hidden">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Columns</p>
            <div className="flex flex-wrap gap-3">
              {COLUMNS.map((c) => (
                <label key={c.key} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm">
                  <Checkbox checked={selectedColumns.includes(c.key)} onCheckedChange={() => toggleColumn(c.key)} />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4 print:hidden">
            <div className="w-56">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Save current setup as template</p>
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name"
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button size="sm" variant="secondary" icon={<Save className="size-3.5" />} onClick={saveTemplate}>
              Save Template
            </Button>
            {templates.map((t) => (
              <Badge key={t.name} tone="neutral" className="cursor-pointer gap-1.5 py-1">
                <button type="button" onClick={() => applyTemplate(t)}>
                  {t.name}
                </button>
                <button type="button" onClick={() => deleteTemplate(t.name)} aria-label={`Delete template ${t.name}`}>
                  <Trash2 className="size-3" />
                </button>
              </Badge>
            ))}
          </div>

          {activeColumns.length === 0 ? (
            <EmptyState title="Select at least one column" />
          ) : rows.length === 0 ? (
            <EmptyState title="No employees match these filters" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {activeColumns.map((c) => (
                    <TableHead key={c.key}>{c.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.employee.id}>
                    {activeColumns.map((c) => (
                      <TableCell key={c.key} className={c.key === 'name' ? 'font-medium' : undefined}>
                        {c.value(r)}
                      </TableCell>
                    ))}
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

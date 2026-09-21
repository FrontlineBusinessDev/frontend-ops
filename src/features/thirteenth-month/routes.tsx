import { Calculator, Lock, PlayCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { ComputationDrawer } from '@/features/thirteenth-month/components/ComputationDrawer'
import { useThirteenthMonthLines, useThirteenthMonthRuns } from '@/features/thirteenth-month/hooks/useThirteenthMonth'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from '@/hooks/useSession'
import { monthlyEquivalentFor } from '@/lib/payroll/rateBasis'
import { finalizeThirteenthMonthRun, generateThirteenthMonthRun } from '@/lib/services/thirteenthMonthService'
import { formatCurrency } from '@/lib/utils/format'

const YEAR_OPTIONS = [2024, 2025, 2026, 2027].map((y) => ({ value: String(y), label: String(y) }))
const DEFAULT_YEAR = 2026

export function ThirteenthMonthPage() {
  const { user } = useSession()
  const { notify } = useToast()
  const { employees, isLoading: employeesLoading } = useEmployees()
  const { runs, isLoading: runsLoading, refetch: refetchRuns } = useThirteenthMonthRuns()
  const canManage = usePermission('thirteenth_month.manage')

  const [year, setYear] = useState(DEFAULT_YEAR)
  const [generationDate, setGenerationDate] = useState(`${DEFAULT_YEAR}-12-15`)
  const [payoutPeriodLabel, setPayoutPeriodLabel] = useState(`December ${DEFAULT_YEAR}`)
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)

  const runsForYear = useMemo(() => runs.filter((r) => r.year === year).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [runs, year])
  const activeRun = runsForYear.find((r) => r.id === selectedRunId) ?? runsForYear[0]
  const { lines, isLoading: linesLoading, refetch: refetchLines } = useThirteenthMonthLines(activeRun?.id)

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])
  const activeEmployees = employees.filter((e) => e.employment.status === 'active')

  const estimatedTotalPayout = activeRun
    ? lines.reduce((sum, l) => sum + l.thirteenthMonthPay, 0)
    : activeEmployees.reduce((sum, e) => sum + Math.round(monthlyEquivalentFor(e)), 0)

  async function handleGenerate() {
    setBusy(true)
    const { run } = await generateThirteenthMonthRun(user, { year, generationDate, payoutPeriodLabel })
    setBusy(false)
    setSelectedRunId(run.id)
    notify({ title: '13th Month Pay batch generated', description: `${employees.filter((e) => e.employment.status === 'active').length} employees included.`, tone: 'success' })
    refetchRuns()
    refetchLines()
  }

  async function handleFinalize() {
    if (!activeRun) return
    await finalizeThirteenthMonthRun(user, activeRun.id)
    notify({ title: '13th Month Pay finalized', description: `Will apply automatically to a payroll run labeled "${activeRun.payoutPeriodLabel}".`, tone: 'success' })
    refetchRuns()
  }

  return (
    <div className="space-y-5">
      <PageHeader title="13th Month Pay" description="Philippine-compliant 13th Month Pay batch generation, preview, and approval." />

      <Card className="flex flex-wrap items-end gap-4 p-5">
        <div className="w-32">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Year</p>
          <Select
            value={String(year)}
            onValueChange={(v) => {
              const y = Number(v)
              setYear(y)
              setGenerationDate(`${y}-12-15`)
              setPayoutPeriodLabel(`December ${y}`)
              setSelectedRunId(undefined)
            }}
            options={YEAR_OPTIONS}
          />
        </div>
        <div className="w-44">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Cutoff / Generation Date</p>
          <Input type="date" value={generationDate} onChange={(e) => setGenerationDate(e.target.value)} />
        </div>
        <div className="w-52">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Payout Payroll Period</p>
          <Input value={payoutPeriodLabel} onChange={(e) => setPayoutPeriodLabel(e.target.value)} placeholder="December 2026" />
        </div>
        {canManage && (
          <Button icon={<PlayCircle className="size-4" />} isLoading={busy} onClick={handleGenerate}>
            Generate 13th Month Pay
          </Button>
        )}
        {activeRun?.status === 'finalized' && <Badge tone="success">Finalized — will apply to "{activeRun.payoutPeriodLabel}"</Badge>}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Eligible Employees Count</p>
          <p className="mt-1 font-display text-xl font-semibold">{employeesLoading ? '—' : activeEmployees.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estimated Total Payout</p>
          <p className="mt-1 font-display text-xl font-semibold">{employeesLoading ? '—' : formatCurrency(estimatedTotalPayout)}</p>
        </Card>
      </div>

      {employeesLoading || runsLoading ? (
        <Skeleton className="h-72" />
      ) : !activeRun ? (
        <EmptyState
          title="No 13th Month Pay batch generated yet for this year"
          description={canManage ? 'Click "Generate 13th Month Pay" to compute the batch above.' : 'Waiting for a payroll admin to generate this batch.'}
        />
      ) : linesLoading ? (
        <Skeleton className="h-72" />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Batch generated {activeRun.generationDate} · <StatusBadge status={activeRun.status === 'draft' ? 'Ready' : 'Finalized'} />
            </p>
            {canManage && activeRun.status === 'draft' && (
              <Button size="sm" variant="destructive" icon={<Lock className="size-3.5" />} onClick={handleFinalize}>
                Finalize Batch
              </Button>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>Annual Basic Salary</TableHead>
                <TableHead>Applicable Period</TableHead>
                <TableHead>13th Month Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const employee = employeeById.get(line.employeeId)
                if (!employee) return null
                return (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">
                      {employee.personal.firstName} {employee.personal.lastName}
                    </TableCell>
                    <TableCell>{formatCurrency(line.annualBasicEarned)}</TableCell>
                    <TableCell className="text-muted-foreground">{line.monthsCredited === 12 ? `Jan – Dec ${activeRun.year}` : `${line.monthsCredited} mo. (prorated)`}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(line.thirteenthMonthPay)}</TableCell>
                    <TableCell>
                      <StatusBadge status={activeRun.status === 'draft' ? 'Ready' : 'Finalized'} />
                    </TableCell>
                    <TableCell className="text-right">
                      <ComputationDrawer
                        employee={employee}
                        line={line}
                        run={activeRun}
                        trigger={
                          <Button size="sm" variant="ghost" icon={<Calculator className="size-3.5" />}>
                            View Computation
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

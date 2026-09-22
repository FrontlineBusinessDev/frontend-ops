import { Eye, Hourglass, Timer, Wallet, X } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { OvertimeApplicationDialog } from '@/features/ess/components/OvertimeApplicationDialog'
import { ESS_ACCENTS, EssCardWatermark } from '@/features/ess/components/EssMetricCard'
import type { EssAccent } from '@/features/ess/components/EssMetricCard'
import { getOtRateById, usePayrollRatesStore } from '@/features/company-settings/payrollRatesStore'
import { useSelfEmployee } from '@/features/ess/hooks/useSelfEmployee'
import { useMyOtApplications, useOtApplicationStore } from '@/features/ess/otApplicationStore'
import type { OtApplication, OtApplicationType } from '@/features/ess/otApplicationStore'
import { formatCurrency, formatDate } from '@/lib/utils/format'

/** Fallback labels/multipliers for the demo's pre-seeded applications, filed under the old
 * hardcoded type ids before the Type dropdown started reading from Payroll Settings. Any type id
 * that matches a configured rate (`payrollRatesStore.ts`) takes precedence over these. */
const LEGACY_TYPE_LABEL: Record<string, string> = {
  overtime: 'OT',
  night_diff: 'Night Diff',
  overtime_night_diff: 'OT + Night Diff',
}

const LEGACY_MULTIPLIER: Record<string, number> = {
  overtime: 1.25,
  night_diff: 1.1,
  overtime_night_diff: 1.35,
}

function otTypeLabel(type: OtApplicationType): string {
  return getOtRateById(type)?.label ?? LEGACY_TYPE_LABEL[type] ?? type
}

function otTypeMultiplier(type: OtApplicationType): number {
  return getOtRateById(type)?.multiplier ?? LEGACY_MULTIPLIER[type] ?? 1.25
}

const OT_STATUS_TONE: Record<OtApplication['status'], 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

/** Soft-tinted KPI card matching the ESS dashboard's metric-card look — plain (no link), just a label/value/hint over a gradient + icon watermark. */
function KpiCard({ label, value, hint, icon: Icon, accent }: { label: string; value: string; hint?: string; icon: typeof Timer; accent: EssAccent }) {
  const a = ESS_ACCENTS[accent]
  return (
    <div
      className="relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-slate-100 bg-card p-5 shadow-sm dark:border-white/10"
      style={{ backgroundImage: a.gradient }}
    >
      <EssCardWatermark icon={Icon} className={a.watermark} />
      <p className="relative text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="relative font-display text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="relative text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function ApplicationDetailsDialog({ application, onOpenChange }: { application: OtApplication | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={!!application} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Application Details</DialogTitle>
        <DialogDescription>{application && `Filed ${formatDate(application.date)}`}</DialogDescription>
        {application && (
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Application Type</span>
              <Badge tone="brand">{otTypeLabel(application.type)}</Badge>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Date of Rendering</span>
              <span className="font-medium">{formatDate(application.date)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Shift / Time Window</span>
              <span className="font-medium">
                {application.startTime} – {application.endTime}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Total Hours</span>
              <span className="font-medium">{application.totalHours.toFixed(1)} hrs</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Status</span>
              <Badge tone={OT_STATUS_TONE[application.status]} className="capitalize">
                {application.status}
              </Badge>
            </div>
            {application.attachmentName && (
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Attachment</span>
                <span className="font-medium">{application.attachmentName}</span>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">Reason / Justification</p>
              <p className="mt-1 font-medium">{application.reason}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function EssOvertimePage() {
  const { employee, isLoading } = useSelfEmployee()
  const applications = useMyOtApplications(employee?.id ?? '')
  const cancelApplication = useOtApplicationStore((s) => s.cancelApplication)
  usePayrollRatesStore((s) => s.otRates) // re-render when Payroll Settings rates change
  const { notify } = useToast()
  const [viewing, setViewing] = useState<OtApplication | null>(null)

  if (isLoading) return <Skeleton className="h-72" />
  if (!employee) return <p className="text-sm text-muted-foreground">No employee record linked to this account.</p>

  const thisMonth = todayKey().slice(0, 7)
  const approvedThisMonth = applications.filter((a) => a.status === 'approved' && a.date.slice(0, 7) === thisMonth)
  const totalApprovedHours = approvedThisMonth.reduce((sum, a) => sum + a.totalHours, 0)
  const pendingCount = applications.filter((a) => a.status === 'pending').length

  const hourlyRate = (employee.compensation.basicPay > 0 ? employee.compensation.basicPay : 30000) / (22 * 8)
  const estimatedPay = applications
    .filter((a) => a.status !== 'rejected')
    .reduce((sum, a) => sum + a.totalHours * hourlyRate * otTypeMultiplier(a.type), 0)

  function handleCancel(application: OtApplication) {
    cancelApplication(application.id)
    notify({ title: 'Application withdrawn', description: 'Your pending request has been cancelled.' })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Overtime & Night Differential"
        description="Submit and track your overtime and night differential render requests."
        actions={<OvertimeApplicationDialog employeeId={employee.id} />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total OT Hours Approved"
          value={`${totalApprovedHours.toFixed(1)} hrs`}
          hint="This month"
          icon={Timer}
          accent="teal"
        />
        <KpiCard
          label="Pending Applications"
          value={`${pendingCount} ${pendingCount === 1 ? 'Request' : 'Requests'}`}
          hint="Awaiting manager approval"
          icon={Hourglass}
          accent="amber"
        />
        <KpiCard
          label="Estimated OT / Night Diff Pay"
          value={formatCurrency(estimatedPay)}
          hint="Pending + approved, this history"
          icon={Wallet}
          accent="indigo"
        />
      </div>

      <Card>
        <Card.Header>
          <div>
            <Card.Title>Application History</Card.Title>
            <Card.Description>All your overtime and night differential requests.</Card.Description>
          </div>
        </Card.Header>
        <Card.Body className="pt-2">
          {applications.length === 0 ? (
            <EmptyState title="No applications yet" description="File your first OT / Night Diff request using the button above." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Rendered / Applied</TableHead>
                  <TableHead>Application Type</TableHead>
                  <TableHead>Shift / Time Window</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>{formatDate(app.date)}</TableCell>
                    <TableCell>
                      <Badge tone="brand">{otTypeLabel(app.type)}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {app.startTime} – {app.endTime}
                    </TableCell>
                    <TableCell>{app.totalHours.toFixed(1)} hrs</TableCell>
                    <TableCell className="max-w-xs truncate" title={app.reason}>
                      {app.reason}
                    </TableCell>
                    <TableCell>
                      <Badge tone={OT_STATUS_TONE[app.status]} className="capitalize">
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" icon={<Eye className="size-3.5" />} onClick={() => setViewing(app)}>
                          View
                        </Button>
                        {app.status === 'pending' && (
                          <Button size="sm" variant="secondary" icon={<X className="size-3.5" />} onClick={() => handleCancel(app)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <ApplicationDetailsDialog application={viewing} onOpenChange={(open) => !open && setViewing(null)} />
    </div>
  )
}

import { ArrowLeft, Archive, FileText, Pencil, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { CompensationHistoryTable } from '@/features/employees/components/CompensationHistoryTable'
import { EditBankInfoForm } from '@/features/employees/components/edit/EditBankInfoForm'
import { EditBenefitsForm } from '@/features/employees/components/edit/EditBenefitsForm'
import { EditCompensationForm } from '@/features/employees/components/edit/EditCompensationForm'
import { EditEmploymentInfoForm } from '@/features/employees/components/edit/EditEmploymentInfoForm'
import { EditGovernmentInfoForm } from '@/features/employees/components/edit/EditGovernmentInfoForm'
import { EditPersonalInfoForm } from '@/features/employees/components/edit/EditPersonalInfoForm'
import { useEmployee } from '@/features/employees/hooks/useEmployee'
import { usePayrollGroups } from '@/features/company-settings/hooks/usePayrollGroups'
import { usePermission } from '@/hooks/usePermission'
import { useTenant } from '@/hooks/useTenant'
import { updateEmployeeStatus } from '@/lib/services/employeeService'
import { useSession } from '@/hooks/useSession'
import { categoryLabel, findEmployeePayrollGroup } from '@/lib/payroll/groupAssignment'
import { PAY_RATE_TYPE_LABEL, estimatedEquivalentFor, formatBaseRate, rateFieldLabel } from '@/lib/payroll/payRate'
import { setEmployeePayrollGroup } from '@/lib/services/payrollSettingsService'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { EmploymentStatus } from '@/types/domain'

const FREQUENCY_LABEL: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  semi_monthly: 'Semi-monthly',
  monthly: 'Monthly',
  custom: 'Custom',
}

function Field({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value?.trim() ? value : '—'}</p>
    </div>
  )
}

type EditableSection = 'personal' | 'employment' | 'compensation' | 'benefits' | 'government' | 'bank'

function SectionEditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />} onClick={onClick}>
      Edit Information
    </Button>
  )
}

export function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { employee, isLoading, refetch } = useEmployee(id)
  const { branches } = useTenant()
  const { groups, compensationTypes, refetch: refetchPayrollGroups } = usePayrollGroups()
  const { user } = useSession()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [statusDialog, setStatusDialog] = useState<EmploymentStatus | null>(null)
  const [editingSection, setEditingSection] = useState<EditableSection | null>(null)
  const [pendingGroupId, setPendingGroupId] = useState<string | null | undefined>(undefined)
  const canEditProfile = usePermission('employees.edit')
  const canEditCompensation = usePermission('employees.compensation.edit')

  function stopEditing() {
    setEditingSection(null)
    refetch()
  }

  if (isLoading) return <Skeleton className="h-96" />
  if (!employee) {
    return (
      <EmptyState
        title="Employee not found"
        description="It may have been removed, or belongs to a different company."
        action={
          <Button size="sm" variant="secondary" onClick={() => navigate('/employees')}>
            Back to employee list
          </Button>
        }
      />
    )
  }

  const fullName = `${employee.personal.firstName} ${employee.personal.lastName}`
  const branch = branches.find((b) => b.id === employee.branchId)
  const currentGroup = findEmployeePayrollGroup(groups, employee.id)
  const compensationType = compensationTypes.find((c) => c.id === currentGroup?.compensationTypeId)
  const pendingGroup = pendingGroupId ? groups.find((g) => g.id === pendingGroupId) : undefined

  async function applyStatusChange() {
    if (!statusDialog || !employee) return
    await updateEmployeeStatus(user, employee.id, statusDialog)
    notify({ title: `Employee ${statusDialog}`, tone: 'success' })
    setStatusDialog(null)
    refetch()
  }

  async function applyGroupChange() {
    if (pendingGroupId === undefined || !employee) return
    await setEmployeePayrollGroup(user, employee.id, pendingGroupId)
    notify({ title: pendingGroupId ? `Reassigned to ${pendingGroup?.name}` : 'Removed from Payroll Group', tone: 'success' })
    setPendingGroupId(undefined)
    refetchPayrollGroups()
  }

  return (
    <div className="space-y-5">
      <Link to="/employees" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Back to employees
      </Link>

      <PageHeader
        title={fullName}
        description={`${employee.employment.position} · ${employee.employment.department} · ${branch?.name ?? ''}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={employee.employment.status} />
            {employee.employment.status === 'active' && (
              <Button size="sm" variant="secondary" onClick={() => setStatusDialog('inactive')}>
                Deactivate
              </Button>
            )}
            {employee.employment.status !== 'archived' && (
              <Button size="sm" variant="destructive" icon={<Archive className="size-4" />} onClick={() => setStatusDialog('archived')}>
                Archive
              </Button>
            )}
            {employee.employment.status !== 'active' && (
              <Button size="sm" onClick={() => setStatusDialog('active')}>
                Reactivate
              </Button>
            )}
          </div>
        }
      />

      <Card className="flex items-center gap-4 p-5">
        <Avatar name={fullName} size="lg" />
        <div>
          <p className="font-display text-base font-semibold tracking-tight">{fullName}</p>
          <p className="text-sm text-muted-foreground">
            {employee.employeeNumber} &middot; Hired {formatDate(employee.employment.dateHired)}
          </p>
        </div>
      </Card>

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">Personal Information</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="compensation">Compensation</TabsTrigger>
          <TabsTrigger value="payroll">Payroll Information</TabsTrigger>
          <TabsTrigger value="benefits">Benefits</TabsTrigger>
          <TabsTrigger value="government">Government Information</TabsTrigger>
          <TabsTrigger value="bank">Bank/Payment</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <Card.Title>Personal Information</Card.Title>
              {canEditProfile && editingSection !== 'personal' && (
                <SectionEditButton onClick={() => setEditingSection('personal')} />
              )}
            </div>
            {editingSection === 'personal' ? (
              <EditPersonalInfoForm employee={employee} onSaved={stopEditing} onCancel={() => setEditingSection(null)} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:grid-cols-3">
                <Field label="First name" value={employee.personal.firstName} />
                <Field label="Last name" value={employee.personal.lastName} />
                <Field label="Birth date" value={formatDate(employee.personal.birthDate)} />
                <Field label="Civil status" value={employee.personal.civilStatus} />
                <Field label="Contact number" value={employee.personal.contactNumber} />
                <Field label="Personal email" value={employee.personal.personalEmail} />
                <Field label="Address" value={employee.personal.address} />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="employment">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <Card.Title>Employment</Card.Title>
              {canEditProfile && editingSection !== 'employment' && (
                <SectionEditButton onClick={() => setEditingSection('employment')} />
              )}
            </div>
            {editingSection === 'employment' ? (
              <EditEmploymentInfoForm employee={employee} onSaved={stopEditing} onCancel={() => setEditingSection(null)} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:grid-cols-3">
                <Field label="Position" value={employee.employment.position} />
                <Field label="Department" value={employee.employment.department} />
                <Field label="Branch" value={branch?.name} />
                <Field label="Employment type" value={employee.employment.employmentType.replace('_', ' ')} />
                <Field label="Date hired" value={formatDate(employee.employment.dateHired)} />
                <Field label="Status" value={employee.employment.status} />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="compensation" className="space-y-5">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <Card.Title>Current Compensation</Card.Title>
              {canEditCompensation && editingSection !== 'compensation' && (
                <SectionEditButton onClick={() => setEditingSection('compensation')} />
              )}
            </div>
            {editingSection === 'compensation' ? (
              <EditCompensationForm employee={employee} onSaved={stopEditing} onCancel={() => setEditingSection(null)} />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:grid-cols-3">
                  <Field label="Pay Rate Type" value={PAY_RATE_TYPE_LABEL[employee.compensation.payType]} />
                  <Field
                    label={rateFieldLabel(employee.compensation.payType)}
                    value={formatBaseRate(employee.compensation.payType, employee.compensation.basicPay, employee.compensation.outputUnit)}
                  />
                  {employee.compensation.payType === 'output_based' && (
                    <Field label="Output Unit" value={employee.compensation.outputUnit ?? undefined} />
                  )}
                </div>
                {(() => {
                  const estimate = estimatedEquivalentFor(employee.compensation.payType, employee.compensation.basicPay)
                  return estimate ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Estimated, not the actual payroll rate — {estimate.label.toLowerCase()}: {formatCurrency(estimate.value)}
                    </p>
                  ) : null
                })()}
                {employee.compensation.allowances.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Allowances</p>
                    <div className="flex flex-wrap gap-2">
                      {employee.compensation.allowances.map((a) => (
                        <Badge key={a.label} tone="brand">
                          {a.label}: {formatCurrency(a.amount)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>

          <Card className="p-5">
            <Card.Title>Compensation History</Card.Title>
            <Card.Description>Salary changes over time, with the reason and who approved each one.</Card.Description>
            <div className="mt-4">
              <CompensationHistoryTable entries={employee.compensationHistory} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="payroll">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <Card.Title>Payroll Information</Card.Title>
              <Badge tone="neutral">Managed via Payroll Settings</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payroll Group</p>
                {canEditProfile ? (
                  <Select
                    value={currentGroup?.id ?? 'unassigned'}
                    onValueChange={(v) => setPendingGroupId(v === 'unassigned' ? null : v)}
                    options={[
                      { value: 'unassigned', label: 'Unassigned' },
                      ...groups.filter((g) => g.status === 'active').map((g) => ({ value: g.id, label: g.name })),
                    ]}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm font-medium text-foreground">{currentGroup?.name ?? 'Unassigned'}</p>
                )}
              </div>
              <Field label="Compensation Type" value={compensationType?.name ?? PAY_RATE_TYPE_LABEL[employee.compensation.payType]} />
              <Field label="Payroll Frequency" value={currentGroup ? FREQUENCY_LABEL[currentGroup.frequency] : '—'} />
              <Field label="Pay Rate Type" value={PAY_RATE_TYPE_LABEL[employee.compensation.payType]} />
              <Field
                label={rateFieldLabel(employee.compensation.payType)}
                value={formatBaseRate(employee.compensation.payType, employee.compensation.basicPay, employee.compensation.outputUnit)}
              />
              {employee.compensation.payType === 'output_based' && (
                <Field label="Output Unit" value={employee.compensation.outputUnit ?? undefined} />
              )}
              <Field label="Branch" value={branch?.name} />
              <Field label="Employee Category" value={categoryLabel(employee.employment.category)} />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Position and category only suggest which Payroll Group fits best — they never restrict assignment. Manage
              members in bulk from Company &amp; Payroll Settings &rarr; Payroll Groups.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="benefits">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <Card.Title>Benefits</Card.Title>
              {canEditProfile && editingSection !== 'benefits' && (
                <SectionEditButton onClick={() => setEditingSection('benefits')} />
              )}
            </div>
            {editingSection === 'benefits' ? (
              <EditBenefitsForm employee={employee} onSaved={stopEditing} onCancel={() => setEditingSection(null)} />
            ) : (
              <div>
                <Field label="HMO plan" value={employee.benefits.hmoPlan} />
                <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Leave credits</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(employee.benefits.leaveCreditsByType).map(([type, credits]) => (
                    <Badge key={type} tone="neutral">
                      {type}: {credits} days
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="government">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <Card.Title>Government Information</Card.Title>
              {canEditProfile && editingSection !== 'government' && (
                <SectionEditButton onClick={() => setEditingSection('government')} />
              )}
            </div>
            {editingSection === 'government' ? (
              <EditGovernmentInfoForm employee={employee} onSaved={stopEditing} onCancel={() => setEditingSection(null)} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:grid-cols-3">
                <Field label="SSS No." value={employee.government.sssNo} />
                <Field label="PhilHealth No." value={employee.government.philhealthNo} />
                <Field label="Pag-IBIG No." value={employee.government.pagibigNo} />
                <Field label="TIN" value={employee.government.tinNo} />
                <Field
                  label="Pag-IBIG Employee Contribution (PHP)"
                  value={
                    employee.government.pagibigEmployeeContribution
                      ? `${formatCurrency(employee.government.pagibigEmployeeContribution)} (custom)`
                      : 'Company default'
                  }
                />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="bank">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <Card.Title>Bank/Payment</Card.Title>
              {canEditProfile && editingSection !== 'bank' && (
                <SectionEditButton onClick={() => setEditingSection('bank')} />
              )}
            </div>
            {editingSection === 'bank' ? (
              <EditBankInfoForm employee={employee} onSaved={stopEditing} onCancel={() => setEditingSection(null)} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:grid-cols-3">
                <Field label="Bank name" value={employee.bank.bankName} />
                <Field label="Account number" value={employee.bank.accountNumber} />
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          {employee.documents.length === 0 ? (
            <EmptyState icon={FileText} title="No documents uploaded" />
          ) : (
            <div className="space-y-2">
              {employee.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <FileText className="size-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{doc.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Uploaded {formatDate(doc.uploadedAt)}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-3">
            {employee.history
              .slice()
              .reverse()
              .map((entry) => (
                <div key={entry.id} className="flex gap-3 border-l-2 border-border pl-4">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{entry.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.actor} &middot; {formatDate(entry.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={statusDialog !== null} onOpenChange={(open) => !open && setStatusDialog(null)}>
        <DialogContent>
          <DialogTitle className="capitalize">{statusDialog} {fullName}?</DialogTitle>
          <DialogDescription>
            {statusDialog === 'archived'
              ? 'Archived employees are removed from active lists but their record and history are kept.'
              : statusDialog === 'active'
                ? 'This restores the employee to the active roster.'
                : 'Deactivated employees keep their record but are excluded from active payroll runs.'}
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStatusDialog(null)}>
              Cancel
            </Button>
            <Button variant={statusDialog === 'archived' ? 'destructive' : 'primary'} onClick={applyStatusChange}>
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingGroupId !== undefined} onOpenChange={(open) => !open && setPendingGroupId(undefined)}>
        <DialogContent>
          <DialogTitle>{pendingGroupId ? `Reassign to ${pendingGroup?.name}?` : 'Remove from Payroll Group?'}</DialogTitle>
          <DialogDescription>
            {currentGroup
              ? `This employee is currently assigned to ${currentGroup.name}. ${
                  pendingGroupId ? `Reassign to ${pendingGroup?.name}?` : 'Unassign them from it?'
                }`
              : `Assign ${fullName} to ${pendingGroup?.name}?`}
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPendingGroupId(undefined)}>
              Cancel
            </Button>
            <Button onClick={applyGroupChange}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

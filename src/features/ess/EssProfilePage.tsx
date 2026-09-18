import { zodResolver } from '@hookform/resolvers/zod'
import { FileText, Lock, ShieldCheck } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input, Textarea } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { CompensationHistoryTable } from '@/features/employees/components/CompensationHistoryTable'
import { useSelfEmployee } from '@/features/ess/hooks/useSelfEmployee'
import { useSession } from '@/hooks/useSession'
import { useTenant } from '@/hooks/useTenant'
import { updateEmployeeSelf } from '@/lib/services/employeeService'
import { formatCurrency, formatDate } from '@/lib/utils/format'

const schema = z.object({
  contactNumber: z.string().min(1, 'Required'),
  personalEmail: z.string().email().optional().or(z.literal('')),
  address: z.string().min(1, 'Required'),
})

type FormValues = z.infer<typeof schema>

/** Plain key-value display — used everywhere the employee can view but not edit a value. */
function Field({ label, value, className }: { label: string; value: string | undefined; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value?.trim() ? value : '—'}</p>
    </div>
  )
}

function ViewOnlyBadge() {
  return (
    <Badge tone="neutral" className="gap-1">
      <Lock className="size-3" />
      View Only
    </Badge>
  )
}

export function EssProfilePage() {
  const { employee, isLoading, refetch } = useSelfEmployee()
  const { user } = useSession()
  const { branches } = useTenant()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (employee) {
      reset({
        contactNumber: employee.personal.contactNumber,
        personalEmail: employee.personal.personalEmail ?? '',
        address: employee.personal.address,
      })
    }
  }, [employee, reset])

  if (isLoading) return <Skeleton className="h-96" />
  if (!employee) return <p className="text-sm text-muted-foreground">No employee record linked to this account.</p>

  async function onSubmit(values: FormValues) {
    await updateEmployeeSelf(user, values)
    notify({ title: 'Profile updated', tone: 'success' })
    refetch()
  }

  const branch = branches.find((b) => b.id === employee.branchId)

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Profile"
        description="Mirrors the full profile HR sees for you — only Personal Information is yours to edit."
      />

      <Card className="flex items-center gap-4 p-5">
        <Avatar name={`${employee.personal.firstName} ${employee.personal.lastName}`} size="lg" />
        <div>
          <p className="font-display text-base font-semibold tracking-tight">
            {employee.personal.firstName} {employee.personal.lastName}
          </p>
          <p className="text-sm text-muted-foreground">
            {employee.employeeNumber} &middot; {employee.employment.position} &middot; Hired {formatDate(employee.employment.dateHired)}
          </p>
        </div>
      </Card>

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">Personal Information</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="compensation">Compensation</TabsTrigger>
          <TabsTrigger value="benefits">Benefits</TabsTrigger>
          <TabsTrigger value="government">Government Information</TabsTrigger>
          <TabsTrigger value="bank">Bank/Payment</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Personal Information — the only editable tab. Contact number, personal email, and
            address are live form fields; the rest of this employee's identity is HR-owned and stays disabled. */}
        <TabsContent value="personal">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <Card.Title>Personal Information</Card.Title>
              <Badge tone="brand">Editable</Badge>
            </div>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              <Field label="First name" value={employee.personal.firstName} />
              <Field label="Last name" value={employee.personal.lastName} />
              <Field label="Birth date" value={formatDate(employee.personal.birthDate)} />
              <Field label="Civil status" value={employee.personal.civilStatus} />
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-3">
              <FormField label="Contact number" required error={errors.contactNumber?.message}>
                <Input {...register('contactNumber')} />
              </FormField>
              <FormField label="Personal email" error={errors.personalEmail?.message}>
                <Input type="email" {...register('personalEmail')} />
              </FormField>
              <FormField label="Address" required error={errors.address?.message} className="col-span-2 sm:col-span-3">
                <Textarea {...register('address')} />
              </FormField>

              <div className="col-span-2 flex justify-end sm:col-span-3">
                <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!isDirty}>
                  Save Changes
                </Button>
              </div>
            </form>
            <p className="mt-4 text-xs text-muted-foreground">
              Only contact number, personal email, and address can be self-updated. Everything else on this profile is
              maintained by HR.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="employment">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <Card.Title>Employment</Card.Title>
              <ViewOnlyBadge />
            </div>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              <Field label="Position" value={employee.employment.position} />
              <Field label="Department" value={employee.employment.department} />
              <Field label="Branch" value={branch?.name} />
              <Field label="Employment type" value={employee.employment.employmentType.replace('_', ' ')} />
              <Field label="Date hired" value={formatDate(employee.employment.dateHired)} />
              <Field label="Status" value={employee.employment.status} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="compensation" className="space-y-5">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <Card.Title>Current Compensation</Card.Title>
              <ViewOnlyBadge />
            </div>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              <Field label="Basic pay" value={formatCurrency(employee.compensation.basicPay)} />
              <Field label="Pay frequency" value={employee.compensation.payType} />
            </div>
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
          </Card>

          <Card className="p-5">
            <Card.Title>Compensation History</Card.Title>
            <Card.Description>Salary changes over time, with the reason and who approved each one.</Card.Description>
            <div className="mt-4">
              <CompensationHistoryTable entries={employee.compensationHistory} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="benefits">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <Card.Title>Benefits</Card.Title>
              <ViewOnlyBadge />
            </div>
            <Field label="HMO plan" value={employee.benefits.hmoPlan} className="sm:max-w-xs" />
            <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Leave credits</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(employee.benefits.leaveCreditsByType).map(([type, credits]) => (
                <Badge key={type} tone="neutral">
                  {type}: {credits} days
                </Badge>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="government">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <Card.Title>Government Information</Card.Title>
              <ViewOnlyBadge />
            </div>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
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
          </Card>
        </TabsContent>

        <TabsContent value="bank">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <Card.Title>Bank/Payment</Card.Title>
              <ViewOnlyBadge />
            </div>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              <Field label="Bank name" value={employee.bank.bankName} />
              <Field label="Account number" value={employee.bank.accountNumber} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          {employee.documents.length === 0 ? (
            <EmptyState icon={FileText} title="No documents uploaded" description="HR will upload documents to your profile as needed." />
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
          {employee.history.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No history yet" />
          ) : (
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

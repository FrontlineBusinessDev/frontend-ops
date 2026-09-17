import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarPlus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { useSelfEmployee } from '@/features/ess/hooks/useSelfEmployee'
import { useLeaveRequests, useLeaveTypes } from '@/features/leave/hooks/useLeave'
import { useSession } from '@/hooks/useSession'
import { submitLeaveRequest } from '@/lib/services/leaveService'
import { formatDate } from '@/lib/utils/format'

const schema = z.object({
  leaveTypeId: z.string().min(1, 'Select a leave type'),
  dateFrom: z.string().min(1, 'Required'),
  dateTo: z.string().min(1, 'Required'),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function RequestLeaveDialog({ employeeId, onCreated }: { employeeId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()
  const leaveTypes = useLeaveTypes()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    await submitLeaveRequest(user, { ...values, employeeId })
    notify({ title: 'Leave request submitted', description: 'Your manager will review it shortly.', tone: 'success' })
    reset()
    setOpen(false)
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button icon={<CalendarPlus className="size-4" />}>Request Leave</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Request Leave</DialogTitle>
        <DialogDescription>Submit a leave request for your manager to approve.</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Leave type" required error={errors.leaveTypeId?.message} className="col-span-2">
            <Controller
              control={control}
              name="leaveTypeId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select leave type"
                  options={leaveTypes.map((lt) => ({ value: lt.id, label: lt.name }))}
                />
              )}
            />
          </FormField>
          <FormField label="From" required error={errors.dateFrom?.message}>
            <Input type="date" {...register('dateFrom')} />
          </FormField>
          <FormField label="To" required error={errors.dateTo?.message}>
            <Input type="date" {...register('dateTo')} />
          </FormField>
          <FormField label="Reason" className="col-span-2">
            <Textarea {...register('reason')} placeholder="Optional context for your manager." />
          </FormField>

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EssLeavePage() {
  const { employee, isLoading: isLoadingEmployee } = useSelfEmployee()
  const { requests, isLoading: isLoadingRequests, refetch } = useLeaveRequests()
  const leaveTypes = useLeaveTypes()

  if (isLoadingEmployee || isLoadingRequests) return <Skeleton className="h-72" />
  if (!employee) return <p className="text-sm text-muted-foreground">No employee record linked to this account.</p>

  const myRequests = requests.filter((r) => r.employeeId === employee.id)
  const leaveTypeById = new Map(leaveTypes.map((lt) => [lt.id, lt]))

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Leave"
        description="Your leave balance and request history."
        actions={<RequestLeaveDialog employeeId={employee.id} onCreated={refetch} />}
      />

      <Card className="p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Leave Balance</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(employee.benefits.leaveCreditsByType).map(([type, credits]) => (
            <Badge key={type} tone="brand">
              {type}: {credits} days
            </Badge>
          ))}
        </div>
      </Card>

      {myRequests.length === 0 ? (
        <EmptyState title="No leave requests yet" description="File a request above to see it here." />
      ) : (
        <div className="space-y-3">
          {myRequests.map((request) => (
            <Card key={request.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{leaveTypeById.get(request.leaveTypeId)?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(request.dateFrom)} &ndash; {formatDate(request.dateTo)}
                  </p>
                  {request.reason && <p className="mt-2 text-sm text-foreground">{request.reason}</p>}
                </div>
                <StatusBadge status={request.status} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

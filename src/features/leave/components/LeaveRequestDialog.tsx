import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarPlus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { submitLeaveRequest } from '@/lib/services/leaveService'
import type { Employee, LeaveType } from '@/types/domain'

const schema = z.object({
  employeeId: z.string().min(1, 'Select an employee'),
  leaveTypeId: z.string().min(1, 'Select a leave type'),
  dateFrom: z.string().min(1, 'Required'),
  dateTo: z.string().min(1, 'Required'),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function LeaveRequestDialog({
  employees,
  leaveTypes,
  onCreated,
}: {
  employees: Employee[]
  leaveTypes: LeaveType[]
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    await submitLeaveRequest(user, values)
    notify({ title: 'Leave request submitted', tone: 'success' })
    reset()
    setOpen(false)
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button icon={<CalendarPlus className="size-4" />}>File Leave Request</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>File Leave Request</DialogTitle>
        <DialogDescription>Submit a leave request on behalf of an employee for manager approval.</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Employee" required error={errors.employeeId?.message} className="col-span-2">
            <Controller
              control={control}
              name="employeeId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select employee"
                  options={employees.map((e) => ({ value: e.id, label: `${e.personal.firstName} ${e.personal.lastName}` }))}
                />
              )}
            />
          </FormField>
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
            <Textarea {...register('reason')} placeholder="Optional context for the approver." />
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

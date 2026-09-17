import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input, Textarea } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { createAttendanceAdjustment } from '@/lib/services/attendanceService'
import type { AttendanceRecord } from '@/types/domain'

const schema = z.object({
  requestedTimeIn: z.string().min(1, 'Required'),
  requestedTimeOut: z.string().min(1, 'Required'),
  reason: z.string().min(10, 'Give a bit more detail (10+ characters)'),
})

type FormValues = z.infer<typeof schema>

export function AdjustmentRequestDialog({
  record,
  employeeName,
  onOpenChange,
  onCreated,
}: {
  record: AttendanceRecord | null
  employeeName: string
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const { user } = useSession()
  const { notify } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: record
      ? { requestedTimeIn: record.timeIn ?? '09:00', requestedTimeOut: record.timeOut ?? '18:00', reason: '' }
      : undefined,
  })

  async function onSubmit(values: FormValues) {
    if (!record) return
    setSubmitting(true)
    await createAttendanceAdjustment(user, { attendanceRecordId: record.id, ...values })
    setSubmitting(false)
    notify({ title: 'Adjustment requested', description: 'Sent for manager approval.', tone: 'success' })
    reset()
    onOpenChange(false)
    onCreated()
  }

  return (
    <Dialog open={record !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Request Attendance Adjustment</DialogTitle>
        <DialogDescription>
          {employeeName} &middot; {record?.date}
        </DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Corrected time in" required error={errors.requestedTimeIn?.message}>
            <Input type="time" {...register('requestedTimeIn')} />
          </FormField>
          <FormField label="Corrected time out" required error={errors.requestedTimeOut?.message}>
            <Input type="time" {...register('requestedTimeOut')} />
          </FormField>
          <FormField label="Reason" required error={errors.reason?.message} className="col-span-2">
            <Textarea {...register('reason')} placeholder="Explain what happened and why the record needs correcting." />
          </FormField>

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

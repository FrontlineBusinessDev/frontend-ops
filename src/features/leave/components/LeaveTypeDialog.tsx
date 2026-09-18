import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input, Textarea } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { HIERARCHY_LABEL, HIERARCHY_LEVELS } from '@/features/leave/hierarchyUtil'
import { useSession } from '@/hooks/useSession'
import { createLeaveType, updateLeaveType, type LeaveTypeInput } from '@/lib/services/leaveService'
import type { LeaveType } from '@/types/domain'

function toFormValues(leaveType?: LeaveType): LeaveTypeInput {
  return {
    name: leaveType?.name ?? '',
    defaultCredits: leaveType?.defaultCredits ?? 0,
    description: leaveType?.description ?? '',
    isPaid: leaveType?.isPaid ?? true,
    maxCarryOver: leaveType?.maxCarryOver ?? 0,
    tierCredits: leaveType?.tierCredits ?? { executive: 0, managerial: 0, rank_and_file: 0 },
  }
}

function LeaveTypeForm({
  leaveType,
  onSaved,
  onCancel,
}: {
  leaveType?: LeaveType
  onSaved: () => void
  onCancel: () => void
}) {
  const { user } = useSession()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LeaveTypeInput>({ defaultValues: toFormValues(leaveType) })

  async function onSubmit(values: LeaveTypeInput) {
    if (leaveType) {
      await updateLeaveType(user, leaveType.id, values)
      notify({ title: 'Leave type updated', tone: 'success' })
    } else {
      await createLeaveType(user, values)
      notify({ title: 'Leave type added', tone: 'success' })
    }
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
      <FormField label="Leave name" required error={errors.name?.message}>
        <Input {...register('name', { required: 'Required' })} placeholder="e.g. Bereavement Leave" />
      </FormField>

      <FormField label="Description / Policy notes">
        <Textarea {...register('description')} placeholder="What this leave type covers and any conditions." />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Default credits (days)" required error={errors.defaultCredits?.message}>
          <Input type="number" step="1" {...register('defaultCredits', { valueAsNumber: true, min: 0 })} />
        </FormField>
        <FormField label="Max carried-over credits" hint="0 = no carry-over allowed">
          <Input type="number" step="1" {...register('maxCarryOver', { valueAsNumber: true, min: 0 })} />
        </FormField>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Controller
          control={control}
          name="isPaid"
          render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
        />
        Paid leave
      </label>

      <div>
        <p className="text-xs font-semibold tracking-tight">Annual credits per hierarchy tier</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Used on the Leave Types &amp; Credits summary and future accrual rules.</p>
        <div className="mt-2 grid grid-cols-3 gap-3">
          {HIERARCHY_LEVELS.map((level) => (
            <FormField key={level} label={HIERARCHY_LABEL[level]}>
              <Input type="number" step="1" {...register(`tierCredits.${level}`, { valueAsNumber: true, min: 0 })} />
            </FormField>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {leaveType ? 'Save Changes' : 'Add Leave Type'}
        </Button>
      </div>
    </form>
  )
}

export function LeaveTypeDialog({
  leaveType,
  onSaved,
  trigger,
}: {
  leaveType?: LeaveType
  onSaved: () => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button icon={<Plus className="size-4" />}>Add Leave Type</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{leaveType ? `Edit ${leaveType.name}` : 'Add Leave Type'}</DialogTitle>
        <DialogDescription>
          {leaveType ? 'Update the policy and tiered credit allowances for this leave type.' : 'Define a new company leave type and its tiered credit allowances.'}
        </DialogDescription>
        <LeaveTypeForm
          leaveType={leaveType}
          onCancel={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            onSaved()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

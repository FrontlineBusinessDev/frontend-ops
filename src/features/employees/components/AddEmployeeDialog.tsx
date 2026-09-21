import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useSession } from '@/hooks/useSession'
import { useTenant } from '@/hooks/useTenant'
import { createEmployee } from '@/lib/services/employeeService'
import {
  OUTPUT_UNIT_OPTIONS,
  PAY_RATE_TYPE_OPTIONS,
  estimatedEquivalentFor,
  helperTextFor,
  rateFieldLabel,
} from '@/lib/payroll/payRate'
import { formatCurrency } from '@/lib/utils/format'
import { useToast } from '@/components/ui/Toast'

const schema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    department: z.string().min(1, 'Department is required'),
    position: z.string().min(1, 'Position is required'),
    branchId: z.string().min(1, 'Branch is required'),
    employmentType: z.enum(['regular', 'probationary', 'contractual', 'part_time']),
    dateHired: z.string().min(1, 'Date hired is required'),
    payType: z.enum(['monthly', 'semi_monthly', 'daily', 'hourly', 'output_based']),
    basicPay: z.number().positive('Rate amount must be greater than 0'),
    outputUnit: z.string().optional(),
  })
  .refine((v) => v.payType !== 'output_based' || Boolean(v.outputUnit), {
    message: 'Output unit is required for Output-Based / Piece-Rate',
    path: ['outputUnit'],
  })

type FormValues = z.infer<typeof schema>

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'regular', label: 'Regular' },
  { value: 'probationary', label: 'Probationary' },
  { value: 'contractual', label: 'Contractual' },
  { value: 'part_time', label: 'Part-time' },
]

const OUTPUT_UNIT_SELECT_OPTIONS = OUTPUT_UNIT_OPTIONS.map((u) => ({ value: u, label: u }))

export function AddEmployeeDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const { branches } = useTenant()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { employmentType: 'regular', branchId: branches[0]?.id ?? '', payType: 'monthly' },
  })

  const payType = watch('payType')
  const basicPay = watch('basicPay')
  const estimatedEquivalent = payType && basicPay > 0 ? estimatedEquivalentFor(payType, basicPay) : null

  async function onSubmit(values: FormValues) {
    await createEmployee(user, { ...values, outputUnit: values.payType === 'output_based' ? values.outputUnit : null })
    notify({ title: 'Employee added', description: `${values.firstName} ${values.lastName} was added to the roster.`, tone: 'success' })
    reset()
    setOpen(false)
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button icon={<Plus className="size-4" />}>Add Employee</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogTitle>Add Employee</DialogTitle>
        <DialogDescription>
          Capture the essentials now &mdash; the full profile (compensation, government IDs, bank details) can be
          completed from the employee&apos;s profile afterward.
        </DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="First name" required error={errors.firstName?.message}>
            <Input {...register('firstName')} placeholder="Juan" />
          </FormField>
          <FormField label="Last name" required error={errors.lastName?.message}>
            <Input {...register('lastName')} placeholder="Dela Cruz" />
          </FormField>
          <FormField label="Department" required error={errors.department?.message}>
            <Input {...register('department')} placeholder="Operations" />
          </FormField>
          <FormField label="Position" required error={errors.position?.message}>
            <Input {...register('position')} placeholder="Associate" />
          </FormField>
          <FormField label="Branch" required error={errors.branchId?.message}>
            <Controller
              control={control}
              name="branchId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                />
              )}
            />
          </FormField>
          <FormField label="Employment type" required error={errors.employmentType?.message}>
            <Controller
              control={control}
              name="employmentType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} options={EMPLOYMENT_TYPE_OPTIONS} />
              )}
            />
          </FormField>
          <FormField label="Date hired" required error={errors.dateHired?.message}>
            <Input type="date" {...register('dateHired')} />
          </FormField>
          <FormField label="Pay Rate Type" required error={errors.payType?.message}>
            <Controller
              control={control}
              name="payType"
              render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={PAY_RATE_TYPE_OPTIONS} />}
            />
          </FormField>
          <FormField
            label={rateFieldLabel(payType)}
            required
            error={errors.basicPay?.message}
            hint={helperTextFor(payType)}
          >
            <Input type="number" step="0.01" {...register('basicPay', { valueAsNumber: true })} placeholder="25000" />
          </FormField>
          {payType === 'output_based' && (
            <FormField label="Output Unit" required error={errors.outputUnit?.message} className="col-span-2">
              <Controller
                control={control}
                name="outputUnit"
                render={({ field }) => <Select value={field.value ?? ''} onValueChange={field.onChange} options={OUTPUT_UNIT_SELECT_OPTIONS} placeholder="Select unit…" />}
              />
            </FormField>
          )}
          {estimatedEquivalent && (
            <p className="col-span-2 -mt-1 text-xs text-muted-foreground">
              Estimated, not the actual payroll rate — {estimatedEquivalent.label.toLowerCase()}: {formatCurrency(estimatedEquivalent.value)}
            </p>
          )}

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Employee
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

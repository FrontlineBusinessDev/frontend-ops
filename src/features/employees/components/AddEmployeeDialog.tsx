import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Settings2 } from 'lucide-react'
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
import { MixedCompensationDialog } from '@/features/employees/components/MixedCompensationDialog'
import { useMixedCompensationStore, summarizeMixedCompensation } from '@/features/employees/mixedCompensationStore'
import type { MixedCompensationStructure } from '@/features/employees/mixedCompensationStore'

const schema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    department: z.string().min(1, 'Department is required'),
    position: z.string().min(1, 'Position is required'),
    branchId: z.string().min(1, 'Branch is required'),
    employmentType: z.enum(['regular', 'probationary', 'contractual', 'part_time']),
    dateHired: z.string().min(1, 'Date hired is required'),
    payType: z.enum(['monthly', 'semi_monthly', 'daily', 'hourly', 'output_based', 'mixed']),
    basicPay: z.number().optional(),
    outputUnit: z.string().optional(),
  })
  .refine((v) => v.payType !== 'output_based' || Boolean(v.outputUnit), {
    message: 'Output unit is required for Output-Based / Piece-Rate',
    path: ['outputUnit'],
  })
  .refine((v) => v.payType === 'mixed' || (v.basicPay !== undefined && v.basicPay > 0), {
    message: 'Rate amount must be greater than 0',
    path: ['basicPay'],
  })

type FormValues = z.infer<typeof schema>

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'regular', label: 'Regular' },
  { value: 'probationary', label: 'Probationary' },
  { value: 'contractual', label: 'Contractual' },
  { value: 'part_time', label: 'Part-time' },
]

const OUTPUT_UNIT_SELECT_OPTIONS = OUTPUT_UNIT_OPTIONS.map((u) => ({ value: u, label: u }))

/** UI-only addition for this modal — "Mixed Compensation" is never persisted as a real `PayRateType`
 * (the payroll engine, reports, and payslips keep handling exactly the 5 standard types). See
 * `mixedCompensationStore.ts`. */
const PAY_RATE_TYPE_OPTIONS_WITH_MIXED = [...PAY_RATE_TYPE_OPTIONS, { value: 'mixed' as const, label: 'Mixed Compensation' }]

export function AddEmployeeDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [mixedDialogOpen, setMixedDialogOpen] = useState(false)
  const [mixedStructure, setMixedStructure] = useState<MixedCompensationStructure | undefined>(undefined)
  const { user } = useSession()
  const { branches } = useTenant()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { employmentType: 'regular', branchId: branches[0]?.id ?? '', payType: 'monthly' },
  })

  const payType = watch('payType')
  const basicPay = watch('basicPay')
  const isMixed = payType === 'mixed'
  const estimatedEquivalent =
    payType !== 'mixed' && basicPay && basicPay > 0 ? estimatedEquivalentFor(payType, basicPay) : null

  function resetAll() {
    reset()
    setMixedStructure(undefined)
  }

  async function onSubmit(values: FormValues) {
    const base = {
      firstName: values.firstName,
      lastName: values.lastName,
      department: values.department,
      position: values.position,
      branchId: values.branchId,
      employmentType: values.employmentType,
      dateHired: values.dateHired,
    }

    if (values.payType === 'mixed') {
      if (!mixedStructure) return
      const employee = await createEmployee(user, {
        ...base,
        payType: mixedStructure.baseType,
        basicPay: mixedStructure.baseAmount,
        outputUnit: null,
      })
      useMixedCompensationStore.getState().setStructure(employee.id, mixedStructure)
    } else {
      await createEmployee(user, {
        ...base,
        payType: values.payType,
        basicPay: values.basicPay!,
        outputUnit: values.payType === 'output_based' ? values.outputUnit : null,
      })
    }
    notify({ title: 'Employee added', description: `${values.firstName} ${values.lastName} was added to the roster.`, tone: 'success' })
    resetAll()
    setOpen(false)
    onCreated()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetAll()
      }}
    >
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
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v)
                    if (v === 'mixed') {
                      // RHF's `valueAsNumber` turns an emptied/unmounted number input into NaN, which
                      // `z.number()` rejects outright — clear it so the mixed path never trips that.
                      setValue('basicPay', undefined)
                    } else {
                      setMixedStructure(undefined)
                    }
                  }}
                  options={PAY_RATE_TYPE_OPTIONS_WITH_MIXED}
                />
              )}
            />
          </FormField>

          {isMixed ? (
            <div className="col-span-2">
              <p className="mb-1.5 text-xs font-semibold tracking-tight text-foreground">
                Mixed Compensation Breakdown<span className="ml-0.5 text-danger">*</span>
              </p>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5">
                <p className="text-sm text-muted-foreground">
                  {mixedStructure ? (
                    <span className="font-medium text-foreground">{summarizeMixedCompensation(mixedStructure)}</span>
                  ) : (
                    'No breakdown configured yet.'
                  )}
                </p>
                <Button type="button" size="sm" variant="secondary" icon={<Settings2 className="size-3.5" />} onClick={() => setMixedDialogOpen(true)}>
                  Configure Mixed Compensation Breakdown
                </Button>
              </div>
              {!mixedStructure && <p className="mt-1.5 text-xs text-danger">Configure the breakdown before saving.</p>}
            </div>
          ) : (
            <FormField label={rateFieldLabel(payType)} required error={errors.basicPay?.message} hint={helperTextFor(payType)}>
              <Input type="number" step="0.01" {...register('basicPay', { valueAsNumber: true })} placeholder="25000" />
            </FormField>
          )}

          {!isMixed && payType === 'output_based' && (
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
            <Button type="submit" isLoading={isSubmitting} disabled={isMixed && !mixedStructure}>
              Save Employee
            </Button>
          </div>
        </form>
      </DialogContent>

      <MixedCompensationDialog
        open={mixedDialogOpen}
        initialValue={mixedStructure}
        onOpenChange={setMixedDialogOpen}
        onSave={setMixedStructure}
      />
    </Dialog>
  )
}

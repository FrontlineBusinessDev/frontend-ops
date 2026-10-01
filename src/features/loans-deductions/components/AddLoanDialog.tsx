import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useLoanTypes } from '@/features/loans-deductions/hooks/useBenefitsDeductions'
import { useSession } from '@/hooks/useSession'
import { createLoan, updateLoan } from '@/lib/services/loanService'
import type { Employee, LoanRecord } from '@/types/domain'

const schema = z.object({
  employeeId: z.string().min(1, 'Select an employee'),
  type: z.string().min(1, 'Select a loan type'),
  label: z.string().min(1, 'Required'),
  principal: z.number().positive('Must be greater than 0'),
  monthlyDeduction: z.number().positive('Must be greater than 0'),
  startDate: z.string().min(1, 'Required'),
})

type FormValues = z.infer<typeof schema>

function toFormValues(loan?: LoanRecord): FormValues {
  return {
    employeeId: loan?.employeeId ?? '',
    type: loan?.type ?? 'company_loan',
    label: loan?.label ?? '',
    principal: loan?.principal ?? 0,
    monthlyDeduction: loan?.monthlyDeduction ?? 0,
    startDate: loan?.startDate ?? new Date().toISOString().slice(0, 10),
  }
}

/** Adds a loan, or edits an existing one (the employee and principal stay fixed once a loan exists). */
export function AddLoanDialog({ employees, onCreated, loan, trigger }: { employees: Employee[]; onCreated: () => void; loan?: LoanRecord; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()
  const { types } = useLoanTypes()
  const isEdit = Boolean(loan)
  // Active types can be picked, plus the loan's current type even if it has since been deactivated.
  const typeOptions = types.filter((t) => t.isActive || t.key === loan?.type).map((t) => ({ value: t.key, label: t.label }))

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(loan) })

  useEffect(() => {
    if (open) reset(toFormValues(loan))
  }, [open, loan, reset])

  async function onSubmit(values: FormValues) {
    if (loan) {
      await updateLoan(user, loan.id, { type: values.type, label: values.label, monthlyDeduction: values.monthlyDeduction, startDate: values.startDate })
      notify({ title: 'Loan updated', tone: 'success' })
    } else {
      await createLoan(user, values)
      notify({ title: 'Loan added', tone: 'success' })
    }
    setOpen(false)
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button icon={<Plus className="size-4" />}>Add Loan</Button>}</DialogTrigger>
      <DialogContent>
        <DialogTitle>{isEdit ? 'Edit Loan' : 'Add Loan Record'}</DialogTitle>
        <DialogDescription>
          {isEdit ? 'Changes apply to the next payroll run. The employee and principal can’t be changed.' : 'Active loans are deducted automatically in payroll runs until fully repaid.'}
        </DialogDescription>

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
                  disabled={isEdit}
                  options={employees.map((e) => ({ value: e.id, label: `${e.personal.firstName} ${e.personal.lastName}` }))}
                />
              )}
            />
          </FormField>
          <FormField label="Loan Type" required error={errors.type?.message} hint="Manage the list under Loans → Loan Types. One-off or monthly charges (uniforms, equipment…) go under Deductions." className="col-span-2">
            <Controller
              control={control}
              name="type"
              render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={typeOptions} />}
            />
          </FormField>
          <FormField label="Label" required error={errors.label?.message} className="col-span-2">
            <Input {...register('label')} placeholder="SSS Salary Loan" />
          </FormField>
          <FormField label="Principal (PHP)" required error={errors.principal?.message}>
            <Input type="number" disabled={isEdit} {...register('principal', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Monthly deduction (PHP)" required error={errors.monthlyDeduction?.message}>
            <Input type="number" {...register('monthlyDeduction', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Start date" required error={errors.startDate?.message} className="col-span-2">
            <Input type="date" {...register('startDate')} />
          </FormField>

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? 'Save Changes' : 'Add Loan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

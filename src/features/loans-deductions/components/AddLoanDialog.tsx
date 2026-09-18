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
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { createLoan } from '@/lib/services/loanService'
import type { Employee } from '@/types/domain'

const schema = z.object({
  employeeId: z.string().min(1, 'Select an employee'),
  type: z.enum([
    'sss_salary_loan',
    'sss_calamity_loan',
    'pagibig_multipurpose_loan',
    'pagibig_calamity_loan',
    'pagibig_mp2',
    'company_loan',
    'other_deduction',
  ]),
  label: z.string().min(1, 'Required'),
  principal: z.number().positive('Must be greater than 0'),
  monthlyDeduction: z.number().positive('Must be greater than 0'),
  startDate: z.string().min(1, 'Required'),
})

type FormValues = z.infer<typeof schema>

const TYPE_OPTIONS = [
  { value: 'sss_salary_loan', label: 'SSS Loan – Salary' },
  { value: 'sss_calamity_loan', label: 'SSS Loan – Calamity' },
  { value: 'pagibig_multipurpose_loan', label: 'Pag-IBIG Loan – Multi-Purpose' },
  { value: 'pagibig_calamity_loan', label: 'Pag-IBIG Loan – Calamity' },
  { value: 'pagibig_mp2', label: 'Pag-IBIG MP2 (Modified Pag-IBIG 2 Savings)' },
  { value: 'company_loan', label: 'Company Loan / Emergency Advance' },
  { value: 'other_deduction', label: 'Other Deduction (Uniform, HMO Co-pay, Equipment, etc.)' },
]

export function AddLoanDialog({ employees, onCreated }: { employees: Employee[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { type: 'company_loan' } })

  async function onSubmit(values: FormValues) {
    await createLoan(user, values)
    notify({ title: 'Loan/Deduction added', tone: 'success' })
    reset()
    setOpen(false)
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button icon={<Plus className="size-4" />}>Add Loan/Deduction</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Add Loan/Deduction Record</DialogTitle>
        <DialogDescription>Recurring deductions will be applied automatically to future payroll runs.</DialogDescription>

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
          <FormField label="Loan/Deduction Type" required className="col-span-2">
            <Controller
              control={control}
              name="type"
              render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={TYPE_OPTIONS} />}
            />
          </FormField>
          <FormField label="Label" required error={errors.label?.message} className="col-span-2">
            <Input {...register('label')} placeholder="SSS Salary Loan" />
          </FormField>
          <FormField label="Principal (PHP)" required error={errors.principal?.message}>
            <Input type="number" {...register('principal', { valueAsNumber: true })} />
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
              Add Loan/Deduction
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

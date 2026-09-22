import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { updateEmployeeGovernmentInfo } from '@/lib/services/employeeService'
import type { Employee, EmployeeGovernment } from '@/types/domain'

export function EditGovernmentInfoForm({
  employee,
  onSaved,
  onCancel,
}: {
  employee: Employee
  onSaved: () => void
  onCancel: () => void
}) {
  const { user } = useSession()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<EmployeeGovernment>({ defaultValues: employee.government })

  async function onSubmit(values: EmployeeGovernment) {
    await updateEmployeeGovernmentInfo(user, employee.id, {
      ...values,
      pagibigEmployeeContribution: values.pagibigEmployeeContribution
        ? Number(values.pagibigEmployeeContribution)
        : undefined,
    })
    notify({ title: 'Government information updated', tone: 'success' })
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-3">
      <FormField label="SSS No.">
        <Input {...register('sssNo')} />
      </FormField>
      <FormField label="PhilHealth No.">
        <Input {...register('philhealthNo')} />
      </FormField>
      <FormField label="Pag-IBIG No.">
        <Input {...register('pagibigNo')} />
      </FormField>
      <FormField label="TIN">
        <Input {...register('tinNo')} />
      </FormField>
      <FormField
        label="Pag-IBIG Employee Contribution (PHP)"
        hint="Leave blank to use the company default set in Statutory Contributions."
      >
        <Input type="number" step="1" {...register('pagibigEmployeeContribution', { valueAsNumber: true })} />
      </FormField>

      <div className="col-span-1 flex justify-end gap-2 sm:col-span-2 md:col-span-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Save Changes
        </Button>
      </div>
    </form>
  )
}

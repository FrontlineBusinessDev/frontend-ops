import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { updateEmployeeBankInfo } from '@/lib/services/employeeService'
import type { Employee, EmployeeBank } from '@/types/domain'

export function EditBankInfoForm({
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
  } = useForm<EmployeeBank>({ defaultValues: employee.bank })

  async function onSubmit(values: EmployeeBank) {
    await updateEmployeeBankInfo(user, employee.id, values)
    notify({ title: 'Bank/payment information updated', tone: 'success' })
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <FormField label="Bank name">
        <Input {...register('bankName')} />
      </FormField>
      <FormField label="Account number">
        <Input {...register('accountNumber')} />
      </FormField>

      <div className="col-span-2 flex justify-end gap-2 sm:col-span-3">
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

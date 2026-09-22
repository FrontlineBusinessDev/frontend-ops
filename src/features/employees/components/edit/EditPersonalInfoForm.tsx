import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { updateEmployeePersonalInfo } from '@/lib/services/employeeService'
import type { Employee, EmployeePersonal } from '@/types/domain'

const CIVIL_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'separated', label: 'Separated' },
]

export function EditPersonalInfoForm({
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
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EmployeePersonal>({ defaultValues: employee.personal })

  async function onSubmit(values: EmployeePersonal) {
    await updateEmployeePersonalInfo(user, employee.id, values)
    notify({ title: 'Personal information updated', tone: 'success' })
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-3">
      <FormField label="First name" required error={errors.firstName?.message}>
        <Input {...register('firstName', { required: 'Required' })} />
      </FormField>
      <FormField label="Last name" required error={errors.lastName?.message}>
        <Input {...register('lastName', { required: 'Required' })} />
      </FormField>
      <FormField label="Birth date">
        <Input type="date" {...register('birthDate')} />
      </FormField>
      <FormField label="Civil status">
        <Select
          value={watch('civilStatus')}
          onValueChange={(v) => setValue('civilStatus', v as EmployeePersonal['civilStatus'])}
          options={CIVIL_STATUS_OPTIONS}
        />
      </FormField>
      <FormField label="Contact number">
        <Input {...register('contactNumber')} />
      </FormField>
      <FormField label="Personal email">
        <Input type="email" {...register('personalEmail')} />
      </FormField>
      <FormField label="Address" className="col-span-1 sm:col-span-2 md:col-span-3">
        <Input {...register('address')} />
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

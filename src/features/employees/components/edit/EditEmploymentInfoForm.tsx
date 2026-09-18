import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { updateEmployeeEmploymentInfo, type UpdateEmploymentInfoInput } from '@/lib/services/employeeService'
import type { Employee } from '@/types/domain'

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'regular', label: 'Regular' },
  { value: 'probationary', label: 'Probationary' },
  { value: 'contractual', label: 'Contractual' },
  { value: 'part_time', label: 'Part-time' },
]

export function EditEmploymentInfoForm({
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
  } = useForm<UpdateEmploymentInfoInput>({
    defaultValues: {
      position: employee.employment.position,
      department: employee.employment.department,
      employmentType: employee.employment.employmentType,
      dateHired: employee.employment.dateHired,
    },
  })

  async function onSubmit(values: UpdateEmploymentInfoInput) {
    await updateEmployeeEmploymentInfo(user, employee.id, values)
    notify({ title: 'Employment information updated', tone: 'success' })
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <FormField label="Position" required error={errors.position?.message}>
        <Input {...register('position', { required: 'Required' })} />
      </FormField>
      <FormField label="Department" required error={errors.department?.message}>
        <Input {...register('department', { required: 'Required' })} />
      </FormField>
      <FormField label="Employment type">
        <Select
          value={watch('employmentType')}
          onValueChange={(v) => setValue('employmentType', v as UpdateEmploymentInfoInput['employmentType'])}
          options={EMPLOYMENT_TYPE_OPTIONS}
        />
      </FormField>
      <FormField label="Date hired">
        <Input type="date" {...register('dateHired')} />
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

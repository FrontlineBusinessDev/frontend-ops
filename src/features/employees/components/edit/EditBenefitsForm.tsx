import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { updateEmployeeBenefits, type UpdateBenefitsInput } from '@/lib/services/employeeService'
import type { Employee } from '@/types/domain'

export function EditBenefitsForm({
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
  const leaveTypes = Object.keys(employee.benefits.leaveCreditsByType)

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<{ hmoPlan: string; credits: Record<string, number> }>({
    defaultValues: {
      hmoPlan: employee.benefits.hmoPlan ?? '',
      credits: { ...employee.benefits.leaveCreditsByType },
    },
  })

  async function onSubmit(values: { hmoPlan: string; credits: Record<string, number> }) {
    const updates: UpdateBenefitsInput = {
      hmoPlan: values.hmoPlan.trim() || undefined,
      leaveCreditsByType: Object.fromEntries(Object.entries(values.credits).map(([k, v]) => [k, Number(v)])),
    }
    await updateEmployeeBenefits(user, employee.id, updates)
    notify({ title: 'Benefits updated', tone: 'success' })
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <FormField label="HMO plan" className="col-span-2 sm:col-span-3">
        <Input {...register('hmoPlan')} placeholder="e.g. HMO Plan B" />
      </FormField>

      {leaveTypes.map((type) => (
        <FormField key={type} label={`${type} credits (days)`}>
          <Input type="number" step="1" {...register(`credits.${type}`, { valueAsNumber: true, min: 0 })} />
        </FormField>
      ))}

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

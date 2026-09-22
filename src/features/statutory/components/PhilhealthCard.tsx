import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { updateStatutoryConfig } from '@/lib/services/payrollService'
import type { StatutoryConfig } from '@/types/domain'

interface FormValues {
  philhealthRate: number
  philhealthEmployeeSharePercent: number
  philhealthEmployerSharePercent: number
}

export function PhilhealthCard({
  config,
  canEdit,
  onSaved,
}: {
  config: StatutoryConfig
  canEdit: boolean
  onSaved: () => void
}) {
  const { user } = useSession()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      philhealthRate: config.philhealthRate,
      philhealthEmployeeSharePercent: config.philhealthEmployeeSharePercent,
      philhealthEmployerSharePercent: config.philhealthEmployerSharePercent,
    },
  })

  useEffect(() => {
    reset({
      philhealthRate: config.philhealthRate,
      philhealthEmployeeSharePercent: config.philhealthEmployeeSharePercent,
      philhealthEmployerSharePercent: config.philhealthEmployerSharePercent,
    })
  }, [config, reset])

  async function onSubmit(values: FormValues) {
    await updateStatutoryConfig(user, values)
    notify({ title: 'PhilHealth settings updated', tone: 'success' })
    onSaved()
  }

  return (
    <Card className="p-6">
      <Card.Title className="mb-4">PhilHealth Contribution</Card.Title>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-3">
        <FormField label="Total Contribution Rate" hint="As a fraction of basic pay, e.g. 0.05 = 5%">
          <Input type="number" step="0.001" disabled={!canEdit} {...register('philhealthRate', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Employee Share (%)" hint="Default 50%">
          <Input
            type="number"
            step="0.01"
            min="0"
            max="1"
            disabled={!canEdit}
            {...register('philhealthEmployeeSharePercent', { valueAsNumber: true })}
          />
        </FormField>
        <FormField label="Employer Share (%)" hint="Default 50%">
          <Input
            type="number"
            step="0.01"
            min="0"
            max="1"
            disabled={!canEdit}
            {...register('philhealthEmployerSharePercent', { valueAsNumber: true })}
          />
        </FormField>
        <p className="col-span-full text-xs text-muted-foreground">
          Custom splits are supported (e.g. 60% employer / 40% employee) for companies with custom benefit policies.
        </p>

        {canEdit && (
          <div className="col-span-full flex justify-end">
            <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!isDirty}>
              Save Changes
            </Button>
          </div>
        )}
      </form>
    </Card>
  )
}

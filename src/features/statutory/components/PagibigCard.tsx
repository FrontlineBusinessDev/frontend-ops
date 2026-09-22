import { Info } from 'lucide-react'
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
  pagibigEmployeeAmount: number
  pagibigEmployerAmount: number
}

export function PagibigCard({
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
    watch,
    formState: { isSubmitting, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      pagibigEmployeeAmount: config.pagibigEmployeeAmount,
      pagibigEmployerAmount: config.pagibigEmployerAmount,
    },
  })

  useEffect(() => {
    reset({ pagibigEmployeeAmount: config.pagibigEmployeeAmount, pagibigEmployerAmount: config.pagibigEmployerAmount })
  }, [config, reset])

  const employeeAmount = Number(watch('pagibigEmployeeAmount')) || 0
  const employerAmount = Number(watch('pagibigEmployerAmount')) || 0
  const total = employeeAmount + employerAmount
  const employeeRatio = total > 0 ? Math.round((employeeAmount / total) * 100) : 0
  const employerRatio = total > 0 ? 100 - employeeRatio : 0

  async function onSubmit(values: FormValues) {
    await updateStatutoryConfig(user, values)
    notify({ title: 'Pag-IBIG settings updated', tone: 'success' })
    onSaved()
  }

  return (
    <Card className="p-6">
      <Card.Title className="mb-4">Pag-IBIG Contribution</Card.Title>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-3">
        <FormField label="Default Employee Contribution (PHP)">
          <Input type="number" step="1" disabled={!canEdit} {...register('pagibigEmployeeAmount', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Default Employer Contribution (PHP)">
          <Input type="number" step="1" disabled={!canEdit} {...register('pagibigEmployerAmount', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Split Ratio" hint="Derived from the amounts above">
          <div className="flex h-9 items-center rounded-lg border border-border bg-muted/40 px-3 text-sm">
            {employeeRatio}% Employee / {employerRatio}% Employer
          </div>
        </FormField>

        <div className="col-span-full flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <p>
            Default rates apply globally. Individual employee Pag-IBIG contribution amounts can be overridden directly within each
            employee&apos;s Compensation profile (Government Information tab).
          </p>
        </div>

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

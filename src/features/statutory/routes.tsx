import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { useStatutoryConfig } from '@/features/statutory/hooks/useStatutoryConfig'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from '@/hooks/useSession'
import { updateStatutoryConfig } from '@/lib/services/payrollService'
import { formatCurrency } from '@/lib/utils/format'

const schema = z.object({
  sssEmployeeRate: z.coerce.number().min(0).max(1),
  sssEmployerRate: z.coerce.number().min(0).max(1),
  philhealthRate: z.coerce.number().min(0).max(1),
  pagibigEmployeeAmount: z.coerce.number().min(0),
  pagibigEmployerAmount: z.coerce.number().min(0),
})

type FormValues = z.infer<typeof schema>

export function StatutoryPage() {
  const { config, isLoading, refetch } = useStatutoryConfig()
  const canEdit = usePermission('statutory.edit')
  const { user } = useSession()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<FormValues>()

  useEffect(() => {
    if (config) reset(config)
  }, [config, reset])

  async function onSubmit(values: FormValues) {
    await updateStatutoryConfig(user, values)
    notify({ title: 'Statutory settings updated', tone: 'success' })
    refetch()
  }

  if (isLoading || !config) return <Skeleton className="h-96" />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Statutory Contributions"
        description="Configurable SSS, PhilHealth, Pag-IBIG, and withholding-tax rules — not hard-coded, since contribution rules change periodically."
      />

      <Card className="p-6">
        <Card.Title className="mb-4">Contribution Rates</Card.Title>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <FormField label="SSS – Employee Rate" hint="As a fraction of basic pay, e.g. 0.045 = 4.5%">
            <Input type="number" step="0.001" disabled={!canEdit} {...register('sssEmployeeRate')} />
          </FormField>
          <FormField label="SSS – Employer Rate">
            <Input type="number" step="0.001" disabled={!canEdit} {...register('sssEmployerRate')} />
          </FormField>
          <FormField label="PhilHealth Rate (total, split 50/50)">
            <Input type="number" step="0.001" disabled={!canEdit} {...register('philhealthRate')} />
          </FormField>
          <FormField label="Pag-IBIG – Employee Amount (PHP)">
            <Input type="number" step="1" disabled={!canEdit} {...register('pagibigEmployeeAmount')} />
          </FormField>
          <FormField label="Pag-IBIG – Employer Amount (PHP)">
            <Input type="number" step="1" disabled={!canEdit} {...register('pagibigEmployerAmount')} />
          </FormField>

          {canEdit && (
            <div className="col-span-full flex justify-end">
              <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!isDirty}>
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </Card>

      <Card className="p-6">
        <Card.Title className="mb-4">Withholding Tax Brackets (Monthly)</Card.Title>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Range</TableHead>
              <TableHead>Base Tax</TableHead>
              <TableHead>Rate on Excess</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {config.taxBrackets.map((bracket) => (
              <TableRow key={bracket.min}>
                <TableCell>
                  {formatCurrency(bracket.min)} {bracket.max ? `– ${formatCurrency(bracket.max)}` : 'and up'}
                </TableCell>
                <TableCell>{formatCurrency(bracket.baseTax)}</TableCell>
                <TableCell>{(bracket.rate * 100).toFixed(0)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

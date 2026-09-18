import { Plus, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { updateStatutoryConfig } from '@/lib/services/payrollService'
import { formatCurrency } from '@/lib/utils/format'
import type { SssBracket, StatutoryConfig } from '@/types/domain'

interface FormValues {
  sssBrackets: SssBracket[]
}

export function SssBracketCard({
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
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting, isDirty },
  } = useForm<FormValues>({ defaultValues: { sssBrackets: config.sssBrackets } })

  const { fields, append, remove } = useFieldArray({ control, name: 'sssBrackets' })

  useEffect(() => {
    reset({ sssBrackets: config.sssBrackets })
  }, [config, reset])

  const rows = watch('sssBrackets')

  async function onSubmit(values: FormValues) {
    await updateStatutoryConfig(user, { sssBrackets: values.sssBrackets })
    notify({ title: 'SSS contribution table updated', tone: 'success' })
    onSaved()
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <Card.Title>SSS Contribution</Card.Title>
        {canEdit && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<Plus className="size-3.5" />}
            onClick={() => append({ minSalary: 0, maxSalary: null, msc: 0, employeeShare: 0, employerShare: 0 })}
          >
            Add Bracket Row
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Min. Basic Pay</TableHead>
              <TableHead>Max. Basic Pay</TableHead>
              <TableHead>Monthly Salary Credit</TableHead>
              <TableHead>Employee Share</TableHead>
              <TableHead>Employer Share</TableHead>
              <TableHead>Total Contribution</TableHead>
              {canEdit && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => {
              const row = rows?.[index]
              const total = (Number(row?.employeeShare) || 0) + (Number(row?.employerShare) || 0)
              return (
                <TableRow key={field.id}>
                  {canEdit ? (
                    <>
                      <TableCell>
                        <Input type="number" step="1" {...register(`sssBrackets.${index}.minSalary`, { valueAsNumber: true })} />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="1"
                          placeholder="No limit"
                          {...register(`sssBrackets.${index}.maxSalary`, {
                            setValueAs: (v) => (v === '' ? null : Number(v)),
                          })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input type="number" step="1" {...register(`sssBrackets.${index}.msc`, { valueAsNumber: true })} />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          {...register(`sssBrackets.${index}.employeeShare`, { valueAsNumber: true })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          {...register(`sssBrackets.${index}.employerShare`, { valueAsNumber: true })}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-medium">{formatCurrency(total)}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 className="size-3.5" />}
                          onClick={() => remove(index)}
                          aria-label="Remove bracket"
                        />
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{formatCurrency(field.minSalary)}</TableCell>
                      <TableCell>{field.maxSalary ? formatCurrency(field.maxSalary) : 'and up'}</TableCell>
                      <TableCell>{formatCurrency(field.msc)}</TableCell>
                      <TableCell>{formatCurrency(field.employeeShare)}</TableCell>
                      <TableCell>{formatCurrency(field.employerShare)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(field.employeeShare + field.employerShare)}</TableCell>
                    </>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {canEdit && (
          <div className="mt-4 flex justify-end">
            <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!isDirty}>
              Save Changes
            </Button>
          </div>
        )}
      </form>
    </Card>
  )
}

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
import type { StatutoryConfig, TaxBracket } from '@/types/domain'

interface FormValues {
  taxBrackets: TaxBracket[]
}

export function WithholdingTaxCard({
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
    formState: { isSubmitting, isDirty },
  } = useForm<FormValues>({ defaultValues: { taxBrackets: config.taxBrackets } })

  const { fields, append, remove } = useFieldArray({ control, name: 'taxBrackets' })

  useEffect(() => {
    reset({ taxBrackets: config.taxBrackets })
  }, [config, reset])

  async function onSubmit(values: FormValues) {
    await updateStatutoryConfig(user, { taxBrackets: values.taxBrackets })
    notify({ title: 'Withholding tax brackets updated', tone: 'success' })
    onSaved()
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <Card.Title>Withholding Tax Brackets (Monthly)</Card.Title>
        {canEdit && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<Plus className="size-3.5" />}
            onClick={() => append({ min: 0, max: null, rate: 0, baseTax: 0 })}
          >
            Add Bracket Row
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Min. Taxable Income</TableHead>
              <TableHead>Max. Taxable Income</TableHead>
              <TableHead>Base Tax</TableHead>
              <TableHead>Rate on Excess</TableHead>
              {canEdit && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) =>
              canEdit ? (
                <TableRow key={field.id}>
                  <TableCell>
                    <Input type="number" step="1" {...register(`taxBrackets.${index}.min`, { valueAsNumber: true })} />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="1"
                      placeholder="No limit"
                      {...register(`taxBrackets.${index}.max`, {
                        setValueAs: (v) => (v === '' ? null : Number(v)),
                      })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.01" {...register(`taxBrackets.${index}.baseTax`, { valueAsNumber: true })} />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      {...register(`taxBrackets.${index}.rate`, { valueAsNumber: true })}
                    />
                  </TableCell>
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
                </TableRow>
              ) : (
                <TableRow key={field.id}>
                  <TableCell>
                    {formatCurrency(field.min)} {field.max ? `– ${formatCurrency(field.max)}` : 'and up'}
                  </TableCell>
                  <TableCell />
                  <TableCell>{formatCurrency(field.baseTax)}</TableCell>
                  <TableCell>{(field.rate * 100).toFixed(0)}%</TableCell>
                </TableRow>
              ),
            )}
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

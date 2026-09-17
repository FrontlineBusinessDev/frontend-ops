import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormField } from '@/components/ui/FormField'
import { Input, Textarea } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { useSelfEmployee } from '@/features/ess/hooks/useSelfEmployee'
import { useSession } from '@/hooks/useSession'
import { updateEmployeeSelf } from '@/lib/services/employeeService'
import { formatDate } from '@/lib/utils/format'

const schema = z.object({
  contactNumber: z.string().min(1, 'Required'),
  personalEmail: z.string().email().optional().or(z.literal('')),
  address: z.string().min(1, 'Required'),
})

type FormValues = z.infer<typeof schema>

export function EssProfilePage() {
  const { employee, isLoading, refetch } = useSelfEmployee()
  const { user } = useSession()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (employee) {
      reset({
        contactNumber: employee.personal.contactNumber,
        personalEmail: employee.personal.personalEmail ?? '',
        address: employee.personal.address,
      })
    }
  }, [employee, reset])

  if (isLoading) return <Skeleton className="h-96" />
  if (!employee) return <p className="text-sm text-muted-foreground">No employee record linked to this account.</p>

  async function onSubmit(values: FormValues) {
    await updateEmployeeSelf(user, values)
    notify({ title: 'Profile updated', tone: 'success' })
    refetch()
  }

  return (
    <div className="space-y-5">
      <PageHeader title="My Profile" description="View your employment details and update your contact information." />

      <Card className="flex items-center gap-4 p-5">
        <Avatar name={`${employee.personal.firstName} ${employee.personal.lastName}`} size="lg" />
        <div>
          <p className="font-display text-base font-semibold tracking-tight">
            {employee.personal.firstName} {employee.personal.lastName}
          </p>
          <p className="text-sm text-muted-foreground">
            {employee.employment.position} &middot; {employee.employment.department} &middot; Hired {formatDate(employee.employment.dateHired)}
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <Card.Title className="mb-4">Contact Information</Card.Title>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
          <FormField label="Contact number" required error={errors.contactNumber?.message}>
            <Input {...register('contactNumber')} />
          </FormField>
          <FormField label="Personal email" error={errors.personalEmail?.message}>
            <Input type="email" {...register('personalEmail')} />
          </FormField>
          <FormField label="Address" required error={errors.address?.message} className="col-span-2">
            <Textarea {...register('address')} />
          </FormField>
          <div className="col-span-2 flex justify-end">
            <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!isDirty}>
              Save Changes
            </Button>
          </div>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">
          Employment, compensation, and government information can only be changed by HR.
        </p>
      </Card>
    </div>
  )
}

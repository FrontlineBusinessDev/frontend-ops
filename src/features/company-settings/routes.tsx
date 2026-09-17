import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { AddHolidayDialog } from '@/features/company-settings/components/AddHolidayDialog'
import { AddScheduleDialog } from '@/features/company-settings/components/AddScheduleDialog'
import { CompanyInfoForm } from '@/features/company-settings/components/CompanyInfoForm'
import { useCompanySettings } from '@/features/company-settings/hooks/useCompanySettings'
import { usePermission } from '@/hooks/usePermission'
import { formatDate } from '@/lib/utils/format'

const HOLIDAY_TYPE_LABEL: Record<string, string> = {
  regular: 'Regular Holiday',
  special_non_working: 'Special Non-Working Day',
}

export function CompanySettingsPage() {
  const { company, schedules, holidays, isLoading, refetch } = useCompanySettings()
  const canEdit = usePermission('settings.company.edit')

  if (isLoading || !company) return <Skeleton className="h-96" />

  return (
    <div className="space-y-5">
      <PageHeader title="Company & Payroll Settings" description="Company information, work schedules, and holidays." />

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Company Info</TabsTrigger>
          <TabsTrigger value="schedules">Work Schedules</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <CompanyInfoForm company={company} canEdit={canEdit} onSaved={refetch} />
        </TabsContent>

        <TabsContent value="schedules">
          <div className="mb-3 flex justify-end">{canEdit && <AddScheduleDialog onCreated={refetch} />}</div>
          {schedules.length === 0 ? (
            <EmptyState title="No work schedules yet" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {schedules.map((s) => (
                <Card key={s.id} className="p-5">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {s.startTime} &ndash; {s.endTime}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">Mon &ndash; Fri</p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="holidays">
          <div className="mb-3 flex justify-end">{canEdit && <AddHolidayDialog onCreated={refetch} />}</div>
          {holidays.length === 0 ? (
            <EmptyState title="No holidays configured" />
          ) : (
            <div className="space-y-2">
              {holidays.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(h.date)}</p>
                  </div>
                  <Badge tone={h.type === 'regular' ? 'brand' : 'neutral'}>{HOLIDAY_TYPE_LABEL[h.type]}</Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

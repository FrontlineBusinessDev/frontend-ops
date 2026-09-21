import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { AddHolidayDialog } from '@/features/company-settings/components/AddHolidayDialog'
import { CompanyInfoForm } from '@/features/company-settings/components/CompanyInfoForm'
import { DeductionsSection } from '@/features/company-settings/components/payroll/DeductionsSection'
import { EarningsSection } from '@/features/company-settings/components/payroll/EarningsSection'
import { PayrollCalendarSection } from '@/features/company-settings/components/payroll/PayrollCalendarSection'
import { PayrollGroupsSection } from '@/features/company-settings/components/payroll/PayrollGroupsSection'
import { PayrollRulesSection } from '@/features/company-settings/components/payroll/PayrollRulesSection'
import { WorkSchedulesSection } from '@/features/company-settings/components/payroll/WorkSchedulesSection'
import { useCompanySettings } from '@/features/company-settings/hooks/useCompanySettings'
import { usePermission } from '@/hooks/usePermission'
import { formatDate } from '@/lib/utils/format'

const HOLIDAY_TYPE_LABEL: Record<string, string> = {
  regular: 'Regular Holiday',
  special_non_working: 'Special Non-Working Day',
}

export function CompanySettingsPage() {
  const {
    company,
    schedules,
    holidays,
    payrollGroups,
    compensationTypes,
    earningConfigs,
    deductionConfigs,
    payrollRules,
    employees,
    isLoading,
    refetch,
  } = useCompanySettings()
  const canEditCompany = usePermission('settings.company.edit')
  const canEditPayroll = usePermission('settings.payroll.edit') || canEditCompany

  if (isLoading || !company) return <Skeleton className="h-96" />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Company & Payroll Settings"
        description="Company profile, payroll structure, and holidays for your organization."
      />

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Company Info</TabsTrigger>
          <TabsTrigger value="payroll-settings">Payroll Settings</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <CompanyInfoForm company={company} canEdit={canEditCompany} onSaved={refetch} />
        </TabsContent>

        <TabsContent value="payroll-settings">
          <Tabs defaultValue="groups">
            <TabsList>
              <TabsTrigger value="groups">Payroll Groups</TabsTrigger>
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
              <TabsTrigger value="deductions">Deductions</TabsTrigger>
              <TabsTrigger value="rules">Payroll Rules</TabsTrigger>
              <TabsTrigger value="schedules">Work Schedules</TabsTrigger>
              <TabsTrigger value="calendar">Payroll Calendar</TabsTrigger>
            </TabsList>

            <TabsContent value="groups">
              <PayrollGroupsSection
                groups={payrollGroups}
                compensationTypes={compensationTypes}
                schedules={schedules}
                employees={employees}
                canEdit={canEditPayroll}
                onRefetch={refetch}
              />
            </TabsContent>

            <TabsContent value="earnings">
              <EarningsSection earnings={earningConfigs} canEdit={canEditPayroll} onRefetch={refetch} />
            </TabsContent>

            <TabsContent value="deductions">
              <DeductionsSection deductions={deductionConfigs} canEdit={canEditPayroll} onRefetch={refetch} />
            </TabsContent>

            <TabsContent value="rules">
              <PayrollRulesSection rules={payrollRules} canEdit={canEditPayroll} onRefetch={refetch} />
            </TabsContent>

            <TabsContent value="schedules">
              <WorkSchedulesSection schedules={schedules} employees={employees} canEdit={canEditPayroll} onRefetch={refetch} />
            </TabsContent>

            <TabsContent value="calendar">
              <PayrollCalendarSection groups={payrollGroups} holidays={holidays} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="holidays">
          <div className="mb-3 flex justify-end">{canEditCompany && <AddHolidayDialog onCreated={refetch} />}</div>
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

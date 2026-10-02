import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { PlainCards } from '@/components/ui/PlainCards'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { RosterTab } from '@/features/schedules/components/RosterTab'
import { ShiftTemplatesTab } from '@/features/schedules/components/ShiftTemplatesTab'
import { TeamsSupervisorsTab } from '@/features/schedules/components/TeamsSupervisorsTab'

const TABS = [
  { value: 'roster', label: 'Roster' },
  { value: 'teams', label: 'Teams and supervisors' },
  { value: 'templates', label: 'Shift templates' },
] as const

/**
 * Schedules — who works when. The Roster shows every employee's week (shifts, rest days, leave) and edits by
 * week, month or year; Teams and supervisors sets who manages each branch and department; Shift templates holds
 * the reusable shifts. Attendance and Payroll read from here. The tab lives in the URL (?tab=teams).
 */
export function SchedulesPage() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.find((t) => t.value === params.get('tab'))?.value ?? 'roster'

  return (
    <PlainCards>
      <div className="space-y-5">
        <PageHeader title="Schedules" description="View and manage every employee’s schedule — shifts, rest days and flexible hours — and choose who supervises each team." />

        <Tabs value={tab} onValueChange={(value) => setParams(value === 'roster' ? {} : { tab: value }, { replace: true })}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="roster" className="pt-4">
            <RosterTab />
          </TabsContent>
          <TabsContent value="teams" className="pt-4">
            <TeamsSupervisorsTab />
          </TabsContent>
          <TabsContent value="templates" className="pt-4">
            <ShiftTemplatesTab />
          </TabsContent>
        </Tabs>
      </div>
    </PlainCards>
  )
}

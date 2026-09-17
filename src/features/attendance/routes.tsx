import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { AdjustmentsList } from '@/features/attendance/components/AdjustmentsList'
import { DailyAttendanceTable } from '@/features/attendance/components/DailyAttendanceTable'
import { useAttendanceAdjustments, useDailyAttendance } from '@/features/attendance/hooks/useAttendance'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { formatDate } from '@/lib/utils/format'

function shiftDate(dateKey: string, deltaDays: number) {
  const date = new Date(`${dateKey}T00:00:00`)
  date.setDate(date.getDate() + deltaDays)
  return date.toISOString().slice(0, 10)
}

export function AttendancePage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const { records, isLoading: isLoadingAttendance } = useDailyAttendance(date)
  const { adjustments, isLoading: isLoadingAdjustments, refetch } = useAttendanceAdjustments()
  const { employees, refetch: refetchEmployees } = useEmployees()

  return (
    <div className="space-y-5">
      <PageHeader title="Attendance & Timekeeping" description="Daily attendance, schedules, and adjustment approvals." />

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily Attendance</TabsTrigger>
          <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <div className="mb-4 flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={<ChevronLeft className="size-4" />} onClick={() => setDate((d) => shiftDate(d, -1))} />
            <p className="w-40 text-center text-sm font-medium">{formatDate(date, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
            <Button size="sm" variant="secondary" icon={<ChevronRight className="size-4" />} onClick={() => setDate((d) => shiftDate(d, 1))} />
          </div>
          {isLoadingAttendance ? (
            <Skeleton className="h-72" />
          ) : (
            <DailyAttendanceTable
              records={records}
              employees={employees}
              onAdjustmentCreated={() => {
                refetch()
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="adjustments">
          {isLoadingAdjustments ? (
            <Skeleton className="h-72" />
          ) : (
            <AdjustmentsList
              adjustments={adjustments}
              employees={employees}
              onDecided={() => {
                refetch()
                refetchEmployees()
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

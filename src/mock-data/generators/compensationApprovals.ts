import type { ApprovalStatus, CompensationApproval, Employee } from '@/types/domain'

/** ~One month of working days, so any recent semi-monthly cutoff is fully covered by timecards. */
const WORKDAYS_OF_HISTORY = 24
/** The most recent working days are still awaiting sign-off, like a real timecard queue. */
const PENDING_WORKDAYS = 3

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Weekday dates, most recent first, starting from the last working day before today. */
function recentWorkdays(count: number): string[] {
  const dates: string[] = []
  const d = new Date()
  while (dates.length < count) {
    d.setDate(d.getDate() - 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) dates.push(toDateKey(d))
  }
  return dates
}

/** Saturdays falling within the covered range, most recent first. */
function recentSaturdays(oldestDate: string): string[] {
  const dates: string[] = []
  const d = new Date()
  while (toDateKey(d) >= oldestDate) {
    d.setDate(d.getDate() - 1)
    if (d.getDay() === 6 && toDateKey(d) >= oldestDate) dates.push(toDateKey(d))
  }
  return dates
}

const REGULAR_HOURS_PATTERN = [8, 8, 8, 7.5, 8, 8, 8, 6, 8, 8, 8]
const OUTPUT_DESCRIPTIONS = ['Completed production batch', 'Daily quota output', 'Daily quota output', 'Completed production batch', 'Rush order output']

function statusFor(isRecent: boolean, seed: number): ApprovalStatus {
  if (isRecent) return 'pending'
  // Late submissions still awaiting sign-off, spread across older cutoffs so each payroll period
  // has its own pending set to filter to.
  if (seed % 17 === 0) return 'pending'
  return seed % 13 === 0 ? 'rejected' : 'approved'
}

/**
 * Daily timecards (hourly) and output submissions (piece-rate) for the active hourly and
 * output-based employees already in the roster — dense enough that a payroll run over any recent
 * cutoff produces realistic Gross Pay from approved entries alone.
 */
export function generateCompensationApprovals(employees: Employee[]): CompensationApproval[] {
  const approvals: CompensationApproval[] = []
  const workdays = recentWorkdays(WORKDAYS_OF_HISTORY)
  const oldest = workdays[workdays.length - 1]
  const pendingCutoff = workdays[PENDING_WORKDAYS - 1]
  const saturdays = recentSaturdays(oldest)

  employees
    .filter((e) => e.employment.status === 'active' && (e.compensation.payType === 'hourly' || e.compensation.payType === 'output_based'))
    .forEach((employee, employeeIndex) => {
      const isHourly = employee.compensation.payType === 'hourly'
      const rate = employee.compensation.basicPay
      const unitLabel = isHourly ? 'hrs' : (employee.compensation.outputUnit ?? 'Per Unit')
      const isTaskUnit = unitLabel === 'Per Task'

      const push = (workDate: string, index: number, quantity: number, description: string, status: ApprovalStatus) => {
        approvals.push({
          id: `${employee.id}_compappr_${index}`,
          companyId: employee.companyId,
          employeeId: employee.id,
          type: isHourly ? 'hourly' : 'output',
          workDate,
          quantity,
          unitLabel,
          rate,
          amount: Math.round(quantity * rate * 100) / 100,
          description,
          status,
          submittedAt: `${workDate}T10:15:00.000Z`,
          decidedBy: status === 'pending' ? undefined : 'Payroll Team',
          decidedAt: status === 'pending' ? undefined : `${workDate}T23:00:00.000Z`,
        })
      }

      workdays.forEach((workDate, dayIndex) => {
        const seed = employeeIndex * 7 + dayIndex
        const status = statusFor(workDate >= pendingCutoff, seed + 1)
        if (isHourly) {
          push(workDate, dayIndex, REGULAR_HOURS_PATTERN[seed % REGULAR_HOURS_PATTERN.length], 'Regular timecard hours', status)
        } else {
          const quantity = isTaskUnit ? 18 + (seed * 5) % 13 : 40 + (seed * 7) % 21
          push(workDate, dayIndex, quantity, OUTPUT_DESCRIPTIONS[seed % OUTPUT_DESCRIPTIONS.length], status)
        }
      })

      // Every other hourly employee also covers weekend support shifts.
      if (isHourly && employeeIndex % 2 === 0) {
        saturdays.forEach((workDate, satIndex) => {
          const status: ApprovalStatus = satIndex === 0 ? 'pending' : 'approved'
          push(workDate, WORKDAYS_OF_HISTORY + satIndex, 4 + (satIndex % 3), 'Weekend support shift timecard', status)
        })
      }
    })

  return approvals
}

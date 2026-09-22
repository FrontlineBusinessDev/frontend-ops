import { create } from 'zustand'

/**
 * A free-form rate-type id rather than a closed union: the "Type" dropdown in
 * `OvertimeApplicationDialog` now populates from the shared Payroll Settings rate store
 * (`payrollRatesStore.ts`), which includes user-added custom OT/Night Diff rate types. This store
 * is display/mock-only (see note below), so widening this doesn't touch the real payroll engine.
 */
export type OtApplicationType = string
export type OtApplicationStatus = 'pending' | 'approved' | 'rejected'

export interface OtApplication {
  id: string
  employeeId: string
  type: OtApplicationType
  date: string
  startTime: string
  endTime: string
  totalHours: number
  reason: string
  attachmentName?: string
  status: OtApplicationStatus
  appliedAt: string
}

export interface CreateOtApplicationInput {
  employeeId: string
  type: OtApplicationType
  date: string
  startTime: string
  endTime: string
  reason: string
  attachmentName?: string
}

/** Any employee viewing the demo sees the same seed rows (not tied to one specific employee id) — new submissions are tied to the real signed-in employee. */
const SEED_EMPLOYEE_ID = '__seed__'

export function computeTotalHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  let minutes = endH * 60 + endM - (startH * 60 + startM)
  if (minutes <= 0) minutes += 24 * 60 // shift crosses midnight (night differential)
  return Math.round((minutes / 60) * 10) / 10
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function seedApplications(): OtApplication[] {
  return [
    {
      id: 'seed_ot_1',
      employeeId: SEED_EMPLOYEE_ID,
      type: 'overtime',
      date: daysAgo(12),
      startTime: '18:00',
      endTime: '22:00',
      totalHours: 4,
      reason: 'Project crunch delivery',
      status: 'approved',
      appliedAt: `${daysAgo(12)}T17:30:00.000Z`,
    },
    {
      id: 'seed_ot_2',
      employeeId: SEED_EMPLOYEE_ID,
      type: 'night_diff',
      date: daysAgo(4),
      startTime: '22:00',
      endTime: '02:00',
      totalHours: 4,
      reason: 'System deployment duty',
      status: 'pending',
      appliedAt: `${daysAgo(4)}T20:00:00.000Z`,
    },
    {
      id: 'seed_ot_3',
      employeeId: SEED_EMPLOYEE_ID,
      type: 'overtime_night_diff',
      date: daysAgo(20),
      startTime: '19:00',
      endTime: '23:30',
      totalHours: 4.5,
      reason: 'Month-end close support',
      status: 'rejected',
      appliedAt: `${daysAgo(20)}T18:00:00.000Z`,
    },
  ]
}

interface OtApplicationState {
  applications: OtApplication[]
  addApplication: (input: CreateOtApplicationInput) => OtApplication
  cancelApplication: (id: string) => void
}

/** ESS-only mock store for OT/Night Diff self-service applications — deliberately not wired into
 * `db.overtimeRecords` (the admin Overtime & Night Differential module's real approval queue),
 * so this addition stays scoped to the Employee Portal. In-memory only, like the rest of this
 * app's mock data — resets on a full page reload. */
export const useOtApplicationStore = create<OtApplicationState>((set, get) => ({
  applications: seedApplications(),
  addApplication: (input) => {
    const application: OtApplication = {
      id: crypto.randomUUID(),
      employeeId: input.employeeId,
      type: input.type,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      totalHours: computeTotalHours(input.startTime, input.endTime),
      reason: input.reason,
      attachmentName: input.attachmentName,
      status: 'pending',
      appliedAt: new Date().toISOString(),
    }
    set({ applications: [application, ...get().applications] })
    return application
  },
  /** Only meaningful for a still-`pending` application — withdraws it from the list entirely. */
  cancelApplication: (id) => {
    set({ applications: get().applications.filter((a) => a.id !== id) })
  },
}))

export function useMyOtApplications(employeeId: string): OtApplication[] {
  const applications = useOtApplicationStore((s) => s.applications)
  return applications.filter((a) => a.employeeId === employeeId || a.employeeId === SEED_EMPLOYEE_ID)
}

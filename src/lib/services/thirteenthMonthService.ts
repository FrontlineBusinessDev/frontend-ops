import { getEmployees } from '@/lib/services/employeeService'
import { monthlyEquivalentFor } from '@/lib/payroll/rateBasis'
import { db } from '@/mock-data'
import type { Employee, SessionUser, ThirteenthMonthLine, ThirteenthMonthRun } from '@/types/domain'

export async function getThirteenthMonthRuns(session: SessionUser): Promise<ThirteenthMonthRun[]> {
  return db.thirteenthMonthRuns.filter((r) => r.companyId === session.companyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getThirteenthMonthLines(session: SessionUser, runId: string): Promise<ThirteenthMonthLine[]> {
  return db.thirteenthMonthLines.filter((l) => l.companyId === session.companyId && l.runId === runId)
}

/**
 * Months of the target year an employee actually earned basic pay for, out of 12 — the statutory
 * proration for mid-year hires. An employee hired in month index `m` (0 = January) is credited
 * `12 - m` months; someone hired after the target year, or not yet hired at all, gets 0.
 */
function monthsCreditedFor(employee: Employee, year: number): number {
  const hireDate = new Date(employee.employment.dateHired)
  const hireYear = hireDate.getFullYear()
  if (hireYear < year) return 12
  if (hireYear > year) return 0
  return 12 - hireDate.getMonth()
}

export interface GenerateThirteenthMonthInput {
  year: number
  generationDate: string
  payoutPeriodLabel: string
}

/**
 * Regenerates the draft batch for `year`: Total Basic Salary Earned ÷ 12, where "earned" is each
 * employee's monthly-equivalent basic pay (the same rate-type-aware figure the payroll engine uses
 * for statutory brackets) times the months actually credited this year. Replaces any previous draft
 * for the same year — finalized runs are left untouched as the historical record.
 */
export async function generateThirteenthMonthRun(
  session: SessionUser,
  input: GenerateThirteenthMonthInput,
): Promise<{ run: ThirteenthMonthRun; lines: ThirteenthMonthLine[] }> {
  const employees = await getEmployees(session)
  const activeEmployees = employees.filter((e) => e.employment.status === 'active')

  const run: ThirteenthMonthRun = {
    id: crypto.randomUUID(),
    companyId: session.companyId,
    year: input.year,
    generationDate: input.generationDate,
    payoutPeriodLabel: input.payoutPeriodLabel,
    status: 'draft',
    createdAt: new Date().toISOString(),
  }

  const lines: ThirteenthMonthLine[] = activeEmployees.map((employee) => {
    const monthsCredited = monthsCreditedFor(employee, input.year)
    const annualBasicEarned = Math.round(monthlyEquivalentFor(employee) * monthsCredited)
    return {
      id: crypto.randomUUID(),
      companyId: session.companyId,
      runId: run.id,
      employeeId: employee.id,
      annualBasicEarned,
      monthsCredited,
      thirteenthMonthPay: Math.round(annualBasicEarned / 12),
    }
  })

  const oldDraftIds = new Set(
    db.thirteenthMonthRuns.filter((r) => r.companyId === session.companyId && r.year === input.year && r.status === 'draft').map((r) => r.id),
  )
  db.thirteenthMonthRuns = db.thirteenthMonthRuns.filter((r) => !oldDraftIds.has(r.id))
  db.thirteenthMonthLines = db.thirteenthMonthLines.filter((l) => !oldDraftIds.has(l.runId))

  db.thirteenthMonthRuns.unshift(run)
  db.thirteenthMonthLines.push(...lines)

  return { run, lines }
}

export async function finalizeThirteenthMonthRun(session: SessionUser, runId: string): Promise<void> {
  const run = db.thirteenthMonthRuns.find((r) => r.id === runId && r.companyId === session.companyId)
  if (!run || run.status !== 'draft') return
  run.status = 'finalized'
  run.finalizedAt = new Date().toISOString()
}

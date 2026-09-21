import { getBranches } from '@/lib/services/branchService'
import { createEmployee } from '@/lib/services/employeeService'
import { getEmployeeMasterlist, getPayrollRegister } from '@/lib/services/reportService'
import { getPayrollPeriods } from '@/lib/services/payrollService'
import { scopeToCompany } from '@/lib/tenancy/tenantScope'
import { db } from '@/mock-data'
import type { ApiKey, Webhook, WebhookEvent, SessionUser } from '@/types/domain'

export async function getApiKeys(session: SessionUser): Promise<ApiKey[]> {
  return scopeToCompany(db.apiKeys, session.companyId)
}

export async function createApiKey(session: SessionUser, label: string): Promise<ApiKey> {
  const token = crypto.randomUUID().replace(/-/g, '')
  const apiKey: ApiKey = {
    id: crypto.randomUUID(),
    companyId: session.companyId,
    label,
    tokenPreview: `fbs_live_${token.slice(0, 8)}...${token.slice(-4)}`,
    createdAt: new Date().toISOString(),
  }
  db.apiKeys.unshift(apiKey)
  return apiKey
}

export async function revokeApiKey(session: SessionUser, keyId: string): Promise<void> {
  db.apiKeys = db.apiKeys.filter((k) => !(k.id === keyId && k.companyId === session.companyId))
}

export async function getWebhooks(session: SessionUser): Promise<Webhook[]> {
  return scopeToCompany(db.webhooks, session.companyId)
}

export async function createWebhook(session: SessionUser, input: { url: string; event: WebhookEvent }): Promise<Webhook> {
  const webhook: Webhook = { id: crypto.randomUUID(), companyId: session.companyId, createdAt: new Date().toISOString(), ...input }
  db.webhooks.unshift(webhook)
  return webhook
}

export async function deleteWebhook(session: SessionUser, webhookId: string): Promise<void> {
  db.webhooks = db.webhooks.filter((w) => !(w.id === webhookId && w.companyId === session.companyId))
}

function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n')
}

export async function exportEmployeeMasterlistCsv(session: SessionUser): Promise<string> {
  const employees = await getEmployeeMasterlist(session)
  const header = ['Employee #', 'First Name', 'Last Name', 'Department', 'Position', 'Date Hired', 'Status']
  const rows = employees.map((e) => [
    e.employeeNumber,
    e.personal.firstName,
    e.personal.lastName,
    e.employment.department,
    e.employment.position,
    e.employment.dateHired,
    e.employment.status,
  ])
  return toCsv([header, ...rows])
}

export interface ImportEmployeesResult {
  imported: number
  skipped: number
  errors: string[]
}

/** Expects a CSV header row: firstName,lastName,department,position,employmentType,dateHired,basicPay */
export async function importEmployeesCsv(session: SessionUser, csvText: string): Promise<ImportEmployeesResult> {
  const branches = await getBranches(session)
  const defaultBranchId = branches[0]?.id
  const lines = csvText.trim().split(/\r?\n/)
  const result: ImportEmployeesResult = { imported: 0, skipped: 0, errors: [] }
  if (!defaultBranchId) {
    result.errors.push('No branches configured for this company yet.')
    return result
  }

  for (const [index, line] of lines.slice(1).entries()) {
    const cells = line.split(',').map((c) => c.trim())
    const [firstName, lastName, department, position, employmentType, dateHired, basicPayRaw] = cells
    const basicPay = Number(basicPayRaw)

    if (!firstName || !lastName || !Number.isFinite(basicPay)) {
      result.skipped += 1
      result.errors.push(`Row ${index + 2}: missing required fields or invalid basic pay`)
      continue
    }

    await createEmployee(session, {
      firstName,
      lastName,
      department: department || 'General',
      position: position || 'Staff',
      branchId: defaultBranchId,
      employmentType: (employmentType as 'regular' | 'probationary' | 'contractual' | 'part_time') || 'regular',
      dateHired: dateHired || new Date().toISOString().slice(0, 10),
      payType: 'monthly',
      basicPay,
    })
    result.imported += 1
  }

  return result
}

export async function exportPayrollRegisterCsv(session: SessionUser): Promise<string> {
  const periods = await getPayrollPeriods(session)
  const report = await getPayrollRegister(session, periods[0]?.id)
  const header = ['Employee', 'Gross Pay', 'SSS', 'PhilHealth', 'Pag-IBIG', 'Withholding Tax', 'Total Deductions', 'Net Pay']
  const rows = report.rows.map((r) => [
    `${r.employee.personal.firstName} ${r.employee.personal.lastName}`,
    String(r.grossPay),
    String(r.sssEmployeeShare),
    String(r.philhealthEmployeeShare),
    String(r.pagibigEmployeeShare),
    String(r.withholdingTax),
    String(r.totalDeductions),
    String(r.netPay),
  ])
  return toCsv([header, ...rows])
}

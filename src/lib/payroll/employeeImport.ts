import { OUTPUT_UNIT_OPTIONS } from '@/lib/payroll/payRate'
import type { CreateEmployeeExtras, CreateEmployeeInput } from '@/lib/services/employeeService'
import type { Branch, Employee, PayRateType } from '@/types/domain'

/**
 * Bulk employee import (CSV). Pure parsing + validation — nothing is saved here; the dialog shows the
 * result as a preview and hands the valid rows to `importEmployees`.
 */

export interface ImportColumn {
  /** Header written in the template. */
  header: string
  required: boolean
  /** What to type — shown beside the sample file in the import dialog. */
  hint: string
  /** Other header spellings accepted on upload. */
  aliases?: string[]
}

export const IMPORT_COLUMNS: ImportColumn[] = [
  { header: 'First Name', required: true, hint: 'e.g. Maria' },
  { header: 'Last Name', required: true, hint: 'e.g. Santos' },
  { header: 'Department', required: true, hint: 'e.g. Operations' },
  { header: 'Position', required: true, hint: 'e.g. Payroll Specialist' },
  { header: 'Branch', required: true, hint: 'Must match a branch name in Branches' },
  { header: 'Employment Type', required: true, hint: 'regular, probationary, contractual or part_time', aliases: ['Employment Status Type'] },
  { header: 'Date Hired', required: true, hint: 'YYYY-MM-DD (MM/DD/YYYY also accepted)' },
  { header: 'Pay Type', required: true, hint: 'monthly, semi_monthly, daily, hourly or output_based', aliases: ['Pay Rate Type', 'Rate Type'] },
  { header: 'Basic Pay', required: true, hint: 'Rate amount for the pay type, numbers only', aliases: ['Base Rate', 'Rate'] },
  { header: 'Output Unit', required: false, hint: `Required for output_based: ${OUTPUT_UNIT_OPTIONS.join(', ')}` },
  { header: 'Birth Date', required: false, hint: 'YYYY-MM-DD' },
  { header: 'Civil Status', required: false, hint: 'single, married, widowed or separated' },
  { header: 'Contact Number', required: false, hint: 'e.g. 09171234567' },
  { header: 'Personal Email', required: false, hint: 'e.g. maria@gmail.com', aliases: ['Email'] },
  { header: 'Address', required: false, hint: 'Home address' },
  { header: 'SSS No', required: false, hint: 'e.g. 34-1234567-8' },
  { header: 'PhilHealth No', required: false, hint: 'e.g. 12-345678901-2' },
  { header: 'Pag-IBIG No', required: false, hint: 'e.g. 1234-5678-9012' },
  { header: 'TIN', required: false, hint: 'e.g. 123-456-789-000' },
  { header: 'Bank Name', required: false, hint: 'e.g. BDO' },
  { header: 'Account Number', required: false, hint: 'Payroll bank account' },
]

const EMPLOYMENT_TYPES = ['regular', 'probationary', 'contractual', 'part_time'] as const
const PAY_TYPES: PayRateType[] = ['monthly', 'semi_monthly', 'daily', 'hourly', 'output_based']
const CIVIL_STATUSES = ['single', 'married', 'widowed', 'separated'] as const

/** A realistic example row per pay type, so the sample file doubles as a reference for each format. */
export function sampleImportRows(branchName: string): string[][] {
  return [
    ['Maria', 'Santos', 'Operations', 'Payroll Specialist', branchName, 'regular', '2024-03-04', 'monthly', '32000', '', '1993-06-14', 'married', '09171234567', 'maria.santos@gmail.com', '12 Rizal St., Quezon City', '34-1234567-8', '12-345678901-2', '1234-5678-9012', '123-456-789-000', 'BDO', '001234567890'],
    ['Jose', 'Dela Cruz', 'Finance', 'Accounting Clerk', branchName, 'probationary', '2026-07-01', 'semi_monthly', '14500', '', '1999-11-02', 'single', '09981234567', 'jose.delacruz@gmail.com', '45 Mabini Ave., Pasig City', '', '', '', '', 'BPI', '0987654321'],
    ['Ana', 'Reyes', 'Production', 'Machine Operator', branchName, 'regular', '2023-09-18', 'daily', '610', '', '1991-02-25', 'married', '09201234567', '', 'Block 5 Lot 8, Antipolo', '', '', '', '', '', ''],
    ['Ramon', 'Garcia', 'Warehouse', 'Utility Helper', branchName, 'part_time', '2026-08-10', 'hourly', '95', '', '2002-08-30', 'single', '', '', '', '', '', '', '', '', ''],
    ['Liza', 'Mendoza', 'Production', 'Sewer', branchName, 'contractual', '2026-05-02', 'output_based', '18.5', 'Per Piece', '1996-12-09', 'single', '09351234567', '', 'Purok 3, Taytay, Rizal', '', '', '', '', '', ''],
  ]
}

export function importTemplateRows(branchName: string): string[][] {
  return [IMPORT_COLUMNS.map((c) => c.header), ...sampleImportRows(branchName)]
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

export interface ImportRow {
  /** 1-based spreadsheet row (header is row 1), for error messages. */
  line: number
  name: string
  input?: CreateEmployeeInput
  errors: string[]
  warnings: string[]
}

export interface ImportParseResult {
  rows: ImportRow[]
  /** Required columns missing from the file's header. */
  missingColumns: string[]
}

function toIsoDate(raw: string): string | null {
  const value = raw.trim()
  let year: number, month: number, day: number
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value)
  if (m) [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])]
  else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value))) [month, day, year] = [Number(m[1]), Number(m[2]), Number(m[3])]
  else return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseEmployeeImport(csvRows: string[][], branches: Branch[], existing: Employee[]): ImportParseResult {
  const [headerRow = [], ...body] = csvRows
  const headerIndex = new Map<string, number>()
  headerRow.forEach((h, i) => headerIndex.set(normalize(h.replace(/^﻿/, '').replace(/\*/g, '')), i))

  const columnIndex = (column: ImportColumn) => {
    for (const key of [column.header, ...(column.aliases ?? [])]) {
      const index = headerIndex.get(normalize(key))
      if (index !== undefined) return index
    }
    return -1
  }
  const indexes = new Map(IMPORT_COLUMNS.map((c) => [c.header, columnIndex(c)]))
  const missingColumns = IMPORT_COLUMNS.filter((c) => c.required && (indexes.get(c.header) ?? -1) < 0).map((c) => c.header)
  if (missingColumns.length > 0) return { rows: [], missingColumns }

  const get = (row: string[], header: string) => {
    const index = indexes.get(header) ?? -1
    return index < 0 ? '' : (row[index] ?? '').trim()
  }

  const branchByName = new Map(branches.map((b) => [normalize(b.name), b]))
  const taken = new Set(existing.map((e) => `${normalize(e.personal.firstName)}|${normalize(e.personal.lastName)}`))

  const rows: ImportRow[] = []
  body.forEach((cells, i) => {
    if (cells.every((c) => !c.trim())) return
    const errors: string[] = []
    const warnings: string[] = []
    const firstName = get(cells, 'First Name')
    const lastName = get(cells, 'Last Name')
    const department = get(cells, 'Department')
    const position = get(cells, 'Position')
    if (!firstName) errors.push('First Name is required')
    if (!lastName) errors.push('Last Name is required')
    if (!department) errors.push('Department is required')
    if (!position) errors.push('Position is required')

    const branch = branchByName.get(normalize(get(cells, 'Branch')))
    if (!branch) errors.push(get(cells, 'Branch') ? `Branch "${get(cells, 'Branch')}" not found` : 'Branch is required')

    const employmentType = normalize(get(cells, 'Employment Type').replace(/-/g, '_'))
    const matchedType = EMPLOYMENT_TYPES.find((t) => normalize(t) === employmentType)
    if (!matchedType) errors.push('Employment Type must be regular, probationary, contractual or part_time')

    const dateHired = toIsoDate(get(cells, 'Date Hired'))
    if (!dateHired) errors.push('Date Hired must be a valid date (YYYY-MM-DD)')

    const matchedPay = PAY_TYPES.find((t) => normalize(t) === normalize(get(cells, 'Pay Type')))
    if (!matchedPay) errors.push('Pay Type must be monthly, semi_monthly, daily, hourly or output_based')

    const basicPay = Number(get(cells, 'Basic Pay').replace(/[₱,\s]/g, ''))
    if (!Number.isFinite(basicPay) || basicPay <= 0) errors.push('Basic Pay must be a number greater than 0')

    let outputUnit: string | null = null
    if (matchedPay === 'output_based') {
      const unit = OUTPUT_UNIT_OPTIONS.find((u) => normalize(u) === normalize(get(cells, 'Output Unit')))
      if (!unit) errors.push(`Output Unit is required for output_based (${OUTPUT_UNIT_OPTIONS.join(', ')})`)
      else outputUnit = unit
    }

    const extras: CreateEmployeeExtras = {}
    const birth = get(cells, 'Birth Date')
    if (birth) {
      const iso = toIsoDate(birth)
      if (iso) extras.birthDate = iso
      else warnings.push('Birth Date ignored (invalid date)')
    }
    const civil = CIVIL_STATUSES.find((s) => s === get(cells, 'Civil Status').toLowerCase())
    if (get(cells, 'Civil Status') && !civil) warnings.push('Civil Status ignored (use single, married, widowed or separated)')
    if (civil) extras.civilStatus = civil
    const email = get(cells, 'Personal Email')
    if (email) {
      if (/^\S+@\S+\.\S+$/.test(email)) extras.personalEmail = email
      else warnings.push('Personal Email ignored (invalid)')
    }
    for (const [header, key] of [
      ['Contact Number', 'contactNumber'],
      ['Address', 'address'],
      ['SSS No', 'sssNo'],
      ['PhilHealth No', 'philhealthNo'],
      ['Pag-IBIG No', 'pagibigNo'],
      ['TIN', 'tinNo'],
      ['Bank Name', 'bankName'],
      ['Account Number', 'accountNumber'],
    ] as const) {
      const value = get(cells, header)
      if (value) extras[key] = value
    }

    if (firstName && lastName) {
      const key = `${normalize(firstName)}|${normalize(lastName)}`
      if (taken.has(key)) errors.push('An employee with this name already exists')
      else taken.add(key) // also catches duplicates inside the file itself
    }

    rows.push({
      line: i + 2,
      name: `${firstName} ${lastName}`.trim() || '(no name)',
      errors,
      warnings,
      input:
        errors.length === 0 && branch && matchedType && dateHired && matchedPay
          ? { firstName, lastName, department, position, branchId: branch.id, employmentType: matchedType, dateHired, payType: matchedPay, basicPay, outputUnit, extras }
          : undefined,
    })
  })
  return { rows, missingColumns }
}

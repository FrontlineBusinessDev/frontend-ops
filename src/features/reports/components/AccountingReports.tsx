import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { downloadCsv, ReportViewShell, toCsv } from '@/features/reports/components/shared'
import { useAllPayrollLines } from '@/features/reports/hooks/useReports'
import { formatCurrency } from '@/lib/utils/format'

interface AccountRow {
  account: string
  debit: number
  credit: number
}

export function DebitCreditReport() {
  const { rows, isLoading } = useAllPayrollLines()
  const periods = useMemo(() => {
    const seen = new Map<string, (typeof rows)[number]['period']>()
    for (const r of rows) seen.set(r.period.id, r.period)
    return [...seen.values()].sort((a, b) => b.startDate.localeCompare(a.startDate))
  }, [rows])
  const [periodId, setPeriodId] = useState<string | undefined>(undefined)
  const activePeriodId = periodId ?? periods[0]?.id
  const periodLines = rows.filter((r) => r.period.id === activePeriodId).map((r) => r.line)

  const accounts: AccountRow[] = useMemo(() => {
    const totals = periodLines.reduce(
      (acc, line) => ({
        grossPay: acc.grossPay + line.grossPay,
        sssEmployer: acc.sssEmployer + line.sssEmployerShare,
        philhealthEmployer: acc.philhealthEmployer + line.philhealthEmployerShare,
        pagibigEmployer: acc.pagibigEmployer + line.pagibigEmployerShare,
        withholdingTax: acc.withholdingTax + line.withholdingTax,
        sssTotal: acc.sssTotal + line.sssEmployeeShare + line.sssEmployerShare,
        philhealthTotal: acc.philhealthTotal + line.philhealthEmployeeShare + line.philhealthEmployerShare,
        pagibigTotal: acc.pagibigTotal + line.pagibigEmployeeShare + line.pagibigEmployerShare,
        loanDeductions: acc.loanDeductions + line.loanDeductions.reduce((s, d) => s + d.amount, 0),
        otherDeductions: acc.otherDeductions + line.otherDeductions.reduce((s, d) => s + d.amount, 0),
        netPay: acc.netPay + line.netPay,
      }),
      {
        grossPay: 0,
        sssEmployer: 0,
        philhealthEmployer: 0,
        pagibigEmployer: 0,
        withholdingTax: 0,
        sssTotal: 0,
        philhealthTotal: 0,
        pagibigTotal: 0,
        loanDeductions: 0,
        otherDeductions: 0,
        netPay: 0,
      },
    )

    const list: AccountRow[] = [
      { account: 'Salaries & Wages Expense', debit: totals.grossPay, credit: 0 },
      { account: 'SSS Contribution Expense', debit: totals.sssEmployer, credit: 0 },
      { account: 'PhilHealth Contribution Expense', debit: totals.philhealthEmployer, credit: 0 },
      { account: 'Pag-IBIG Contribution Expense', debit: totals.pagibigEmployer, credit: 0 },
      { account: 'Withholding Tax Payable', debit: 0, credit: totals.withholdingTax },
      { account: 'SSS Payable', debit: 0, credit: totals.sssTotal },
      { account: 'PhilHealth Payable', debit: 0, credit: totals.philhealthTotal },
      { account: 'Pag-IBIG Payable', debit: 0, credit: totals.pagibigTotal },
    ]
    if (totals.loanDeductions > 0) list.push({ account: 'Loans Payable', debit: 0, credit: totals.loanDeductions })
    if (totals.otherDeductions > 0) list.push({ account: 'Other Deductions Payable', debit: 0, credit: totals.otherDeductions })
    list.push({ account: 'Cash / Payroll Payable', debit: 0, credit: totals.netPay })

    // The payroll engine rounds each employee's net pay to the nearest peso; summed across many
    // employees that can leave the journal a few centavos off. Plug the difference here (standard
    // accounting practice) rather than changing the engine's per-line rounding.
    const preliminary = list.reduce((acc, a) => ({ debit: acc.debit + a.debit, credit: acc.credit + a.credit }), { debit: 0, credit: 0 })
    const roundingDiff = Math.round((preliminary.debit - preliminary.credit) * 100) / 100
    if (roundingDiff > 0) list.push({ account: 'Rounding Adjustment', debit: 0, credit: roundingDiff })
    else if (roundingDiff < 0) list.push({ account: 'Rounding Adjustment', debit: -roundingDiff, credit: 0 })

    return list
  }, [periodLines])

  const grandTotal = accounts.reduce((acc, a) => ({ debit: acc.debit + a.debit, credit: acc.credit + a.credit }), { debit: 0, credit: 0 })

  function onExport() {
    const period = periods.find((p) => p.id === activePeriodId)
    const header = ['Account Title', 'Debit (PHP)', 'Credit (PHP)']
    const dataRows = accounts.map((a) => [a.account, a.debit ? String(a.debit) : '', a.credit ? String(a.credit) : ''])
    dataRows.push(['Total', String(grandTotal.debit), String(grandTotal.credit)])
    downloadCsv(`payroll-debit-credit-${period?.label ?? 'period'}.csv`, toCsv([header, ...dataRows]))
  }

  return (
    <ReportViewShell
      title="Payroll Summary — Debit & Credit"
      description="Accounting-oriented summary of payroll transactions, formatted as formal Debit/Credit journal accounts."
      onExportCsv={periodLines.length > 0 ? onExport : undefined}
    >
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : periods.length === 0 ? (
        <EmptyState title="No payroll periods yet" description="Run a payroll period first to generate this journal entry." />
      ) : (
        <div className="space-y-4">
          <div className="max-w-xs print:hidden">
            <Select value={activePeriodId} onValueChange={setPeriodId} options={periods.map((p) => ({ value: p.id, label: p.label }))} />
          </div>

          {periodLines.length === 0 ? (
            <EmptyState title="This period hasn't been run yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Title</TableHead>
                  <TableHead className="text-right">Debit (₱)</TableHead>
                  <TableHead className="text-right">Credit (₱)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.account}>
                    <TableCell className="font-medium">{a.account}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.debit ? formatCurrency(a.debit) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.credit ? formatCurrency(a.credit) : '—'}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(grandTotal.debit)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(grandTotal.credit)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </ReportViewShell>
  )
}

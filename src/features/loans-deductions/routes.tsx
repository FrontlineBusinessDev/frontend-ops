import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { PlainCards } from '@/components/ui/PlainCards'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { BenefitsView } from '@/features/loans-deductions/components/BenefitsView'
import { DeductionsView } from '@/features/loans-deductions/components/DeductionsView'
import { EmployeeLoansView } from '@/features/loans-deductions/components/EmployeeLoansView'
import { LoanTypesView } from '@/features/loans-deductions/components/LoanTypesView'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { usePermission } from '@/hooks/usePermission'

const SECTIONS = [
  {
    value: 'benefits',
    label: 'Benefits',
    subs: [
      { value: 'hmo', label: 'HMO' },
      { value: 'allowances', label: 'Allowances' },
      { value: 'insurance', label: 'Insurance' },
      { value: 'other-benefits', label: 'Other Benefits' },
    ],
  },
  {
    value: 'loans',
    label: 'Loans',
    subs: [
      { value: 'employee-loans', label: 'Employee Loans' },
      { value: 'loan-types', label: 'Loan Types' },
    ],
  },
  {
    value: 'deductions',
    label: 'Deductions',
    subs: [
      { value: 'other-deductions', label: 'Other Deductions' },
      { value: 'recurring', label: 'Recurring Deductions' },
      { value: 'one-time', label: 'One-time Deductions' },
    ],
  },
] as const

/**
 * Benefits, Loans & Deductions — what each employee receives (benefits), owes (loans) and has taken from
 * pay (deductions). Active records here are picked up by Payroll Runs and appear on the payslip.
 * The current section and sub-tab live in the URL (?section=loans&tab=loan-types) so they can be linked.
 */
export function LoansDeductionsPage() {
  const [params, setParams] = useSearchParams()
  const { employees } = useEmployees()
  const canManage = usePermission('loans.manage')

  const section = SECTIONS.find((s) => s.value === params.get('section')) ?? SECTIONS[0]
  const sub = section.subs.find((s) => s.value === params.get('tab'))?.value ?? section.subs[0].value

  function go(nextSection: string, nextSub?: string) {
    const target = SECTIONS.find((s) => s.value === nextSection) ?? SECTIONS[0]
    setParams({ section: target.value, tab: nextSub ?? target.subs[0].value }, { replace: true })
  }

  return (
    <PlainCards>
      <div className="space-y-5">
        <PageHeader
          title="Benefits, Loans & Deductions"
          description="Manage what employees receive, what they owe, and what is deducted from their pay — all of it flows into Payroll Runs and onto the payslip."
        />

        <Tabs value={section.value} onValueChange={(value) => go(value)}>
          <TabsList>
            {SECTIONS.map((s) => (
              <TabsTrigger key={s.value} value={s.value}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {SECTIONS.map((s) => (
            <TabsContent key={s.value} value={s.value} className="pt-4">
              <Tabs value={sub} onValueChange={(value) => go(s.value, value)}>
                <TabsList>
                  {s.subs.map((item) => (
                    <TabsTrigger key={item.value} value={item.value}>
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="pt-5">
                  {s.value === 'benefits' && (
                    <>
                      <TabsContent value="hmo">
                        <BenefitsView category="hmo" employees={employees} canManage={canManage} />
                      </TabsContent>
                      <TabsContent value="allowances">
                        <BenefitsView category="allowance" employees={employees} canManage={canManage} />
                      </TabsContent>
                      <TabsContent value="insurance">
                        <BenefitsView category="insurance" employees={employees} canManage={canManage} />
                      </TabsContent>
                      <TabsContent value="other-benefits">
                        <BenefitsView category="other" employees={employees} canManage={canManage} />
                      </TabsContent>
                    </>
                  )}
                  {s.value === 'loans' && (
                    <>
                      <TabsContent value="employee-loans">
                        <EmployeeLoansView />
                      </TabsContent>
                      <TabsContent value="loan-types">
                        <LoanTypesView />
                      </TabsContent>
                    </>
                  )}
                  {s.value === 'deductions' && (
                    <>
                      <TabsContent value="other-deductions">
                        <DeductionsView kind="all" employees={employees} canManage={canManage} />
                      </TabsContent>
                      <TabsContent value="recurring">
                        <DeductionsView kind="recurring" employees={employees} canManage={canManage} />
                      </TabsContent>
                      <TabsContent value="one-time">
                        <DeductionsView kind="one_time" employees={employees} canManage={canManage} />
                      </TabsContent>
                    </>
                  )}
                </div>
              </Tabs>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </PlainCards>
  )
}

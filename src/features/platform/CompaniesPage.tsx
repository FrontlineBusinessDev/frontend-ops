import { Building2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { db } from '@/mock-data'

export function CompaniesPage() {
  return (
    <div>
      <PageHeader
        title="Companies"
        description="Cross-tenant view for platform administration. Full SaaS super-admin tooling is treated as future scope."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {db.companies.map((company) => (
          <Card key={company.id}>
            <Card.Header>
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" />
                <Card.Title>{company.name}</Card.Title>
              </div>
              <Badge tone="brand" className="capitalize">
                {company.planTier}
              </Badge>
            </Card.Header>
            <Card.Body className="space-y-1 pt-3 text-sm text-muted-foreground">
              <p>Payroll frequency: {company.payrollFrequency.replace('_', '-')}</p>
              <p>{db.employees.filter((e) => e.companyId === company.id).length} employees</p>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  )
}

import { Construction } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'

export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <EmptyState
        icon={Construction}
        title={`${title} lands in ${phase}`}
        description="This module is scaffolded in the navigation and RBAC now; the screens themselves are built in a later phase of the build plan."
      />
    </div>
  )
}

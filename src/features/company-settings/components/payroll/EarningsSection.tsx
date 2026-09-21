import { Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Switch } from '@/components/ui/Switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { updateEarningConfig } from '@/lib/services/payrollSettingsService'
import type { EarningConfig } from '@/types/domain'
import { EarningDialog } from '@/features/company-settings/components/payroll/EarningDialog'

export function EarningsSection({ earnings, canEdit, onRefetch }: { earnings: EarningConfig[]; canEdit: boolean; onRefetch: () => void }) {
  const { user } = useSession()
  const { notify } = useToast()

  async function toggleActive(earning: EarningConfig) {
    await updateEarningConfig(user, earning.id, { isActive: !earning.isActive })
    notify({ title: earning.isActive ? 'Earning deactivated' : 'Earning activated', tone: 'success' })
    onRefetch()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Earnings Configuration</p>
          <p className="text-xs text-muted-foreground">Earnings categories available for payroll processing.</p>
        </div>
        {canEdit && <EarningDialog onSaved={onRefetch} />}
      </div>

      {earnings.length === 0 ? (
        <EmptyState title="No earnings configured" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Fixed / Variable</TableHead>
              <TableHead>Taxable</TableHead>
              <TableHead>In Payroll</TableHead>
              <TableHead>Active</TableHead>
              {canEdit && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {earnings.map((earning) => (
              <TableRow key={earning.id}>
                <TableCell className="font-medium">{earning.name}</TableCell>
                <TableCell className="text-muted-foreground">{earning.category}</TableCell>
                <TableCell>
                  <Badge tone="neutral" className="capitalize">{earning.calcType}</Badge>
                </TableCell>
                <TableCell>{earning.taxable ? 'Yes' : 'No'}</TableCell>
                <TableCell>{earning.includedInPayroll ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <Switch checked={earning.isActive} onCheckedChange={() => toggleActive(earning)} disabled={!canEdit} />
                </TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <EarningDialog
                      earning={earning}
                      onSaved={onRefetch}
                      trigger={
                        <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />}>
                          Edit
                        </Button>
                      }
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

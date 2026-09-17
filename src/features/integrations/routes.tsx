import { Download, Plug, Plus, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input, Textarea } from '@/components/ui/Input'
import { PlanGate } from '@/components/ui/PlanGate'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useApiKeys, useWebhooks } from '@/features/integrations/hooks/useIntegrations'
import { useSubscriptionUsage } from '@/features/subscription/hooks/useSubscription'
import { useSession } from '@/hooks/useSession'
import {
  createApiKey,
  createWebhook,
  deleteWebhook,
  exportEmployeeMasterlistCsv,
  exportPayrollRegisterCsv,
  importEmployeesCsv,
  revokeApiKey,
} from '@/lib/services/integrationService'
import { formatDate } from '@/lib/utils/format'
import type { WebhookEvent } from '@/types/domain'

const WEBHOOK_EVENT_OPTIONS: { value: WebhookEvent; label: string }[] = [
  { value: 'payroll.finalized', label: 'Payroll Finalized' },
  { value: 'employee.created', label: 'Employee Created' },
  { value: 'leave.approved', label: 'Leave Approved' },
]

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function DataExportTab() {
  const { user } = useSession()
  const { notify } = useToast()

  async function onExportEmployees() {
    const csv = await exportEmployeeMasterlistCsv(user)
    downloadCsv('employee-masterlist.csv', csv)
    notify({ title: 'Employee masterlist exported', tone: 'success' })
  }

  async function onExportPayroll() {
    const csv = await exportPayrollRegisterCsv(user)
    downloadCsv('payroll-register.csv', csv)
    notify({ title: 'Payroll register exported', tone: 'success' })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="p-5">
        <p className="text-sm font-medium">Employee Masterlist</p>
        <p className="mt-1 text-xs text-muted-foreground">Export the full employee roster as CSV for use in other systems.</p>
        <Button size="sm" className="mt-4" variant="secondary" icon={<Download className="size-4" />} onClick={onExportEmployees}>
          Export CSV
        </Button>
      </Card>
      <Card className="p-5">
        <p className="text-sm font-medium">Payroll Register</p>
        <p className="mt-1 text-xs text-muted-foreground">Export the latest payroll period so it can integrate with accounting software.</p>
        <Button size="sm" className="mt-4" variant="secondary" icon={<Download className="size-4" />} onClick={onExportPayroll}>
          Export CSV
        </Button>
      </Card>
    </div>
  )
}

function DataImportTab() {
  const { user } = useSession()
  const { notify } = useToast()
  const [csvText, setCsvText] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setCsvText(await file.text())
  }

  async function onImport() {
    if (!csvText.trim()) return
    setIsImporting(true)
    try {
      const result = await importEmployeesCsv(user, csvText)
      notify({
        title: `Imported ${result.imported} employee${result.imported === 1 ? '' : 's'}`,
        description: result.skipped > 0 ? `${result.skipped} row(s) skipped — see errors below.` : undefined,
        tone: result.imported > 0 ? 'success' : 'danger',
      })
      if (result.imported > 0) setCsvText('')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Card className="p-5">
      <p className="text-sm font-medium">Import Employees</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Upload or paste a CSV with columns: firstName, lastName, department, position, employmentType, dateHired, basicPay
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon={<Upload className="size-4" />} onClick={() => fileInputRef.current?.click()}>
          Choose CSV File
        </Button>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFileSelected} />
      </div>

      <FormField label="CSV contents" className="mt-4">
        <Textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder="firstName,lastName,department,position,employmentType,dateHired,basicPay"
          className="min-h-40 font-mono text-xs"
        />
      </FormField>

      <Button size="sm" className="mt-4" isLoading={isImporting} disabled={!csvText.trim()} onClick={onImport}>
        Import Employees
      </Button>
    </Card>
  )
}

function ApiKeysTab() {
  const { user } = useSession()
  const { notify } = useToast()
  const { apiKeys, isLoading, refetch } = useApiKeys()
  const [label, setLabel] = useState('')

  async function onCreate() {
    if (!label.trim()) return
    await createApiKey(user, label.trim())
    setLabel('')
    refetch()
    notify({ title: 'API key created', tone: 'success' })
  }

  async function onRevoke(keyId: string) {
    await revokeApiKey(user, keyId)
    refetch()
    notify({ title: 'API key revoked', tone: 'success' })
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 p-5">
        <FormField label="New key label" className="flex-1 basis-56">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Accounting Sync" />
        </FormField>
        <Button size="sm" icon={<Plus className="size-4" />} disabled={!label.trim()} onClick={onCreate}>
          Generate Key
        </Button>
      </Card>

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : apiKeys.length === 0 ? (
        <EmptyState title="No API keys yet" description="Generate a key to let external systems authenticate with FBS OPS." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="font-medium">{key.label}</TableCell>
                <TableCell className="font-mono text-xs">{key.tokenPreview}</TableCell>
                <TableCell>{formatDate(key.createdAt)}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => onRevoke(key.id)}>
                    Revoke
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function AddWebhookDialog({ onCreated }: { onCreated: () => void }) {
  const { user } = useSession()
  const { notify } = useToast()
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [event, setEvent] = useState<WebhookEvent>('payroll.finalized')

  async function onSubmit() {
    if (!url.trim()) return
    await createWebhook(user, { url: url.trim(), event })
    notify({ title: 'Webhook added', tone: 'success' })
    setUrl('')
    setOpen(false)
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" icon={<Plus className="size-4" />}>
          Add Webhook
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Add Webhook</DialogTitle>
        <DialogDescription>FBS OPS will POST an event payload to this URL when it occurs.</DialogDescription>
        <div className="mt-5 space-y-4">
          <FormField label="Endpoint URL" required>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhooks/fbs-ops" />
          </FormField>
          <FormField label="Event">
            <Select value={event} onValueChange={(v) => setEvent(v as WebhookEvent)} options={WEBHOOK_EVENT_OPTIONS} />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={!url.trim()}>
              Add Webhook
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function WebhooksTab() {
  const { user } = useSession()
  const { notify } = useToast()
  const { webhooks, isLoading, refetch } = useWebhooks()

  async function onDelete(id: string) {
    await deleteWebhook(user, id)
    refetch()
    notify({ title: 'Webhook removed', tone: 'success' })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddWebhookDialog onCreated={refetch} />
      </div>

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : webhooks.length === 0 ? (
        <EmptyState title="No webhooks yet" description="Add a webhook to notify external systems of payroll and HR events." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Endpoint URL</TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhooks.map((webhook) => (
              <TableRow key={webhook.id}>
                <TableCell>
                  <Badge tone="brand">{WEBHOOK_EVENT_OPTIONS.find((o) => o.value === webhook.event)?.label ?? webhook.event}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{webhook.url}</TableCell>
                <TableCell>{formatDate(webhook.createdAt)}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => onDelete(webhook.id)}>
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

const CONNECTED_SERVICES = [
  { name: 'Accounting Software Sync', description: 'Push finalized payroll journal entries automatically.' },
  { name: 'Biometric Attendance Devices', description: 'Import time-in/time-out records from biometric scanners.' },
  { name: 'Banking / Payment Disbursement', description: 'Send net pay directly to employee bank accounts.' },
]

function ConnectedServicesTab() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CONNECTED_SERVICES.map((service) => (
        <Card key={service.name} className="p-5">
          <div className="flex items-center gap-2">
            <Plug className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium">{service.name}</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{service.description}</p>
          <Badge tone="neutral" className="mt-3">
            Coming Soon
          </Badge>
        </Card>
      ))}
    </div>
  )
}

function GatedApiTabs() {
  const { usage, isLoading } = useSubscriptionUsage()
  if (isLoading) return <Skeleton className="h-56" />

  return (
    <PlanGate feature="api_integrations" planTier={usage!.planTier}>
      <Tabs defaultValue="api-keys">
        <TabsList>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>
        <TabsContent value="api-keys">
          <ApiKeysTab />
        </TabsContent>
        <TabsContent value="webhooks">
          <WebhooksTab />
        </TabsContent>
      </Tabs>
    </PlanGate>
  )
}

export function IntegrationsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Integrations & API"
        description="Import/export data, manage API access, and connect external systems."
      />

      <Tabs defaultValue="export">
        <TabsList>
          <TabsTrigger value="export">Data Export</TabsTrigger>
          <TabsTrigger value="import">Data Import</TabsTrigger>
          <TabsTrigger value="api">API & Webhooks</TabsTrigger>
          <TabsTrigger value="services">Connected Services</TabsTrigger>
        </TabsList>

        <TabsContent value="export">
          <DataExportTab />
        </TabsContent>
        <TabsContent value="import">
          <DataImportTab />
        </TabsContent>
        <TabsContent value="api">
          <GatedApiTabs />
        </TabsContent>
        <TabsContent value="services">
          <ConnectedServicesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

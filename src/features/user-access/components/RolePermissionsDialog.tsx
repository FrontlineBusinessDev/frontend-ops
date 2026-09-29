import { Check, Minus, Search, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { CAPABILITY_INFO, PERMISSION_GROUP_DESCRIPTION, ROLE_DESCRIPTION, groupCapabilities } from '@/features/user-access/permissionCatalog'
import type { Capability } from '@/lib/rbac/permissions'
import { cn } from '@/lib/utils/cn'
import type { Role } from '@/types/domain'

function CapabilityRow({ capability, granted }: { capability: Capability; granted: boolean }) {
  const info = CAPABILITY_INFO[capability]
  return (
    <li className={cn('flex items-start gap-3 px-4 py-2.5', !granted && 'opacity-60')}>
      <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full', granted ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>
        {granted ? <Check className="size-3" /> : <Minus className="size-3" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
          {info.label}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-normal text-muted-foreground">{capability}</code>
        </p>
        <p className="text-xs text-muted-foreground">{info.description}</p>
      </div>
      {!granted && <span className="shrink-0 text-[11px] text-muted-foreground">Not granted</span>}
    </li>
  )
}

/** The full, grouped capability list for one role — every permission it has, optionally beside the ones it doesn't. */
export function RolePermissionsDialog({
  role,
  roleLabel,
  capabilities,
  onClose,
}: {
  role: Role | null
  roleLabel: string
  capabilities: Capability[]
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [showNotGranted, setShowNotGranted] = useState(false)

  const total = Object.keys(CAPABILITY_INFO).length
  const q = query.trim().toLowerCase()
  const matches = (c: Capability) => !q || `${c} ${CAPABILITY_INFO[c].label} ${CAPABILITY_INFO[c].description} ${CAPABILITY_INFO[c].group}`.toLowerCase().includes(q)
  const groups = groupCapabilities(capabilities)
    .map((g) => ({ ...g, visibleGranted: g.granted.filter(matches), visibleNotGranted: showNotGranted ? g.notGranted.filter(matches) : [] }))
    .filter((g) => g.visibleGranted.length + g.visibleNotGranted.length > 0)

  function close(open: boolean) {
    if (open) return
    setQuery('')
    setShowNotGranted(false)
    onClose()
  }

  return (
    <Dialog open={!!role} onOpenChange={close}>
      <DialogContent className="flex max-w-3xl flex-col overflow-hidden p-0 sm:p-0">
        {role && (
          <>
            <div className="space-y-3 border-b border-border px-4 pb-4 pt-4 pr-12 sm:px-6 sm:pt-5">
              <DialogTitle className="flex flex-wrap items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                {roleLabel}
                <Badge tone="brand">
                  {capabilities.length} of {total} capabilities
                </Badge>
              </DialogTitle>
              <DialogDescription>{ROLE_DESCRIPTION[role]}</DialogDescription>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search permissions…" className="pl-9" />
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch checked={showNotGranted} onCheckedChange={setShowNotGranted} />
                  Show permissions not granted
                </label>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
              {groups.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">{q ? 'No permissions match your search.' : 'This role has no permissions.'}</p>
              ) : (
                groups.map((g) => (
                  <section key={g.group} className="overflow-hidden rounded-xl border border-border">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
                      <div>
                        <p className="text-sm font-semibold">{g.group}</p>
                        <p className="text-xs text-muted-foreground">{PERMISSION_GROUP_DESCRIPTION[g.group]}</p>
                      </div>
                      <Badge tone={g.notGranted.length === 0 ? 'success' : g.granted.length === 0 ? 'neutral' : 'brand'}>
                        {g.granted.length} / {g.granted.length + g.notGranted.length} granted
                      </Badge>
                    </div>
                    <ul className="divide-y divide-border">
                      {g.visibleGranted.map((c) => (
                        <CapabilityRow key={c} capability={c} granted />
                      ))}
                      {g.visibleNotGranted.map((c) => (
                        <CapabilityRow key={c} capability={c} granted={false} />
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

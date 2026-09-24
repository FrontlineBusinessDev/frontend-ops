import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { INSIGHT_FEATURES } from '@/features/insights/insightsCatalog'
import type { InsightFeature } from '@/features/insights/insightsCatalog'

function InsightFeatureCard({ feature, onSelect }: { feature: InsightFeature; onSelect: () => void }) {
  const Icon = feature.icon
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <div className="flex items-center justify-between">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <Badge tone="brand">Coming Soon</Badge>
      </div>
      <div>
        <p className="text-sm font-semibold tracking-tight">{feature.title}</p>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">{feature.description}</p>
      </div>
    </button>
  )
}

function InsightFeatureDialog({ feature, onOpenChange }: { feature: InsightFeature | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={!!feature} onOpenChange={onOpenChange}>
      <DialogContent>
        {feature && (
          <>
            <div className="mb-1 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="size-5" />
              </div>
              <Badge tone="brand" className="gap-1">
                <Sparkles className="size-3" />
                Coming Soon
              </Badge>
            </div>
            <DialogTitle>{feature.title}</DialogTitle>
            <DialogDescription>{feature.overview}</DialogDescription>
            <p className="mt-4 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
              This feature is still in development. We&apos;ll notify Company Admins here once it&apos;s ready to use.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function InsightsPage() {
  const [selected, setSelected] = useState<InsightFeature | null>(null)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Insights & Decision Making Support"
        description="Data-driven tools for compensation planning, cost analysis, and scenario testing across your organization."
      />

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INSIGHT_FEATURES.map((feature) => (
            <InsightFeatureCard key={feature.id} feature={feature} onSelect={() => setSelected(feature)} />
          ))}
        </div>
      </Card>

      <InsightFeatureDialog feature={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  )
}

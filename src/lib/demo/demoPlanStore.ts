import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlanTier } from '@/types/domain'

interface DemoPlanState {
  /** null = follow the signed-in company's real subscription tier. Set = preview the Sidebar's
   * module gating as if the company were on that tier instead, without touching real billing
   * data (`company.planTier`) — purely a client-side "Demo Portal" preview toggle. */
  previewTier: PlanTier | null
  setPreviewTier: (tier: PlanTier | null) => void
}

export const useDemoPlanStore = create<DemoPlanState>()(
  persist(
    (set) => ({
      previewTier: null,
      setPreviewTier: (tier) => set({ previewTier: tier }),
    }),
    { name: 'fbs-ops-demo-portal-tier' },
  ),
)

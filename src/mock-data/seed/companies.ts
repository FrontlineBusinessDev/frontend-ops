import type { Company } from '@/types/domain'

export const companies: Company[] = [
  {
    id: 'co_frontline',
    name: 'Frontline Business Solutions',
    planTier: 'professional',
    timezone: 'Asia/Manila',
    payrollFrequency: 'semi_monthly',
    createdAt: '2022-01-10T00:00:00.000Z',
  },
  {
    id: 'co_manila_bay',
    name: 'Manila Bay Logistics',
    planTier: 'growth',
    timezone: 'Asia/Manila',
    payrollFrequency: 'monthly',
    createdAt: '2023-04-02T00:00:00.000Z',
  },
  {
    id: 'co_cebu_craft',
    name: 'Cebu Craft Foods',
    planTier: 'starter',
    timezone: 'Asia/Manila',
    payrollFrequency: 'semi_monthly',
    createdAt: '2024-02-18T00:00:00.000Z',
  },
]

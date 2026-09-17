import type { Branch } from '@/types/domain'

export const branches: Branch[] = [
  { id: 'br_fl_head', companyId: 'co_frontline', name: 'Head Office – Makati', isHeadOffice: true },
  { id: 'br_fl_qc', companyId: 'co_frontline', name: 'Quezon City Branch', isHeadOffice: false },
  { id: 'br_fl_davao', companyId: 'co_frontline', name: 'Davao Branch', isHeadOffice: false },

  { id: 'br_mb_head', companyId: 'co_manila_bay', name: 'Head Office – Pasay', isHeadOffice: true },
  { id: 'br_mb_cavite', companyId: 'co_manila_bay', name: 'Cavite Warehouse', isHeadOffice: false },

  { id: 'br_cc_head', companyId: 'co_cebu_craft', name: 'Head Office – Cebu City', isHeadOffice: true },
  { id: 'br_cc_mandaue', companyId: 'co_cebu_craft', name: 'Mandaue Plant', isHeadOffice: false },
]

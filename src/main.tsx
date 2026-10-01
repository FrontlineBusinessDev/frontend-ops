import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import { seedSamplePayrollRuns } from '@/mock-data/payrollRuns'
import '@/styles/globals.css'

// Sample payroll run history (mock db) is processed through the payroll engine before the first render.
seedSamplePayrollRuns()
  .catch((error) => console.error('Sample payroll runs could not be seeded', error))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })

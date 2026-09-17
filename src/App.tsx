import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/routes'
import { ToastProvider } from '@/components/ui/Toast'

export function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  )
}

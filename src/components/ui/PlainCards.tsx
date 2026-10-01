import type { ReactNode } from 'react'
import { CardThemeContext, useCardTheme } from '@/components/ui/cardTheme'

/** Cards rendered inside keep the soft theme but drop its corner watermark icon. */
export function PlainCards({ children }: { children: ReactNode }) {
  const cardTheme = useCardTheme()
  return <CardThemeContext.Provider value={{ ...cardTheme, watermark: undefined }}>{children}</CardThemeContext.Provider>
}

import { createContext, useContext } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface CardThemeValue {
  /** Company Admin soft card theme (pastel gradients + corner watermark) — set by AppShell. */
  soft: boolean
  /** Default corner watermark for cards on the current page (its sidebar nav icon). */
  watermark?: LucideIcon
  /** True inside another Card — nested cards stay plain tiles without a watermark. */
  nested?: boolean
}

export const CardThemeContext = createContext<CardThemeValue>({ soft: false })

export function useCardTheme() {
  return useContext(CardThemeContext)
}

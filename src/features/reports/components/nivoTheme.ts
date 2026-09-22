import type { PartialTheme } from '@nivo/theming'

/**
 * Shared @nivo theme for Advanced Reports charts — every value is a CSS custom property from
 * `src/styles/globals.css` (never a literal hex), so charts stay in sync with the app's palette
 * and automatically follow dark mode, matching the existing recharts reports elsewhere in this
 * feature.
 */
export const NIVO_THEME: PartialTheme = {
  background: 'transparent',
  text: {
    fontFamily: 'var(--font-sans)',
    fontSize: 11,
    fill: 'var(--color-muted-foreground)',
  },
  axis: {
    domain: { line: { stroke: 'var(--color-border)', strokeWidth: 1 } },
    ticks: {
      line: { stroke: 'var(--color-border)', strokeWidth: 1 },
      text: { fontSize: 11, fill: 'var(--color-muted-foreground)' },
    },
    legend: { text: { fontSize: 11, fill: 'var(--color-muted-foreground)', fontWeight: 600 } },
  },
  grid: { line: { stroke: 'var(--color-border)', strokeWidth: 1 } },
  legends: { text: { fontSize: 11, fill: 'var(--color-foreground)' } },
  tooltip: {
    container: {
      background: 'var(--color-card)',
      color: 'var(--color-card-foreground)',
      fontSize: 12,
      borderRadius: 12,
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-soft-lg)',
    },
  },
  crosshair: { line: { stroke: 'var(--color-muted-foreground)', strokeWidth: 1, strokeOpacity: 0.35 } },
}

/**
 * Categorical palette for every Advanced Reports chart — deliberately red-free (no `--color-danger`
 * or any `#ef4444`/`#dc2626`-family hue). Teal brand shades plus indigo/blue/violet/amber/slate
 * accents give up to 8 distinguishable series without ever reaching for red.
 */
export const CHART_PALETTE_NO_RED = [
  'var(--color-brand-500)',
  'var(--color-chart-indigo)',
  'var(--color-chart-blue)',
  'var(--color-accent)',
  'var(--color-brand-300)',
  'var(--color-chart-violet)',
  'var(--color-brand-700)',
  'var(--color-chart-slate)',
]

/** Two-series palette for explicit "earnings vs. deductions"-style comparisons — deductions gets a neutral slate/violet hue, never red. */
export const EARNINGS_DEDUCTIONS_PALETTE = ['var(--color-brand-500)', 'var(--color-chart-violet)']

/** Two-series palette for active/inactive-style comparisons — inactive gets neutral slate, never red. */
export const ACTIVE_INACTIVE_PALETTE = ['var(--color-brand-500)', 'var(--color-chart-slate)']

/** Palette for the 4-part attendance breakdown (Present, Late, Undertime, Absent) — Absent gets a muted slate, never red. */
export const ATTENDANCE_PALETTE = ['var(--color-brand-500)', 'var(--color-accent)', 'var(--color-chart-indigo)', 'var(--color-chart-slate)']

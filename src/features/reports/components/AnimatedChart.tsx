import { motion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'

/**
 * Framer Motion wrapper for every @nivo chart in Advanced Reports — animates a fresh mount in
 * (fade + slight rise) whenever the underlying dataset changes (`key`-driven, e.g. after a
 * filter change), and gives the whole chart card a subtle lift on hover.
 */
export function AnimatedChart({
  children,
  className,
  style,
  chartKey,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Pass a value that changes with the dataset (e.g. a filter selection) to replay the entry animation. */
  chartKey?: string | number
}) {
  return (
    <motion.div
      key={chartKey}
      className={className}
      style={style}
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
      whileHover={{ scale: 1.004, transition: { duration: 0.2 } }}
    >
      {children}
    </motion.div>
  )
}

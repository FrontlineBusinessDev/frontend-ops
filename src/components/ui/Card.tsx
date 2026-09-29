import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { CardThemeContext, useCardTheme } from '@/components/ui/cardTheme'
import { cn } from '@/lib/utils/cn'

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Corner watermark icon in the soft card theme. Defaults to the page's nav icon; null hides it. */
  watermark?: LucideIcon | null
}

const CardRoot = forwardRef<HTMLDivElement, CardProps>(({ className, watermark, children, ...props }, ref) => {
  const theme = useCardTheme()
  const Watermark = theme.soft && !theme.nested ? (watermark === undefined ? theme.watermark : watermark) : null

  const card = (
    <div
      ref={ref}
      data-slot="card"
      className={cn(
        'rounded-2xl border border-border bg-card text-card-foreground shadow-soft',
        // isolate + -z-10 keeps the watermark above the card's background but behind its content.
        Watermark && 'relative isolate',
        className,
      )}
      {...props}
    >
      {Watermark && (
        <Watermark data-slot="card-watermark" aria-hidden="true" className="pointer-events-none absolute right-3 top-3 -z-10 size-16" />
      )}
      {children}
    </div>
  )

  return theme.soft ? <CardThemeContext.Provider value={{ ...theme, nested: true }}>{card}</CardThemeContext.Provider> : card
})
CardRoot.displayName = 'Card'

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-start justify-between gap-4 px-6 pt-6', className)} {...props} />
))
CardHeader.displayName = 'Card.Header'

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('font-display text-base font-semibold tracking-tight', className)} {...props} />
  ),
)
CardTitle.displayName = 'Card.Title'

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  ),
)
CardDescription.displayName = 'Card.Description'

const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-6 py-6', className)} {...props} />
))
CardBody.displayName = 'Card.Body'

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center gap-3 px-6 pb-6 pt-2', className)} {...props} />
))
CardFooter.displayName = 'Card.Footer'

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Body: CardBody,
  Footer: CardFooter,
})

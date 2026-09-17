import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'
import { initials } from '@/lib/utils/format'

export interface AvatarProps {
  name: string
  src?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = {
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-xs',
  lg: 'size-12 text-sm',
} as const

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(({ name, src, className, size = 'md' }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-semibold text-primary',
      SIZE_CLASSES[size],
      className,
    )}
  >
    <AvatarPrimitive.Image src={src} alt={name} className="size-full object-cover" />
    <AvatarPrimitive.Fallback delayMs={200}>{initials(name)}</AvatarPrimitive.Fallback>
  </AvatarPrimitive.Root>
))
Avatar.displayName = 'Avatar'

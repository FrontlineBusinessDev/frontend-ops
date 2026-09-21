import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

interface HighlightNavState {
  highlightId?: string
  tab?: string
}

/**
 * Reads a `{ highlightId, tab }` navigation state set by the notification popover, scrolls the
 * matching `id="row-{highlightId}"` element into view once it renders, and clears the highlight
 * (and the nav state, so back/refresh doesn't retrigger it) after a few seconds.
 */
export function useHighlightTarget() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state as HighlightNavState | null) ?? null
  const [highlightId, setHighlightId] = useState(state?.highlightId)

  useEffect(() => {
    const targetId = state?.highlightId
    if (!targetId) return

    let attempts = 0
    const scrollInterval = setInterval(() => {
      const el = document.getElementById(`row-${targetId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        clearInterval(scrollInterval)
      } else if (++attempts > 20) {
        clearInterval(scrollInterval)
      }
    }, 150)

    const clearTimer = setTimeout(() => {
      setHighlightId(undefined)
      navigate(location.pathname, { replace: true, state: null })
    }, 2600)

    return () => {
      clearInterval(scrollInterval)
      clearTimeout(clearTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.highlightId])

  return { highlightId, tab: state?.tab }
}

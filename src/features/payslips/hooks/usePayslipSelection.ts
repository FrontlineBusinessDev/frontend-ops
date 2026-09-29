import { useCallback, useMemo, useState } from 'react'

/** Row selection for a payslip table (checkbox per row + select-all in the header). */
export function usePayslipSelection(allIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // Drop selections for rows that are no longer listed.
  const visibleSelected = useMemo(() => new Set(allIds.filter((id) => selected.has(id))), [allIds, selected])
  const toggle = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])
  const allChecked = allIds.length > 0 && visibleSelected.size === allIds.length
  const toggleAll = useCallback((checked: boolean) => setSelected(checked ? new Set(allIds) : new Set()), [allIds])
  return {
    selected: visibleSelected,
    toggle,
    toggleAll,
    allChecked,
    headerState: (allChecked ? true : visibleSelected.size > 0 ? 'indeterminate' : false) as boolean | 'indeterminate',
    clear: () => setSelected(new Set()),
  }
}

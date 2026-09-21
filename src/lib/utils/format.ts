const phpFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
})

export function formatCurrency(amount: number) {
  return phpFormatter.format(amount)
}

export function formatDate(value: string | Date, opts?: Intl.DateTimeFormatOptions) {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...opts,
  }).format(date)
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

interface AddressLike {
  buildingUnit?: string
  street?: string
  barangay?: string
  city?: string
  province?: string
  region?: string
  zipCode?: string
  country: string
}

export function formatAddress(address: AddressLike) {
  return [address.buildingUnit, address.street, address.barangay, address.city, address.province, address.zipCode, address.country]
    .filter(Boolean)
    .join(', ')
}

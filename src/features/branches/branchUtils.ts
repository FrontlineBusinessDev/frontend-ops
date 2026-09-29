import type { Employee } from '@/types/domain'

export function fullName(e: Employee) {
  return `${e.personal.firstName} ${e.personal.lastName}`
}

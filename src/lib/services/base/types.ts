export interface PaginatedResult<T> {
  items: T[]
  total: number
}

export type ServiceErrorCode = 'not_found' | 'forbidden' | 'unknown'

export class ServiceError extends Error {
  code: ServiceErrorCode

  constructor(message: string, code: ServiceErrorCode = 'unknown') {
    super(message)
    this.name = 'ServiceError'
    this.code = code
  }
}

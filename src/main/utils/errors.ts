export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: unknown

  constructor(message: string, code = 'INTERNAL_ERROR', statusCode = 500, details?: unknown) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.details = details
    Error.captureStackTrace?.(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details)
  }
}

export class AuthError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHENTICATED') {
    super(message, code, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied: insufficient permissions', details?: unknown) {
    super(message, 'FORBIDDEN', 403, details)
  }
}

export class ModuleDisabledError extends AppError {
  constructor(moduleName: string) {
    super(`Module '${moduleName}' is disabled for this business`, 'MODULE_DISABLED', 403)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const detail = identifier ? ` with identifier '${identifier}'` : ''
    super(`${resource}${detail} not found`, 'NOT_FOUND', 404)
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT', 409, details)
  }
}

export class BusinessIsolationError extends AppError {
  constructor(message = 'Cross-business operation prohibited') {
    super(message, 'BUSINESS_ISOLATION_VIOLATION', 403)
  }
}

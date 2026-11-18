import { describe, it, expect } from 'vitest'
import {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  ModuleDisabledError,
  NotFoundError,
  ConflictError,
  BusinessIsolationError
} from '../../src/main/utils/errors'

describe('Application Typed Errors', () => {
  it('ValidationError should hold code and details', () => {
    const err = new ValidationError('Invalid phone number', { field: 'phone' })
    expect(err).toBeInstanceOf(AppError)
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.statusCode).toBe(400)
    expect(err.details).toEqual({ field: 'phone' })
    expect(err.message).toBe('Invalid phone number')
  })

  it('AuthError should have 401 code', () => {
    const err = new AuthError('Bad credentials', 'INVALID_CREDENTIALS')
    expect(err.code).toBe('INVALID_CREDENTIALS')
    expect(err.statusCode).toBe(401)
  })

  it('ForbiddenError should have 403 code', () => {
    const err = new ForbiddenError('Permission customers:delete required')
    expect(err.code).toBe('FORBIDDEN')
    expect(err.statusCode).toBe(403)
  })

  it('ModuleDisabledError should describe module', () => {
    const err = new ModuleDisabledError('inventory')
    expect(err.code).toBe('MODULE_DISABLED')
    expect(err.message).toContain('inventory')
  })

  it('NotFoundError should format message', () => {
    const err = new NotFoundError('Customer', 'c-123')
    expect(err.code).toBe('NOT_FOUND')
    expect(err.message).toBe("Customer with identifier 'c-123' not found")
  })

  it('ConflictError and BusinessIsolationError create expected codes', () => {
    expect(new ConflictError('Duplicate username').code).toBe('CONFLICT')
    expect(new BusinessIsolationError().code).toBe('BUSINESS_ISOLATION_VIOLATION')
  })
})

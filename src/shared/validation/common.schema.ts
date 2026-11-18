import { z } from 'zod'

/**
 * Strict MoneyAmount integer validator.
 * Asserts the value is a safe integer (representing the smallest currency unit).
 */
export const moneyAmountSchema = z
  .number({
    required_error: 'Money amount is required',
    invalid_type_error: 'Money amount must be an integer number'
  })
  .int('Money amount must be an integer in smallest currency unit')
  .refine((val) => Number.isSafeInteger(val), {
    message: 'Money amount exceeds safe integer limit'
  })

export const nonNegativeMoneySchema = z
  .number({
    required_error: 'Money amount is required',
    invalid_type_error: 'Money amount must be an integer number'
  })
  .int('Money amount must be an integer in smallest currency unit')
  .min(0, 'Money amount cannot be negative')
  .refine((val) => Number.isSafeInteger(val), {
    message: 'Money amount exceeds safe integer limit'
  })

export const positiveMoneySchema = z
  .number({
    required_error: 'Money amount is required',
    invalid_type_error: 'Money amount must be an integer number'
  })
  .int('Money amount must be an integer in smallest currency unit')
  .positive('Money amount must be greater than zero')
  .refine((val) => Number.isSafeInteger(val), {
    message: 'Money amount exceeds safe integer limit'
  })

export const uuidSchema = z.string().uuid('Invalid UUID format')

export const isoDateTimeSchema = z.string().datetime({
  message: 'Invalid ISO datetime format'
})

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in format YYYY-MM-DD')

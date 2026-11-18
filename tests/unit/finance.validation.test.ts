import { describe, it, expect } from 'vitest'
import {
  createExpenseSchema,
  updateExpenseSchema,
  createExpenseCategorySchema,
  dateRangeFilterSchema
} from '../../src/shared/validation/finance.schema'

describe('Finance & Expenses Validation Schemas', () => {
  it('validates a valid createExpense payload', () => {
    const valid = {
      categoryId: 'cat-123',
      amount: 450000,
      paymentMethod: 'Bank Transfer' as const,
      paidTo: 'Ceylon Electricity Board',
      referenceNo: 'BILL-99881',
      notes: 'Monthly workshop utility bill',
      expenseDate: '2026-11-13'
    }

    const parsed = createExpenseSchema.parse(valid)
    expect(parsed.amount).toBe(450000)
    expect(parsed.paymentMethod).toBe('Bank Transfer')
    expect(parsed.paidTo).toBe('Ceylon Electricity Board')
  })

  it('rejects negative or zero expense amount', () => {
    const invalidNegative = {
      categoryId: 'cat-123',
      amount: -500
    }
    expect(() => createExpenseSchema.parse(invalidNegative)).toThrow()

    const invalidZero = {
      categoryId: 'cat-123',
      amount: 0
    }
    expect(() => createExpenseSchema.parse(invalidZero)).toThrow()
  })

  it('validates and defaults payment method to Cash', () => {
    const minimal = {
      categoryId: 'cat-123',
      amount: 15000
    }

    const parsed = createExpenseSchema.parse(minimal)
    expect(parsed.paymentMethod).toBe('Cash')
  })

  it('validates dateRangeFilterSchema and rejects reversed dates', () => {
    const valid = {
      startDate: '2026-01-01',
      endDate: '2026-12-31'
    }
    expect(() => dateRangeFilterSchema.parse(valid)).not.toThrow()

    const reversed = {
      startDate: '2026-12-31',
      endDate: '2026-01-01'
    }
    expect(() => dateRangeFilterSchema.parse(reversed)).toThrow(/Start date cannot be after end date/)
  })

  it('validates expense category creation', () => {
    const valid = {
      name: 'Workshop Insurance',
      description: 'Annual facility and equipment coverage'
    }
    const parsed = createExpenseCategorySchema.parse(valid)
    expect(parsed.name).toBe('Workshop Insurance')

    expect(() => createExpenseCategorySchema.parse({ name: '' })).toThrow(/Category name is required/)
  })
})

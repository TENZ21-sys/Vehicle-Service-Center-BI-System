import { describe, it, expect } from 'vitest'
import {
  assertValidMoneyAmount,
  isValidMoneyAmount,
  formatMoney,
  toMoneyAmount
} from '../../src/shared/types/money.types'

describe('Money Calculations and Integer Invariant', () => {
  it('should accept valid integers as MoneyAmount', () => {
    expect(isValidMoneyAmount(100)).toBe(true)
    expect(isValidMoneyAmount(0)).toBe(true)
    expect(isValidMoneyAmount(-500)).toBe(true)
    expect(() => assertValidMoneyAmount(2500)).not.toThrow()
  })

  it('should strictly reject floats for MoneyAmount', () => {
    expect(isValidMoneyAmount(10.5)).toBe(false)
    expect(isValidMoneyAmount(0.01)).toBe(false)
    expect(isValidMoneyAmount(NaN)).toBe(false)
    expect(isValidMoneyAmount(Infinity)).toBe(false)
    expect(isValidMoneyAmount('100')).toBe(false)

    expect(() => assertValidMoneyAmount(12.34)).toThrow(TypeError)
    expect(() => assertValidMoneyAmount(99.99)).toThrow(
      'MoneyAmount must be an integer in smallest currency units'
    )
  })

  it('should accurately convert decimal strings/numbers to smallest currency unit integers', () => {
    // 150.50 LKR -> 15050 cents
    expect(toMoneyAmount('150.50', 2)).toBe(15050)
    expect(toMoneyAmount(150.5, 2)).toBe(15050)
    expect(toMoneyAmount('0.05', 2)).toBe(5)
    expect(toMoneyAmount(0, 2)).toBe(0)
    expect(toMoneyAmount('1000', 2)).toBe(100000)
    // 3 decimals
    expect(toMoneyAmount('1.234', 3)).toBe(1234)
  })

  it('should format money amount integers into display strings', () => {
    expect(formatMoney(15050, 'LKR', 2)).toBe('LKR 150.50')
    expect(formatMoney(0, 'LKR', 2)).toBe('LKR 0.00')
    expect(formatMoney(5, 'LKR', 2)).toBe('LKR 0.05')
    expect(formatMoney(10000000, 'LKR', 2)).toBe('LKR 100,000.00')
  })

  it('should throw when trying to format a float directly', () => {
    expect(() => formatMoney(150.5 as unknown as number, 'LKR', 2)).toThrow(TypeError)
  })
})

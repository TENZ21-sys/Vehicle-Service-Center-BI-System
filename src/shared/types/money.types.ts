/**
 * MoneyAmount represents an amount of money stored as an integer
 * in the smallest currency unit (e.g., cents, paise, lkr cents).
 * Floats are strictly prohibited.
 */
export type MoneyAmount = number

export function assertValidMoneyAmount(value: unknown): asserts value is MoneyAmount {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new TypeError(`MoneyAmount must be an integer in smallest currency units. Received: ${value}`)
  }
}

export function isValidMoneyAmount(value: unknown): value is MoneyAmount {
  return typeof value === 'number' && Number.isInteger(value)
}

/**
 * Format a MoneyAmount integer into a display string.
 * Example: 150000 with 2 decimals and 'LKR' -> 'LKR 1,500.00'
 */
export function formatMoney(
  amount: MoneyAmount,
  currencyCode = 'LKR',
  decimals = 2
): string {
  assertValidMoneyAmount(amount)
  const divisor = Math.pow(10, decimals)
  const floatVal = amount / divisor
  return `${currencyCode} ${floatVal.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`
}

/**
 * Parse a decimal string or float-like number to MoneyAmount integer in smallest currency unit.
 * Example: '150.50' with 2 decimals -> 15050
 */
export function toMoneyAmount(displayValue: string | number, decimals = 2): MoneyAmount {
  const num = typeof displayValue === 'string' ? parseFloat(displayValue) : displayValue
  if (isNaN(num)) {
    throw new TypeError(`Cannot convert ${displayValue} to MoneyAmount`)
  }
  const multiplier = Math.pow(10, decimals)
  return Math.round(num * multiplier)
}

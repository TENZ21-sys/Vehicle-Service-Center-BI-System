import { describe, it, expect } from 'vitest'
import { createCustomerSchema, updateCustomerSchema } from '../../src/shared/validation/customer.schema'

describe('Customer Validation Schema', () => {
  it('validates a valid customer profile', () => {
    const valid = {
      name: 'Sunil Wickramasinghe',
      phonePrimary: '+94 77 123 4567',
      phoneSecondary: '011 234 5678',
      email: 'sunil@example.com',
      address: '45 Galle Road, Colombo 03',
      nic: '851234567V',
      notes: 'VIP customer, preferred service advisor: John'
    }

    const res = createCustomerSchema.safeParse(valid)
    expect(res.success).toBe(true)
  })

  it('rejects missing or short customer name', () => {
    const invalid = {
      name: 'A',
      phonePrimary: '0771234567'
    }
    const res = createCustomerSchema.safeParse(invalid)
    expect(res.success).toBe(false)
  })

  it('rejects invalid phone numbers with symbols other than digits/plus/dash', () => {
    const invalid = {
      name: 'Kamal Perera',
      phonePrimary: '077-1234abc'
    }
    const res = createCustomerSchema.safeParse(invalid)
    expect(res.success).toBe(false)
  })

  it('allows partial updates and deactivation', () => {
    expect(updateCustomerSchema.safeParse({ name: 'Updated Name' }).success).toBe(true)
    expect(updateCustomerSchema.safeParse({ isActive: false }).success).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import {
  moneyAmountSchema,
  nonNegativeMoneySchema,
  positiveMoneySchema,
  uuidSchema
} from '../../src/shared/validation/common.schema'
import {
  loginSchema,
  createUserSchema,
  updateUserSchema
} from '../../src/shared/validation/user.schema'
import {
  createBusinessSchema,
  updateBusinessProfileSchema
} from '../../src/shared/validation/setting.schema'

describe('Validation Schemas', () => {
  describe('Money Schemas', () => {
    it('validates integer money amounts and rejects floats', () => {
      expect(moneyAmountSchema.safeParse(5000).success).toBe(true)
      expect(moneyAmountSchema.safeParse(0).success).toBe(true)
      expect(moneyAmountSchema.safeParse(-200).success).toBe(true)

      const floatResult = moneyAmountSchema.safeParse(12.34)
      expect(floatResult.success).toBe(false)
      if (!floatResult.success) {
        expect(floatResult.error.issues[0].message).toContain('must be an integer')
      }
    })

    it('enforces non-negative and positive bounds', () => {
      expect(nonNegativeMoneySchema.safeParse(0).success).toBe(true)
      expect(nonNegativeMoneySchema.safeParse(100).success).toBe(true)
      expect(nonNegativeMoneySchema.safeParse(-1).success).toBe(false)

      expect(positiveMoneySchema.safeParse(1).success).toBe(true)
      expect(positiveMoneySchema.safeParse(0).success).toBe(false)
      expect(positiveMoneySchema.safeParse(-5).success).toBe(false)
    })
  })

  describe('UUID Schema', () => {
    it('accepts valid UUID v4', () => {
      expect(uuidSchema.safeParse('123e4567-e89b-12d3-a456-426614174000').success).toBe(true)
    })

    it('rejects invalid strings', () => {
      expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false)
    })
  })

  describe('User Schemas', () => {
    it('validates login input', () => {
      expect(loginSchema.safeParse({ username: 'admin', password: 'password123' }).success).toBe(true)
      expect(loginSchema.safeParse({ username: 'a', password: '123' }).success).toBe(false)
    })

    it('validates create user schema with roles', () => {
      const validUser = {
        username: 'john_doe',
        password: 'securePassword123',
        displayName: 'John Doe',
        email: 'john@example.com',
        phone: '0771234567',
        roleIds: ['123e4567-e89b-12d3-a456-426614174000']
      }
      expect(createUserSchema.safeParse(validUser).success).toBe(true)

      // Missing roleIds
      expect(createUserSchema.safeParse({ ...validUser, roleIds: [] }).success).toBe(false)

      // Invalid username characters
      expect(createUserSchema.safeParse({ ...validUser, username: 'john doe!' }).success).toBe(false)

      // Password too short
      expect(createUserSchema.safeParse({ ...validUser, password: 'short' }).success).toBe(false)
    })

    it('validates update user schema', () => {
      expect(updateUserSchema.safeParse({ displayName: 'New Name' }).success).toBe(true)
      expect(updateUserSchema.safeParse({ isActive: false }).success).toBe(true)
    })
  })

  describe('Business & Settings Schemas', () => {
    it('validates create business input', () => {
      const validBiz = {
        name: 'AutoCare Center',
        ownerUsername: 'owner_admin',
        ownerPassword: 'ownerPassword123',
        ownerDisplayName: 'Center Owner',
        currencyCode: 'LKR'
      }
      expect(createBusinessSchema.safeParse(validBiz).success).toBe(true)

      // Short name
      expect(createBusinessSchema.safeParse({ ...validBiz, name: 'A' }).success).toBe(false)
    })

    it('validates business profile update', () => {
      const validProfile = {
        business_name: 'Metro Auto Workshop',
        address: '123 Main Street, Colombo',
        phone: '+94112345678',
        email: 'info@metroauto.lk',
        logo_path: '',
        currency_code: 'LKR',
        currency_symbol: 'Rs.',
        currency_decimals: 2
      }
      expect(updateBusinessProfileSchema.safeParse(validProfile).success).toBe(true)
    })
  })
})

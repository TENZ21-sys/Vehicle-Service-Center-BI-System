import { z } from 'zod'
import { uuidSchema } from './common.schema'

export const loginSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters'),
  password: z.string().optional()
})

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain alphanumeric characters, dots, underscores and dashes'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password cannot exceed 100 characters'),
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name cannot exceed 100 characters'),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().trim().max(20, 'Phone cannot exceed 20 characters').optional().or(z.literal('')),
  roleIds: z.array(uuidSchema).min(1, 'User must have at least one assigned role'),
  securityQuestion: z.string().trim().max(200).optional().or(z.literal('')),
  securityAnswer: z.string().trim().max(200).optional().or(z.literal(''))
})

export const updateUserSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name cannot exceed 100 characters')
    .optional(),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().trim().max(20, 'Phone cannot exceed 20 characters').optional().or(z.literal('')),
  roleIds: z.array(uuidSchema).min(1, 'User must have at least one assigned role').optional(),
  isActive: z.boolean().optional(),
  securityQuestion: z.string().trim().max(200).optional().or(z.literal('')),
  securityAnswer: z.string().trim().max(200).optional().or(z.literal(''))
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().optional().or(z.literal('')),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(100)
})

export const resetWithSecurityAnswerSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  securityAnswer: z.string().trim().min(1, 'Security answer is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(100)
})

export const resetWithMasterKeySchema = z.object({
  masterRecoveryKey: z.string().trim().min(10, 'Valid emergency recovery key is required'),
  targetUsername: z.string().trim().min(1, 'Target username is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(100)
})

export const deleteAccountSchema = z.object({
  userId: uuidSchema,
  verificationPassword: z.string().min(1, 'Password verification is required')
})

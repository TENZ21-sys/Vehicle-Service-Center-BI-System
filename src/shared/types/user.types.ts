import { BaseEntity, UUID } from './common.types'
import { Role } from './role.types'
import { PermissionKey } from './permission.types'

export interface User extends BaseEntity {
  username: string
  displayName: string
  email?: string
  phone?: string
  isActive: boolean
  mustChangePassword?: boolean
  lastLoginAt?: string
  securityQuestion?: string
  roles?: Role[]
}

export interface UserWithPasswordHash extends User {
  passwordHash: string
  securityAnswerHash?: string
  recoveryPinHash?: string
}

export interface AuthSession {
  userId: UUID
  username: string
  displayName: string
  roleIds: UUID[]
  permissions: PermissionKey[]
  businessId: UUID
  businessName: string
}

export interface CreateUserInput {
  username: string
  password: string
  displayName: string
  email?: string
  phone?: string
  roleIds: string[]
  securityQuestion?: string
  securityAnswer?: string
}

export interface UpdateUserInput {
  displayName?: string
  email?: string
  phone?: string
  roleIds?: string[]
  securityQuestion?: string
  securityAnswer?: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export interface ResetWithSecurityAnswerInput {
  username: string
  securityAnswer: string
  newPassword: string
}

export interface ResetWithMasterKeyInput {
  masterRecoveryKey: string
  targetUsername: string
  newPassword: string
}

export interface DeleteAccountInput {
  userId: string
  verificationPassword: string
}

export interface StaffLookupResult {
  username: string
  displayName: string
  roleName: string
  hasSecurityQuestion: boolean
}

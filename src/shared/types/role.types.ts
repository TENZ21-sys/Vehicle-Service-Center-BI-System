import { BaseEntity, UUID } from './common.types'
import { PermissionKey } from './permission.types'

export interface Role extends BaseEntity {
  name: string
  description?: string
  isSystem: boolean
  isOwner: boolean
  isActive: boolean
  permissions?: PermissionKey[]
}

export interface RolePermissionLink {
  roleId: UUID
  permissionId: UUID
}

export interface UserRoleLink {
  userId: UUID
  roleId: UUID
  assignedAt: string
  assignedBy?: UUID
}

import { PermissionRepository } from '../repositories/permissions.repo'
import { sessionManager } from './session'
import { AuditService } from './audit.service'
import { PermissionKey, Permission } from '@shared/types/permission.types'
import { Role } from '@shared/types/role.types'
import { ForbiddenError, ModuleDisabledError } from '../utils/errors'
import { DatabaseManager } from '../database/connection'

export class PermissionService {
  private repo: PermissionRepository
  private audit: AuditService

  constructor(repo = new PermissionRepository(), audit = new AuditService()) {
    this.repo = repo
    this.audit = audit
  }

  /**
   * Enforces backend permission check on the current active session.
   * Logs permission violations to audit log.
   */
  public requirePermission(permission: PermissionKey): void {
    const session = sessionManager.requireSession()
    if (!sessionManager.hasPermission(permission)) {
      this.audit.record({
        userId: session.userId,
        action: 'PERMISSION_DENIED',
        metadata: { requiredPermission: permission }
      })
      throw new ForbiddenError(`Access denied: requires permission '${permission}'`)
    }
  }

  /**
   * Enforces that a module feature toggle is enabled.
   */
  public requireModuleEnabled(moduleName: string): void {
    const db = DatabaseManager.getInstance().getActiveDb()
    const key = `module_${moduleName}`
    const row = db
      .prepare("SELECT value FROM settings WHERE category = 'feature_toggles' AND key = ?")
      .get(key) as { value: string } | undefined

    if (row) {
      try {
        const isEnabled = JSON.parse(row.value)
        if (isEnabled === false) {
          throw new ModuleDisabledError(moduleName)
        }
      } catch (e) {
        if (e instanceof ModuleDisabledError) throw e
      }
    }
  }

  public listPermissions(): Permission[] {
    return this.repo.getAllPermissions()
  }

  public listRoles(includeInactive = false): Role[] {
    return this.repo.getAllRoles(includeInactive)
  }

  public getRole(id: string): Role {
    return this.repo.getRoleById(id)
  }

  public createRole(name: string, description: string, permissionKeys: PermissionKey[]): Role {
    this.requirePermission('settings:roles')
    const role = this.repo.createRole(name, description, permissionKeys)
    const session = sessionManager.getSession()
    this.audit.record({
      userId: session?.userId,
      action: 'ROLE_CREATED',
      entityType: 'role',
      entityId: role.id,
      newValue: role
    })
    return role
  }

  public updateRole(
    id: string,
    updates: { name?: string; description?: string; permissions?: PermissionKey[] }
  ): Role {
    this.requirePermission('settings:roles')
    const oldRole = this.repo.getRoleById(id)
    const newRole = this.repo.updateRole(id, updates)
    const session = sessionManager.getSession()

    this.audit.record({
      userId: session?.userId,
      action: updates.permissions ? 'PERMISSIONS_MODIFIED' : 'ROLE_UPDATED',
      entityType: 'role',
      entityId: id,
      oldValue: oldRole,
      newValue: newRole
    })
    return newRole
  }

  public deactivateRole(id: string): void {
    this.requirePermission('settings:roles')
    const oldRole = this.repo.getRoleById(id)
    this.repo.deactivateRole(id)
    const session = sessionManager.getSession()

    this.audit.record({
      userId: session?.userId,
      action: 'ROLE_UPDATED',
      entityType: 'role',
      entityId: id,
      oldValue: oldRole,
      newValue: { ...oldRole, isActive: false }
    })
  }
}

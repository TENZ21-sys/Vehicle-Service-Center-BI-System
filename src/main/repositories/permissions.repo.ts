import { DatabaseManager } from '../database/connection'
import { v4 as uuidv4 } from 'uuid'
import { Role } from '@shared/types/role.types'
import { Permission, PermissionKey } from '@shared/types/permission.types'
import { ForbiddenError, NotFoundError, ConflictError } from '../utils/errors'

export class PermissionRepository {
  private dbManager: DatabaseManager

  constructor(dbManager = DatabaseManager.getInstance()) {
    this.dbManager = dbManager
  }

  public getAllPermissions(): Permission[] {
    const db = this.dbManager.getActiveDb()
    const stmt = db.prepare('SELECT id, key, module, description, created_at as createdAt FROM permissions ORDER BY module, key ASC')
    return stmt.all() as Permission[]
  }

  public getAllRoles(includeInactive = false): Role[] {
    const db = this.dbManager.getActiveDb()
    const query = `
      SELECT id, name, description, is_system as isSystem, is_owner as isOwner,
             is_active as isActive, created_at as createdAt, updated_at as updatedAt
      FROM roles
      ${includeInactive ? '' : 'WHERE is_active = 1'}
      ORDER BY is_owner DESC, is_system DESC, name ASC
    `
    const roles = db.prepare(query).all() as Role[]
    return roles.map((r) => ({
      ...r,
      permissions: this.getRolePermissionKeys(r.id)
    }))
  }

  public getRoleById(id: string): Role {
    const db = this.dbManager.getActiveDb()
    const stmt = db.prepare(`
      SELECT id, name, description, is_system as isSystem, is_owner as isOwner,
             is_active as isActive, created_at as createdAt, updated_at as updatedAt
      FROM roles
      WHERE id = ?
    `)
    const role = stmt.get(id) as Role | undefined
    if (!role) {
      throw new NotFoundError('Role', id)
    }
    return {
      ...role,
      permissions: this.getRolePermissionKeys(role.id)
    }
  }

  public getRolePermissionKeys(roleId: string): PermissionKey[] {
    const db = this.dbManager.getActiveDb()
    const query = `
      SELECT p.key
      FROM permissions p
      INNER JOIN role_permissions rp ON rp.permission_id = p.id
      WHERE rp.role_id = ?
    `
    const rows = db.prepare(query).all(roleId) as { key: PermissionKey }[]
    return rows.map((r) => r.key)
  }

  public createRole(name: string, description: string, permissionKeys: PermissionKey[]): Role {
    const db = this.dbManager.getActiveDb()
    const existing = db.prepare('SELECT id FROM roles WHERE name = ?').get(name)
    if (existing) {
      throw new ConflictError(`A role with the name "${name}" already exists.`)
    }

    const id = uuidv4()
    const now = new Date().toISOString()

    const createTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO roles (id, name, description, is_system, is_owner, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 0, 0, 1, ?, ?)
      `).run(id, name, description, now, now)

      this.assignPermissionsToRole(id, permissionKeys)
    })

    createTx()
    return this.getRoleById(id)
  }

  public updateRole(
    id: string,
    updates: { name?: string; description?: string; permissions?: PermissionKey[] }
  ): Role {
    const db = this.dbManager.getActiveDb()
    const role = this.getRoleById(id)
    const now = new Date().toISOString()

    // Protected Owner Role invariant: Owner cannot lose settings permissions
    if (role.isOwner && updates.permissions) {
      const settingsPerms: PermissionKey[] = [
        'settings:view',
        'settings:edit',
        'settings:users',
        'settings:roles',
        'settings:permissions'
      ]
      for (const sp of settingsPerms) {
        if (!updates.permissions.includes(sp)) {
          throw new ForbiddenError(
            `The Business Owner / Admin role cannot lose settings permissions (${sp}).`
          )
        }
      }
    }

    const updateTx = db.transaction(() => {
      if (updates.name || updates.description !== undefined) {
        db.prepare(`
          UPDATE roles
          SET name = COALESCE(?, name),
              description = COALESCE(?, description),
              updated_at = ?
          WHERE id = ?
        `).run(updates.name || null, updates.description !== undefined ? updates.description : null, now, id)
      }

      if (updates.permissions) {
        db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(id)
        this.assignPermissionsToRole(id, updates.permissions)
      }
    })

    updateTx()
    return this.getRoleById(id)
  }

  public deactivateRole(id: string): void {
    const role = this.getRoleById(id)
    if (role.isSystem) {
      throw new ForbiddenError(`System role "${role.name}" cannot be deactivated.`)
    }

    const db = this.dbManager.getActiveDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE roles SET is_active = 0, updated_at = ? WHERE id = ?').run(now, id)
  }

  private assignPermissionsToRole(roleId: string, permissionKeys: PermissionKey[]): void {
    const db = this.dbManager.getActiveDb()
    const linkStmt = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)')

    const permStmt = db.prepare('SELECT id FROM permissions WHERE key = ?')
    for (const key of permissionKeys) {
      const permRow = permStmt.get(key) as { id: string } | undefined
      if (permRow) {
        linkStmt.run(roleId, permRow.id)
      }
    }
  }
}

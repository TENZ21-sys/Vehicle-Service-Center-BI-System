import { DatabaseManager } from '../database/connection'
import { v4 as uuidv4 } from 'uuid'
import { User, UserWithPasswordHash, StaffLookupResult } from '@shared/types/user.types'
import { Role } from '@shared/types/role.types'
import { PermissionKey } from '@shared/types/permission.types'
import { NotFoundError } from '../utils/errors'

export class UserRepository {
  private dbManager: DatabaseManager

  constructor(dbManager = DatabaseManager.getInstance()) {
    this.dbManager = dbManager
  }

  public findByUsername(username: string): UserWithPasswordHash | null {
    const db = this.dbManager.getActiveDb()
    const stmt = db.prepare(`
      SELECT id, username, password_hash as passwordHash, display_name as displayName,
             email, phone, is_active as isActive, must_change_pwd as mustChangePassword,
             last_login_at as lastLoginAt, created_at as createdAt, updated_at as updatedAt,
             security_question as securityQuestion, security_answer_hash as securityAnswerHash,
             recovery_pin_hash as recoveryPinHash
      FROM users
      WHERE username = ? AND is_active = 1
    `)
    const row = stmt.get(username) as UserWithPasswordHash | undefined
    return row || null
  }

  public findById(id: string): User | null {
    const db = this.dbManager.getActiveDb()
    const stmt = db.prepare(`
      SELECT id, username, display_name as displayName, email, phone,
             is_active as isActive, must_change_pwd as mustChangePassword,
             last_login_at as lastLoginAt, created_at as createdAt, updated_at as updatedAt,
             security_question as securityQuestion
      FROM users
      WHERE id = ?
    `)
    const row = stmt.get(id) as User | undefined
    if (!row) return null

    const roles = this.getUserRoles(row.id)
    return { ...row, roles }
  }

  public findAll(includeInactive = false): User[] {
    const db = this.dbManager.getActiveDb()
    const query = `
      SELECT id, username, display_name as displayName, email, phone,
             is_active as isActive, must_change_pwd as mustChangePassword,
             last_login_at as lastLoginAt, created_at as createdAt, updated_at as updatedAt,
             security_question as securityQuestion
      FROM users
      ${includeInactive ? '' : 'WHERE is_active = 1'}
      ORDER BY display_name ASC
    `
    const users = db.prepare(query).all() as User[]
    return users.map((u) => ({
      ...u,
      roles: this.getUserRoles(u.id)
    }))
  }

  public create(userData: {
    username: string
    passwordHash: string
    displayName: string
    email?: string
    phone?: string
    roleIds: string[]
    securityQuestion?: string
    securityAnswerHash?: string
  }): User {
    const db = this.dbManager.getActiveDb()
    const id = uuidv4()
    const now = new Date().toISOString()

    const createTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO users (
          id, username, password_hash, display_name, email, phone,
          security_question, security_answer_hash,
          is_active, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        id,
        userData.username,
        userData.passwordHash,
        userData.displayName,
        userData.email || null,
        userData.phone || null,
        userData.securityQuestion || null,
        userData.securityAnswerHash || null,
        now,
        now
      )

      const linkStmt = db.prepare(`
        INSERT INTO user_roles (user_id, role_id, assigned_at)
        VALUES (?, ?, ?)
      `)
      for (const roleId of userData.roleIds) {
        linkStmt.run(id, roleId, now)
      }
    })

    createTx()
    const created = this.findById(id)
    if (!created) throw new NotFoundError('User', id)
    return created
  }

  public update(
    id: string,
    updates: Partial<User> & { securityAnswerHash?: string },
    roleIds?: string[]
  ): User {
    const db = this.dbManager.getActiveDb()
    const now = new Date().toISOString()

    const updateTx = db.transaction(() => {
      const sets: string[] = ['updated_at = ?']
      const params: (string | number | null)[] = [now]

      if (updates.displayName !== undefined) {
        sets.push('display_name = ?')
        params.push(updates.displayName)
      }
      if (updates.email !== undefined) {
        sets.push('email = ?')
        params.push(updates.email || null)
      }
      if (updates.phone !== undefined) {
        sets.push('phone = ?')
        params.push(updates.phone || null)
      }
      if (updates.isActive !== undefined) {
        sets.push('is_active = ?')
        params.push(updates.isActive ? 1 : 0)
      }
      if (updates.securityQuestion !== undefined) {
        sets.push('security_question = ?')
        params.push(updates.securityQuestion || null)
      }
      if (updates.securityAnswerHash !== undefined) {
        sets.push('security_answer_hash = ?')
        params.push(updates.securityAnswerHash || null)
      }

      params.push(id)
      db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...params)

      if (roleIds) {
        db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(id)
        const linkStmt = db.prepare('INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES (?, ?, ?)')
        for (const roleId of roleIds) {
          linkStmt.run(id, roleId, now)
        }
      }
    })

    updateTx()
    const updated = this.findById(id)
    if (!updated) throw new NotFoundError('User', id)
    return updated
  }

  public updatePassword(id: string, passwordHash: string): void {
    const db = this.dbManager.getActiveDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE users SET password_hash = ?, must_change_pwd = 0, updated_at = ? WHERE id = ?').run(
      passwordHash,
      now,
      id
    )
  }

  public updateSecurityQuestion(id: string, question: string, answerHash: string): void {
    const db = this.dbManager.getActiveDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE users SET security_question = ?, security_answer_hash = ?, updated_at = ? WHERE id = ?').run(
      question,
      answerHash,
      now,
      id
    )
  }

  public updateLastLogin(id: string): void {
    const db = this.dbManager.getActiveDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, id)
  }

  public countActiveOwners(): number {
    const db = this.dbManager.getActiveDb()
    const query = `
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE r.is_owner = 1 AND u.is_active = 1
    `
    const row = db.prepare(query).get() as { count: number }
    return row?.count || 0
  }

  public findStaffDirectory(): StaffLookupResult[] {
    const db = this.dbManager.getActiveDb()
    const query = `
      SELECT u.username, u.display_name as displayName,
             COALESCE(r.name, 'Staff') as roleName,
             CASE WHEN u.security_question IS NOT NULL AND u.security_question != '' THEN 1 ELSE 0 END as hasSecurityQuestion
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.is_active = 1
      GROUP BY u.id
      ORDER BY u.display_name ASC
    `
    const rows = db.prepare(query).all() as Array<{
      username: string
      displayName: string
      roleName: string
      hasSecurityQuestion: number
    }>

    return rows.map((r) => ({
      username: r.username,
      displayName: r.displayName,
      roleName: r.roleName,
      hasSecurityQuestion: Boolean(r.hasSecurityQuestion)
    }))
  }

  public findByContact(contact: string): StaffLookupResult[] {
    const db = this.dbManager.getActiveDb()
    const trimmed = contact.trim().toLowerCase()
    const likePattern = `%${trimmed}%`
    const query = `
      SELECT u.username, u.display_name as displayName,
             COALESCE(r.name, 'Staff') as roleName,
             CASE WHEN u.security_question IS NOT NULL AND u.security_question != '' THEN 1 ELSE 0 END as hasSecurityQuestion
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.is_active = 1 AND (
        LOWER(u.email) = ? OR LOWER(u.email) LIKE ?
        OR u.phone = ? OR u.phone LIKE ?
        OR LOWER(u.username) = ? OR LOWER(u.username) LIKE ?
      )
      GROUP BY u.id
    `
    const rows = db.prepare(query).all(
      trimmed, likePattern,
      contact.trim(), likePattern,
      trimmed, likePattern
    ) as Array<{
      username: string
      displayName: string
      roleName: string
      hasSecurityQuestion: number
    }>

    return rows.map((r) => ({
      username: r.username,
      displayName: r.displayName,
      roleName: r.roleName,
      hasSecurityQuestion: Boolean(r.hasSecurityQuestion)
    }))
  }

  public getUserRoles(userId: string): Role[] {
    const db = this.dbManager.getActiveDb()
    const query = `
      SELECT r.id, r.name, r.description, r.is_system as isSystem,
             r.is_owner as isOwner, r.is_active as isActive,
             r.created_at as createdAt, r.updated_at as updatedAt
      FROM roles r
      INNER JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ? AND r.is_active = 1
    `
    return db.prepare(query).all(userId) as Role[]
  }

  public getUserPermissions(userId: string): PermissionKey[] {
    const db = this.dbManager.getActiveDb()
    const query = `
      SELECT DISTINCT p.key
      FROM permissions p
      INNER JOIN role_permissions rp ON rp.permission_id = p.id
      INNER JOIN user_roles ur ON ur.role_id = rp.role_id
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ? AND r.is_active = 1
    `
    const rows = db.prepare(query).all(userId) as { key: PermissionKey }[]
    return rows.map((r) => r.key)
  }
}

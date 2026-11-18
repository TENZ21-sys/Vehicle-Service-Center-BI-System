import bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import { UserRepository } from '../repositories/users.repo'
import { PermissionRepository } from '../repositories/permissions.repo'
import { sessionManager } from './session'
import { AuditService } from './audit.service'
import { DatabaseManager } from '../database/connection'
import { MasterDatabaseManager } from '../database/master'
import { AuthSession, User, StaffLookupResult } from '@shared/types/user.types'
import { Role } from '@shared/types/role.types'
import { AuthError, ValidationError, NotFoundError } from '../utils/errors'
import {
  loginSchema,
  changePasswordSchema,
  createUserSchema,
  updateUserSchema,
  resetWithSecurityAnswerSchema,
  resetWithMasterKeySchema,
  deleteAccountSchema
} from '@shared/validation/user.schema'
import { logger } from '../utils/logger'

export class AuthService {
  private userRepo: UserRepository
  private audit: AuditService

  constructor(userRepo = new UserRepository(), audit = new AuditService()) {
    this.userRepo = userRepo
    this.audit = audit
  }

  public async login(input: unknown): Promise<AuthSession> {
    const parse = loginSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(
        parse.error.issues[0]?.message || 'Invalid login credentials format',
        parse.error.issues
      )
    }

    const { username, password } = parse.data
    const userWithHash = this.userRepo.findByUsername(username)

    if (!userWithHash) {
      this.audit.record({
        action: 'LOGIN_FAILED',
        entityType: 'user',
        metadata: { username, reason: 'User not found or inactive' }
      })
      throw new AuthError('Invalid username or password', 'INVALID_CREDENTIALS')
    }

    // Check if open passwordless login is enabled for this business
    let isPasswordlessAllowed = false
    try {
      const db = DatabaseManager.getInstance().getActiveDb()
      const row = db
        .prepare("SELECT value FROM settings WHERE category = 'system' AND key = 'allow_passwordless_login'")
        .get() as { value: string } | undefined
      if (row && row.value) {
        isPasswordlessAllowed = JSON.parse(row.value) === true
      }
    } catch {
      // Default to false if settings query fails
    }

    if (!isPasswordlessAllowed) {
      const isPasswordProvided = Boolean(password && password.trim().length > 0)
      const matches = isPasswordProvided ? bcrypt.compareSync(password as string, userWithHash.passwordHash) : false
      if (!matches) {
        this.audit.record({
          userId: userWithHash.id,
          action: 'LOGIN_FAILED',
          entityType: 'user',
          entityId: userWithHash.id,
          metadata: { username, reason: 'Incorrect password' }
        })
        throw new AuthError('Invalid username or password', 'INVALID_CREDENTIALS')
      }
    }

    // Resolve business info and permissions
    const activeBusinessId = DatabaseManager.getInstance().getActiveBusinessId()
    if (!activeBusinessId) {
      throw new AuthError('No business selected. Please select a business first.')
    }

    const business = MasterDatabaseManager.getInstance().getBusinessById(activeBusinessId)
    const permissions = this.userRepo.getUserPermissions(userWithHash.id)
    const roles = this.userRepo.getUserRoles(userWithHash.id)

    const session: AuthSession = {
      userId: userWithHash.id,
      username: userWithHash.username,
      displayName: userWithHash.displayName,
      roleIds: roles.map((r) => r.id),
      permissions,
      businessId: business.id,
      businessName: business.name
    }

    sessionManager.setSession(session)
    this.userRepo.updateLastLogin(userWithHash.id)

    this.audit.record({
      userId: userWithHash.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'user',
      entityId: userWithHash.id
    })

    logger.info(`User "${username}" logged in successfully to "${business.name}"`)
    return session
  }

  public logout(): void {
    const session = sessionManager.getSession()
    if (session) {
      this.audit.record({
        userId: session.userId,
        action: 'LOGOUT',
        entityType: 'user',
        entityId: session.userId
      })
      sessionManager.clearSession()
      logger.info(`User "${session.username}" logged out.`)
    }
  }

  public getSession(): AuthSession | null {
    return sessionManager.getSession()
  }

  public changePassword(userId: string, input: unknown): void {
    const session = sessionManager.requireSession()
    if (session.userId !== userId && !sessionManager.hasPermission('settings:users')) {
      throw new AuthError('Cannot change password for another user without administrative authorization')
    }

    const parse = changePasswordSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid password format')
    }

    const targetUser = this.userRepo.findById(userId)
    if (!targetUser) {
      throw new NotFoundError('User', userId)
    }

    const userWithHash = this.userRepo.findByUsername(targetUser.username)
    if (!userWithHash) {
      throw new NotFoundError('User', userId)
    }

    // If changing own password, require current password verification
    if (session.userId === userId) {
      if (!parse.data.currentPassword) {
        throw new AuthError('Current password is required to change your own password', 'INVALID_PASSWORD')
      }
      const validCurrent = bcrypt.compareSync(parse.data.currentPassword, userWithHash.passwordHash)
      if (!validCurrent) {
        throw new AuthError('Current password does not match', 'INVALID_PASSWORD')
      }
    }

    const newHash = bcrypt.hashSync(parse.data.newPassword, 10)
    this.userRepo.updatePassword(userId, newHash)

    this.audit.record({
      userId: session.userId,
      action: 'USER_UPDATED',
      entityType: 'user',
      entityId: userId,
      metadata: { change: 'password_changed', targetUserId: userId }
    })
  }

  public createUser(input: unknown): User {
    const session = sessionManager.requireSession()
    if (!sessionManager.hasPermission('settings:users')) {
      throw new AuthError('Permission "settings:users" required to create staff accounts')
    }

    const parse = createUserSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid user data')
    }

    const { username, password, displayName, email, phone, roleIds, securityQuestion, securityAnswer } = parse.data
    const existing = this.userRepo.findByUsername(username)
    if (existing) {
      throw new ValidationError(`Username "${username}" is already taken`)
    }

    const passwordHash = bcrypt.hashSync(password, 10)
    let securityAnswerHash: string | undefined
    if (securityAnswer && securityAnswer.trim()) {
      securityAnswerHash = bcrypt.hashSync(securityAnswer.trim().toLowerCase(), 10)
    }

    const newUser = this.userRepo.create({
      username,
      passwordHash,
      displayName,
      email: email || undefined,
      phone: phone || undefined,
      roleIds,
      securityQuestion: securityQuestion?.trim() || undefined,
      securityAnswerHash
    })

    this.audit.record({
      userId: session.userId,
      action: 'USER_CREATED',
      entityType: 'user',
      entityId: newUser.id,
      newValue: { username, displayName, email, roleIds }
    })

    return newUser
  }

  public updateUser(userId: string, input: unknown): User {
    const session = sessionManager.requireSession()
    if (!sessionManager.hasPermission('settings:users') && session.userId !== userId) {
      throw new AuthError('Administrative permission required to edit staff accounts')
    }

    const parse = updateUserSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid user updates')
    }

    const { displayName, email, phone, roleIds, isActive, securityQuestion, securityAnswer } = parse.data
    const updates: Partial<User> & { securityAnswerHash?: string } = {}

    if (displayName !== undefined) updates.displayName = displayName
    if (email !== undefined) updates.email = email || undefined
    if (phone !== undefined) updates.phone = phone || undefined
    if (isActive !== undefined) updates.isActive = isActive
    if (securityQuestion !== undefined) updates.securityQuestion = securityQuestion || undefined

    if (securityAnswer && securityAnswer.trim()) {
      updates.securityAnswerHash = bcrypt.hashSync(securityAnswer.trim().toLowerCase(), 10)
    }

    const updated = this.userRepo.update(userId, updates, roleIds)

    this.audit.record({
      userId: session.userId,
      action: 'USER_UPDATED',
      entityType: 'user',
      entityId: userId,
      newValue: { displayName, email, phone, roleIds, isActive }
    })

    return updated
  }

  /**
   * Deactivates/deletes a staff account with mandatory password verification of the acting user
   * and strict Owner Invariant enforcement (cannot delete last remaining owner).
   */
  public deleteUser(input: unknown): boolean {
    const session = sessionManager.requireSession()
    const parse = deleteAccountSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid deletion request')
    }

    const { userId, verificationPassword } = parse.data

    // Verify acting user password
    const actingUser = this.userRepo.findByUsername(session.username)
    if (!actingUser) {
      throw new AuthError('Acting user session is invalid')
    }

    const validPassword = bcrypt.compareSync(verificationPassword, actingUser.passwordHash)
    if (!validPassword) {
      throw new AuthError('Password verification failed. Incorrect password.', 'INVALID_PASSWORD')
    }

    const targetUser = this.userRepo.findById(userId)
    if (!targetUser) {
      throw new NotFoundError('User', userId)
    }

    // Owner protection invariant: cannot delete the last active owner
    const targetRoles = targetUser.roles || []
    const isTargetOwner = targetRoles.some((r) => r.isOwner)
    if (isTargetOwner) {
      const activeOwnersCount = this.userRepo.countActiveOwners()
      if (activeOwnersCount <= 1) {
        throw new ValidationError(
          'Cannot delete the last active Owner account. Please promote another staff member to Owner first.'
        )
      }
    }

    // Soft-delete to preserve foreign keys and audit history
    this.userRepo.update(userId, { isActive: false })

    this.audit.record({
      userId: session.userId,
      action: 'USER_DEACTIVATED',
      entityType: 'user',
      entityId: userId,
      metadata: { targetUsername: targetUser.username, displayName: targetUser.displayName }
    })

    logger.info(`User "${targetUser.username}" (${userId}) deactivated by "${session.username}"`)
    return true
  }

  public listUsers(includeInactive = false): User[] {
    const session = sessionManager.requireSession()
    if (!sessionManager.hasPermission('settings:users')) {
      throw new AuthError('Permission "settings:users" required to view staff accounts')
    }
    return this.userRepo.findAll(includeInactive)
  }

  /**
   * Returns the security question for a given username (publicly accessible on login screen).
   */
  public getSecurityQuestion(username: string): { username: string; securityQuestion: string | null } {
    const trimmed = username.trim()
    const user = this.userRepo.findByUsername(trimmed)
    if (!user || !user.securityQuestion) {
      return { username: trimmed, securityQuestion: null }
    }
    return { username: user.username, securityQuestion: user.securityQuestion }
  }

  /**
   * Resets password on login screen by answering personal security question.
   */
  public resetWithSecurityAnswer(input: unknown): boolean {
    const parse = resetWithSecurityAnswerSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid reset details')
    }

    const { username, securityAnswer, newPassword } = parse.data
    const user = this.userRepo.findByUsername(username)
    if (!user || !user.securityAnswerHash) {
      throw new AuthError('Security question recovery is not configured for this account.')
    }

    const answerMatches = bcrypt.compareSync(securityAnswer.trim().toLowerCase(), user.securityAnswerHash)
    if (!answerMatches) {
      this.audit.record({
        action: 'SECURITY_RECOVERY_FAILED',
        entityType: 'user',
        entityId: user.id,
        metadata: { username, reason: 'Incorrect security answer' }
      })
      throw new AuthError('Incorrect security answer. Please check your spelling and try again.', 'INVALID_ANSWER')
    }

    const newHash = bcrypt.hashSync(newPassword, 10)
    this.userRepo.updatePassword(user.id, newHash)

    this.audit.record({
      userId: user.id,
      action: 'USER_PASSWORD_RESET',
      entityType: 'user',
      entityId: user.id,
      metadata: { method: 'security_question' }
    })

    logger.info(`Password successfully reset via security question for user "${username}"`)
    return true
  }

  /**
   * Resets password using the Emergency Business Recovery Key (for Owner or all-locked-out situations).
   */
  public resetWithMasterKey(input: unknown): boolean {
    const parse = resetWithMasterKeySchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid recovery key format')
    }

    const { masterRecoveryKey, targetUsername, newPassword } = parse.data
    const db = DatabaseManager.getInstance().getActiveDb()

    // Fetch stored emergency recovery key hash from settings
    const row = db
      .prepare("SELECT value FROM settings WHERE category = 'system' AND key = 'emergency_recovery_key_hash'")
      .get() as { value: string } | undefined

    if (!row || !row.value) {
      throw new AuthError('No Emergency Recovery Key has been established for this business yet.')
    }

    let storedHash: string
    try {
      storedHash = JSON.parse(row.value)
    } catch {
      storedHash = row.value
    }

    const inputHash = crypto.createHash('sha256').update(masterRecoveryKey.trim()).digest('hex')
    if (inputHash !== storedHash) {
      this.audit.record({
        action: 'EMERGENCY_RECOVERY_FAILED',
        entityType: 'system',
        metadata: { reason: 'Invalid emergency recovery key entered' }
      })
      throw new AuthError('Invalid Emergency Recovery Key. Please verify the code and try again.', 'INVALID_KEY')
    }

    const targetUser = this.userRepo.findByUsername(targetUsername)
    if (!targetUser) {
      throw new NotFoundError('User', targetUsername)
    }

    const newHash = bcrypt.hashSync(newPassword, 10)
    this.userRepo.updatePassword(targetUser.id, newHash)

    this.audit.record({
      userId: targetUser.id,
      action: 'EMERGENCY_RECOVERY_USED',
      entityType: 'user',
      entityId: targetUser.id,
      metadata: { targetUsername }
    })

    logger.info(`Emergency Master Recovery Key successfully used to reset password for "${targetUsername}"`)
    return true
  }

  /**
   * Public staff lookup by contact query (phone, email, or username) for login screen.
   */
  public lookupUsername(query: string): StaffLookupResult[] {
    if (!query || !query.trim()) return []
    return this.userRepo.findByContact(query)
  }

  /**
   * Returns active staff directory for login screen "Forgot Username?" list.
   */
  public listStaffDirectory(): StaffLookupResult[] {
    return this.userRepo.findStaffDirectory()
  }

  /**
   * Allows Owner to view or regenerate the Emergency Business Recovery Key.
   */
  public regenerateEmergencyKey(ownerPassword: string): string {
    const session = sessionManager.requireSession()
    const actingUser = this.userRepo.findByUsername(session.username)
    if (!actingUser) {
      throw new AuthError('Invalid session')
    }

    // Verify owner password
    const validPassword = bcrypt.compareSync(ownerPassword, actingUser.passwordHash)
    if (!validPassword) {
      throw new AuthError('Incorrect password. Cannot regenerate recovery key.', 'INVALID_PASSWORD')
    }

    const business = MasterDatabaseManager.getInstance().getBusinessById(session.businessId)
    const rawKey = this.generateNewKey(business.name)
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')

    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const db = DatabaseManager.getInstance().getActiveDb()
    db.prepare(`
      INSERT INTO settings (id, category, key, value, value_type, updated_by, updated_at, created_at)
      VALUES (?, 'system', 'emergency_recovery_key_hash', ?, 'string', ?, ?, ?)
      ON CONFLICT(category, key) DO UPDATE SET
        value = excluded.value,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at
    `).run(id, JSON.stringify(keyHash), session.userId, now, now)

    this.audit.record({
      userId: session.userId,
      action: 'EMERGENCY_KEY_REGENERATED',
      entityType: 'system',
      metadata: { businessId: session.businessId }
    })

    logger.info(`Emergency Recovery Key regenerated by "${session.username}"`)
    return rawKey
  }

  public listRoles(): Role[] {
    const permRepo = new PermissionRepository()
    return permRepo.getAllRoles(false)
  }

  private generateNewKey(businessName: string): string {
    const prefix = businessName.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase() || 'RESC'
    const seg1 = crypto.randomBytes(3).toString('hex').toUpperCase()
    const seg2 = crypto.randomBytes(3).toString('hex').toUpperCase()
    const seg3 = crypto.randomBytes(3).toString('hex').toUpperCase()
    const seg4 = crypto.randomBytes(3).toString('hex').toUpperCase()
    return `${prefix}-${seg1}-${seg2}-${seg3}-${seg4}`
  }
}

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { MasterDatabaseManager } from '../../src/main/database/master'
import { DatabaseManager } from '../../src/main/database/connection'
import { AuthService } from '../../src/main/services/auth.service'
import { BusinessService } from '../../src/main/services/business.service'
import { sessionManager } from '../../src/main/services/session'
import { ValidationError, AuthError } from '../../src/main/utils/errors'

describe('Account Recovery & Security Management Integration Tests', () => {
  const testDataDir = path.join(process.cwd(), 'test-data-recovery')
  const migrationsDir = path.join(process.cwd(), 'src/main/database/migrations')

  let masterDb: MasterDatabaseManager
  let dbManager: DatabaseManager
  let authService: AuthService
  let businessService: BusinessService

  beforeEach(() => {
    DatabaseManager.resetInstanceForTesting()
    MasterDatabaseManager.resetInstanceForTesting()
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true })
    }

    dbManager = DatabaseManager.getInstance(testDataDir)
    masterDb = MasterDatabaseManager.getInstance(testDataDir, migrationsDir)
    authService = new AuthService()
    businessService = new BusinessService()
  })

  afterEach(() => {
    sessionManager.clearSession()
    DatabaseManager.resetInstanceForTesting()
    MasterDatabaseManager.resetInstanceForTesting()
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true })
    }
  })

  it('handles complete security question recovery flow', async () => {
    const biz = masterDb.createBusiness(
      'Recovery Motors',
      'tech_user',
      'Password123!',
      'Lead Tech'
    )
    const db = dbManager.openBusinessDatabase(biz.id, biz.db_filename)

    // Log in as owner to create technician with security question
    const loginSession = await authService.login({ username: 'tech_user', password: 'Password123!' })
    expect(loginSession.username).toBe('tech_user')

    // Get non-owner role id from database
    const techRole = db.prepare("SELECT id FROM roles WHERE is_owner = 0 LIMIT 1").get() as { id: string }

    // Create a staff user with security question
    const newStaff = authService.createUser({
      username: 'john_doe',
      password: 'OldPassword123!',
      displayName: 'John Doe',
      email: 'john@example.com',
      phone: '0771234567',
      roleIds: [techRole.id],
      securityQuestion: 'What is your pet name?',
      securityAnswer: 'Fluffy'
    })
    expect(newStaff.id).toBeDefined()

    // 1. Fetch security question for john_doe
    const sqResult = authService.getSecurityQuestion('john_doe')
    expect(sqResult.securityQuestion).toBe('What is your pet name?')

    // 2. Attempt recovery with wrong answer
    expect(() =>
      authService.resetWithSecurityAnswer({
        username: 'john_doe',
        securityAnswer: 'WrongAnswer',
        newPassword: 'BrandNewPassword123!'
      })
    ).toThrow(AuthError)

    // 3. Reset with correct answer (case-insensitive & trimmed)
    const resetSuccess = authService.resetWithSecurityAnswer({
      username: 'john_doe',
      securityAnswer: '  fluffy  ',
      newPassword: 'BrandNewPassword123!'
    })
    expect(resetSuccess).toBe(true)

    // 4. John Doe can now log in with the new password
    const techLogin = await authService.login({
      username: 'john_doe',
      password: 'BrandNewPassword123!'
    })
    expect(techLogin.username).toBe('john_doe')
  })

  it('handles emergency master recovery key password reset', async () => {
    const createdBiz = businessService.createBusiness({
      name: 'Key Auto Center',
      ownerUsername: 'master_owner',
      ownerPassword: 'InitialPassword123!',
      ownerDisplayName: 'Center Owner'
    })

    const recoveryKey = createdBiz.emergencyRecoveryKey
    expect(recoveryKey).toBeDefined()
    expect(recoveryKey).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{6}$/)

    // Select business
    businessService.selectBusiness(createdBiz.id)

    // Attempt reset with invalid key
    expect(() =>
      authService.resetWithMasterKey({
        targetUsername: 'master_owner',
        masterRecoveryKey: 'KEYA-000000-000000-000000-000000',
        newPassword: 'OwnerEmergencyPassword123!'
      })
    ).toThrow(AuthError)

    // Reset with valid key
    const success = authService.resetWithMasterKey({
      targetUsername: 'master_owner',
      masterRecoveryKey: recoveryKey,
      newPassword: 'OwnerEmergencyPassword123!'
    })
    expect(success).toBe(true)

    // Log in with new password
    const loginRes = await authService.login({
      username: 'master_owner',
      password: 'OwnerEmergencyPassword123!'
    })
    expect(loginRes.username).toBe('master_owner')
  })

  it('supports staff directory lookup and username search by contact', async () => {
    const biz = masterDb.createBusiness('Lookup Garage', 'owner_test', 'Pass123!', 'Owner Test')
    const db = dbManager.openBusinessDatabase(biz.id, biz.db_filename)
    await authService.login({ username: 'owner_test', password: 'Pass123!' })

    const techRole = db.prepare("SELECT id FROM roles WHERE is_owner = 0 LIMIT 1").get() as { id: string }

    authService.createUser({
      username: 'sarah_admin',
      password: 'SarahPassword123!',
      displayName: 'Sarah Connor',
      email: 'sarah@terminator.com',
      phone: '+15550199',
      roleIds: [techRole.id],
      securityQuestion: 'Mother name?',
      securityAnswer: 'Jane'
    })

    // Search by email
    const matchEmail = authService.lookupUsername('sarah@terminator.com')
    expect(matchEmail.length).toBe(1)
    expect(matchEmail[0].username).toBe('sarah_admin')

    // Search by partial phone
    const matchPhone = authService.lookupUsername('5550199')
    expect(matchPhone.length).toBe(1)
    expect(matchPhone[0].username).toBe('sarah_admin')

    // Directory listing
    const directory = authService.listStaffDirectory()
    expect(directory.some((u) => u.username === 'sarah_admin')).toBe(true)
    expect(directory.some((u) => u.username === 'owner_test')).toBe(true)
  })

  it('enforces password verification and Owner invariant on account deletion', async () => {
    const biz = masterDb.createBusiness('Strict Garage', 'chief_owner', 'ChiefPass123!', 'Chief Owner')
    const db = dbManager.openBusinessDatabase(biz.id, biz.db_filename)
    const session = await authService.login({ username: 'chief_owner', password: 'ChiefPass123!' })

    const techRole = db.prepare("SELECT id FROM roles WHERE is_owner = 0 LIMIT 1").get() as { id: string }

    const tech = authService.createUser({
      username: 'junior_tech',
      password: 'TechPassword123!',
      displayName: 'Junior Tech',
      roleIds: [techRole.id]
    })

    // 1. Deleting sole owner must fail with ValidationError even with correct password
    expect(() =>
      authService.deleteUser({
        userId: session.userId,
        verificationPassword: 'ChiefPass123!'
      })
    ).toThrow(ValidationError)

    // 2. Deleting tech with WRONG password must fail with AuthError
    expect(() =>
      authService.deleteUser({
        userId: tech.id,
        verificationPassword: 'WrongChiefPassword!'
      })
    ).toThrow(AuthError)

    // 3. Deleting tech with CORRECT password must succeed
    const deleteRes = authService.deleteUser({
      userId: tech.id,
      verificationPassword: 'ChiefPass123!'
    })
    expect(deleteRes).toBe(true)

    // 4. Deleted tech cannot log in
    await expect(
      authService.login({ username: 'junior_tech', password: 'TechPassword123!' })
    ).rejects.toThrow(AuthError)
  })

  it('handles self-service password change with verification', async () => {
    const biz = masterDb.createBusiness('Self Garage', 'self_user', 'OldPass123!', 'Self User')
    dbManager.openBusinessDatabase(biz.id, biz.db_filename)
    const session = await authService.login({ username: 'self_user', password: 'OldPass123!' })

    // Change with wrong current password
    expect(() =>
      authService.changePassword(session.userId, {
        currentPassword: 'IncorrectPassword',
        newPassword: 'BrandNewPass123!'
      })
    ).toThrow(AuthError)

    // Change with correct current password
    expect(() =>
      authService.changePassword(session.userId, {
        currentPassword: 'OldPass123!',
        newPassword: 'BrandNewPass123!'
      })
    ).not.toThrow()

    // Verify login with new password
    const newSession = await authService.login({
      username: 'self_user',
      password: 'BrandNewPass123!'
    })
    expect(newSession.username).toBe('self_user')
  })
})

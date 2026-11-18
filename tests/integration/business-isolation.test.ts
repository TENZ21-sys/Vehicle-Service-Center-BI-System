import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { MasterDatabaseManager } from '../../src/main/database/master'
import { DatabaseManager } from '../../src/main/database/connection'
import { AuthService } from '../../src/main/services/auth.service'
import { PermissionService } from '../../src/main/services/permissions.service'
import { SettingsService } from '../../src/main/services/settings.service'
import { AuditService } from '../../src/main/services/audit.service'
import { sessionManager } from '../../src/main/services/session'

describe('Multi-Business Isolation & Authentication End-to-End', () => {
  const testDataDir = path.join(process.cwd(), 'test-data-biz')
  const migrationsDir = path.join(process.cwd(), 'src/main/database/migrations')

  let masterDb: MasterDatabaseManager
  let dbManager: DatabaseManager
  let authService: AuthService
  let permService: PermissionService
  let settingsService: SettingsService
  let auditService: AuditService

  beforeEach(() => {
    DatabaseManager.resetInstanceForTesting()
    MasterDatabaseManager.resetInstanceForTesting()
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true })
    }

    dbManager = DatabaseManager.getInstance(testDataDir)
    masterDb = MasterDatabaseManager.getInstance(testDataDir, migrationsDir)
    authService = new AuthService()
    permService = new PermissionService()
    settingsService = new SettingsService()
    auditService = new AuditService()
  })

  afterEach(() => {
    sessionManager.clearSession()
    DatabaseManager.resetInstanceForTesting()
    MasterDatabaseManager.resetInstanceForTesting()
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true })
    }
  })

  it('provisions two independent businesses and enforces strict data isolation', async () => {
    // 1. Create Business 1
    const biz1 = masterDb.createBusiness(
      'Alpha Motors',
      'owner_alpha',
      'AlphaSecret123',
      'Alpha Owner'
    )
    expect(biz1.id).toBeDefined()
    expect(biz1.name).toBe('Alpha Motors')

    // 2. Create Business 2
    const biz2 = masterDb.createBusiness(
      'Beta Garage',
      'owner_beta',
      'BetaSecret123',
      'Beta Owner'
    )
    expect(biz2.id).toBeDefined()
    expect(biz2.name).toBe('Beta Garage')

    // 3. Select Business 1 and login as owner_alpha
    dbManager.openBusinessDatabase(biz1.id, biz1.db_filename)
    const session1 = await authService.login({
      username: 'owner_alpha',
      password: 'AlphaSecret123'
    })

    expect(session1.username).toBe('owner_alpha')
    expect(session1.businessName).toBe('Alpha Motors')
    expect(session1.permissions).toContain('settings:view')
    expect(session1.permissions).toContain('settings:edit')

    // Verify owner role cannot lose settings permissions
    const ownerRole = permService.listRoles().find((r) => r.isOwner)
    expect(ownerRole).toBeDefined()
    expect(() => {
      permService.updateRole(ownerRole!.id, {
        permissions: ['customers:view'] // Trying to strip settings:view
      })
    }).toThrow('cannot lose settings permissions')

    // 4. In Business 1, add an audit log and modify a setting
    settingsService.setSetting('business_profile', 'phone', '+94112223344', 'string')
    const phoneSetting = settingsService.getSetting('business_profile', 'phone')
    expect(phoneSetting?.value).toBe('+94112223344')

    const auditTrailBiz1 = auditService.getAuditTrail()
    expect(auditTrailBiz1.some((e) => e.action === 'SETTING_CHANGED')).toBe(true)

    // 5. Logout of Business 1 and switch to Business 2
    authService.logout()
    expect(sessionManager.getSession()).toBeNull()

    dbManager.openBusinessDatabase(biz2.id, biz2.db_filename)

    // 6. Verify owner_alpha cannot login to Business 2
    await expect(
      authService.login({
        username: 'owner_alpha',
        password: 'AlphaSecret123'
      })
    ).rejects.toThrow('Invalid username or password')

    // 7. Login as owner_beta in Business 2
    const session2 = await authService.login({
      username: 'owner_beta',
      password: 'BetaSecret123'
    })
    expect(session2.username).toBe('owner_beta')
    expect(session2.businessName).toBe('Beta Garage')

    // Verify Business 2 does not have Business 1's modified phone setting
    const phoneSettingBiz2 = settingsService.getSetting('business_profile', 'phone')
    expect(phoneSettingBiz2?.value).toBe('')

    // 8. Test Feature Toggles: Toggle off inventory module
    expect(settingsService.getFeatureToggles().module_inventory).toBe(true)
    settingsService.updateFeatureToggles({
      module_appointments: true,
      module_quotations: true,
      module_inventory: false, // Disabled
      module_finance: true,
      module_bi: true
    })

    // Now requiring the inventory module should throw ModuleDisabledError
    expect(() => permService.requireModuleEnabled('inventory')).toThrow(
      "Module 'inventory' is disabled"
    )
    // Other modules remain enabled
    expect(() => permService.requireModuleEnabled('appointments')).not.toThrow()
  })
})

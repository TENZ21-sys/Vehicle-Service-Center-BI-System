import { SettingsRepository } from '../repositories/settings.repo'
import { sessionManager } from './session'
import { AuditService } from './audit.service'
import { PermissionService } from './permissions.service'
import { Setting, SettingValueType, BusinessProfileSettings } from '@shared/types/setting.types'
import { updateBusinessProfileSchema, updateFeatureTogglesSchema } from '@shared/validation/setting.schema'
import { ValidationError } from '../utils/errors'

export class SettingsService {
  private repo: SettingsRepository
  private audit: AuditService
  private permService: PermissionService

  constructor(
    repo = new SettingsRepository(),
    audit = new AuditService(),
    permService = new PermissionService()
  ) {
    this.repo = repo
    this.audit = audit
    this.permService = permService
  }

  public getSetting(category: string, key: string): Setting | null {
    return this.repo.get(category, key)
  }

  public getCategory(category: string): Record<string, unknown> {
    return this.repo.getByCategory(category)
  }

  public setSetting(
    category: string,
    key: string,
    value: unknown,
    valueType: SettingValueType
  ): Setting {
    this.permService.requirePermission('settings:edit')
    const session = sessionManager.getSession()
    const oldSetting = this.repo.get(category, key)

    const updated = this.repo.set(category, key, value, valueType, session?.userId)

    this.audit.record({
      userId: session?.userId,
      action: 'SETTING_CHANGED',
      entityType: 'setting',
      entityId: `${category}.${key}`,
      oldValue: oldSetting?.value,
      newValue: value
    })

    return updated
  }

  public updateBusinessProfile(input: unknown): BusinessProfileSettings {
    this.permService.requirePermission('settings:edit')
    const parse = updateBusinessProfileSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid profile settings')
    }

    for (const [key, val] of Object.entries(parse.data)) {
      const valType: SettingValueType = typeof val === 'number' ? 'number' : 'string'
      this.setSetting('business_profile', key, val, valType)
    }

    return this.repo.getByCategory('business_profile') as unknown as BusinessProfileSettings
  }

  public updateFeatureToggles(input: unknown): Record<string, boolean> {
    this.permService.requirePermission('settings:edit')
    const parse = updateFeatureTogglesSchema.safeParse(input)
    if (!parse.success) {
      throw new ValidationError(parse.error.issues[0]?.message || 'Invalid feature toggles')
    }

    for (const [key, val] of Object.entries(parse.data)) {
      this.setSetting('feature_toggles', key, val, 'boolean')
    }

    return this.repo.getByCategory('feature_toggles') as Record<string, boolean>
  }

  public getFeatureToggles(): Record<string, boolean> {
    return this.repo.getByCategory('feature_toggles') as Record<string, boolean>
  }
}

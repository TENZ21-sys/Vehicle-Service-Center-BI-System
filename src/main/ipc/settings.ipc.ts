import { registerIpcHandler } from './ipc-wrapper'
import { SettingsService } from '../services/settings.service'
import { SettingValueType } from '@shared/types/setting.types'

export function registerSettingsIpcHandlers(service = new SettingsService()): void {
  registerIpcHandler('settings:get', async (_event, category: string, key: string) => {
    return service.getSetting(category, key)
  })

  registerIpcHandler(
    'settings:set',
    async (_event, category: string, key: string, value: unknown, valueType: SettingValueType) => {
      return service.setSetting(category, key, value, valueType)
    }
  )

  registerIpcHandler('settings:getByCategory', async (_event, category: string) => {
    return service.getCategory(category)
  })

  registerIpcHandler('settings:getFeatureToggles', async () => {
    return service.getFeatureToggles()
  })

  registerIpcHandler('settings:updateProfile', async (_event, profileData: unknown) => {
    return service.updateBusinessProfile(profileData)
  })

  registerIpcHandler('settings:updateToggles', async (_event, toggles: unknown) => {
    return service.updateFeatureToggles(toggles)
  })
}

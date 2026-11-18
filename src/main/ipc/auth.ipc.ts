import { registerIpcHandler } from './ipc-wrapper'
import { AuthService } from '../services/auth.service'

export function registerAuthIpcHandlers(service = new AuthService()): void {
  registerIpcHandler('auth:login', async (_event, username: string, password: string) => {
    return service.login({ username, password })
  })

  registerIpcHandler('auth:logout', async () => {
    service.logout()
    return true
  })

  registerIpcHandler('auth:getSession', async () => {
    return service.getSession()
  })

  registerIpcHandler('auth:changePassword', async (_event, userId: string, input: unknown) => {
    service.changePassword(userId, input)
    return true
  })

  registerIpcHandler('auth:createUser', async (_event, input: unknown) => {
    return service.createUser(input)
  })

  registerIpcHandler('auth:updateUser', async (_event, userId: string, input: unknown) => {
    return service.updateUser(userId, input)
  })

  registerIpcHandler('auth:deleteUser', async (_event, input: unknown) => {
    return service.deleteUser(input)
  })

  registerIpcHandler('auth:listUsers', async (_event, includeInactive?: boolean) => {
    return service.listUsers(includeInactive)
  })

  registerIpcHandler('auth:getSecurityQuestion', async (_event, username: string) => {
    return service.getSecurityQuestion(username)
  })

  registerIpcHandler('auth:resetWithSecurityAnswer', async (_event, input: unknown) => {
    return service.resetWithSecurityAnswer(input)
  })

  registerIpcHandler('auth:resetWithMasterKey', async (_event, input: unknown) => {
    return service.resetWithMasterKey(input)
  })

  registerIpcHandler('auth:lookupUsername', async (_event, query: string) => {
    return service.lookupUsername(query)
  })

  registerIpcHandler('auth:listStaffDirectory', async () => {
    return service.listStaffDirectory()
  })

  registerIpcHandler('auth:regenerateEmergencyKey', async (_event, ownerPassword: string) => {
    return service.regenerateEmergencyKey(ownerPassword)
  })

  registerIpcHandler('auth:listRoles', async () => {
    return service.listRoles()
  })
}

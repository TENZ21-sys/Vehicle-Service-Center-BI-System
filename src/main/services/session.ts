import { AuthSession } from '@shared/types/user.types'
import { PermissionKey } from '@shared/types/permission.types'
import { AuthError } from '../utils/errors'

class SessionManager {
  private static instance: SessionManager | null = null
  private currentSession: AuthSession | null = null
  private permissionSet: Set<PermissionKey> = new Set()

  private constructor() {}

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  public setSession(session: AuthSession): void {
    this.currentSession = session
    this.permissionSet = new Set(session.permissions)
  }

  public getSession(): AuthSession | null {
    return this.currentSession
  }

  public requireSession(): AuthSession {
    if (!this.currentSession) {
      throw new AuthError('Active user session required. Please log in.')
    }
    return this.currentSession
  }

  public hasPermission(permission: PermissionKey): boolean {
    if (!this.currentSession) return false
    return this.permissionSet.has(permission)
  }

  public clearSession(): void {
    this.currentSession = null
    this.permissionSet.clear()
  }
}

export const sessionManager = SessionManager.getInstance()

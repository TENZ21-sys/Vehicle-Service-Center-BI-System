import { MasterDatabaseManager, BusinessRecord } from '../database/master'

export class BusinessRepository {
  private masterDb: MasterDatabaseManager

  constructor(masterDb?: MasterDatabaseManager) {
    this.masterDb = masterDb || MasterDatabaseManager.getInstance()
  }

  public findAll(): BusinessRecord[] {
    return this.masterDb.listBusinesses()
  }

  public findById(id: string): BusinessRecord {
    return this.masterDb.getBusinessById(id)
  }

  public create(
    name: string,
    ownerUsername?: string,
    ownerPassword?: string,
    ownerDisplayName?: string
  ): BusinessRecord {
    return this.masterDb.createBusiness(name, ownerUsername, ownerPassword, ownerDisplayName)
  }

  public deactivate(id: string): void {
    this.masterDb.deactivateBusiness(id)
  }

  public delete(id: string): void {
    this.masterDb.deleteBusiness(id)
  }
}

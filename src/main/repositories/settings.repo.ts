import { DatabaseManager } from '../database/connection'
import { v4 as uuidv4 } from 'uuid'
import { Setting, SettingValueType } from '@shared/types/setting.types'
import { DEFAULT_SETTINGS } from '@shared/constants/defaults'

export class SettingsRepository {
  private dbManager: DatabaseManager

  constructor(dbManager = DatabaseManager.getInstance()) {
    this.dbManager = dbManager
  }

  public get(category: string, key: string): Setting | null {
    const db = this.dbManager.getActiveDb()
    const stmt = db.prepare(`
      SELECT id, category, key, value, value_type as valueType,
             updated_by as updatedBy, updated_at as updatedAt, created_at as createdAt
      FROM settings
      WHERE category = ? AND key = ?
    `)
    const row = stmt.get(category, key) as (Omit<Setting, 'value'> & { value: string }) | undefined
    if (!row) {
      // Check code default
      const defaultVal = DEFAULT_SETTINGS[category]?.[key]
      if (defaultVal) {
        return {
          id: 'default',
          category,
          key,
          value: defaultVal.value,
          valueType: defaultVal.valueType,
          createdAt: '',
          updatedAt: ''
        }
      }
      return null
    }

    let parsedVal: unknown = row.value
    try {
      parsedVal = JSON.parse(row.value)
    } catch {
      // leave as string
    }

    return {
      ...row,
      value: parsedVal
    }
  }

  public getByCategory(category: string): Record<string, unknown> {
    const db = this.dbManager.getActiveDb()
    const stmt = db.prepare(`
      SELECT key, value, value_type as valueType
      FROM settings
      WHERE category = ?
    `)
    const rows = stmt.all(category) as { key: string; value: string; valueType: SettingValueType }[]
    const result: Record<string, unknown> = {}

    // Populate with defaults first
    const defaults = DEFAULT_SETTINGS[category]
    if (defaults) {
      for (const [k, d] of Object.entries(defaults)) {
        result[k] = d.value
      }
    }

    // Override with DB values
    for (const r of rows) {
      try {
        result[r.key] = JSON.parse(r.value)
      } catch {
        result[r.key] = r.value
      }
    }

    return result
  }

  public set(
    category: string,
    key: string,
    value: unknown,
    valueType: SettingValueType,
    updatedBy?: string
  ): Setting {
    const db = this.dbManager.getActiveDb()
    const now = new Date().toISOString()
    const strVal = JSON.stringify(value)

    const existing = db.prepare('SELECT id, value FROM settings WHERE category = ? AND key = ?').get(category, key) as { id: string; value: string } | undefined

    if (existing) {
      db.prepare(`
        UPDATE settings
        SET value = ?, value_type = ?, updated_by = ?, updated_at = ?
        WHERE id = ?
      `).run(strVal, valueType, updatedBy || null, now, existing.id)

      return {
        id: existing.id,
        category,
        key,
        value,
        valueType,
        updatedBy,
        updatedAt: now,
        createdAt: ''
      }
    } else {
      const id = uuidv4()
      db.prepare(`
        INSERT INTO settings (id, category, key, value, value_type, updated_by, updated_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, category, key, strVal, valueType, updatedBy || null, now, now)

      return {
        id,
        category,
        key,
        value,
        valueType,
        updatedBy,
        updatedAt: now,
        createdAt: now
      }
    }
  }
}

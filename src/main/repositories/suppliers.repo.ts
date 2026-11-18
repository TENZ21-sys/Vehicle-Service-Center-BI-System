import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseManager } from '../database/connection'
import {
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput
} from '@shared/types/inventory.types'

export class SuppliersRepository {
  private explicitDb?: Database.Database

  constructor(db?: Database.Database) {
    this.explicitDb = db
  }

  private get db(): Database.Database {
    return this.explicitDb || DatabaseManager.getInstance().getActiveDb()
  }

  public listSuppliers(includeInactive = false): Supplier[] {
    const sql = includeInactive
      ? 'SELECT * FROM suppliers ORDER BY name ASC'
      : 'SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name ASC'
    const rows = this.db.prepare(sql).all() as any[]
    return rows.map((r) => this.mapRow(r))
  }

  public getSupplierById(id: string): Supplier | null {
    const row = this.db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as any
    return row ? this.mapRow(row) : null
  }

  public createSupplier(input: CreateSupplierInput): Supplier {
    const id = uuidv4()
    const now = new Date().toISOString()
    this.db
      .prepare(
        `INSERT INTO suppliers (
          id, name, contact_person, phone, email, address, notes,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(
        id,
        input.name,
        input.contactPerson || null,
        input.phone || null,
        input.email || null,
        input.address || null,
        input.notes || null,
        now,
        now
      )

    return this.getSupplierById(id)!
  }

  public updateSupplier(id: string, input: UpdateSupplierInput): Supplier {
    const now = new Date().toISOString()
    const existing = this.getSupplierById(id)
    if (!existing) throw new Error(`Supplier ${id} not found`)

    const name = input.name !== undefined ? input.name : existing.name
    const contactPerson =
      input.contactPerson !== undefined ? input.contactPerson : existing.contactPerson
    const phone = input.phone !== undefined ? input.phone : existing.phone
    const email = input.email !== undefined ? input.email : existing.email
    const address = input.address !== undefined ? input.address : existing.address
    const notes = input.notes !== undefined ? input.notes : existing.notes

    this.db
      .prepare(
        `UPDATE suppliers
         SET name = ?, contact_person = ?, phone = ?, email = ?,
             address = ?, notes = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        name,
        contactPerson || null,
        phone || null,
        email || null,
        address || null,
        notes || null,
        now,
        id
      )

    return this.getSupplierById(id)!
  }

  public deactivateSupplier(id: string): void {
    const now = new Date().toISOString()
    this.db
      .prepare('UPDATE suppliers SET is_active = 0, updated_at = ? WHERE id = ?')
      .run(now, id)
  }

  private mapRow(row: any): Supplier {
    return {
      id: row.id,
      name: row.name,
      contactPerson: row.contact_person,
      phone: row.phone,
      email: row.email,
      address: row.address,
      notes: row.notes,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}

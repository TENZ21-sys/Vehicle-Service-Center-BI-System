import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseManager } from '../database/connection'
import { SequenceRepository } from './sequence.repo'
import {
  Expense,
  ExpenseCategory,
  ExpenseWithCategory,
  CreateExpenseInput,
  UpdateExpenseInput,
  CreateExpenseCategoryInput,
  UpdateExpenseCategoryInput,
  ExpenseFilter
} from '../../shared/types/finance.types'
import { NotFoundError, ValidationError } from '../utils/errors'

export class ExpensesRepository {
  private explicitDb?: Database.Database
  private sequenceRepo: SequenceRepository

  constructor(db?: Database.Database) {
    this.explicitDb = db
    this.sequenceRepo = new SequenceRepository(db)
  }

  private get db(): Database.Database {
    return this.explicitDb || DatabaseManager.getInstance().getActiveDb()
  }

  // --- Category Methods ---

  public listCategories(includeInactive = false): ExpenseCategory[] {
    const query = includeInactive
      ? 'SELECT * FROM expense_categories ORDER BY name ASC'
      : 'SELECT * FROM expense_categories WHERE is_active = 1 ORDER BY name ASC'

    const rows = this.db.prepare(query).all() as any[]
    return rows.map((r) => this.mapCategory(r))
  }

  public getCategoryById(id: string): ExpenseCategory | null {
    const row = this.db.prepare('SELECT * FROM expense_categories WHERE id = ?').get(id) as any
    return row ? this.mapCategory(row) : null
  }

  public createCategory(input: CreateExpenseCategoryInput): ExpenseCategory {
    const now = new Date().toISOString()
    const id = uuidv4()

    try {
      this.db
        .prepare(
          `INSERT INTO expense_categories (id, name, description, is_active, created_at, updated_at)
           VALUES (?, ?, ?, 1, ?, ?)`
        )
        .run(id, input.name.trim(), input.description?.trim() || null, now, now)

      return this.getCategoryById(id)!
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        throw new ValidationError(`Expense category "${input.name}" already exists`)
      }
      throw err
    }
  }

  public updateCategory(id: string, input: UpdateExpenseCategoryInput): ExpenseCategory {
    const category = this.getCategoryById(id)
    if (!category) {
      throw new NotFoundError(`Expense category not found: ${id}`)
    }

    const now = new Date().toISOString()
    const updates: string[] = []
    const params: any[] = []

    if (input.name !== undefined) {
      updates.push('name = ?')
      params.push(input.name.trim())
    }
    if (input.description !== undefined) {
      updates.push('description = ?')
      params.push(input.description?.trim() || null)
    }
    if (input.isActive !== undefined) {
      updates.push('is_active = ?')
      params.push(input.isActive ? 1 : 0)
    }

    if (updates.length === 0) return category

    updates.push('updated_at = ?')
    params.push(now)
    params.push(id)

    this.db.prepare(`UPDATE expense_categories SET ${updates.join(', ')} WHERE id = ?`).run(...params)
    return this.getCategoryById(id)!
  }

  public deleteCategory(id: string): boolean {
    const now = new Date().toISOString()
    const res = this.db
      .prepare('UPDATE expense_categories SET is_active = 0, updated_at = ? WHERE id = ?')
      .run(now, id)
    return res.changes > 0
  }

  // --- Expense Methods ---

  public create(input: CreateExpenseInput, userId?: string): ExpenseWithCategory {
    const category = this.getCategoryById(input.categoryId)
    if (!category || !category.isActive) {
      throw new ValidationError(`Valid active expense category is required`)
    }

    const id = uuidv4()
    const expenseNumber = this.sequenceRepo.getNextNumber('expense')
    const now = new Date().toISOString()
    const expenseDate = input.expenseDate || now.split('T')[0]
    const paymentMethod = input.paymentMethod || 'Cash'

    this.db
      .prepare(
        `INSERT INTO expenses (
          id, expense_number, category_id, amount, payment_method,
          paid_to, reference_no, notes, expense_date, created_by,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(
        id,
        expenseNumber,
        category.id,
        input.amount,
        paymentMethod,
        input.paidTo?.trim() || null,
        input.referenceNo?.trim() || null,
        input.notes?.trim() || null,
        expenseDate,
        userId || null,
        now,
        now
      )

    return this.getById(id)!
  }

  public getById(id: string): ExpenseWithCategory | null {
    const row = this.db
      .prepare(
        `SELECT e.*,
                c.id as cat_id, c.name as cat_name, c.description as cat_desc,
                c.is_active as cat_is_active, c.created_at as cat_created_at, c.updated_at as cat_updated_at,
                u.username as created_by_username
         FROM expenses e
         JOIN expense_categories c ON e.category_id = c.id
         LEFT JOIN users u ON e.created_by = u.id
         WHERE e.id = ?`
      )
      .get(id) as any

    return row ? this.mapExpenseWithCategory(row) : null
  }

  public getByNumber(expenseNumber: string): ExpenseWithCategory | null {
    const row = this.db
      .prepare(
        `SELECT e.*,
                c.id as cat_id, c.name as cat_name, c.description as cat_desc,
                c.is_active as cat_is_active, c.created_at as cat_created_at, c.updated_at as cat_updated_at,
                u.username as created_by_username
         FROM expenses e
         JOIN expense_categories c ON e.category_id = c.id
         LEFT JOIN users u ON e.created_by = u.id
         WHERE e.expense_number = ?`
      )
      .get(expenseNumber) as any

    return row ? this.mapExpenseWithCategory(row) : null
  }

  public list(filter?: ExpenseFilter): ExpenseWithCategory[] {
    let sql = `
      SELECT e.*,
             c.id as cat_id, c.name as cat_name, c.description as cat_desc,
             c.is_active as cat_is_active, c.created_at as cat_created_at, c.updated_at as cat_updated_at,
             u.username as created_by_username
      FROM expenses e
      JOIN expense_categories c ON e.category_id = c.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.is_active = 1
    `
    const params: any[] = []

    if (filter?.categoryId) {
      sql += ' AND e.category_id = ?'
      params.push(filter.categoryId)
    }

    if (filter?.startDate) {
      sql += ' AND e.expense_date >= ?'
      params.push(filter.startDate)
    }

    if (filter?.endDate) {
      sql += ' AND e.expense_date <= ?'
      params.push(filter.endDate)
    }

    if (filter?.paymentMethod) {
      sql += ' AND e.payment_method = ?'
      params.push(filter.paymentMethod)
    }

    if (filter?.search) {
      sql += ' AND (e.expense_number LIKE ? OR e.paid_to LIKE ? OR e.reference_no LIKE ? OR e.notes LIKE ?)'
      const term = `%${filter.search}%`
      params.push(term, term, term, term)
    }

    sql += ' ORDER BY e.expense_date DESC, e.created_at DESC'

    const rows = this.db.prepare(sql).all(...params) as any[]
    return rows.map((r) => this.mapExpenseWithCategory(r))
  }

  public update(id: string, input: UpdateExpenseInput): ExpenseWithCategory {
    const expense = this.getById(id)
    if (!expense || !expense.isActive) {
      throw new NotFoundError(`Active expense not found: ${id}`)
    }

    if (input.categoryId) {
      const category = this.getCategoryById(input.categoryId)
      if (!category || !category.isActive) {
        throw new ValidationError('Invalid or inactive expense category')
      }
    }

    const now = new Date().toISOString()
    const updates: string[] = []
    const params: any[] = []

    if (input.categoryId !== undefined) {
      updates.push('category_id = ?')
      params.push(input.categoryId)
    }
    if (input.amount !== undefined) {
      updates.push('amount = ?')
      params.push(input.amount)
    }
    if (input.paymentMethod !== undefined) {
      updates.push('payment_method = ?')
      params.push(input.paymentMethod)
    }
    if (input.paidTo !== undefined) {
      updates.push('paid_to = ?')
      params.push(input.paidTo?.trim() || null)
    }
    if (input.referenceNo !== undefined) {
      updates.push('reference_no = ?')
      params.push(input.referenceNo?.trim() || null)
    }
    if (input.notes !== undefined) {
      updates.push('notes = ?')
      params.push(input.notes?.trim() || null)
    }
    if (input.expenseDate !== undefined) {
      updates.push('expense_date = ?')
      params.push(input.expenseDate)
    }

    if (updates.length === 0) return expense

    updates.push('updated_at = ?')
    params.push(now)
    params.push(id)

    this.db.prepare(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`).run(...params)
    return this.getById(id)!
  }

  public delete(id: string): boolean {
    const now = new Date().toISOString()
    const res = this.db
      .prepare('UPDATE expenses SET is_active = 0, updated_at = ? WHERE id = ?')
      .run(now, id)
    return res.changes > 0
  }

  // --- Mappers ---

  private mapCategory(row: any): ExpenseCategory {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private mapExpenseWithCategory(row: any): ExpenseWithCategory {
    return {
      id: row.id,
      expenseNumber: row.expense_number,
      categoryId: row.category_id,
      amount: row.amount,
      paymentMethod: row.payment_method,
      paidTo: row.paid_to,
      referenceNo: row.reference_no,
      notes: row.notes,
      expenseDate: row.expense_date,
      createdBy: row.created_by,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdByUsername: row.created_by_username || null,
      category: {
        id: row.cat_id,
        name: row.cat_name,
        description: row.cat_desc,
        isActive: Boolean(row.cat_is_active),
        createdAt: row.cat_created_at,
        updatedAt: row.cat_updated_at
      }
    }
  }
}

import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseManager } from '../database/connection'
import { Payment, RecordPaymentInput } from '@shared/types/invoice.types'

export class PaymentsRepository {
  private explicitDb?: Database.Database

  constructor(db?: Database.Database) {
    this.explicitDb = db
  }

  private get db(): Database.Database {
    return this.explicitDb || DatabaseManager.getInstance().getActiveDb()
  }

  public getById(id: string): Payment | null {
    const row = this.db
      .prepare(
        `SELECT p.*, u.username as received_by_name
         FROM payments p
         LEFT JOIN users u ON p.received_by = u.id
         WHERE p.id = ?`
      )
      .get(id) as any

    if (!row) return null

    return {
      id: row.id,
      invoiceId: row.invoice_id,
      paymentMethod: row.payment_method,
      amount: row.amount,
      reference: row.reference,
      notes: row.notes,
      receivedBy: row.received_by,
      receivedByName: row.received_by_name,
      createdAt: row.created_at
    }
  }

  public listByInvoice(invoiceId: string): Payment[] {
    const rows = this.db
      .prepare(
        `SELECT p.*, u.username as received_by_name
         FROM payments p
         LEFT JOIN users u ON p.received_by = u.id
         WHERE p.invoice_id = ?
         ORDER BY p.created_at ASC`
      )
      .all(invoiceId) as any[]

    return rows.map((row) => ({
      id: row.id,
      invoiceId: row.invoice_id,
      paymentMethod: row.payment_method,
      amount: row.amount,
      reference: row.reference,
      notes: row.notes,
      receivedBy: row.received_by,
      receivedByName: row.received_by_name,
      createdAt: row.created_at
    }))
  }

  public recordPayment(input: RecordPaymentInput, receivedBy?: string | null): Payment {
    const transaction = this.db.transaction(() => {
      const invoice = this.db
        .prepare('SELECT * FROM invoices WHERE id = ?')
        .get(input.invoiceId) as any

      if (!invoice) {
        throw new Error(`Invoice not found: ${input.invoiceId}`)
      }

      if (invoice.status === 'Void') {
        throw new Error(`Cannot record payment for voided invoice #${invoice.invoice_number}`)
      }

      if (invoice.status === 'Paid' || invoice.due_amount <= 0) {
        throw new Error(`Invoice #${invoice.invoice_number} is already fully paid`)
      }

      if (input.amount > invoice.due_amount) {
        throw new Error(
          `Payment amount (${input.amount}) exceeds outstanding balance (${invoice.due_amount})`
        )
      }

      const paymentId = uuidv4()
      const now = new Date().toISOString()

      // Insert payment record
      this.db
        .prepare(
          `INSERT INTO payments (
            id, invoice_id, payment_method, amount, reference, notes, received_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          paymentId,
          input.invoiceId,
          input.paymentMethod,
          input.amount,
          input.reference || null,
          input.notes || null,
          receivedBy || null,
          now
        )

      // Update invoice balances
      const newPaidAmount = invoice.paid_amount + input.amount
      const newDueAmount = invoice.total_amount - newPaidAmount
      const newStatus = newDueAmount <= 0 ? 'Paid' : 'Partial'

      this.db
        .prepare(
          `UPDATE invoices
           SET paid_amount = ?, due_amount = ?, status = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(newPaidAmount, newDueAmount, newStatus, now, invoice.id)

      return paymentId
    })

    const paymentId = transaction()
    return this.getById(paymentId)!
  }
}

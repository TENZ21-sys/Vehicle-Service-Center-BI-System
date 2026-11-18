import { ExpensesRepository } from '../repositories/expenses.repo'
import { AnalyticsRepository } from '../repositories/analytics.repo'
import { SettingsRepository } from '../repositories/settings.repo'
import { PermissionService } from './permissions.service'
import { AuditService } from './audit.service'
import { sessionManager } from './session'
import {
  Expense,
  ExpenseCategory,
  ExpenseWithCategory,
  CreateExpenseInput,
  UpdateExpenseInput,
  CreateExpenseCategoryInput,
  UpdateExpenseCategoryInput,
  ExpenseFilter,
  CashFlowSummary
} from '@shared/types/finance.types'
import {
  createExpenseSchema,
  updateExpenseSchema,
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  expenseFilterSchema,
  dateRangeFilterSchema
} from '@shared/validation/finance.schema'
import { ValidationError, NotFoundError } from '../utils/errors'

export class FinanceService {
  private expenseRepo: ExpensesRepository
  private analyticsRepo: AnalyticsRepository
  private settingsRepo: SettingsRepository
  private permService: PermissionService
  private audit: AuditService

  constructor(
    expenseRepo = new ExpensesRepository(),
    analyticsRepo = new AnalyticsRepository(),
    settingsRepo = new SettingsRepository(),
    permService = new PermissionService(),
    audit = new AuditService()
  ) {
    this.expenseRepo = expenseRepo
    this.analyticsRepo = analyticsRepo
    this.settingsRepo = settingsRepo
    this.permService = permService
    this.audit = audit
  }

  private checkModuleEnabled(): void {
    const toggle = this.settingsRepo.get('feature_toggles', 'module_finance')
    if (toggle && toggle.value === false) {
      throw new ValidationError('Finance module is currently disabled in system settings.')
    }
  }

  private checkExpensesEnabled(): void {
    this.checkModuleEnabled()
    const toggle = this.settingsRepo.get('finance', 'finance_enable_expenses')
    if (toggle && toggle.value === false) {
      throw new ValidationError('Expense tracking is currently disabled in system settings.')
    }
  }

  private checkCashRegisterEnabled(): void {
    this.checkModuleEnabled()
    const toggle = this.settingsRepo.get('finance', 'finance_enable_cash_register')
    if (toggle && toggle.value === false) {
      throw new ValidationError('Cash register reconciliation is currently disabled in system settings.')
    }
  }

  // --- Categories ---

  public listCategories(includeInactive = false): ExpenseCategory[] {
    this.checkModuleEnabled()
    this.permService.requirePermission('finance:view')
    return this.expenseRepo.listCategories(includeInactive)
  }

  public createCategory(input: CreateExpenseCategoryInput): ExpenseCategory {
    this.checkModuleEnabled()
    this.permService.requirePermission('finance:create_expense')
    const validated = createExpenseCategorySchema.parse(input)
    const category = this.expenseRepo.createCategory(validated)

    const session = sessionManager.requireSession()
    this.audit.record({
      action: 'EXPENSE_CATEGORY_CREATED',
      entityType: 'expense_category',
      entityId: category.id,
      userId: session.userId,
      metadata: { name: category.name }
    })

    return category
  }

  public updateCategory(id: string, input: UpdateExpenseCategoryInput): ExpenseCategory {
    this.checkModuleEnabled()
    this.permService.requirePermission('finance:create_expense')
    const validated = updateExpenseCategorySchema.parse(input)
    const category = this.expenseRepo.updateCategory(id, validated)

    const session = sessionManager.requireSession()
    this.audit.record({
      action: 'EXPENSE_CATEGORY_UPDATED',
      entityType: 'expense_category',
      entityId: category.id,
      userId: session.userId,
      metadata: { name: category.name, isActive: category.isActive }
    })

    return category
  }

  // --- Expenses ---

  public listExpenses(filter?: ExpenseFilter): ExpenseWithCategory[] {
    this.checkExpensesEnabled()
    this.permService.requirePermission('finance:view')
    const validatedFilter = filter ? expenseFilterSchema.parse(filter) : undefined
    return this.expenseRepo.list(validatedFilter)
  }

  public getExpenseById(id: string): ExpenseWithCategory {
    this.checkExpensesEnabled()
    this.permService.requirePermission('finance:view')
    const expense = this.expenseRepo.getById(id)
    if (!expense) {
      throw new NotFoundError(`Expense with ID ${id} not found`)
    }
    return expense
  }

  public createExpense(input: CreateExpenseInput): ExpenseWithCategory {
    this.checkExpensesEnabled()
    this.permService.requirePermission('finance:create_expense')
    const validated = createExpenseSchema.parse(input)
    const session = sessionManager.requireSession()

    const expense = this.expenseRepo.create(validated, session.userId)

    this.audit.record({
      action: 'EXPENSE_RECORDED',
      entityType: 'expense',
      entityId: expense.id,
      userId: session.userId,
      metadata: {
        expenseNumber: expense.expenseNumber,
        category: expense.category.name,
        amount: expense.amount,
        paymentMethod: expense.paymentMethod
      }
    })

    return expense
  }

  public updateExpense(id: string, input: UpdateExpenseInput): ExpenseWithCategory {
    this.checkExpensesEnabled()
    this.permService.requirePermission('finance:create_expense')
    const validated = updateExpenseSchema.parse(input)
    const session = sessionManager.requireSession()

    const expense = this.expenseRepo.update(id, validated)

    this.audit.record({
      action: 'EXPENSE_UPDATED',
      entityType: 'expense',
      entityId: expense.id,
      userId: session.userId,
      metadata: {
        expenseNumber: expense.expenseNumber,
        amount: expense.amount
      }
    })

    return expense
  }

  public deleteExpense(id: string): boolean {
    this.checkExpensesEnabled()
    this.permService.requirePermission('finance:create_expense')
    const session = sessionManager.requireSession()
    const expense = this.expenseRepo.getById(id)
    if (!expense) {
      throw new NotFoundError(`Expense with ID ${id} not found`)
    }

    const success = this.expenseRepo.delete(id)
    if (success) {
      this.audit.record({
        action: 'EXPENSE_DELETED',
        entityType: 'expense',
        entityId: id,
        userId: session.userId,
        metadata: { expenseNumber: expense.expenseNumber }
      })
    }
    return success
  }

  // --- Cash Flow & Register ---

  public getCashFlowSummary(startDate: string, endDate: string): CashFlowSummary {
    this.checkCashRegisterEnabled()
    this.permService.requirePermission('finance:view')
    dateRangeFilterSchema.parse({ startDate, endDate })
    return this.analyticsRepo.getCashFlowSummary(startDate, endDate)
  }
}

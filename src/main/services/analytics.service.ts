import { AnalyticsRepository } from '../repositories/analytics.repo'
import { SettingsRepository } from '../repositories/settings.repo'
import { PermissionService } from './permissions.service'
import {
  FinancialSummary,
  WorkshopTurnaroundMetrics,
  TechnicianMetrics,
  InventoryTurnoverMetrics,
  CustomerLtvMetrics
} from '@shared/types/finance.types'
import { dateRangeFilterSchema } from '@shared/validation/finance.schema'
import { ValidationError } from '../utils/errors'

export class AnalyticsService {
  private analyticsRepo: AnalyticsRepository
  private settingsRepo: SettingsRepository
  private permService: PermissionService

  constructor(
    analyticsRepo = new AnalyticsRepository(),
    settingsRepo = new SettingsRepository(),
    permService = new PermissionService()
  ) {
    this.analyticsRepo = analyticsRepo
    this.settingsRepo = settingsRepo
    this.permService = permService
  }

  private checkModuleEnabled(): void {
    const toggle = this.settingsRepo.get('feature_toggles', 'module_bi')
    if (toggle && toggle.value === false) {
      throw new ValidationError('Business Intelligence & Analytics module is currently disabled in system settings.')
    }
  }

  public getFinancialSummary(startDate: string, endDate: string): FinancialSummary {
    this.checkModuleEnabled()
    this.permService.requirePermission('bi:view')
    dateRangeFilterSchema.parse({ startDate, endDate })

    const summary = this.analyticsRepo.getFinancialSummary(startDate, endDate)

    // Check if COGS tracking is disabled by settings
    const cogsToggle = this.settingsRepo.get('finance', 'finance_enable_cogs_tracking')
    if (cogsToggle && cogsToggle.value === false) {
      summary.partsCogs = 0
      summary.grossProfit = summary.totalRevenue
      summary.grossMarginPercent = 100
      summary.netProfit = summary.totalRevenue - summary.totalExpenses
      summary.netMarginPercent = summary.totalRevenue > 0
        ? Number(((summary.netProfit / summary.totalRevenue) * 100).toFixed(2))
        : 0
    }

    return summary
  }

  public getWorkshopTurnaroundMetrics(startDate?: string, endDate?: string): WorkshopTurnaroundMetrics {
    this.checkModuleEnabled()
    this.permService.requirePermission('bi:view')

    const toggle = this.settingsRepo.get('bi', 'bi_enable_turnaround_metrics')
    if (toggle && toggle.value === false) {
      throw new ValidationError('Workshop turnaround metrics tracking is disabled in settings.')
    }

    return this.analyticsRepo.getWorkshopTurnaroundMetrics(startDate, endDate)
  }

  public getTechnicianMetrics(startDate?: string, endDate?: string): TechnicianMetrics[] {
    this.checkModuleEnabled()
    this.permService.requirePermission('bi:view')

    const toggle = this.settingsRepo.get('bi', 'bi_enable_technician_metrics')
    if (toggle && toggle.value === false) {
      throw new ValidationError('Technician performance metrics tracking is disabled in settings.')
    }

    return this.analyticsRepo.getTechnicianMetrics(startDate, endDate)
  }

  public getInventoryTurnoverMetrics(): InventoryTurnoverMetrics {
    this.checkModuleEnabled()
    this.permService.requirePermission('bi:view')

    const toggle = this.settingsRepo.get('bi', 'bi_enable_inventory_analytics')
    if (toggle && toggle.value === false) {
      throw new ValidationError('Inventory turnover analytics is disabled in settings.')
    }

    return this.analyticsRepo.getInventoryTurnoverMetrics()
  }

  public getCustomerLtvMetrics(): CustomerLtvMetrics {
    this.checkModuleEnabled()
    this.permService.requirePermission('bi:view')

    const toggle = this.settingsRepo.get('bi', 'bi_enable_customer_analytics')
    if (toggle && toggle.value === false) {
      throw new ValidationError('Customer lifetime value & retention analytics is disabled in settings.')
    }

    return this.analyticsRepo.getCustomerLtvMetrics()
  }
}

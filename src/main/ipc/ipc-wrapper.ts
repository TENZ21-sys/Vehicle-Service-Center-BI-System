import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { ApiResponse } from '@shared/types/common.types'
import { AppError } from '../utils/errors'
import { logger } from '../utils/logger'

type IpcHandler<TArgs extends unknown[], TResult> = (
  event: IpcMainInvokeEvent,
  ...args: TArgs
) => Promise<TResult> | TResult

export function registerIpcHandler<TArgs extends unknown[], TResult>(
  channel: string,
  handler: IpcHandler<TArgs, TResult>
): void {
  ipcMain.handle(channel, async (event, ...args: TArgs): Promise<ApiResponse<TResult>> => {
    try {
      logger.debug(`IPC Invoke: [${channel}]`)
      const result = await handler(event, ...args)
      return {
        success: true,
        data: result
      }
    } catch (err: unknown) {
      if (err instanceof AppError) {
        logger.warn(`IPC Error [${channel}] (${err.code}): ${err.message}`, err.details)
        return {
          success: false,
          error: {
            code: err.code,
            message: err.message,
            details: err.details
          }
        }
      }

      const unexpected = err instanceof Error ? err : new Error(String(err))
      logger.error(`IPC Unexpected Error [${channel}]: ${unexpected.message}`, unexpected.stack)

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected internal error occurred. Please consult the application logs.'
        }
      }
    }
  })
}

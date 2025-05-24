import { Inject, Injectable } from '@nestjs/common'
import { DRIZZLE_PROVIDER_TOKEN } from '../db/constants'
import { db } from '../db'
import { logs } from '../db/schema' // Импортируем схему logs

export type DrizzleDB = typeof db

@Injectable()
export class LogsService {
  constructor(@Inject(DRIZZLE_PROVIDER_TOKEN) private readonly drizzle: DrizzleDB) {}

  /**
   * Создает запись лога в базе данных
   * @param action Тип действия
   * @param userId ID пользователя (опционально)
   * @param additionalData Дополнительные данные (опционально)
   */
  async createLog(action: string, userId?: number, additionalData?: Record<string, unknown>): Promise<void> {
    try {
      // Need to check the logs schema to identify the correct field names
      // The error indicates 'data' field doesn't exist in the schema
      await this.drizzle.insert(logs).values({
        action,
        userId: userId ?? null,
        // Assuming 'additionalData' is the correct field name based on the error
        additionalData: additionalData ? JSON.stringify(additionalData) : null
      })
      // Логирование в консоль для отладки (можно убрать)
      console.log(`Log created: User ${userId ?? 'Guest'} - Action: ${action}`)
    } catch (error) {
      // Обработка ошибок логирования (например, запись в другой логгер или игнорирование)
      console.error('Failed to create log:', error)
    }
  }
}

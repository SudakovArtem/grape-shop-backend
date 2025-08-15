import { Injectable, Inject } from '@nestjs/common'
import { DRIZZLE_PROVIDER_TOKEN } from '../../db/constants'
import { guestSessions } from '../../db/schema'
import { eq, lt } from 'drizzle-orm'
import { DrizzleDB } from '../../carts/carts.service'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class GuestSessionService {
  constructor(@Inject(DRIZZLE_PROVIDER_TOKEN) private readonly drizzle: DrizzleDB) {}

  /**
   * Генерирует новый guest-id
   */
  generateGuestId(): string {
    return `guest_${uuidv4().replace(/-/g, '')}`
  }

  /**
   * Создаёт новую гостевую сессию
   */
  async createGuestSession(guestId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // Сессия действует 30 дней

    await this.drizzle.insert(guestSessions).values({
      guestId,
      ipAddress,
      userAgent,
      expiresAt
    })
  }

  /**
   * Проверяет валидность гостевой сессии
   */
  async isValidGuestSession(guestId: string): Promise<boolean> {
    const session = await this.drizzle.select().from(guestSessions).where(eq(guestSessions.guestId, guestId)).limit(1)

    if (session.length === 0) {
      return false
    }

    // Проверяем, не истекла ли сессия
    const now = new Date()
    return session[0].expiresAt > now
  }

  /**
   * Продлевает срок действия гостевой сессии
   */
  async extendGuestSession(guestId: string): Promise<void> {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    await this.drizzle.update(guestSessions).set({ expiresAt }).where(eq(guestSessions.guestId, guestId))
  }

  /**
   * Удаляет истекшие гостевые сессии (для очистки)
   */
  async cleanExpiredSessions(): Promise<void> {
    const now = new Date()
    await this.drizzle.delete(guestSessions).where(lt(guestSessions.expiresAt, now))
  }

  /**
   * Получает информацию о гостевой сессии
   */
  async getGuestSession(guestId: string) {
    const session = await this.drizzle.select().from(guestSessions).where(eq(guestSessions.guestId, guestId)).limit(1)

    return session.length > 0 ? session[0] : null
  }
}

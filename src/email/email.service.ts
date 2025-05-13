import { Injectable, Logger } from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)

  constructor(private readonly mailerService: MailerService) {}

  async sendResetPasswordEmail(to: string, token: string): Promise<void> {
    const resetUrl = `http://localhost:3000/reset-password?token=${token}`
    const subject = 'Сброс пароля для Grape Shop'
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template: __dirname + '/../../templates/reset-password',
        context: {
          resetUrl
        }
      })
      this.logger.log(`Email sent successfully to ${to} with subject "${subject}"`)
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async sendRegistrationWelcomeEmail(to: string, name?: string | null): Promise<void> {
    const subject = 'Добро пожаловать в Grape Shop!'
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template: __dirname + '/../../templates/welcome',
        context: {
          name: name || 'Пользователь'
        }
      })
      this.logger.log(`Email sent successfully to ${to} with subject "${subject}"`)
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async sendOrderStatusUpdateEmail(to: string, orderId: number, newStatus: string): Promise<void> {
    const subject = `Обновление статуса заказа №${orderId}`
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template: __dirname + '/../../templates/order-status',
        context: {
          orderId,
          newStatus
        }
      })
      this.logger.log(`Email sent successfully to ${to} with subject "${subject}"`)
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

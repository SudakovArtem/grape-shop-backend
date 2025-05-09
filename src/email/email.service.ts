import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as sgMail from '@sendgrid/mail'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private readonly fromAddress: string

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY')
    const fromAddr = this.configService.get<string>('EMAIL_FROM_ADDRESS')

    if (!apiKey || !fromAddr) {
      this.logger.error('SendGrid API Key or From Address is not configured. Email functionality will be disabled.')
      // Инициализируем fromAddress как пустую строку, чтобы удовлетворить TypeScript
      // и проверка в sendEmail предотвратит отправку.
      this.fromAddress = ''
    } else {
      sgMail.setApiKey(apiKey)
      this.fromAddress = fromAddr // Присваиваем только если есть
      this.logger.log('SendGrid Mail Service Initialized')
    }
  }

  async sendResetPasswordEmail(to: string, token: string): Promise<void> {
    // В реальном приложении URL должен указывать на ваш фронтенд
    const resetUrl = `http://localhost:3000/reset-password?token=${token}` // Пример URL
    const subject = 'Сброс пароля для Grape Shop' // Можно вынести в константы или конфиг
    const text = `Вы запросили сброс пароля. Перейдите по следующей ссылке, чтобы установить новый пароль: ${resetUrl}\n\nЕсли вы не запрашивали сброс пароля, просто проигнорируйте это письмо.\n\nСсылка действительна в течение 1 часа.`
    const html = `
      <p>Вы запросили сброс пароля для вашего аккаунта.</p>
      <p>Нажмите на ссылку ниже, чтобы установить новый пароль:</p>
      <p><a href="${resetUrl}">Сбросить пароль</a></p>
      <p>Если вы не запрашивали сброс пароля, пожалуйста, проигнорируйте это письмо.</p>
      <p>Ссылка действительна в течение 1 часа.</p>
    `

    await this.sendEmail(to, subject, text, html)
  }

  async sendRegistrationWelcomeEmail(to: string, name?: string | null): Promise<void> {
    const subject = 'Добро пожаловать в Grape Shop!'
    const text = `Здравствуйте, ${name || 'Пользователь'}!\n\nСпасибо за регистрацию в нашем магазине саженцев винограда Grape Shop!`
    const html = `
      <h1>Добро пожаловать в Grape Shop!</h1>
      <p>Здравствуйте, ${name || 'Пользователь'}!</p>
      <p>Спасибо за регистрацию в нашем магазине саженцев винограда.</p>
      <p>Желаем приятных покупок!</p>
    `
    await this.sendEmail(to, subject, text, html)
  }

  async sendOrderStatusUpdateEmail(to: string, orderId: number, newStatus: string): Promise<void> {
    const subject = `Обновление статуса заказа №${orderId}`
    const text = `Статус вашего заказа №${orderId} был обновлен на: ${newStatus}.`
    const html = `
      <p>Статус вашего заказа №${orderId} был обновлен.</p>
      <p><b>Новый статус: ${newStatus}</b></p>
      <p>Вы можете проверить детали заказа в вашем личном кабинете.</p>
    `
    await this.sendEmail(to, subject, text, html)
  }

  private async sendEmail(to: string, subject: string, text: string, html: string): Promise<void> {
    // Проверка apiKey здесь не нужна, т.к. он устанавливается один раз.
    // Проверяем только fromAddress, который мог не установиться при отсутствии конфига.
    if (!this.fromAddress) {
      this.logger.warn(
        `Email sending is disabled due to missing EMAIL_FROM_ADDRESS configuration. Attempted to send to ${to} with subject "${subject}"`
      )
      return // Не отправляем, если нет конфигурации
    }

    const msg = {
      to,
      from: this.fromAddress, // Используем верифицированный email отправителя
      subject,
      text, // Текстовая версия письма
      html // HTML версия письма
    }

    try {
      await sgMail.send(msg)
      this.logger.log(`Email sent successfully to ${to} with subject "${subject}"`)
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to send email to ${to}: ${error.message}`, error.stack)
      } else {
        this.logger.error(`Failed to send email to ${to}: ${String(error)}`)
      }
    }
  }
}

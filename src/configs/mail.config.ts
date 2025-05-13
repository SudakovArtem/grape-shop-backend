import { ConfigService } from '@nestjs/config'
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter'

export const getMailConfig = (configService: ConfigService) => {
  const transport = configService.get<string>('MAIL_TRANSPORT')
  const mailFromName = configService.get<string>('MAIL_FROM_NAME')
  if (!transport || !mailFromName) {
    throw new Error('MAIL_TRANSPORT и MAIL_FROM_NAME должны быть заданы в .env')
  }
  const mailFromAddress = transport.split(':')[1].split('//')[1]

  return {
    transport,
    defaults: {
      from: `"${mailFromName}" <${mailFromAddress}>`
    },
    template: {
      adapter: new EjsAdapter(),
      options: {
        strict: false
      }
    }
  }
}

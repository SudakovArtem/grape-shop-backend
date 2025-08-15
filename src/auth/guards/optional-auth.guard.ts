import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/**
 * Optional Auth Guard - позволяет запросам проходить как с токеном, так и без него
 * Если токен предоставлен и валиден, устанавливает req.user
 * Если токена нет или он невалиден, req.user остается undefined, но запрос продолжается
 */
@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Пробуем выполнить стандартную JWT аутентификацию
    return super.canActivate(context)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext, status?: any): TUser {
    // Если произошла ошибка аутентификации или пользователь не найден,
    // просто возвращаем undefined (не выбрасываем исключение)
    // Это позволяет запросу продолжиться без авторизации
    if (err || !user) {
      return undefined as TUser
    }
    return user as TUser
  }
}

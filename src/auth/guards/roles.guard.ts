import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { AuthenticatedUser } from '../../users/jwt.strategy' // Путь к вашему интерфейсу пользователя

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(), // Сначала проверяем метаданные на уровне метода
      context.getClass() // Затем на уровне класса
    ])
    if (!requiredRoles || requiredRoles.length === 0) {
      // Если декоратор @Roles не использован или массив ролей пуст, разрешаем доступ
      // Это позволяет использовать RolesGuard глобально или на уровне контроллера,
      // а специфичные роли указывать только там, где это необходимо.
      // Если же доступ без указания ролей должен быть запрещен, здесь нужно вернуть false
      // или чтобы @Roles([]) явно указывался для публичных защищенных роутов.
      return true
    }

    const { user } = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>()

    // Если пользователя нет в запросе (например, эндпоинт не защищен AuthGuard или токен невалиден)
    // или у пользователя нет роли, запрещаем доступ.
    if (!user || !user.role) {
      return false
    }

    // Проверяем, есть ли у пользователя хотя бы одна из требуемых ролей
    return requiredRoles.some((role) => user.role === role)
  }
}

import { Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
// Убираем UsersService и Drizzle, если не делаем запрос к БД внутри validate
// import { UsersService, SafeUser } from './users.service'

// Если SafeUser импортируется из users.service, его нужно будет адаптировать или создать локальный интерфейс
// Предположим, что SafeUser (или его аналог для req.user) может выглядеть так:
export interface AuthenticatedUser {
  id: number
  email: string
  role: string // Добавили роль
  firstName?: string // Опционально, если нет в токене
  lastName?: string // Опционально, если нет в токене
  // другие поля, которые могут быть в токене и нужны в req.user
}

// Определяем тип для JWT Payload, который генерирует UsersService
interface JwtPayload {
  email: string
  sub: number // ID пользователя
  role: string // Роль пользователя
  firstName?: string // Если UsersService добавляет это в токен
  lastName?: string // Если UsersService добавляет это в токен
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService
    // private readonly usersService: UsersService // Убираем, если не используем
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET')
    if (!jwtSecret) {
      // Эта ошибка будет выброшена при инициализации приложения, если JWT_SECRET не настроен
      throw new InternalServerErrorException('JWT_SECRET is not defined in environment variables.')
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Рекомендуется оставить false
      secretOrKey: jwtSecret
    })
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    // payload - это уже декодированный объект из JWT
    // Проверяем наличие обязательных полей в payload
    if (!payload || !payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Invalid token payload')
    }

    // Просто возвращаем объект пользователя на основе payload
    // NestJS поместит этот объект в req.user
    const user: AuthenticatedUser = {
      id: payload.sub,
      email: payload.email,
      role: payload.role
    }

    // Добавляем опциональные поля, если они есть в payload
    if (payload.firstName) {
      user.firstName = payload.firstName
    }
    if (payload.lastName) {
      user.lastName = payload.lastName
    }

    return user
  }
}

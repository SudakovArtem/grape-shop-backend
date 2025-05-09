import {
  Inject,
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException
} from '@nestjs/common'
import { DRIZZLE_PROVIDER_TOKEN } from '../db/constants'
import { db } from '../db' // Импортируем тип нашего db инстанса
import { users } from '../db/schema' // Убираем импорт типа User, он будет выведен
import { CreateUserDto } from './dto/create-user.dto'
import { LoginUserDto } from './dto/login-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { eq, and, gt } from 'drizzle-orm' // Импортируем eq, and, gt для выражений WHERE
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt'
import { LogsService } from '../logs/logs.service' // Импорт LogsService
import { EmailService } from '../email/email.service' // Импортируем EmailService
import * as crypto from 'crypto'

// Определяем тип для нашего db инстанса для удобства
export type DrizzleDB = typeof db

// Выводим тип для select-операций из таблицы users
// и создаем SafeUser, исключая поля, которые не должны отправляться клиенту
export type UserSelect = typeof users.$inferSelect
// Добавляем 'role' в SafeUser, так как он теперь является частью схемы и нужен
export type SafeUser = Omit<UserSelect, 'password' | 'resetPasswordToken' | 'resetPasswordExpires'> & {
  role: UserSelect['role']
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE_PROVIDER_TOKEN) private readonly drizzle: DrizzleDB,
    private readonly jwtService: JwtService,
    private readonly logsService: LogsService, // Инъекция LogsService
    private readonly emailService: EmailService // Инъектируем EmailService
  ) {}

  async create(createUserDto: CreateUserDto): Promise<SafeUser> {
    const { email, password, name, address, phone } = createUserDto // Достаем все поля из DTO

    const existingUser = await this.drizzle.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)

    if (existingUser.length > 0) {
      throw new ConflictException('Пользователь с таким email уже существует')
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const result = await this.drizzle
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        name, // Добавляем при создании
        address, // Добавляем при создании
        phone // Добавляем при создании
        // role будет 'user' по умолчанию из схемы БД
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        address: users.address,
        phone: users.phone,
        role: users.role, // Добавляем role в returning
        createdAt: users.createdAt
      })

    if (!result || result.length === 0) {
      throw new Error('Не удалось создать пользователя')
    }
    const newUser = result[0]

    await this.logsService.createLog('user_registered', newUser.id)
    try {
      await this.emailService.sendRegistrationWelcomeEmail(newUser.email, newUser.name)
    } catch (error) {
      console.error(`Ошибка при отправке приветственного email пользователю ${newUser.email}:`, error)
    }
    return newUser
  }

  async login(loginUserDto: LoginUserDto): Promise<{ accessToken: string }> {
    const { email, password } = loginUserDto

    // Извлекаем все поля пользователя, включая роль
    const userResult = await this.drizzle.select().from(users).where(eq(users.email, email)).limit(1)

    if (userResult.length === 0) {
      throw new UnauthorizedException('Неверный email или пароль')
    }

    const foundUser = userResult[0]
    const isPasswordMatching = await bcrypt.compare(password, foundUser.password)

    if (!isPasswordMatching) {
      throw new UnauthorizedException('Неверный email или пароль')
    }

    // Добавляем роль в payload токена
    const payload = { email: foundUser.email, sub: foundUser.id, role: foundUser.role }
    const accessToken = this.jwtService.sign(payload)

    return {
      accessToken
    }
  }

  async getProfile(userId: number): Promise<SafeUser> {
    const user = await this.drizzle
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        address: users.address,
        phone: users.phone,
        role: users.role, // Добавляем role в select
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (user.length === 0) {
      throw new NotFoundException('Пользователь не найден')
    }
    return user[0]
  }

  async updateProfile(userId: number, updateUserDto: UpdateUserDto): Promise<SafeUser> {
    const { name, address, phone } = updateUserDto

    // Уточняем тип для dataToUpdate, чтобы он соответствовал возможным полям для обновления
    const dataToUpdate: Partial<Pick<UserSelect, 'name' | 'address' | 'phone'>> = {}
    if (name !== undefined) dataToUpdate.name = name
    if (address !== undefined) dataToUpdate.address = address
    if (phone !== undefined) dataToUpdate.phone = phone

    if (Object.keys(dataToUpdate).length === 0) {
      const currentUser = await this.drizzle
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          address: users.address,
          phone: users.phone,
          role: users.role, // Добавляем role в select
          createdAt: users.createdAt
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
      if (currentUser.length === 0) throw new NotFoundException('Пользователь не найден')
      return currentUser[0]
    }

    const result = await this.drizzle.update(users).set(dataToUpdate).where(eq(users.id, userId)).returning({
      id: users.id,
      email: users.email,
      name: users.name,
      address: users.address,
      phone: users.phone,
      role: users.role, // Добавляем role в returning
      createdAt: users.createdAt
    })

    if (!result || result.length === 0) {
      throw new NotFoundException('Пользователь не найден или не удалось обновить')
    }

    return result[0]
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.drizzle
      .select({ id: users.id, email: users.email, name: users.name, role: users.role }) // Добавим role, хотя здесь не критично
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (user.length === 0) {
      console.warn(`Запрос на сброс пароля для несуществующего email: ${email}`)
      return
    }

    const foundUser = user[0]
    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    const tokenExpires = new Date()
    tokenExpires.setHours(tokenExpires.getHours() + 1)

    await this.drizzle
      .update(users)
      .set({ resetPasswordToken: hashedResetToken, resetPasswordExpires: tokenExpires })
      .where(eq(users.id, foundUser.id))

    try {
      await this.emailService.sendResetPasswordEmail(foundUser.email, resetToken)
    } catch (error) {
      console.error(`Ошибка при отправке email для сброса пароля пользователю ${foundUser.email}:`, error)
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    // При поиске пользователя для сброса пароля, его роль не важна, поэтому select() без явных полей оставляем
    const userResult = await this.drizzle
      .select()
      .from(users)
      .where(and(eq(users.resetPasswordToken, hashedToken), gt(users.resetPasswordExpires, new Date())))
      .limit(1)

    if (userResult.length === 0) {
      throw new BadRequestException('Токен сброса пароля недействителен или истек.')
    }

    const foundUser = userResult[0]
    const newHashedPassword = await bcrypt.hash(newPassword, 10)

    await this.drizzle
      .update(users)
      .set({
        password: newHashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null
      })
      .where(eq(users.id, foundUser.id))
  }

  // Метод для установки роли (пример)
  async setRole(userId: number, newRole: UserSelect['role']): Promise<SafeUser> {
    if (!['user', 'admin'].includes(newRole)) {
      throw new BadRequestException('Недопустимая роль.')
    }
    const updatedResult = await this.drizzle
      .update(users)
      .set({ role: newRole })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        address: users.address,
        phone: users.phone,
        role: users.role, // Возвращаем роль
        createdAt: users.createdAt
      })

    if (updatedResult.length === 0) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден.`)
    }
    return updatedResult[0]
  }
}

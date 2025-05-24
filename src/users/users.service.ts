import {
  Inject,
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException
} from '@nestjs/common'
import { DRIZZLE_PROVIDER_TOKEN } from '../db/constants'
import { db } from '../db' // Импортируем тип нашего db инстанса
import { users, logs } from '../db/schema' // Убираем импорт orders
import { CreateUserDto } from './dto/create-user.dto'
import { LoginUserDto } from './dto/login-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { eq, and, gt, ilike, SQL, desc, count, asc } from 'drizzle-orm' // Убрал asc, добавил desc, count
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt'
import { LogsService } from '../logs/logs.service' // Импорт LogsService
import { EmailService } from '../email/email.service' // Импортируем EmailService
import * as crypto from 'crypto'
import { FindAllUsersQueryDto } from './dto/find-all-users-query.dto'
import { AuthenticatedUser } from './jwt.strategy'

// Определяем тип для нашего db инстанса для удобства
export type DrizzleDB = typeof db

// Выводим тип для select-операций из таблицы users
// и создаем SafeUser, исключая поля, которые не должны отправляться клиенту
export type UserSelect = typeof users.$inferSelect
// Добавляем 'role' в SafeUser, так как он теперь является частью схемы и нужен
// Добавляем 'avatar' в SafeUser, так как он теперь является частью схемы
// Omit теперь включает и 'avatar' из UserSelect, если он там был, но нам нужно его явно включить в SafeUser
// Правильнее будет так: сначала Omit, потом добавляем нужные поля, включая role и avatar из UserSelect
export type SafeUser = Omit<UserSelect, 'password' | 'resetPasswordToken' | 'resetPasswordExpires'> & {
  role: UserSelect['role']
  avatar: UserSelect['avatar'] // Убедимся, что avatar здесь указан как обязательный (или nullable, если схема позволяет)
}

// Определяем тип для объекта SelectQueryBuilder, который возвращает Drizzle
// Это может потребовать импорта специфичного типа из drizzle-orm/pg-core если он есть,
// или использования общего типа, если он подходит.
// Для примера, используем ReturnType от базового запроса, если это возможно, или any как крайнюю меру.
// Более точный тип был бы лучше, например, что-то вроде PgSelect<...

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
        name,
        address,
        phone
        // avatar будет null по умолчанию или его можно добавить в CreateUserDto опционально
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        address: users.address,
        phone: users.phone,
        avatar: users.avatar, // Добавляем avatar
        role: users.role,
        createdAt: users.createdAt
      })

    if (!result || result.length === 0) {
      throw new Error('Не удалось создать пользователя')
    }
    const newUser = result[0]

    await this.logsService.createLog('user_registered', newUser.id, { email: newUser.email })
    try {
      await this.emailService.sendRegistrationWelcomeEmail(newUser.email, newUser.name)
    } catch (error) {
      console.error(`Ошибка при отправке приветственного email пользователю ${newUser.email}:`, error)
    }
    return newUser
  }

  private async _authenticateAndGenerateToken(
    loginUserDto: LoginUserDto,
    requiredRole?: string
  ): Promise<{ accessToken: string }> {
    const { email, password } = loginUserDto

    const userResult = await this.drizzle.select().from(users).where(eq(users.email, email)).limit(1)

    if (userResult.length === 0) {
      throw new UnauthorizedException('Неверный email или пароль')
    }

    const foundUser = userResult[0]
    const isPasswordMatching = await bcrypt.compare(password, foundUser.password)

    if (!isPasswordMatching) {
      throw new UnauthorizedException('Неверный email или пароль')
    }

    if (requiredRole && foundUser.role !== requiredRole) {
      throw new ForbiddenException('Доступ запрещен. У пользователя нет достаточных прав.')
    }

    const payload = { email: foundUser.email, sub: foundUser.id, role: foundUser.role }
    const accessToken = this.jwtService.sign(payload)

    return {
      accessToken
    }
  }

  async login(loginUserDto: LoginUserDto): Promise<{ accessToken: string }> {
    return this._authenticateAndGenerateToken(loginUserDto)
  }

  async adminLogin(loginUserDto: LoginUserDto): Promise<{ accessToken: string }> {
    return this._authenticateAndGenerateToken(loginUserDto, 'admin')
  }

  async getProfile(userId: number): Promise<SafeUser> {
    const user = await this.drizzle
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        address: users.address,
        phone: users.phone,
        avatar: users.avatar, // Добавляем avatar
        role: users.role,
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
    const { name, address, phone, avatar } = updateUserDto // Добавляем avatar

    // Уточняем тип для dataToUpdate, чтобы он соответствовал возможным полям для обновления
    const dataToUpdate: Partial<Pick<UserSelect, 'name' | 'address' | 'phone' | 'avatar'>> = {} // Добавляем avatar
    if (name !== undefined) dataToUpdate.name = name
    if (address !== undefined) dataToUpdate.address = address
    if (phone !== undefined) dataToUpdate.phone = phone
    if (avatar !== undefined) dataToUpdate.avatar = avatar // Добавляем обработку avatar

    if (Object.keys(dataToUpdate).length === 0) {
      // Если нет данных для обновления, просто возвращаем текущего пользователя
      const currentUser = await this.drizzle
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          address: users.address,
          phone: users.phone,
          avatar: users.avatar,
          role: users.role,
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
      avatar: users.avatar, // Убедимся, что avatar возвращается
      role: users.role,
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

  // Метод для установки роли пользователю (пример)
  async setRole(userId: number, role: 'user' | 'admin'): Promise<SafeUser> {
    const updatedUsers = await this.drizzle.update(users).set({ role: role }).where(eq(users.id, userId)).returning({
      id: users.id,
      email: users.email,
      name: users.name,
      address: users.address,
      phone: users.phone,
      avatar: users.avatar, // Добавляем avatar
      role: users.role,
      createdAt: users.createdAt
    })

    if (updatedUsers.length === 0) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден.`)
    }
    return updatedUsers[0]
  }

  async remove(idToDelete: number, currentUser: AuthenticatedUser): Promise<void> {
    const userToDeleteResult = await this.drizzle
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, idToDelete))
      .limit(1)

    if (userToDeleteResult.length === 0) {
      throw new NotFoundException(`Пользователь с ID ${idToDelete} не найден.`)
    }

    if (currentUser.id !== idToDelete && currentUser.role !== 'admin') {
      throw new ForbiddenException('У вас нет прав для удаления этого пользователя.')
    }

    try {
      await this.drizzle.transaction(async (tx) => {
        // Удаление связанных логов (оставляем, так как для logs нет каскадного удаления)
        await tx.delete(logs).where(eq(logs.userId, idToDelete))

        // Удаление carts и orders (и связанных orderItems) будет выполнено каскадно базой данных.
        // Поэтому явное удаление их здесь не требуется.

        const deleteResult = await tx.delete(users).where(eq(users.id, idToDelete))

        if (deleteResult.rowCount === 0) {
          throw new InternalServerErrorException(
            `Не удалось удалить пользователя с ID ${idToDelete} в ходе транзакции.`
          )
        }
      })
    } catch (error) {
      // Перебрасываем известные ожидаемые ошибки (NotFoundException, ForbiddenException)
      // ConflictException из-за заказов больше не должен возникать здесь.
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error
      }
      console.error(`Ошибка при удалении пользователя ID ${idToDelete} и связанных данных:`, error)
      throw new InternalServerErrorException(
        `Произошла ошибка при удалении пользователя и связанных данных. Пожалуйста, попробуйте снова.`
      )
    }

    await this.logsService.createLog('user_deleted', currentUser.id, { userId: idToDelete })
  }

  async findAllUsers(
    queryDto: FindAllUsersQueryDto
  ): Promise<{ data: SafeUser[]; meta: { total: number; page: number; limit: number; lastPage: number } }> {
    const { page = 1, limit = 10, email: emailQuery, sortBy = '-createdAt' } = queryDto
    const offset = (page - 1) * limit

    const conditions: (SQL | undefined)[] = []
    if (emailQuery) {
      conditions.push(ilike(users.email, `%${emailQuery}%`))
    }

    const whereCondition = conditions.length > 0 ? and(...conditions.filter((c): c is SQL => !!c)) : undefined

    const orderByClause = sortBy === 'createdAt' ? asc(users.createdAt) : desc(users.createdAt)

    const result = await this.drizzle
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        address: users.address,
        phone: users.phone,
        avatar: users.avatar, // Добавляем avatar
        role: users.role,
        createdAt: users.createdAt
      })
      .from(users)
      .where(whereCondition)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset)

    const totalResult = await this.drizzle
      .select({ count: count(users.id) }) // Используем count(users.id) вместо countDistinct
      .from(users)
      .where(whereCondition)

    const total = totalResult[0].count

    return {
      data: result,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit)
      }
    }
  }

  async findUserByIdForAdmin(userId: number): Promise<SafeUser> {
    const user = await this.drizzle
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        address: users.address,
        phone: users.phone,
        avatar: users.avatar, // Добавляем avatar
        role: users.role,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (user.length === 0) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден.`)
    }
    return user[0]
  }
}

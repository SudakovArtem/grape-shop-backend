import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Request,
  UseGuards,
  Put,
  Query,
  Param,
  ParseIntPipe,
  Delete
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { CreateUserDto } from './dto/create-user.dto'
import { LoginUserDto } from './dto/login-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { AuthGuard } from '@nestjs/passport'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'
import { FindAllUsersQueryDto } from './dto/find-all-users-query.dto'
import { UserResponseDto } from './dto/user-response.dto'
import { LoginResponseDto } from './dto/login-response.dto'
import { MessageResponseDto } from '../common/dto/message-response.dto'
import { PaginatedUserResponseDto } from './dto/paginated-user-response.dto'
import { AuthenticatedUser } from './jwt.strategy'

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Получить всех пользователей (только для администраторов)' })
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список пользователей с пагинацией',
    type: PaginatedUserResponseDto
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Недостаточно прав.' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async findAllUsers(@Query() queryDto: FindAllUsersQueryDto): Promise<PaginatedUserResponseDto> {
    return this.usersService.findAllUsers(queryDto)
  }

  @Post('register')
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Пользователь успешно зарегистрирован.',
    type: UserResponseDto
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Неверные данные для регистрации.' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Пользователь с таким email уже существует.' })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto)
  }

  @Post('login')
  @ApiOperation({ summary: 'Вход пользователя и получение JWT токена' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Успешный вход, получен токен.', type: LoginResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Неверный email или пароль.' })
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginUserDto: LoginUserDto): Promise<LoginResponseDto> {
    return this.usersService.login(loginUserDto)
  }

  @Post('admin/login')
  @ApiOperation({ summary: 'Вход администратора и получение JWT токена' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Успешный вход, получен токен.', type: LoginResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Неверный email или пароль.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Доступ запрещен. У пользователя нет прав администратора.'
  })
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() loginUserDto: LoginUserDto): Promise<LoginResponseDto> {
    return await this.usersService.adminLogin(loginUserDto)
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Запрос на сброс пароля' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Запрос на сброс пароля отправлен.', type: MessageResponseDto })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<MessageResponseDto> {
    await this.usersService.forgotPassword(forgotPasswordDto.email)
    return { message: 'Если пользователь с таким email существует, ему будет отправлена инструкция по сбросу пароля.' }
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Сброс пароля с использованием токена' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Пароль успешно сброшен.', type: MessageResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Токен недействителен или истек.' })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<MessageResponseDto> {
    await this.usersService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword)
    return { message: 'Пароль успешно сброшен.' }
  }

  @Get('profile')
  @ApiOperation({ summary: 'Получить профиль текущего пользователя' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Профиль текущего пользователя.', type: UserResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getProfile(@Request() req: { user: AuthenticatedUser }): Promise<UserResponseDto> {
    return await this.usersService.getProfile(req.user.id)
  }

  @Put('profile')
  @ApiOperation({ summary: 'Обновить профиль текущего пользователя' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Профиль успешно обновлен.', type: UserResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Неверные данные для обновления.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Request() req: { user: { id: number } },
    @Body() updateUserDto: UpdateUserDto
  ): Promise<UserResponseDto> {
    const userId = req.user.id
    return await this.usersService.updateProfile(userId, updateUserDto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить информацию о пользователе по ID (только для администраторов)' })
  @ApiBearerAuth()
  @ApiResponse({ status: HttpStatus.OK, description: 'Информация о пользователе.', type: UserResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Пользователь не найден.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Доступ запрещен.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async findUserById(@Param('id', ParseIntPipe) id: number): Promise<UserResponseDto> {
    return this.usersService.findUserByIdForAdmin(id)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить пользователя (доступно самому пользователю или администратору)' })
  @ApiBearerAuth()
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Пользователь успешно удален.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Пользователь не найден.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Нет прав на удаление этого пользователя.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id', ParseIntPipe) id: number, @Request() req: { user: AuthenticatedUser }): Promise<void> {
    return await this.usersService.remove(id, req.user)
  }
}

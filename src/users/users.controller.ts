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
import { UsersService, SafeUser } from './users.service'
import { CreateUserDto } from './dto/create-user.dto'
import { LoginUserDto } from './dto/login-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { AuthGuard } from '@nestjs/passport'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'
import { AuthenticatedUser } from './jwt.strategy'
import { FindAllUsersQueryDto } from './dto/find-all-users-query.dto'

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Получить всех пользователей (только для администраторов)' })
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список пользователей с пагинацией'
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async findAllUsers(@Query() queryDto: FindAllUsersQueryDto): Promise<{ data: SafeUser[]; meta: any }> {
    return this.usersService.findAllUsers(queryDto)
  }

  @Post('register')
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: CreateUserDto): Promise<SafeUser> {
    return this.usersService.create(createUserDto)
  }

  @Post('login')
  @ApiOperation({ summary: 'Вход пользователя и получение JWT токена' })
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginUserDto: LoginUserDto): Promise<{ accessToken: string }> {
    return this.usersService.login(loginUserDto)
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Запрос на сброс пароля' })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.usersService.forgotPassword(forgotPasswordDto.email)
    return { message: 'Если пользователь с таким email существует, ему будет отправлена инструкция по сбросу пароля.' }
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Сброс пароля с использованием токена' })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    await this.usersService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword)
    return { message: 'Пароль успешно сброшен.' }
  }

  @Get('profile')
  @ApiOperation({ summary: 'Получить профиль текущего пользователя' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  getProfile(@Request() req: { user: AuthenticatedUser }): AuthenticatedUser {
    return req.user
  }

  @Put('profile')
  @ApiOperation({ summary: 'Обновить профиль текущего пользователя' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Request() req: { user: { id: number } },
    @Body() updateUserDto: UpdateUserDto
  ): Promise<SafeUser> {
    const userId = req.user.id
    return await this.usersService.updateProfile(userId, updateUserDto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить информацию о пользователе по ID (только для администраторов)' })
  @ApiBearerAuth()
  @ApiResponse({ status: HttpStatus.OK, description: 'Информация о пользователе.', type: Object })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Пользователь не найден.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Доступ запрещен.' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async findUserById(@Param('id', ParseIntPipe) id: number): Promise<SafeUser> {
    return this.usersService.findUserByIdForAdmin(id)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить пользователя (доступно самому пользователю или администратору)' })
  @ApiBearerAuth()
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Пользователь успешно удален.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Пользователь не найден.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Нет прав на удаление этого пользователя.' })
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id', ParseIntPipe) id: number, @Request() req: { user: AuthenticatedUser }): Promise<void> {
    return await this.usersService.remove(id, req.user)
  }
}

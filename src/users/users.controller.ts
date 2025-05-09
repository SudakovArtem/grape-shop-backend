import { Controller, Post, Body, HttpCode, HttpStatus, Get, Request, UseGuards, Put } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { CreateUserDto } from './dto/create-user.dto'
import { LoginUserDto } from './dto/login-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { AuthGuard } from '@nestjs/passport'
import { SafeUser } from './users.service'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register') // Эндпоинт будет POST /users/register
  @HttpCode(HttpStatus.CREATED) // Устанавливаем код ответа 201 Created
  async register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.usersService.login(loginUserDto)
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK) // Возвращаем OK независимо от того, найден ли email
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.usersService.forgotPassword(forgotPasswordDto.email)
    // Всегда возвращаем общее сообщение для безопасности
    return { message: 'Если пользователь с таким email существует, ему будет отправлена инструкция по сбросу пароля.' }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    await this.usersService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword)
    return { message: 'Пароль успешно сброшен.' }
  }

  @Get('profile')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  getProfile(@Request() req: { user: SafeUser }): SafeUser {
    return req.user
  }

  @Put('profile') // Эндпоинт PUT /users/profile
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Request() req: { user: { id: number } }, // Получаем ID пользователя из токена
    @Body() updateUserDto: UpdateUserDto
  ): Promise<SafeUser> {
    const userId = req.user.id
    return await this.usersService.updateProfile(userId, updateUserDto)
  }
}

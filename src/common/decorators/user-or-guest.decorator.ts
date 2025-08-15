import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { UserOrGuestInterface } from '../interfaces/user-or-guest.interface'
import { Request } from 'express'
import { AuthenticatedUser } from '../../users/jwt.strategy'

interface RequestWithUser extends Request {
  user?: AuthenticatedUser
}

export const UserOrGuest = createParamDecorator((data: unknown, ctx: ExecutionContext): UserOrGuestInterface => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>()
  const user = request.user
  const guestId = request.headers['x-guest-id'] as string | undefined

  return {
    user,
    guestId,
    isGuest: !user
  }
})

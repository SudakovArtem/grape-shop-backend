import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const GuestId = createParamDecorator((data: unknown, ctx: ExecutionContext): string | undefined => {
  const request = ctx.switchToHttp().getRequest()
  return request.headers['x-guest-id'] as string | undefined
})

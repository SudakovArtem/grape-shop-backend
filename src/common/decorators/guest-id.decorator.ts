import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const GuestId = createParamDecorator((data: unknown, ctx: ExecutionContext): string | undefined => {
  const request = ctx.switchToHttp().getRequest<{ headers: Record<string, string> }>()
  return request.headers['x-guest-id']
})

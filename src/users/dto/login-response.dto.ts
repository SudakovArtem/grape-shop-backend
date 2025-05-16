import { ApiProperty } from '@nestjs/swagger'

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT токен доступа', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string
}

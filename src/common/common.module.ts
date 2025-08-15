import { Module } from '@nestjs/common'
import { GuestSessionService } from './services/guest-session.service'
import { DbModule } from '../db/db.module'

@Module({
  imports: [DbModule],
  providers: [GuestSessionService],
  exports: [GuestSessionService]
})
export class CommonModule {}

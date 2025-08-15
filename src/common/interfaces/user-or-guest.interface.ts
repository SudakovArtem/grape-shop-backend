import { AuthenticatedUser } from '../../users/jwt.strategy'

export interface UserOrGuestInterface {
  user?: AuthenticatedUser
  guestId?: string
  isGuest: boolean
}

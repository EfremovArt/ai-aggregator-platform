import { Controller, Get } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getProfile(user.id);
  }

  @Get('me/analytics')
  async analytics(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getAnalytics(user.id);
  }
}

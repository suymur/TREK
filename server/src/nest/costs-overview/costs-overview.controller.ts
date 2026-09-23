import { Controller, Get, HttpException, UseGuards } from '@nestjs/common';
import type { CostsOverviewResponse } from '@trek/shared';
import type { User } from '../../types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CostsOverviewService } from './costs-overview.service';

/**
 * GET /api/costs/overview — the costs of all the caller's trips (#2).
 *
 * Not trip-scoped, so there is no TripAccessGuard: the service only ever reads the
 * trips the caller owns or is a member of. With the Costs addon switched off the
 * route answers 403 (the issue asks for 403, where @RequireAddon would answer 404),
 * after authentication, so an anonymous caller still gets 401.
 */
@Controller('api/costs')
@UseGuards(JwtAuthGuard)
export class CostsOverviewController {
  constructor(private readonly costs: CostsOverviewService) {}

  @Get('overview')
  overview(@CurrentUser() user: User): Promise<CostsOverviewResponse> {
    if (!this.costs.isEnabled()) {
      throw new HttpException({ error: 'Costs addon is not enabled' }, 403);
    }
    return this.costs.overview(user.id);
  }
}

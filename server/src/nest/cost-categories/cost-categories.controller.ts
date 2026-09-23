import { Body, Controller, Delete, Get, Headers, HttpException, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import type { CostCategoryDeleteResponse, CostCategoryListResponse, CostCategoryResponse } from '@trek/shared';
import type { User } from '../../types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CostCategoriesService, type CostCategoryResult } from './cost-categories.service';
import { CostCategoryCreateDto, CostCategoryUpdateDto } from './cost-categories.dto';

/**
 * /api/costs/categories — the custom cost categories (#4).
 *
 * Instance-wide, so not trip-scoped: any signed-in user lists and creates;
 * only the creator or an admin renames or deletes (403 otherwise). A second
 * category of the same name, in any letter case, is a 409. Deleting moves the
 * category's expenses to `other` and answers how many moved. With the Costs
 * addon switched off every route answers 403, like GET /api/costs/overview.
 *
 * Writes forward X-Socket-Id so the originating tab does not get its own
 * change echoed back.
 */
@Controller('api/costs/categories')
@UseGuards(JwtAuthGuard)
export class CostCategoriesController {
  constructor(private readonly categories: CostCategoriesService) {}

  @Get()
  list(): CostCategoryListResponse {
    this.requireEnabled();
    return { categories: this.categories.list() };
  }

  @Post()
  create(
    @CurrentUser() user: User,
    @Body() body: CostCategoryCreateDto,
    @Headers('x-socket-id') socketId?: string,
  ): CostCategoryResponse {
    this.requireEnabled();
    const category = unwrap(this.categories.create(user, body));
    this.categories.broadcastChanged(socketId);
    return { category };
  }

  @Put(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CostCategoryUpdateDto,
    @Headers('x-socket-id') socketId?: string,
  ): CostCategoryResponse {
    this.requireEnabled();
    const category = unwrap(this.categories.update(id, user, body));
    this.categories.broadcastChanged(socketId);
    return { category };
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Headers('x-socket-id') socketId?: string,
  ): CostCategoryDeleteResponse {
    this.requireEnabled();
    const { moved } = unwrap(this.categories.remove(id, user));
    this.categories.broadcastChanged(socketId);
    return { success: true, moved };
  }

  private requireEnabled(): void {
    if (!this.categories.isEnabled()) {
      throw new HttpException({ error: 'Costs addon is not enabled' }, 403);
    }
  }
}

function unwrap<T>(result: CostCategoryResult<T>): T {
  if ('error' in result) throw new HttpException({ error: result.error }, result.status);
  return result.value;
}

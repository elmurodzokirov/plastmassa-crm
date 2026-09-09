import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { UpsertRecipeDto } from './dto/upsert-recipe.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('recipes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  async findAllActive() {
    return this.recipesService.findAllActive();
  }

  @Get('product/:productId')
  async getActiveByProduct(@Param('productId') productId: string) {
    return this.recipesService.findActiveByProduct(productId);
  }

  @Get('product/:productId/history')
  async getHistory(@Param('productId') productId: string) {
    return this.recipesService.findHistory(productId);
  }

  @Get('product/:productId/cost')
  async getPlannedCost(@Param('productId') productId: string) {
    return this.recipesService.calculatePlannedCost(productId);
  }

  @Post()
  @Permissions('products:update')
  async upsert(
    @Body() dto: UpsertRecipeDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.recipesService.upsert(dto, userId);
  }
}

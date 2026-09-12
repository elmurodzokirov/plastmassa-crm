import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductionService } from './production.service';
import { ProductionController } from './production.controller';
import { ProductionLog, ProductionLogSchema } from './schemas/production-log.schema';
import { StockMovement, StockMovementSchema } from '../stock/schemas/stock-movement.schema';
import { ProductsModule } from '../products/products.module';
import { ProductLotsModule } from '../product-lots/product-lots.module';
import { RecipesModule } from '../recipes/recipes.module';
import { MaterialsModule } from '../materials/materials.module';
import { MaterialLotsModule } from '../material-lots/material-lots.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductionLog.name, schema: ProductionLogSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
    ]),
    ProductsModule,
    ProductLotsModule,
    RecipesModule,
    MaterialsModule,
    MaterialLotsModule,
    UsersModule,
  ],
  controllers: [ProductionController],
  providers: [ProductionService],
  exports: [ProductionService],
})
export class ProductionModule {}

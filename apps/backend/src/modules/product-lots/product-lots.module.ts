import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductLotsService } from './product-lots.service';
import { ProductLotsController } from './product-lots.controller';
import { ProductLot, ProductLotSchema } from './schemas/product-lot.schema';
import { ProductsModule } from '../products/products.module';
import { UnitsModule } from '../units/units.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductLot.name, schema: ProductLotSchema },
    ]),
    ProductsModule,
    UnitsModule,
  ],
  controllers: [ProductLotsController],
  providers: [ProductLotsService],
  exports: [ProductLotsService],
})
export class ProductLotsModule {}

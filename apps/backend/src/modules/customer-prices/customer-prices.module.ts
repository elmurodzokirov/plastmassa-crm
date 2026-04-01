import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerPricesService } from './customer-prices.service';
import { CustomerPricesController } from './customer-prices.controller';
import { CustomerPrice, CustomerPriceSchema } from './schemas/customer-price.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerPrice.name, schema: CustomerPriceSchema },
    ]),
  ],
  controllers: [CustomerPricesController],
  providers: [CustomerPricesService],
  exports: [CustomerPricesService],
})
export class CustomerPricesModule {}

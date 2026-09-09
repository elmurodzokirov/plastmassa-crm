import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MaterialLotsService } from './material-lots.service';
import { MaterialLotsController } from './material-lots.controller';
import { MaterialLot, MaterialLotSchema } from './schemas/material-lot.schema';
import { MaterialsModule } from '../materials/materials.module';
import { UnitsModule } from '../units/units.module';
import { SuppliersModule } from '../suppliers/suppliers.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MaterialLot.name, schema: MaterialLotSchema }]),
    MaterialsModule,
    UnitsModule,
    SuppliersModule,
  ],
  controllers: [MaterialLotsController],
  providers: [MaterialLotsService],
  exports: [MaterialLotsService],
})
export class MaterialLotsModule {}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CustomerPrice, CustomerPriceDocument } from './schemas/customer-price.schema';
import { BulkUpsertCustomerPriceDto } from './dto/upsert-customer-price.dto';

@Injectable()
export class CustomerPricesService {
  constructor(
    @InjectModel(CustomerPrice.name)
    private readonly customerPriceModel: Model<CustomerPriceDocument>,
  ) {}

  async findByCustomer(customerId: string): Promise<CustomerPriceDocument[]> {
    return this.customerPriceModel
      .find({ customer: customerId })
      .populate('product', 'name price baseUnit')
      .exec();
  }

  async bulkUpsert(dto: BulkUpsertCustomerPriceDto): Promise<CustomerPriceDocument[]> {
    const operations = dto.prices.map((item) => ({
      updateOne: {
        filter: { customer: dto.customer, product: item.product },
        update: { $set: { price: item.price } },
        upsert: true,
      },
    }));

    await this.customerPriceModel.bulkWrite(operations);
    return this.findByCustomer(dto.customer);
  }

  async remove(id: string): Promise<void> {
    const result = await this.customerPriceModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Narx topilmadi');
  }
}

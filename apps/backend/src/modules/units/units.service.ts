import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Unit, UnitDocument } from './schemas/unit.schema';
import {
  UnitConversion,
  UnitConversionDocument,
} from './schemas/unit-conversion.schema';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { CreateUnitConversionDto } from './dto/create-unit-conversion.dto';

@Injectable()
export class UnitsService {
  constructor(
    @InjectModel(Unit.name) private readonly unitModel: Model<UnitDocument>,
    @InjectModel(UnitConversion.name)
    private readonly unitConversionModel: Model<UnitConversionDocument>,
  ) {}

  async create(createUnitDto: CreateUnitDto): Promise<UnitDocument> {
    const createdUnit = new this.unitModel(createUnitDto);
    return createdUnit.save();
  }

  async findAll(): Promise<UnitDocument[]> {
    return this.unitModel.find().sort({ type: 1, name: 1 }).exec();
  }

  async findById(id: string): Promise<UnitDocument> {
    const unit = await this.unitModel.findById(id).exec();

    if (!unit) {
      throw new NotFoundException(`Unit with ID "${id}" not found`);
    }

    return unit;
  }

  async update(
    id: string,
    updateUnitDto: UpdateUnitDto,
  ): Promise<UnitDocument> {
    const updatedUnit = await this.unitModel
      .findByIdAndUpdate(id, { $set: updateUnitDto }, { new: true })
      .exec();

    if (!updatedUnit) {
      throw new NotFoundException(`Unit with ID "${id}" not found`);
    }

    return updatedUnit;
  }

  async delete(id: string): Promise<UnitDocument> {
    const deletedUnit = await this.unitModel.findByIdAndDelete(id).exec();

    if (!deletedUnit) {
      throw new NotFoundException(`Unit with ID "${id}" not found`);
    }

    return deletedUnit;
  }

  async createConversion(
    createConversionDto: CreateUnitConversionDto,
  ): Promise<UnitConversionDocument> {
    const fromUnit = await this.unitModel
      .findById(createConversionDto.fromUnit)
      .exec();

    if (!fromUnit) {
      throw new NotFoundException(
        `From unit with ID "${createConversionDto.fromUnit}" not found`,
      );
    }

    const toUnit = await this.unitModel
      .findById(createConversionDto.toUnit)
      .exec();

    if (!toUnit) {
      throw new NotFoundException(
        `To unit with ID "${createConversionDto.toUnit}" not found`,
      );
    }

    const existingConversion = await this.unitConversionModel
      .findOne({
        fromUnit: createConversionDto.fromUnit,
        toUnit: createConversionDto.toUnit,
      })
      .exec();

    if (existingConversion) {
      existingConversion.factor = createConversionDto.factor;
      return existingConversion.save();
    }

    const createdConversion = new this.unitConversionModel(createConversionDto);
    return createdConversion.save();
  }

  async findAllConversions(): Promise<UnitConversionDocument[]> {
    return this.unitConversionModel
      .find()
      .populate('fromUnit')
      .populate('toUnit')
      .exec();
  }

  async convert(
    fromUnitId: string,
    toUnitId: string,
    value: number,
  ): Promise<number> {
    if (fromUnitId === toUnitId) {
      return value;
    }

    const directConversion = await this.unitConversionModel
      .findOne({ fromUnit: fromUnitId, toUnit: toUnitId })
      .exec();

    if (directConversion) {
      return value * directConversion.factor;
    }

    const reverseConversion = await this.unitConversionModel
      .findOne({ fromUnit: toUnitId, toUnit: fromUnitId })
      .exec();

    if (reverseConversion) {
      return value / reverseConversion.factor;
    }

    throw new BadRequestException(
      `No conversion found between units "${fromUnitId}" and "${toUnitId}"`,
    );
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Machine, MachineDocument } from './schemas/machine.schema';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';

@Injectable()
export class MachinesService {
  constructor(
    @InjectModel(Machine.name)
    private readonly machineModel: Model<MachineDocument>,
  ) {}

  async create(dto: CreateMachineDto): Promise<MachineDocument> {
    const machine = new this.machineModel(dto);
    return machine.save();
  }

  async findAll(): Promise<MachineDocument[]> {
    return this.machineModel.find().sort({ name: 1 }).exec();
  }

  async findById(id: string): Promise<MachineDocument> {
    const machine = await this.machineModel.findById(id).exec();
    if (!machine) {
      throw new NotFoundException(`Machine with ID "${id}" not found`);
    }
    return machine;
  }

  async update(id: string, dto: UpdateMachineDto): Promise<MachineDocument> {
    const machine = await this.machineModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .exec();
    if (!machine) {
      throw new NotFoundException(`Machine with ID "${id}" not found`);
    }
    return machine;
  }

  async remove(id: string): Promise<MachineDocument> {
    const machine = await this.machineModel
      .findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true })
      .exec();
    if (!machine) {
      throw new NotFoundException(`Machine with ID "${id}" not found`);
    }
    return machine;
  }
}

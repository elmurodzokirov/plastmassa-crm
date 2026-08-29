import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ALL_PERMISSIONS } from '@plastmassa/shared';
import { Role, RoleDocument } from './schemas/role.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
  ) {}

  async create(dto: CreateRoleDto): Promise<RoleDocument> {
    const invalidPermissions = dto.permissions.filter(
      (p) => !ALL_PERMISSIONS.includes(p),
    );
    if (invalidPermissions.length > 0) {
      throw new BadRequestException(
        `Invalid permissions: ${invalidPermissions.join(', ')}`,
      );
    }

    const existing = await this.roleModel.findOne({ name: dto.name }).exec();
    if (existing) {
      throw new ConflictException(`Role "${dto.name}" already exists`);
    }

    const role = new this.roleModel(dto);
    return role.save();
  }

  async findAll(): Promise<RoleDocument[]> {
    return this.roleModel.find({ isActive: true }).sort({ isSystem: -1, name: 1 }).exec();
  }

  async findById(id: string): Promise<RoleDocument> {
    const role = await this.roleModel.findById(id).exec();
    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }
    return role;
  }

  async findByName(name: string): Promise<RoleDocument | null> {
    return this.roleModel.findOne({ name }).exec();
  }

  async getAllPermissions(): Promise<string[]> {
    return ALL_PERMISSIONS;
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleDocument> {
    const role = await this.findById(id);

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be modified');
    }

    if (dto.permissions) {
      const invalidPermissions = dto.permissions.filter(
        (p) => !ALL_PERMISSIONS.includes(p),
      );
      if (invalidPermissions.length > 0) {
        throw new BadRequestException(
          `Invalid permissions: ${invalidPermissions.join(', ')}`,
        );
      }
    }

    if (dto.name && dto.name !== role.name) {
      const existing = await this.roleModel
        .findOne({ name: dto.name, _id: { $ne: id } })
        .exec();
      if (existing) {
        throw new ConflictException(`Role "${dto.name}" already exists`);
      }
    }

    const updated = await this.roleModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    return updated;
  }

  async delete(id: string): Promise<RoleDocument> {
    const role = await this.findById(id);

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    role.isActive = false;
    return role.save();
  }
}

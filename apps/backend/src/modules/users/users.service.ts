import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const existingUser = await this.userModel
      .findOne({ username: createUserDto.username })
      .exec();

    if (existingUser) {
      throw new ConflictException(
        `User with username "${createUserDto.username}" already exists`,
      );
    }

    const existingPhone = await this.userModel
      .findOne({ phone: createUserDto.phone })
      .exec();

    if (existingPhone) {
      throw new ConflictException(
        `User with phone "${createUserDto.phone}" already exists`,
      );
    }

    const createdUser = new this.userModel(createUserDto);
    const saved = await createdUser.save();
    return saved.populate('role');
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }) {
    const { page = 1, limit = 20, search, role } = query;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) {
      filter.role = role;
    }

    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password')
        .populate('role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).populate('role').exec();

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).populate('role').exec();
  }

  async count(): Promise<number> {
    return this.userModel.countDocuments().exec();
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone }).populate('role').exec();
  }

  async linkTelegram(phone: string, chatId: string): Promise<UserDocument> {
    const user = await this.userModel
      .findOneAndUpdate(
        { phone },
        { $set: { telegramChatId: chatId } },
        { new: true },
      )
      .populate('role')
      .exec();

    if (!user) {
      throw new NotFoundException(`User with phone "${phone}" not found`);
    }

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    if (updateUserDto.username) {
      const existingUser = await this.userModel
        .findOne({ username: updateUserDto.username, _id: { $ne: id } })
        .exec();

      if (existingUser) {
        throw new ConflictException(
          `User with username "${updateUserDto.username}" already exists`,
        );
      }
    }

    if (updateUserDto.phone) {
      const existingPhone = await this.userModel
        .findOne({ phone: updateUserDto.phone, _id: { $ne: id } })
        .exec();

      if (existingPhone) {
        throw new ConflictException(
          `User with phone "${updateUserDto.phone}" already exists`,
        );
      }
    }

    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt(10);
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, { $set: updateUserDto }, { new: true })
      .select('-password')
      .populate('role')
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return updatedUser;
  }

  async delete(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true })
      .select('-password')
      .populate('role')
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }
}

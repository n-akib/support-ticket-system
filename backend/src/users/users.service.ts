import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role?: UserRole;
  }): Promise<User> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const user = this.usersRepository.create({
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      role: data.role || UserRole.CUSTOMER,
    });

    return this.usersRepository.save(user);
  }

  async findByEmail(email: string, includePassword = false): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    if (includePassword) {
      return this.usersRepository
        .createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .where('user.email = :email', { email: normalizedEmail })
        .getOne();
    }
    return this.usersRepository.findOne({ where: { email: normalizedEmail } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}

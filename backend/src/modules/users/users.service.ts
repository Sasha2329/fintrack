import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

interface CreateUserParams {
  email: string;
  fullName: string;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>
  ) {}

  findByEmail(email: string) {
    return this.usersRepository.findOne({ where: { email } });
  }

  findById(id: string) {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(params: CreateUserParams) {
    const user = this.usersRepository.create({
      ...params,
      activeSandboxWalletPhone: null
    });
    return this.usersRepository.save(user);
  }

  async setActiveSandboxWalletPhone(userId: string, phoneNumber: string | null) {
    await this.usersRepository.update({ id: userId }, { activeSandboxWalletPhone: phoneNumber });
    return this.findById(userId);
  }

  async getAdminSummary() {
    const users = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoin('user.transactions', 'transaction')
      .select('user.id', 'id')
      .addSelect('user.email', 'email')
      .addSelect('user.fullName', 'fullName')
      .addSelect('COUNT(transaction.id)', 'transactionsCount')
      .addSelect('MAX(transaction.transactionDate)', 'lastTransactionDate')
      .groupBy('user.id')
      .addGroupBy('user.email')
      .addGroupBy('user.fullName')
      .orderBy('user.fullName', 'ASC')
      .getRawMany<{
        id: string;
        email: string;
        fullName: string;
        transactionsCount: string;
        lastTransactionDate: string | null;
      }>();

    return {
      totalUsers: users.length,
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        transactionsCount: Number(user.transactionsCount),
        lastTransactionDate: user.lastTransactionDate,
        passwordStatus: 'Хранится как хэш, исходный пароль недоступен'
      }))
    };
  }
}

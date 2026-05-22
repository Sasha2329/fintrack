import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SandboxWalletAccount } from '../sandbox-wallet/entities/sandbox-wallet-account.entity';
import { SandboxWallet } from '../sandbox-wallet/entities/sandbox-wallet.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DashboardService {
  constructor(
    private readonly transactionsService: TransactionsService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(SandboxWallet)
    private readonly walletsRepository: Repository<SandboxWallet>,
    @InjectRepository(SandboxWalletAccount)
    private readonly accountsRepository: Repository<SandboxWalletAccount>
  ) {}

  async getSummary(userId: string, month?: string) {
    const summary = await this.transactionsService.buildSummary(userId, month);
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    const activePhone = user?.activeSandboxWalletPhone;

    if (!activePhone) {
      return {
        ...summary,
        mainAccountBalance: summary.overallBalance,
        walletBalance: null
      };
    }

    const wallet = await this.walletsRepository.findOne({
      where: { userId, phoneNumber: activePhone }
    });

    if (!wallet) {
      return {
        ...summary,
        mainAccountBalance: summary.overallBalance,
        walletBalance: null
      };
    }

    const mainAccount = await this.accountsRepository.findOne({
      where: { walletId: wallet.id, userId, type: 'main' }
    });

    return {
      ...summary,
      overallBalance: mainAccount ? Number(mainAccount.balance) : summary.overallBalance,
      mainAccountBalance: mainAccount ? Number(mainAccount.balance) : summary.overallBalance,
      walletBalance: Number(wallet.balance)
    };
  }
}

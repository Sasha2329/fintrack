import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsModule } from '../transactions/transactions.module';
import { SandboxWalletAccount } from '../sandbox-wallet/entities/sandbox-wallet-account.entity';
import { SandboxWallet } from '../sandbox-wallet/entities/sandbox-wallet.entity';
import { User } from '../users/entities/user.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TransactionsModule,
    TypeOrmModule.forFeature([User, SandboxWallet, SandboxWalletAccount])
  ],
  controllers: [DashboardController],
  providers: [DashboardService]
})
export class DashboardModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { SandboxWalletController } from './sandbox-wallet.controller';
import { SandboxWalletService } from './sandbox-wallet.service';
import { SandboxWalletAccount } from './entities/sandbox-wallet-account.entity';
import { SandboxWalletOperation } from './entities/sandbox-wallet-operation.entity';
import { SandboxWallet } from './entities/sandbox-wallet.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SandboxWallet, SandboxWalletOperation, SandboxWalletAccount]),
    WebhooksModule,
    TransactionsModule,
    UsersModule
  ],
  controllers: [SandboxWalletController],
  providers: [SandboxWalletService]
})
export class SandboxWalletModule {}

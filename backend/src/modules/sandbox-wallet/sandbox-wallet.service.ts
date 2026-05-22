import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { TransactionType } from '../transactions/entities/transaction.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';
import { ConnectSandboxWalletDto } from './dto/connect-sandbox-wallet.dto';
import { SendSandboxTransactionDto } from './dto/send-sandbox-transaction.dto';
import { SetSandboxWalletBalanceDto } from './dto/set-sandbox-wallet-balance.dto';
import { SandboxWalletAccount, SandboxAccountType } from './entities/sandbox-wallet-account.entity';
import {
  SandboxWalletOperation,
  SandboxWalletOperationKind
} from './entities/sandbox-wallet-operation.entity';
import { SandboxWallet } from './entities/sandbox-wallet.entity';

const accountPresets: Array<{ type: SandboxAccountType; title: string; share: number; suffix: string }> = [
  { type: 'main', title: 'Основной счет', share: 0.7, suffix: '01' },
  { type: 'savings', title: 'Накопительный счет', share: 0.2, suffix: '22' },
  { type: 'virtual', title: 'Виртуальная карта', share: 0.1, suffix: '44' }
];

@Injectable()
export class SandboxWalletService {
  constructor(
    @InjectRepository(SandboxWallet)
    private readonly walletRepository: Repository<SandboxWallet>,
    @InjectRepository(SandboxWalletOperation)
    private readonly operationRepository: Repository<SandboxWalletOperation>,
    @InjectRepository(SandboxWalletAccount)
    private readonly accountRepository: Repository<SandboxWalletAccount>,
    private readonly transactionsService: TransactionsService,
    private readonly usersService: UsersService
  ) {}

  async getState(user: JwtPayload) {
    const userEntity = await this.usersService.findById(user.sub);
    const activePhone = userEntity?.activeSandboxWalletPhone;
    const savedWallets = await this.listSavedWallets(user.sub);

    if (!activePhone) {
      return {
        connected: false,
        savedWallets
      };
    }

    const wallet = await this.walletRepository.findOne({ where: { phoneNumber: activePhone, userId: user.sub } });

    if (!wallet) {
      return {
        connected: false,
        savedWallets
      };
    }

    await this.ensureWalletAccounts(wallet);

    return {
      connected: true,
      savedWallets,
      wallet: await this.buildWalletResponse(wallet),
      availableAccounts: await this.listAvailableAccounts(user.sub)
    };
  }

  async connectWallet(user: JwtPayload, dto: ConnectSandboxWalletDto) {
    const userEntity = await this.usersService.findById(user.sub);

    let wallet = await this.walletRepository.findOne({
      where: { phoneNumber: dto.phoneNumber, userId: user.sub }
    });

    if (!wallet) {
      const initialBalance = dto.initialBalance ?? 120000;
      wallet = this.walletRepository.create({
        userId: user.sub,
        phoneNumber: dto.phoneNumber,
        ownerName: userEntity?.fullName ?? user.fullName,
        pinCode: dto.pinCode,
        initialBalance: initialBalance.toFixed(2),
        balance: initialBalance.toFixed(2)
      });
      wallet = await this.walletRepository.save(wallet);
      await this.createAccounts(wallet, initialBalance, {
        savingsAllocation: dto.savingsAllocation,
        virtualAllocation: dto.virtualAllocation
      });
    } else {
      await this.ensureWalletAccounts(wallet, dto.initialBalance);
      await this.bootstrapEmptyWalletBalance(wallet, dto);

      if (!wallet.pinCode) {
        wallet.pinCode = dto.pinCode;
        await this.walletRepository.save(wallet);
      } else if (wallet.pinCode !== dto.pinCode) {
        throw new BadRequestException('Неверный PIN-код тестового кошелька');
      }
    }

    await this.usersService.setActiveSandboxWalletPhone(user.sub, dto.phoneNumber);
    return this.getState(user);
  }

  async setInitialBalance(user: JwtPayload, dto: SetSandboxWalletBalanceDto) {
    const wallet = await this.getActiveWallet(user.sub);
    await this.reseedWallet(wallet, dto.initialBalance, {
      savingsAllocation: dto.savingsAllocation,
      virtualAllocation: dto.virtualAllocation
    });
    return this.getState(user);
  }

  async disconnectWallet(user: JwtPayload) {
    await this.usersService.setActiveSandboxWalletPhone(user.sub, null);
    return this.getState(user);
  }

  async resetWallet(user: JwtPayload) {
    const wallet = await this.getActiveWallet(user.sub);
    await this.ensureWalletAccounts(wallet);

    await this.clearWalletHistory(wallet);
    await this.applyInitialBalance(wallet, Number(wallet.initialBalance));

    return this.getState(user);
  }

  async sendTransaction(user: JwtPayload, dto: SendSandboxTransactionDto) {
    const wallet = await this.getActiveWallet(user.sub);
    await this.ensureWalletAccounts(wallet);

    const account = await this.accountRepository.findOne({
      where: { id: dto.accountId, walletId: wallet.id, userId: user.sub }
    });

    if (!account) {
      throw new BadRequestException('Выбранный счет тестового кошелька не найден');
    }

    if (dto.destinationAccountId) {
      return this.processTransfer(user, wallet, account, dto);
    }

    const accountBalance = Number(account.balance);
    const nextAccountBalance =
      dto.direction === 'credit' ? accountBalance + dto.amount : accountBalance - dto.amount;

    if (dto.direction === 'debit' && nextAccountBalance < 0) {
      throw new BadRequestException('Недостаточно средств на выбранном счете');
    }

    account.balance = nextAccountBalance.toFixed(2);
    await this.accountRepository.save(account);

    const walletBalance = await this.recalculateWalletBalance(wallet.id, user.sub);

    const operation = this.operationRepository.create({
      walletId: wallet.id,
      userId: user.sub,
      accountId: account.id,
      accountTitle: account.title,
      title: dto.title,
      category: dto.category,
      direction: dto.direction,
      operationKind: dto.operationKind ?? this.inferOperationKind(dto),
      amount: dto.amount.toFixed(2),
      note: dto.note ?? null,
      occurredAt: new Date(dto.occurredAt),
      balanceAfter: walletBalance.toFixed(2)
    });

    const savedOperation = await this.operationRepository.save(operation);

    await this.transactionsService.createFromWebhook(user.sub, {
      title: `${dto.title} • ${account.title}`,
      type: dto.direction === 'credit' ? TransactionType.INCOME : TransactionType.EXPENSE,
      amount: dto.amount,
      category: dto.category,
      note: dto.note,
      transactionDate: dto.occurredAt,
      provider: 'sandbox-wallet',
      externalEventId: savedOperation.id
    });

    return {
      status: 'accepted',
      walletBalance,
      accountBalance: nextAccountBalance,
      operationId: savedOperation.id
    };
  }

  private async processTransfer(
    user: JwtPayload,
    sourceWallet: SandboxWallet,
    sourceAccount: SandboxWalletAccount,
    dto: SendSandboxTransactionDto
  ) {
    if (!dto.destinationAccountId) {
      throw new BadRequestException('Не указан счет назначения для перевода');
    }

    if (dto.destinationAccountId === sourceAccount.id) {
      throw new BadRequestException('Нельзя выполнить перевод на тот же самый счет');
    }

    const destinationAccount = await this.accountRepository.findOne({
      where: { id: dto.destinationAccountId, userId: user.sub }
    });

    if (!destinationAccount) {
      throw new BadRequestException('Счет назначения не найден');
    }

    const destinationWallet = await this.walletRepository.findOne({
      where: { id: destinationAccount.walletId, userId: user.sub }
    });

    if (!destinationWallet) {
      throw new BadRequestException('Кошелек назначения не найден');
    }

    const sourceBalance = Number(sourceAccount.balance);
    const nextSourceBalance = sourceBalance - dto.amount;

    if (nextSourceBalance < 0) {
      throw new BadRequestException('Недостаточно средств на счете отправителя');
    }

    const nextDestinationBalance = Number(destinationAccount.balance) + dto.amount;
    sourceAccount.balance = nextSourceBalance.toFixed(2);
    destinationAccount.balance = nextDestinationBalance.toFixed(2);
    await this.accountRepository.save(sourceAccount);
    await this.accountRepository.save(destinationAccount);

    const sourceWalletBalance = await this.recalculateWalletBalance(sourceWallet.id, user.sub);
    const destinationWalletBalance =
      destinationWallet.id === sourceWallet.id
        ? sourceWalletBalance
        : await this.recalculateWalletBalance(destinationWallet.id, user.sub);

    const transferTitle = dto.title || 'Перевод между счетами';

    const outgoingOperation = this.operationRepository.create({
      walletId: sourceWallet.id,
      userId: user.sub,
      accountId: sourceAccount.id,
      accountTitle: sourceAccount.title,
      title: transferTitle,
      category: 'Переводы',
      direction: 'debit',
      operationKind: 'transfer',
      amount: dto.amount.toFixed(2),
      note:
        dto.note ??
        `Перевод на ${destinationAccount.title} (${destinationWallet.phoneNumber})`,
      occurredAt: new Date(dto.occurredAt),
      balanceAfter: sourceWalletBalance.toFixed(2)
    });

    const incomingOperation = this.operationRepository.create({
      walletId: destinationWallet.id,
      userId: user.sub,
      accountId: destinationAccount.id,
      accountTitle: destinationAccount.title,
      title: `Входящий перевод • ${transferTitle}`,
      category: 'Переводы',
      direction: 'credit',
      operationKind: 'transfer',
      amount: dto.amount.toFixed(2),
      note:
        dto.note ??
        `Перевод с ${sourceAccount.title} (${sourceWallet.phoneNumber})`,
      occurredAt: new Date(dto.occurredAt),
      balanceAfter: destinationWalletBalance.toFixed(2)
    });

    const savedOutgoing = await this.operationRepository.save(outgoingOperation);
    await this.operationRepository.save(incomingOperation);

    return {
      status: 'accepted',
      transfer: true,
      walletBalance: sourceWalletBalance,
      accountBalance: nextSourceBalance,
      operationId: savedOutgoing.id
    };
  }

  private async listSavedWallets(userId: string) {
    const wallets = await this.walletRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });

    return Promise.all(
      wallets.map(async (wallet) => {
        await this.ensureWalletAccounts(wallet);
        const accounts = await this.accountRepository.find({
          where: { walletId: wallet.id, userId },
          order: { createdAt: 'ASC' }
        });

        return {
          phoneNumber: wallet.phoneNumber,
          ownerName: wallet.ownerName,
          balance: Number(wallet.balance),
          accountsCount: accounts.length
        };
      })
    );
  }

  private async listAvailableAccounts(userId: string) {
    const wallets = await this.walletRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });

    return Promise.all(
      wallets.map(async (wallet) => {
        await this.ensureWalletAccounts(wallet);
        const accounts = await this.accountRepository.find({
          where: { walletId: wallet.id, userId },
          order: { createdAt: 'ASC' }
        });

        return {
          walletId: wallet.id,
          phoneNumber: wallet.phoneNumber,
          ownerName: wallet.ownerName,
          balance: Number(wallet.balance),
          accounts: accounts.map((account) => ({
            id: account.id,
            type: account.type,
            title: account.title,
            maskedNumber: account.maskedNumber,
            balance: Number(account.balance)
          }))
        };
      })
    );
  }

  private async buildWalletResponse(wallet: SandboxWallet) {
    await this.ensureWalletAccounts(wallet);

    const accounts = await this.accountRepository.find({
      where: { walletId: wallet.id, userId: wallet.userId },
      order: { createdAt: 'ASC' }
    });

    const operations = await this.operationRepository.find({
      where: { walletId: wallet.id, userId: wallet.userId },
      order: { occurredAt: 'DESC', createdAt: 'DESC' },
      take: 10
    });

    const credits = operations
      .filter((operation) => operation.direction === 'credit')
      .reduce((sum, operation) => sum + Number(operation.amount), 0);
    const debits = operations
      .filter((operation) => operation.direction === 'debit')
      .reduce((sum, operation) => sum + Number(operation.amount), 0);

    return {
      phoneNumber: wallet.phoneNumber,
      ownerName: wallet.ownerName,
      balance: Number(wallet.balance),
      initialBalance: Number(wallet.initialBalance),
      totalCredits: credits,
      totalDebits: debits,
      accounts: accounts.map((account) => ({
        id: account.id,
        type: account.type,
        title: account.title,
        maskedNumber: account.maskedNumber,
        balance: Number(account.balance),
        initialBalance: Number(account.initialBalance)
      })),
      operations: operations.map((operation) => ({
        id: operation.id,
        accountId: operation.accountId,
        accountTitle: operation.accountTitle,
        title: operation.title,
        category: operation.category,
        direction: operation.direction,
        operationKind: operation.operationKind ?? this.inferOperationKindFromRecord(operation),
        amount: Number(operation.amount),
        note: operation.note,
        occurredAt: operation.occurredAt,
        balanceAfter: Number(operation.balanceAfter)
      }))
    };
  }

  private async getActiveWallet(userId: string) {
    const userEntity = await this.usersService.findById(userId);
    const activePhone = userEntity?.activeSandboxWalletPhone;

    if (!activePhone) {
      throw new BadRequestException('Сначала подключите тестовый кошелек по номеру телефона');
    }

    const wallet = await this.walletRepository.findOne({
      where: { phoneNumber: activePhone, userId }
    });

    if (!wallet) {
      throw new BadRequestException('Подключенный кошелек не найден');
    }

    return wallet;
  }

  private async ensureWalletAccounts(wallet: SandboxWallet, preferredInitialBalance?: number) {
    const existingAccounts = await this.accountRepository.find({
      where: { walletId: wallet.id, userId: wallet.userId }
    });

    if (existingAccounts.length) {
      return existingAccounts;
    }

    const baseBalance =
      preferredInitialBalance ?? Number(wallet.initialBalance || wallet.balance || 120000);
    const normalizedBalance = Number.isFinite(baseBalance) && baseBalance >= 0 ? baseBalance : 120000;

    wallet.initialBalance = normalizedBalance.toFixed(2);
    wallet.balance = normalizedBalance.toFixed(2);
    await this.walletRepository.save(wallet);

    await this.createAccounts(wallet, normalizedBalance);

    return this.accountRepository.find({
      where: { walletId: wallet.id, userId: wallet.userId },
      order: { createdAt: 'ASC' }
    });
  }

  private async bootstrapEmptyWalletBalance(wallet: SandboxWallet, dto: ConnectSandboxWalletDto) {
    if (dto.initialBalance === undefined) {
      return;
    }

    const operationsCount = await this.operationRepository.count({
      where: { walletId: wallet.id, userId: wallet.userId }
    });

    if (operationsCount > 0) {
      return;
    }

    const accounts = await this.accountRepository.find({
      where: { walletId: wallet.id, userId: wallet.userId }
    });

    const totalAccountBalance = accounts.reduce((sum, account) => sum + Number(account.balance), 0);
    const walletBalance = Number(wallet.balance);

    if (walletBalance === 0 && totalAccountBalance === 0 && dto.initialBalance > 0) {
      await this.applyInitialBalance(wallet, dto.initialBalance, {
        savingsAllocation: dto.savingsAllocation,
        virtualAllocation: dto.virtualAllocation
      });
    }
  }

  private async reseedWallet(
    wallet: SandboxWallet,
    initialBalance: number,
    distribution?: {
      savingsAllocation?: number;
      virtualAllocation?: number;
    }
  ) {
    await this.ensureWalletAccounts(wallet, initialBalance);
    await this.clearWalletHistory(wallet);
    await this.applyInitialBalance(wallet, initialBalance, distribution);
  }

  private async clearWalletHistory(wallet: SandboxWallet) {
    await this.operationRepository.delete({ walletId: wallet.id, userId: wallet.userId });
    await this.transactionsService.clearWebhookTransactionsByProvider(wallet.userId, 'sandbox-wallet');
  }

  private async applyInitialBalance(
    wallet: SandboxWallet,
    initialBalance: number,
    distribution?: {
      savingsAllocation?: number;
      virtualAllocation?: number;
    }
  ) {
    const normalizedBalance = Number.isFinite(initialBalance) && initialBalance >= 0 ? initialBalance : 0;
    const accounts = await this.accountRepository.find({
      where: { walletId: wallet.id, userId: wallet.userId },
      order: { createdAt: 'ASC' }
    });

    const preparedAccounts = this.buildAccountBalances(wallet, normalizedBalance, distribution);

    if (accounts.length !== preparedAccounts.length) {
      await this.accountRepository.delete({ walletId: wallet.id, userId: wallet.userId });
      await this.accountRepository.save(preparedAccounts);
    } else {
      const existingByType = new Map(accounts.map((account) => [account.type, account]));

      for (const prepared of preparedAccounts) {
        const existing = existingByType.get(prepared.type);
        if (!existing) {
          continue;
        }

        existing.title = prepared.title;
        existing.maskedNumber = prepared.maskedNumber;
        existing.initialBalance = prepared.initialBalance;
        existing.balance = prepared.balance;
        await this.accountRepository.save(existing);
      }
    }

    wallet.initialBalance = normalizedBalance.toFixed(2);
    wallet.balance = normalizedBalance.toFixed(2);
    await this.walletRepository.save(wallet);
  }

  private async createAccounts(
    wallet: SandboxWallet,
    initialBalance: number,
    distribution?: {
      savingsAllocation?: number;
      virtualAllocation?: number;
    }
  ) {
    await this.accountRepository.save(this.buildAccountBalances(wallet, initialBalance, distribution));
  }

  private buildAccountBalances(
    wallet: SandboxWallet,
    initialBalance: number,
    distribution?: {
      savingsAllocation?: number;
      virtualAllocation?: number;
    }
  ) {
    const phoneTail = wallet.phoneNumber.replace(/\D/g, '').slice(-4).padStart(4, '0');
    const savingsAllocation = Number(distribution?.savingsAllocation ?? initialBalance * 0.2);
    const virtualAllocation = Number(distribution?.virtualAllocation ?? initialBalance * 0.1);
    const normalizedSavings = Math.max(0, Math.min(initialBalance, Number(savingsAllocation.toFixed(2))));
    const maxVirtual = Math.max(0, initialBalance - normalizedSavings);
    const normalizedVirtual = Math.max(0, Math.min(maxVirtual, Number(virtualAllocation.toFixed(2))));
    const mainAllocation = Number((initialBalance - normalizedSavings - normalizedVirtual).toFixed(2));

    const allocations: Record<SandboxAccountType, number> = {
      main: mainAllocation,
      savings: normalizedSavings,
      virtual: normalizedVirtual
    };

    return accountPresets.map((preset) => {
      const rawValue = allocations[preset.type];

      return this.accountRepository.create({
        walletId: wallet.id,
        userId: wallet.userId,
        type: preset.type,
        title: preset.title,
        maskedNumber: `•••• ${phoneTail}${preset.suffix}`,
        initialBalance: rawValue.toFixed(2),
        balance: rawValue.toFixed(2)
      });
    });
  }

  private async recalculateWalletBalance(walletId: string, userId: string) {
    const accounts = await this.accountRepository.find({
      where: { walletId, userId }
    });

    const balance = accounts.reduce((sum, account) => sum + Number(account.balance), 0);
    await this.walletRepository.update({ id: walletId }, { balance: balance.toFixed(2) });
    return balance;
  }

  private inferOperationKind(dto: SendSandboxTransactionDto): SandboxWalletOperationKind {
    if (dto.operationKind) {
      return dto.operationKind;
    }

    if (dto.destinationAccountId) {
      return 'transfer';
    }

    if (dto.direction === 'credit' && dto.category.toLowerCase().includes('возврат')) {
      return 'refund';
    }

    return dto.direction === 'credit' ? 'topup' : 'purchase';
  }

  private inferOperationKindFromRecord(operation: SandboxWalletOperation): SandboxWalletOperationKind {
    if (operation.category.toLowerCase().includes('перевод')) {
      return 'transfer';
    }

    if (operation.direction === 'credit' && operation.category.toLowerCase().includes('возврат')) {
      return 'refund';
    }

    return operation.direction === 'credit' ? 'topup' : 'purchase';
  }
}

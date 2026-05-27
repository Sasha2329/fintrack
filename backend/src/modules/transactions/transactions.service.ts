import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { buildTransactionMail } from '../mail/mail.templates';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Transaction, TransactionSource, TransactionType } from './entities/transaction.entity';

interface CreateWebhookTransactionParams {
  title: string;
  type: TransactionType;
  amount: number;
  category: string;
  note?: string;
  transactionDate: string;
  provider: string;
  externalEventId: string;
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService
  ) {}

  async create(userId: string, dto: CreateTransactionDto) {
    const transaction = this.transactionsRepository.create({
      ...dto,
      amount: dto.amount.toFixed(2),
      note: dto.note ?? null,
      source: TransactionSource.MANUAL,
      provider: null,
      externalEventId: null,
      transactionDate: new Date(dto.transactionDate),
      userId
    });

    const savedTransaction = await this.transactionsRepository.save(transaction);
    await this.sendTransactionNotification(userId, savedTransaction);
    return savedTransaction;
  }

  async createFromWebhook(userId: string, params: CreateWebhookTransactionParams) {
    const existing = await this.transactionsRepository.findOne({
      where: {
        userId,
        provider: params.provider,
        externalEventId: params.externalEventId
      }
    });

    if (existing) {
      return existing;
    }

    const transaction = this.transactionsRepository.create({
      title: params.title,
      type: params.type,
      amount: params.amount.toFixed(2),
      category: params.category,
      note: params.note ?? null,
      source: TransactionSource.WEBHOOK,
      provider: params.provider,
      externalEventId: params.externalEventId,
      transactionDate: new Date(params.transactionDate),
      userId
    });

    const savedTransaction = await this.transactionsRepository.save(transaction);
    await this.sendTransactionNotification(userId, savedTransaction);
    return savedTransaction;
  }

  async findAllByUser(userId: string) {
    return this.transactionsRepository.find({
      where: { userId },
      order: { transactionDate: 'DESC', createdAt: 'DESC' }
    });
  }

  async removeOneForUser(userId: string, transactionId: string) {
    const result = await this.transactionsRepository.delete({
      id: transactionId,
      userId
    });

    return {
      deleted: result.affected ?? 0
    };
  }

  async buildSummary(userId: string, month?: string) {
    const transactions = await this.findAllByUser(userId);
    const periodMonth = month ?? new Date().toISOString().slice(0, 7);
    const filteredTransactions = transactions.filter(
      (transaction) => transaction.transactionDate.toISOString().slice(0, 7) === periodMonth
    );

    const summary = filteredTransactions.reduce(
      (acc, transaction) => {
        const amount = Number(transaction.amount);

        if (transaction.type === TransactionType.INCOME) {
          acc.totalIncome += amount;
          acc.incomeByCategory[transaction.category] =
            (acc.incomeByCategory[transaction.category] ?? 0) + amount;
        } else {
          acc.totalExpense += amount;
          acc.expenseByCategory[transaction.category] =
            (acc.expenseByCategory[transaction.category] ?? 0) + amount;
        }

        acc.byCategory[transaction.category] =
          (acc.byCategory[transaction.category] ?? 0) + amount;

        return acc;
      },
      {
        totalIncome: 0,
        totalExpense: 0,
        byCategory: {} as Record<string, number>,
        incomeByCategory: {} as Record<string, number>,
        expenseByCategory: {} as Record<string, number>
      }
    );

    const overallBalance = transactions.reduce((acc, transaction) => {
      const amount = Number(transaction.amount);
      return transaction.type === TransactionType.INCOME ? acc + amount : acc - amount;
    }, 0);

    const recentTransactions = filteredTransactions.slice(0, 5).map((transaction) => ({
      ...transaction,
      amount: Number(transaction.amount)
    }));

    const mapCategories = (items: Record<string, number>) =>
      Object.entries(items)
        .map(([name, total]) => ({
          name,
          total: Number(total.toFixed(2))
        }))
        .sort((left, right) => right.total - left.total);

    return {
      balance: Number((summary.totalIncome - summary.totalExpense).toFixed(2)),
      overallBalance: Number(overallBalance.toFixed(2)),
      totalIncome: Number(summary.totalIncome.toFixed(2)),
      totalExpense: Number(summary.totalExpense.toFixed(2)),
      categories: mapCategories(summary.byCategory),
      incomeCategories: mapCategories(summary.incomeByCategory),
      expenseCategories: mapCategories(summary.expenseByCategory),
      periodMonth,
      recentTransactions
    };
  }

  async clearAllForUser(userId: string) {
    const result = await this.transactionsRepository.delete({ userId });
    return {
      deleted: result.affected ?? 0
    };
  }

  async clearWebhookTransactionsByProvider(userId: string, provider: string) {
    const result = await this.transactionsRepository.delete({
      userId,
      source: TransactionSource.WEBHOOK,
      provider
    });

    return {
      deleted: result.affected ?? 0
    };
  }

  private async sendTransactionNotification(userId: string, transaction: Transaction) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      return;
    }

    const mail = buildTransactionMail({
      fullName: user.fullName,
      title: transaction.title,
      type: transaction.type,
      amount: Number(transaction.amount),
      category: transaction.category,
      transactionDate: transaction.transactionDate.toISOString(),
      source: transaction.source,
      provider: transaction.provider
    });

    await this.mailService.sendMail({
      to: user.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html
    });
  }
}

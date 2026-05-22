import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionType } from '../transactions/entities/transaction.entity';
import { UsersService } from '../users/users.service';
import { WebhookTransactionDto } from './dto/webhook-transaction.dto';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly transactionsService: TransactionsService
  ) {}

  validateSecret(secret?: string) {
    const expectedSecret = this.configService.getOrThrow<string>('WEBHOOK_SHARED_SECRET');

    if (!secret || secret !== expectedSecret) {
      throw new UnauthorizedException('Некорректный webhook secret');
    }
  }

  getIntegrationMeta() {
    const externalBaseUrl = this.configService.get<string>('EXTERNAL_BASE_URL')?.trim() || null;
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    const baseUrl = externalBaseUrl || frontendUrl.replace(/:\d+$/, ':3000');

    return {
      externalBaseUrl,
      isPubliclyReachableConfigured: Boolean(externalBaseUrl),
      webhookPath: '/api/webhooks/transactions/:provider',
      exampleWebhookUrl: `${baseUrl}/api/webhooks/transactions/demo-bank`,
      note: externalBaseUrl
        ? 'Внешний адрес задан и может использоваться сторонними системами для webhook-интеграции.'
        : 'Внешний адрес не задан. Пока доступны только локальные тесты через localhost или тестовый кошелек.'
    };
  }

  async ingestTransaction(provider: string, dto: WebhookTransactionDto) {
    const user = await this.usersService.findByEmail(dto.userEmail);

    if (!user) {
      throw new BadRequestException('Пользователь для интеграции не найден');
    }

    const transaction = await this.transactionsService.createFromWebhook(user.id, {
      title: dto.title,
      type: dto.direction === 'credit' ? TransactionType.INCOME : TransactionType.EXPENSE,
      amount: dto.amount,
      category: dto.category,
      note: dto.note,
      transactionDate: dto.occurredAt,
      provider,
      externalEventId: dto.eventId
    });

    return {
      status: 'accepted',
      provider,
      transactionId: transaction.id,
      source: transaction.source
    };
  }
}

import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { WebhookTransactionDto } from './dto/webhook-transaction.dto';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('meta')
  getMeta() {
    return this.webhooksService.getIntegrationMeta();
  }

  @Post('transactions/:provider')
  ingestTransaction(
    @Param('provider') provider: string,
    @Headers('x-webhook-secret') secret: string | undefined,
    @Body() dto: WebhookTransactionDto
  ) {
    this.webhooksService.validateSecret(secret);
    return this.webhooksService.ingestTransaction(provider, dto);
  }
}

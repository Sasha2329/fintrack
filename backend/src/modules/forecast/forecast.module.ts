import { Module } from '@nestjs/common';
import { TransactionsModule } from '../transactions/transactions.module';
import { ForecastController } from './forecast.controller';
import { ForecastService } from './forecast.service';

@Module({
  imports: [TransactionsModule],
  controllers: [ForecastController],
  providers: [ForecastService]
})
export class ForecastModule {}


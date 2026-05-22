import { IsDateString, IsEmail, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class WebhookTransactionDto {
  @IsString()
  eventId!: string;

  @IsEmail()
  userEmail!: string;

  @IsIn(['credit', 'debit'])
  direction!: 'credit' | 'debit';

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsString()
  category!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsDateString()
  occurredAt!: string;
}


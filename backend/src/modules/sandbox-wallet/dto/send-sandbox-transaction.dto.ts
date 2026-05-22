import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SandboxWalletOperationKind } from '../entities/sandbox-wallet-operation.entity';

export class SendSandboxTransactionDto {
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

  @IsString()
  accountId!: string;

  @IsOptional()
  @IsString()
  destinationAccountId?: string;

  @IsOptional()
  @IsIn(['purchase', 'topup', 'transfer', 'refund'])
  operationKind?: SandboxWalletOperationKind;

  @IsOptional()
  @IsString()
  note?: string;

  @IsDateString()
  occurredAt!: string;
}

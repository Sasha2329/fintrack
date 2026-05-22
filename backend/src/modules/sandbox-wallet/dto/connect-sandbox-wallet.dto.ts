import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

export class ConnectSandboxWalletDto {
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'Номер телефона должен содержать от 10 до 15 цифр'
  })
  phoneNumber!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  initialBalance?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  savingsAllocation?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  virtualAllocation?: number;

  @IsString()
  @MinLength(4)
  @MaxLength(4)
  @Matches(/^\d{4}$/, {
    message: 'PIN-код должен состоять из 4 цифр'
  })
  pinCode!: string;
}

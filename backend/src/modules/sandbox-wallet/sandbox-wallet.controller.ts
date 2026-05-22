import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ConnectSandboxWalletDto } from './dto/connect-sandbox-wallet.dto';
import { SendSandboxTransactionDto } from './dto/send-sandbox-transaction.dto';
import { SetSandboxWalletBalanceDto } from './dto/set-sandbox-wallet-balance.dto';
import { SandboxWalletService } from './sandbox-wallet.service';

@Controller('sandbox-wallet')
@UseGuards(JwtAuthGuard)
export class SandboxWalletController {
  constructor(private readonly sandboxWalletService: SandboxWalletService) {}

  @Get('state')
  getState(@CurrentUser() user: JwtPayload) {
    return this.sandboxWalletService.getState(user);
  }

  @Post('connect')
  connectWallet(@CurrentUser() user: JwtPayload, @Body() dto: ConnectSandboxWalletDto) {
    return this.sandboxWalletService.connectWallet(user, dto);
  }

  @Delete('disconnect')
  disconnectWallet(@CurrentUser() user: JwtPayload) {
    return this.sandboxWalletService.disconnectWallet(user);
  }

  @Delete('reset')
  resetWallet(@CurrentUser() user: JwtPayload) {
    return this.sandboxWalletService.resetWallet(user);
  }

  @Post('set-balance')
  setInitialBalance(@CurrentUser() user: JwtPayload, @Body() dto: SetSandboxWalletBalanceDto) {
    return this.sandboxWalletService.setInitialBalance(user, dto);
  }

  @Post('send')
  sendTransaction(@CurrentUser() user: JwtPayload, @Body() dto: SendSandboxTransactionDto) {
    return this.sandboxWalletService.sendTransaction(user, dto);
  }
}

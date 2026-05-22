import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { buildLoginMail, buildWelcomeMail } from '../mail/mail.templates';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new BadRequestException('Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      fullName: dto.fullName,
      passwordHash
    });

    const welcomeMail = buildWelcomeMail(user.fullName);
    void this.mailService
      .sendMail({
        to: user.email,
        subject: welcomeMail.subject,
        text: welcomeMail.text,
        html: welcomeMail.html
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
        this.logger.log(`Не удалось отправить welcome-письмо: ${message}`);
      });

    return this.buildAuthResponse({
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: 'user'
    });
  }

  async login(dto: LoginDto) {
    const adminLogin = this.configService.get<string>('ADMIN_LOGIN') ?? 'ADMIN';
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD') ?? 'pubgmobile23';

    if (dto.email === adminLogin) {
      if (dto.password !== adminPassword) {
        throw new UnauthorizedException('Неправильный пароль для данного аккаунта');
      }

      return this.buildAuthResponse({
        sub: this.configService.get<string>('ADMIN_ID') ?? '11111111-1111-4111-8111-111111111111',
        email: this.configService.get<string>('ADMIN_EMAIL') ?? 'admin@fintrack.local',
        fullName: this.configService.get<string>('ADMIN_DISPLAY_NAME') ?? 'ADMIN',
        role: 'admin'
      });
    }

    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Пользователь с таким email не зарегистрирован');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Неправильный пароль для данного аккаунта');
    }

    const loginMail = buildLoginMail(user.fullName);
    void this.mailService
      .sendMail({
        to: user.email,
        subject: loginMail.subject,
        text: loginMail.text,
        html: loginMail.html
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
        this.logger.log(`Не удалось отправить login-письмо: ${message}`);
      });

    return this.buildAuthResponse({
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: 'user'
    });
  }

  private buildAuthResponse(payload: JwtPayload) {
    return {
      accessToken: this.jwtService.sign(payload, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.configService.getOrThrow<string>('JWT_EXPIRES_IN')
      }),
      user: {
        id: payload.sub,
        email: payload.email,
        fullName: payload.fullName,
        role: payload.role
      }
    };
  }
}

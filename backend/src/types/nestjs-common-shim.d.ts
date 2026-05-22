declare module '@nestjs/common' {
  export const Controller: (prefix?: string) => ClassDecorator;
  export const Injectable: () => ClassDecorator;
  export const Module: (metadata: Record<string, unknown>) => ClassDecorator;
  export const Body: (...pipes: unknown[]) => ParameterDecorator;
  export const Delete: (path?: string) => MethodDecorator;
  export const Get: (path?: string) => MethodDecorator;
  export const Headers: (property?: string) => ParameterDecorator;
  export const Param: (property?: string) => ParameterDecorator;
  export const Post: (path?: string) => MethodDecorator;
  export const Query: (property?: string) => ParameterDecorator;
  export const UseGuards: (...guards: unknown[]) => ClassDecorator & MethodDecorator;
  export const createParamDecorator: (
    factory: (data: unknown, context: ExecutionContext) => unknown
  ) => (...dataOrPipes: unknown[]) => ParameterDecorator;
  export interface ExecutionContext {
    switchToHttp(): {
      getRequest(): Record<string, unknown>;
    };
  }
  export interface CanActivate {
    canActivate(context: ExecutionContext): boolean | Promise<boolean>;
  }
  export class BadRequestException extends Error {
    constructor(message?: string | object | unknown);
  }
  export class ForbiddenException extends Error {
    constructor(message?: string | object | unknown);
  }
  export class Logger {
    constructor(context?: string);
    log(message: string): void;
  }
  export class UnauthorizedException extends Error {
    constructor(message?: string | object | unknown);
  }
  export class ValidationPipe {
    constructor(options?: Record<string, unknown>);
  }
}

declare module 'joi' {
  const Joi: any;
  export = Joi;
}

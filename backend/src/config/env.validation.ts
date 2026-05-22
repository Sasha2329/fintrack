import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  ADMIN_LOGIN: Joi.string().default('ADMIN'),
  ADMIN_PASSWORD: Joi.string().min(6).default('pubgmobile23'),
  ADMIN_DISPLAY_NAME: Joi.string().default('ADMIN'),
  ADMIN_EMAIL: Joi.string().email().default('admin@fintrack.com'),
  ADMIN_ID: Joi.string()
    .guid({ version: ['uuidv4', 'uuidv5'] })
    .default('11111111-1111-4111-8111-111111111111'),
  FRONTEND_URL: Joi.string().uri().required(),
  EXTERNAL_BASE_URL: Joi.string().uri().allow('', null),
  WEBHOOK_SHARED_SECRET: Joi.string().min(8).required(),
  SMTP_HOST: Joi.string().allow('', null),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('', null),
  SMTP_PASS: Joi.string().allow('', null),
  SMTP_FROM: Joi.string().email().allow('', null),
  MAIL_PREVIEW_DIR: Joi.string().default('mail-preview')
});

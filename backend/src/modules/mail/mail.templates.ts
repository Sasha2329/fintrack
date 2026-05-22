import { TransactionSource, TransactionType } from '../transactions/entities/transaction.entity';

export function buildWelcomeMail(fullName: string) {
  return {
    subject: 'Финтрек: регистрация прошла успешно',
    text:
      `Здравствуйте, ${fullName}!\n\n` +
      `Поздравляем, вы успешно зарегистрировались на сайте Финтрек.\n` +
      `Теперь вы можете вести учет доходов и расходов, отслеживать аналитику и прогноз бюджета.`,
    html:
      `<h2>Здравствуйте, ${fullName}!</h2>` +
      `<p><strong>Поздравляем, вы успешно зарегистрировались на сайте Финтрек.</strong></p>` +
      `<p>Теперь вы можете вести учет доходов и расходов, отслеживать аналитику и прогноз бюджета.</p>`
  };
}

export function buildLoginMail(fullName: string) {
  return {
    subject: 'Финтрек: выполнен вход в аккаунт',
    text:
      `Здравствуйте, ${fullName}!\n\n` +
      `Поздравляем, вы успешно вошли в аккаунт на сайте Финтрек.\n` +
      `Если это были не вы, рекомендуем сменить пароль и проверить активность в системе.`,
    html:
      `<h2>Здравствуйте, ${fullName}!</h2>` +
      `<p><strong>Поздравляем, вы успешно вошли в аккаунт на сайте Финтрек.</strong></p>` +
      `<p>Если это были не вы, рекомендуем сменить пароль и проверить активность в системе.</p>`
  };
}

export function buildTransactionMail(params: {
  fullName: string;
  title: string;
  type: TransactionType;
  amount: number;
  category: string;
  transactionDate: string;
  source: TransactionSource;
  provider?: string | null;
}) {
  const verb = params.type === TransactionType.INCOME ? 'зачисление' : 'списание';
  const sourceLabel =
    params.source === TransactionSource.WEBHOOK
      ? `автоматически через интеграцию${params.provider ? ` (${params.provider})` : ''}`
      : 'вручную';

  const text =
    `Здравствуйте, ${params.fullName}!\n\n` +
    `В системе Финтрек зафиксировано ${verb}.\n` +
    `Операция: ${params.title}\n` +
    `Сумма: ${params.amount.toLocaleString('ru-RU')} ₽\n` +
    `Категория: ${params.category}\n` +
    `Дата операции: ${new Date(params.transactionDate).toLocaleString('ru-RU')}\n` +
    `Источник: ${sourceLabel}`;

  const html =
    `<h2>Финансовое уведомление</h2>` +
    `<p>Здравствуйте, ${params.fullName}!</p>` +
    `<p>В системе <strong>Финтрек</strong> зафиксировано ${verb}.</p>` +
    `<ul>` +
    `<li><strong>Операция:</strong> ${params.title}</li>` +
    `<li><strong>Сумма:</strong> ${params.amount.toLocaleString('ru-RU')} ₽</li>` +
    `<li><strong>Категория:</strong> ${params.category}</li>` +
    `<li><strong>Дата операции:</strong> ${new Date(params.transactionDate).toLocaleString('ru-RU')}</li>` +
    `<li><strong>Источник:</strong> ${sourceLabel}</li>` +
    `</ul>`;

  return {
    subject: `Финтрек: ${params.type === TransactionType.INCOME ? 'зачисление' : 'списание'} средств`,
    text,
    html
  };
}

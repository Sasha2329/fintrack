import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const API_BASE_URL = process.env.API_BASE_URL || 'https://fintrack-api-docker.onrender.com/api';
const DEFAULT_EMAIL = 'chukanovsasha23@gmail.com';

const walletOperations = [
  {
    title: 'Зачисление заработной платы',
    direction: 'credit',
    amount: 90000,
    category: 'Зарплата',
    operationKind: 'topup',
    accountType: 'main',
    occurredAt: '2026-05-01T09:00:00.000Z'
  },
  {
    title: 'Покупка в супермаркете',
    direction: 'debit',
    amount: 3240,
    category: 'Продукты',
    operationKind: 'purchase',
    accountType: 'main',
    occurredAt: '2026-05-02T18:10:00.000Z'
  },
  {
    title: 'Поездки на такси',
    direction: 'debit',
    amount: 1180,
    category: 'Транспорт',
    operationKind: 'purchase',
    accountType: 'main',
    occurredAt: '2026-05-03T22:15:00.000Z'
  },
  {
    title: 'Оплата мобильной связи',
    direction: 'debit',
    amount: 650,
    category: 'Связь',
    operationKind: 'purchase',
    accountType: 'main',
    occurredAt: '2026-05-04T11:20:00.000Z'
  },
  {
    title: 'Онлайн-покупка на маркетплейсе',
    direction: 'debit',
    amount: 4290,
    category: 'Маркетплейсы',
    operationKind: 'purchase',
    accountType: 'virtual',
    occurredAt: '2026-05-05T13:30:00.000Z'
  },
  {
    title: 'Покупка лекарств',
    direction: 'debit',
    amount: 1740,
    category: 'Здоровье',
    operationKind: 'purchase',
    accountType: 'main',
    occurredAt: '2026-05-06T19:10:00.000Z'
  },
  {
    title: 'Возврат за заказ',
    direction: 'credit',
    amount: 1390,
    category: 'Возвраты',
    operationKind: 'refund',
    accountType: 'virtual',
    occurredAt: '2026-05-07T16:40:00.000Z'
  },
  {
    title: 'Оплата подписки на сервис',
    direction: 'debit',
    amount: 499,
    category: 'Подписки',
    operationKind: 'purchase',
    accountType: 'virtual',
    occurredAt: '2026-05-08T09:45:00.000Z'
  },
  {
    title: 'Покупка продуктов на неделю',
    direction: 'debit',
    amount: 2860,
    category: 'Продукты',
    operationKind: 'purchase',
    accountType: 'main',
    occurredAt: '2026-05-10T17:25:00.000Z'
  },
  {
    title: 'Кафе с друзьями',
    direction: 'debit',
    amount: 1420,
    category: 'Кафе',
    operationKind: 'purchase',
    accountType: 'main',
    occurredAt: '2026-05-11T20:30:00.000Z'
  },
  {
    title: 'Фриланс-подработка',
    direction: 'credit',
    amount: 12000,
    category: 'Фриланс',
    operationKind: 'topup',
    accountType: 'main',
    occurredAt: '2026-05-12T12:00:00.000Z'
  },
  {
    title: 'Билеты в кино',
    direction: 'debit',
    amount: 980,
    category: 'Развлечения',
    operationKind: 'purchase',
    accountType: 'virtual',
    occurredAt: '2026-05-14T19:00:00.000Z'
  },
  {
    title: 'Покупка одежды',
    direction: 'debit',
    amount: 6150,
    category: 'Одежда',
    operationKind: 'purchase',
    accountType: 'virtual',
    occurredAt: '2026-05-16T15:30:00.000Z'
  },
  {
    title: 'Покупка продуктов',
    direction: 'debit',
    amount: 2540,
    category: 'Продукты',
    operationKind: 'purchase',
    accountType: 'main',
    occurredAt: '2026-05-18T18:40:00.000Z'
  },
  {
    title: 'Оплата коммунальных услуг',
    direction: 'debit',
    amount: 4300,
    category: 'Коммунальные услуги',
    operationKind: 'purchase',
    accountType: 'main',
    occurredAt: '2026-05-20T10:10:00.000Z'
  },
  {
    title: 'Перевод от родственников',
    direction: 'credit',
    amount: 5000,
    category: 'Переводы',
    operationKind: 'topup',
    accountType: 'main',
    occurredAt: '2026-05-21T14:05:00.000Z'
  },
  {
    title: 'Покупка подарка',
    direction: 'debit',
    amount: 3650,
    category: 'Подарки',
    operationKind: 'purchase',
    accountType: 'virtual',
    occurredAt: '2026-05-23T18:15:00.000Z'
  },
  {
    title: 'Покупка продуктов в конце месяца',
    direction: 'debit',
    amount: 3180,
    category: 'Продукты',
    operationKind: 'purchase',
    accountType: 'main',
    occurredAt: '2026-05-25T19:35:00.000Z'
  },
  {
    title: 'Зачисление кешбэка',
    direction: 'credit',
    amount: 870,
    category: 'Кэшбэк',
    operationKind: 'topup',
    accountType: 'main',
    occurredAt: '2026-05-27T09:20:00.000Z'
  },
  {
    title: 'Оплата спортзала',
    direction: 'debit',
    amount: 2600,
    category: 'Спорт',
    operationKind: 'purchase',
    accountType: 'main',
    occurredAt: '2026-05-29T08:50:00.000Z'
  }
];

const manualTransactions = [
  {
    title: 'Наличные на кофе',
    type: 'expense',
    amount: 320,
    category: 'Кафе',
    note: '[seed-may-2026] Ручной ввод наличных',
    transactionDate: '2026-05-03T08:40:00.000Z'
  },
  {
    title: 'Покупка воды и перекуса',
    type: 'expense',
    amount: 190,
    category: 'Продукты',
    note: '[seed-may-2026] Ручной ввод наличных',
    transactionDate: '2026-05-04T13:10:00.000Z'
  },
  {
    title: 'Оплата маршрутки',
    type: 'expense',
    amount: 90,
    category: 'Транспорт',
    note: '[seed-may-2026] Ручной ввод наличных',
    transactionDate: '2026-05-06T07:50:00.000Z'
  },
  {
    title: 'Обед в столовой',
    type: 'expense',
    amount: 410,
    category: 'Кафе',
    note: '[seed-may-2026] Ручной ввод наличных',
    transactionDate: '2026-05-07T13:15:00.000Z'
  },
  {
    title: 'Карманные расходы',
    type: 'expense',
    amount: 600,
    category: 'Прочее',
    note: '[seed-may-2026] Ручной ввод наличных',
    transactionDate: '2026-05-09T18:00:00.000Z'
  },
  {
    title: 'Покупка овощей на рынке',
    type: 'expense',
    amount: 780,
    category: 'Продукты',
    note: '[seed-may-2026] Ручной ввод наличных',
    transactionDate: '2026-05-12T17:20:00.000Z'
  },
  {
    title: 'Возврат долга от друга',
    type: 'income',
    amount: 2500,
    category: 'Переводы',
    note: '[seed-may-2026] Ручной ввод наличных',
    transactionDate: '2026-05-15T12:10:00.000Z'
  },
  {
    title: 'Покупка бытовых мелочей',
    type: 'expense',
    amount: 560,
    category: 'Дом',
    note: '[seed-may-2026] Ручной ввод наличных',
    transactionDate: '2026-05-17T16:45:00.000Z'
  },
  {
    title: 'Кофе и десерт',
    type: 'expense',
    amount: 470,
    category: 'Кафе',
    note: '[seed-may-2026] Ручной ввод наличных',
    transactionDate: '2026-05-19T18:25:00.000Z'
  },
  {
    title: 'Оплата парковки',
    type: 'expense',
    amount: 250,
    category: 'Транспорт',
    note: '[seed-may-2026] Ручной ввод наличных',
    transactionDate: '2026-05-21T09:35:00.000Z'
  },
  {
    title: 'Продажа старой техники',
    type: 'income',
    amount: 7000,
    category: 'Прочие доходы',
    note: '[seed-may-2026] Ручной ввод наличных',
    transactionDate: '2026-05-24T15:30:00.000Z'
  },
  {
    title: 'Покупка книг',
    type: 'expense',
    amount: 1350,
    category: 'Образование',
    note: '[seed-may-2026] Ручной ввод наличных',
    transactionDate: '2026-05-26T17:40:00.000Z'
  }
];

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = Array.isArray(payload?.message)
      ? payload.message[0]
      : payload?.message || `HTTP ${response.status}`;
    throw new Error(`${path}: ${message}`);
  }

  return response.status === 204 ? null : response.json();
}

async function promptCredentials() {
  const rl = readline.createInterface({ input, output });
  const enteredEmail = await rl.question(`Email [${DEFAULT_EMAIL}]: `);
  const password = await rl.question('Пароль: ');
  await rl.close();

  return {
    email: enteredEmail.trim() || DEFAULT_EMAIL,
    password: password.trim()
  };
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

function pickAccount(accounts, type) {
  return accounts.find((account) => account.type === type) || accounts[0];
}

async function main() {
  const { email, password } = await promptCredentials();
  if (!password) {
    throw new Error('Пароль не введён');
  }

  const session = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const token = session.accessToken;
  const walletState = await apiRequest('/sandbox-wallet/state', {
    headers: authHeaders(token)
  });

  if (!walletState.connected || !walletState.wallet?.accounts?.length) {
    throw new Error(
      'Тестовый кошелёк не подключён. Сначала подключи кошелёк на сайте, при необходимости установи начальный баланс 0 и только потом запускай сидинг.'
    );
  }

  const accounts = walletState.wallet.accounts;
  let walletCreated = 0;
  for (const operation of walletOperations) {
    const account = pickAccount(accounts, operation.accountType);
    await apiRequest('/sandbox-wallet/send', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        accountId: account.id,
        direction: operation.direction,
        amount: operation.amount,
        category: operation.category,
        title: operation.title,
        note: '[seed-may-2026] Автоматическое наполнение для отчёта',
        occurredAt: operation.occurredAt,
        operationKind: operation.operationKind
      })
    });
    walletCreated += 1;
  }

  let manualCreated = 0;
  for (const transaction of manualTransactions) {
    await apiRequest('/transactions', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(transaction)
    });
    manualCreated += 1;
  }

  console.log('');
  console.log('Готово.');
  console.log(`Email: ${email}`);
  console.log(`Через кошелёк добавлено: ${walletCreated}`);
  console.log(`Ручных операций добавлено: ${manualCreated}`);
  console.log(`Всего новых операций: ${walletCreated + manualCreated}`);
  console.log('Зарплата 90000 добавлена первой датой: 2026-05-01.');
}

main().catch((error) => {
  console.error('');
  console.error('Не удалось выполнить наполнение данных.');
  console.error(error.message);
  process.exitCode = 1;
});

const userEmail = process.env.WEBHOOK_TEST_EMAIL ?? process.argv[2] ?? 'demo@example.com';

const payload = {
  eventId: `income-${Date.now()}`,
  userEmail,
  direction: 'credit',
  amount: 12500,
  category: 'Автозачисление',
  title: 'Тестовое поступление',
  note: 'Webhook income client',
  occurredAt: new Date().toISOString()
};

const response = await fetch('http://localhost:3000/api/webhooks/transactions/demo-bank', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-webhook-secret': 'financeflow_webhook_secret'
  },
  body: JSON.stringify(payload)
});

console.log(await response.text());

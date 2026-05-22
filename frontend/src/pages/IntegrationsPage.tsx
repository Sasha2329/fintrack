import { useEffect, useMemo, useState } from 'react';
import { api, IntegrationMeta, TransactionItem } from '../services/api';

export function IntegrationsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [meta, setMeta] = useState<IntegrationMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getTransactions(), api.getIntegrationMeta()])
      .then(([items, integrationMeta]) => {
        setTransactions(items);
        setMeta(integrationMeta);
      })
      .catch((fetchError: Error) => setError(fetchError.message));
  }, []);

  const importedTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.provider === 'sandbox-wallet'),
    [transactions]
  );

  const groupedByDate = useMemo(() => {
    return importedTransactions.reduce<Record<string, TransactionItem[]>>((acc, transaction) => {
      const key = transaction.transactionDate.slice(0, 10);
      acc[key] = [...(acc[key] ?? []), transaction];
      return acc;
    }, {});
  }, [importedTransactions]);

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  return (
    <div className="page-grid">
      <section className="hero-banner panel">
        <div className="hero-banner__content">
          <span className="eyebrow">Интеграции</span>
          <h2>Как операции из тестового кошелька попадают в Финтрек</h2>
          <p>
            Здесь видны события, пришедшие из тестового банкового контура в основную систему учета,
            а также техническая точка интеграции, на которую в будущем может быть подключен реальный банк.
          </p>
        </div>

        <div className="hero-highlight hero-highlight--stable">
          <span>Импортированных операций</span>
          <strong>{importedTransactions.length}</strong>
          <p>Все они пришли автоматически из тестового кошелька через интеграционный контур.</p>
        </div>
      </section>

      <section className="panel integration-meta">
        <div className="panel-heading">
          <h3>Параметры интеграции</h3>
          <p>Технические сведения о канале обмена данными между кошельком и основной системой.</p>
        </div>

        <div className="integration-meta__card">
          <strong>Webhook-маршрут</strong>
          <span>{meta?.note ?? 'Метаданные интеграции загружаются...'}</span>
          {meta ? <div className="integration-url">{meta.exampleWebhookUrl}</div> : null}
        </div>

        <div className="integration-meta__card">
          <strong>Источник данных</strong>
          <span>Тестовый кошелек выполняет роль демонстрационного банка и автоматически создает события списаний и зачислений.</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Журнал импортов</h3>
          <p>Операции, которые уже попали из кошелька в раздел учета и участвуют в аналитике Финтрек.</p>
        </div>

        <div className="wallet-operation-list">
          {Object.keys(groupedByDate).length ? (
            Object.entries(groupedByDate)
              .sort((left, right) => right[0].localeCompare(left[0]))
              .map(([date, items]) => (
                <section className="integration-log-group" key={date}>
                  <strong className="integration-log-group__title">
                    {new Date(date).toLocaleDateString('ru-RU')}
                  </strong>

                  {items.map((transaction) => (
                    <article className="wallet-operation-card" key={transaction.id}>
                      <div>
                        <strong>{transaction.title}</strong>
                        <span>{transaction.category}</span>
                        <span>{new Date(transaction.transactionDate).toLocaleString('ru-RU')}</span>
                        <span>{transaction.note ?? 'Импортировано автоматически из банкового контура'}</span>
                      </div>

                      <div className="transaction-meta">
                        <span className="badge badge--auto">Из тестового кошелька</span>
                        <strong>{Number(transaction.amount).toLocaleString('ru-RU')} ₽</strong>
                        <span>{transaction.type === 'income' ? 'Зачисление' : 'Списание'}</span>
                      </div>
                    </article>
                  ))}
                </section>
              ))
          ) : (
            <div className="empty-state">Пока нет импортированных операций из тестового кошелька.</div>
          )}
        </div>
      </section>
    </div>
  );
}

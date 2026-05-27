import { useEffect, useMemo, useState } from 'react';
import { api, TransactionItem } from '../services/api';

export function IntegrationsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getTransactions()
      .then((items) => {
        setTransactions(items);
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
          <h2>Как операции из кошелька попадают в Финтрек</h2>
          <p>
            Здесь видны события, пришедшие из кошелька в основную систему учета,
            а также техническая точка интеграции, на которую в будущем может быть подключен реальный банк.
          </p>
        </div>

        <div className="hero-highlight hero-highlight--stable">
          <span>Импортированных операций</span>
          <strong>{importedTransactions.length}</strong>
          <p>Все они пришли автоматически из кошелька через интеграционный контур.</p>
        </div>
      </section>

      <section className="panel integration-meta">
        <div className="panel-heading">
          <h3>Как работает обмен данными</h3>
          <p>Кошелёк и основной раздел учёта синхронизируют операции автоматически, без ручного переноса данных.</p>
        </div>

        <div className="integration-meta__card">
          <strong>Автоматическая передача операций</strong>
          <span>После проведения операции в кошельке запись автоматически попадает в Финтрек и участвует в аналитике.</span>
        </div>

        <div className="integration-meta__card">
          <strong>Источник данных</strong>
          <span>Кошелёк выполняет роль демонстрационного банкового контура и автоматически создает события списаний и зачислений.</span>
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
                        <span className="badge badge--auto">Из кошелька</span>
                        <strong>{Number(transaction.amount).toLocaleString('ru-RU')} ₽</strong>
                        <span>{transaction.type === 'income' ? 'Зачисление' : 'Списание'}</span>
                      </div>
                    </article>
                  ))}
                </section>
              ))
          ) : (
            <div className="empty-state">Пока нет импортированных операций из кошелька.</div>
          )}
        </div>
      </section>
    </div>
  );
}

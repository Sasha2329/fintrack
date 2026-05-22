import { TransactionItem } from '../services/api';

interface TransactionListProps {
  transactions: TransactionItem[];
  title?: string;
  description?: string;
}

export function TransactionList({
  transactions,
  title = 'История операций',
  description = 'Последние изменения вашего финансового баланса.'
}: TransactionListProps) {
  return (
    <div className="panel">
      <div className="panel-heading">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <div className="transaction-list">
        {transactions.length === 0 ? (
          <div className="empty-state">Пока нет операций. Добавьте первую запись.</div>
        ) : (
          transactions.map((transaction) => (
            <article className="transaction-item" key={transaction.id}>
              <div className="transaction-copy">
                <strong>{transaction.title}</strong>
                <span>
                  {transaction.category} • {new Date(transaction.transactionDate).toLocaleDateString('ru-RU')}
                </span>
                <span>
                  {transaction.source === 'webhook'
                    ? `Автоматически${transaction.provider ? ` • ${transaction.provider}` : ''}`
                    : 'Вручную'}
                </span>
              </div>

              <div className="transaction-meta">
                <div className="transaction-badges">
                  <span
                    className={
                      transaction.type === 'income' ? 'badge badge--income' : 'badge badge--expense'
                    }
                  >
                    {transaction.type === 'income' ? 'Доход' : 'Расход'}
                  </span>
                  <span
                    className={
                      transaction.source === 'webhook' ? 'badge badge--auto' : 'badge badge--manual'
                    }
                  >
                    {transaction.source === 'webhook' ? 'Авто' : 'Ручной'}
                  </span>
                </div>
                <strong>{Number(transaction.amount).toLocaleString('ru-RU')} ₽</strong>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

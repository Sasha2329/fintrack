import { TransactionItem } from '../services/api';

interface TransactionListProps {
  transactions: TransactionItem[];
  title?: string;
  description?: string;
  onDelete?: (transaction: TransactionItem) => void | Promise<void>;
  deletingId?: string | null;
  sectionId?: string;
}

export function TransactionList({
  transactions,
  title = 'История операций',
  description = 'Последние изменения вашего финансового баланса.',
  onDelete,
  deletingId,
  sectionId
}: TransactionListProps) {
  return (
    <div className="panel" id={sectionId}>
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
                    ? `Безнал${transaction.provider ? ` • ${transaction.provider}` : ''}`
                    : 'Наличная операция'}
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
                    {transaction.source === 'webhook' ? 'Безнал' : 'Нал'}
                  </span>
                </div>
                <strong>{Number(transaction.amount).toLocaleString('ru-RU')} ₽</strong>
                {onDelete ? (
                  <button
                    type="button"
                    className="transaction-delete"
                    onClick={() => onDelete(transaction)}
                    disabled={deletingId === transaction.id}
                    aria-label={`Удалить операцию ${transaction.title}`}
                    title="Удалить операцию"
                  >
                    {deletingId === transaction.id ? (
                      <span className="transaction-delete__loader" aria-hidden="true" />
                    ) : (
                      <svg
                        className="transaction-delete__icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M9 3h6m-8 3h10m-9 0 .6 11.2A2 2 0 0 0 10.6 19h2.8a2 2 0 0 0 2-1.8L16 6M10 10v5m4-5v5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

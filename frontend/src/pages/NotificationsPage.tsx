import { useEffect, useMemo, useState } from 'react';
import { api, TransactionItem } from '../services/api';
import { getCategoryBudgets, getFinancialGoals } from '../services/planning';

export function NotificationsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [overallBalance, setOverallBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getTransactions()
      .then(async (loadedTransactions) => {
        setTransactions(loadedTransactions);
        try {
          const summary = await api.getSummary(new Date().toISOString().slice(0, 7));
          setOverallBalance(summary.overallBalance);
        } catch {
          setOverallBalance(0);
        }
      })
      .catch((fetchError: Error) => setError(fetchError.message));
  }, []);

  const notifications = useMemo(() => {
    const monthKey = new Date().toISOString().slice(0, 7);
    const budgets = getCategoryBudgets();
    const goals = getFinancialGoals();
    const items: Array<{ title: string; body: string; tone: 'info' | 'warn' | 'success' }> = [];

    for (const budget of budgets) {
      const spent = transactions
        .filter(
          (transaction) =>
            transaction.type === 'expense' &&
            transaction.transactionDate.slice(0, 7) === monthKey &&
            transaction.category.toLowerCase() === budget.category.toLowerCase()
        )
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

      if (spent > budget.limit) {
        items.push({
          title: 'Превышение бюджета',
          body: `Категория «${budget.category}» превысила лимит на ${Math.abs(budget.limit - spent).toLocaleString('ru-RU')} ₽.`,
          tone: 'warn'
        });
      }
    }

    for (const goal of goals) {
      if (goal.currentAmount >= goal.targetAmount) {
        items.push({
          title: 'Финансовая цель достигнута',
          body: `Цель «${goal.title}» закрыта. Можно зафиксировать результат или поставить новую цель.`,
          tone: 'success'
        });
      }
    }

    for (const transaction of transactions.slice(0, 6)) {
      if (transaction.source === 'webhook') {
        items.push({
          title: 'Новая операция из тестового кошелька',
          body: `Операция «${transaction.title}» автоматически подгружена в Финтрек через интеграционный контур.`,
          tone: 'info'
        });
      }
    }

    if (overallBalance < 0) {
      items.push({
        title: 'Баланс стал отрицательным',
        body: 'Текущий общий баланс ниже нуля. Стоит проверить крупные категории расходов и лимиты.',
        tone: 'warn'
      });
    }

    return items.slice(0, 12);
  }, [overallBalance, transactions]);

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  return (
    <div className="page-grid">
      <section className="hero-banner panel">
        <div className="hero-banner__content">
          <span className="eyebrow">Уведомления</span>
          <h2>Внутренний центр событий и предупреждений</h2>
          <p>
            Здесь собираются важные события по бюджету: новые операции из тестового кошелька,
            перерасход по категориям, достижение финансовых целей и изменения общего баланса.
          </p>
        </div>

        <div className="hero-highlight hero-highlight--focus">
          <span>Событий для внимания</span>
          <strong>{notifications.length}</strong>
          <p>Уведомления помогают быстро понять, что требует реакции пользователя.</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Лента уведомлений</h3>
          <p>Сервисные сообщения и аналитические подсказки внутри платформы.</p>
        </div>

        <div className="insight-list">
          {notifications.length ? (
            notifications.map((notification, index) => (
              <div
                className={notification.tone === 'warn' ? 'error-banner' : notification.tone === 'success' ? 'success-banner' : 'insight-item'}
                key={`${notification.title}-${index}`}
              >
                <strong>{notification.title}</strong>
                <div>{notification.body}</div>
              </div>
            ))
          ) : (
            <div className="empty-state">Пока нет новых уведомлений.</div>
          )}
        </div>
      </section>
    </div>
  );
}

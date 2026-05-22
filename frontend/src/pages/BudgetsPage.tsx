import { useEffect, useMemo, useState } from 'react';
import { api, TransactionItem } from '../services/api';
import { CategoryBudget, getCategoryBudgets, saveCategoryBudgets } from '../services/planning';

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export function BudgetsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>(() => getCategoryBudgets());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getTransactions().then(setTransactions).catch((fetchError: Error) => setError(fetchError.message));
  }, []);

  useEffect(() => {
    saveCategoryBudgets(budgets);
  }, [budgets]);

  const monthTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transaction.type === 'expense' && transaction.transactionDate.slice(0, 7) === currentMonthKey()
      ),
    [transactions]
  );

  const budgetRows = budgets.map((budget) => {
    const spent = monthTransactions
      .filter((transaction) => transaction.category.toLowerCase() === budget.category.toLowerCase())
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const usage = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;

    return {
      ...budget,
      spent,
      usage,
      remaining: budget.limit - spent
    };
  });

  const warnings = budgetRows.filter((row) => row.usage > 100);

  function updateBudget(id: string, field: 'category' | 'limit', value: string) {
    setBudgets((current) =>
      current.map((budget) =>
        budget.id === id
          ? {
              ...budget,
              [field]: field === 'limit' ? Number(value) || 0 : value
            }
          : budget
      )
    );
  }

  function addBudget() {
    setBudgets((current) => [
      ...current,
      {
        id: `budget-${Date.now()}`,
        category: 'Новая категория',
        limit: 5000
      }
    ]);
  }

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  return (
    <div className="page-grid">
      <section className="hero-banner panel">
        <div className="hero-banner__content">
          <span className="eyebrow">Бюджеты</span>
          <h2>Лимиты по категориям и контроль перерасхода</h2>
          <p>
            Здесь можно задавать лимиты для продуктов, транспорта, развлечений и любых других
            категорий. Система показывает прогресс и предупреждает, если лимит уже превышен.
          </p>
        </div>

        <div className="hero-highlight hero-highlight--risk">
          <span>Предупреждений в этом месяце</span>
          <strong>{warnings.length}</strong>
          <p>Чем раньше замечен перерасход, тем проще скорректировать бюджет.</p>
        </div>
      </section>

      {warnings.length ? (
        <div className="error-banner">
          {warnings.map((row) => `Категория «${row.category}» превышена на ${Math.abs(row.remaining).toLocaleString('ru-RU')} ₽.`).join(' ')}
        </div>
      ) : null}

      <section className="panel">
        <div className="panel-heading">
          <h3>Категориальные бюджеты</h3>
          <p>Редактируйте лимиты и отслеживайте фактические расходы по каждой категории.</p>
        </div>

        <div className="budget-grid">
          {budgetRows.map((row) => (
            <div className="budget-card" key={row.id}>
              <div className="form-grid">
                <label>
                  Категория
                  <input value={row.category} onChange={(event) => updateBudget(row.id, 'category', event.target.value)} />
                </label>
                <label>
                  Лимит
                  <input
                    type="number"
                    min="0"
                    value={row.limit}
                    onChange={(event) => updateBudget(row.id, 'limit', event.target.value)}
                  />
                </label>
              </div>

              <div className="progress-card">
                <div className="progress-meta">
                  <span>Потрачено</span>
                  <strong>{row.spent.toLocaleString('ru-RU')} ₽</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${Math.min(row.usage, 100)}%` }} />
                </div>
                <p>
                  {row.remaining >= 0
                    ? `Остаток: ${row.remaining.toLocaleString('ru-RU')} ₽`
                    : `Перерасход: ${Math.abs(row.remaining).toLocaleString('ru-RU')} ₽`}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button type="button" className="secondary-button" onClick={addBudget}>
          Добавить бюджет категории
        </button>
      </section>
    </div>
  );
}

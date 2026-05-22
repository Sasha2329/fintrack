import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { FinancialGoal, getFinancialGoals, saveFinancialGoals } from '../services/planning';

export function GoalsPage() {
  const [goals, setGoals] = useState<FinancialGoal[]>(() => getFinancialGoals());
  const [overallBalance, setOverallBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSummary(new Date().toISOString().slice(0, 7))
      .then((summary) => setOverallBalance(summary.overallBalance))
      .catch((fetchError: Error) => setError(fetchError.message));
  }, []);

  useEffect(() => {
    saveFinancialGoals(goals);
  }, [goals]);

  function updateGoal(id: string, field: keyof FinancialGoal, value: string) {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === id
          ? {
              ...goal,
              [field]:
                field === 'targetAmount' || field === 'currentAmount'
                  ? Number(value) || 0
                  : value
            }
          : goal
      )
    );
  }

  function addGoal() {
    setGoals((current) => [
      ...current,
      {
        id: `goal-${Date.now()}`,
        title: 'Новая цель',
        targetAmount: 50000,
        currentAmount: 0,
        deadline: new Date().toISOString().slice(0, 10)
      }
    ]);
  }

  function removeGoal(id: string) {
    setGoals((current) => current.filter((goal) => goal.id !== id));
  }

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  return (
    <div className="page-grid">
      <section className="hero-banner panel">
        <div className="hero-banner__content">
          <span className="eyebrow">Финансовые цели</span>
          <h2>Накопления с прогрессом и остатком до результата</h2>
          <p>
            Добавляйте цели вроде ноутбука, отпуска или финансовой подушки. Для каждой цели
            считается прогресс, сколько осталось накопить и насколько текущий общий баланс помогает
            в достижении этих планов.
          </p>
        </div>

        <div className="hero-highlight hero-highlight--stable">
          <span>Общий положительный баланс</span>
          <strong>{Math.max(0, overallBalance).toLocaleString('ru-RU')} ₽</strong>
          <p>Это доступная база, которую можно распределять между целями и резервом.</p>
        </div>
      </section>

      <section className="budget-grid">
        {goals.map((goal) => {
          const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
          const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

          return (
            <section className="panel goal-card" key={goal.id}>
              <div className="panel-heading">
                <div>
                  <h3>{goal.title}</h3>
                  <p>Дедлайн: {new Date(goal.deadline).toLocaleDateString('ru-RU')}</p>
                </div>
                <button
                  type="button"
                  className="icon-action icon-action--danger"
                  aria-label={`Удалить цель ${goal.title}`}
                  onClick={() => removeGoal(goal.id)}
                  title="Удалить цель"
                >
                  🗑
                </button>
              </div>

              <div className="form-grid">
                <label>
                  Название цели
                  <input value={goal.title} onChange={(event) => updateGoal(goal.id, 'title', event.target.value)} />
                </label>
                <label>
                  Дата цели
                  <input type="date" value={goal.deadline} onChange={(event) => updateGoal(goal.id, 'deadline', event.target.value)} />
                </label>
                <label>
                  Целевая сумма
                  <input
                    type="number"
                    min="0"
                    value={goal.targetAmount}
                    onChange={(event) => updateGoal(goal.id, 'targetAmount', event.target.value)}
                  />
                </label>
                <label>
                  Уже накоплено
                  <input
                    type="number"
                    min="0"
                    value={goal.currentAmount}
                    onChange={(event) => updateGoal(goal.id, 'currentAmount', event.target.value)}
                  />
                </label>
              </div>

              <div className="progress-card">
                <div className="progress-meta">
                  <span>Прогресс</span>
                  <strong>{Math.min(progress, 100).toFixed(0)}%</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill progress-fill--accent" style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
                <p>Осталось накопить: {remaining.toLocaleString('ru-RU')} ₽</p>
              </div>
            </section>
          );
        })}
      </section>

      <button type="button" className="secondary-button" onClick={addGoal}>
        Добавить новую цель
      </button>
    </div>
  );
}

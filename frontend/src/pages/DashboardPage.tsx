import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DonutChartCard } from '../components/DonutChartCard';
import { StatsCard } from '../components/StatsCard';
import { TransactionList } from '../components/TransactionList';
import { api, DashboardSummary } from '../services/api';

const SETTINGS_KEY = 'fintrack_dashboard_settings';
const LEGACY_SETTINGS_KEY = 'financeflow_dashboard_settings';

interface DashboardSettings {
  monthlyBudget: number;
  savingsGoal: number;
}

const defaultSettings: DashboardSettings = {
  monthlyBudget: 60000,
  savingsGoal: 150000
};

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatMonthLabel(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric'
  });
}

export function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<DashboardSettings>(() => {
    const raw = localStorage.getItem(SETTINGS_KEY) ?? localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (!raw) {
      return defaultSettings;
    }

    try {
      const parsed = { ...defaultSettings, ...(JSON.parse(raw) as Partial<DashboardSettings>) };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
      localStorage.removeItem(LEGACY_SETTINGS_KEY);
      return parsed;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    api
      .getSummary(selectedMonth)
      .then((data) => {
        setSummary(data);
        setError(null);
      })
      .catch((fetchError: Error) => setError(fetchError.message));
  }, [selectedMonth]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    localStorage.removeItem(LEGACY_SETTINGS_KEY);
  }, [settings]);

  const categoryMax = useMemo(() => {
    if (!summary || summary.categories.length === 0) {
      return 1;
    }

    return Math.max(...summary.categories.map((category) => category.total), 1);
  }, [summary]);

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  if (!summary) {
    return <div className="panel">Загрузка данных дашборда...</div>;
  }

  const monthLabel = formatMonthLabel(summary.periodMonth);
  const monthlyBudgetLeft = settings.monthlyBudget - summary.totalExpense;
  const budgetUsage = settings.monthlyBudget
    ? Math.min(100, (summary.totalExpense / settings.monthlyBudget) * 100)
    : 0;
  const savingsProgress = settings.savingsGoal
    ? Math.min(100, (Math.max(summary.overallBalance, 0) / settings.savingsGoal) * 100)
    : 0;
  const savingsRate = summary.totalIncome
    ? ((summary.totalIncome - summary.totalExpense) / summary.totalIncome) * 100
    : 0;
  const largestCategory = summary.categories[0];
  const healthTone =
    summary.balance >= 0 && savingsRate >= 20
      ? 'stable'
      : summary.balance >= 0
        ? 'focus'
        : 'risk';
  const healthLabel =
    healthTone === 'stable'
      ? 'Финансовая ситуация стабильна'
      : healthTone === 'focus'
        ? 'Есть запас, но расходам нужен контроль'
        : 'Расходы превышают безопасный уровень';
  const insights = [
    `Норма накоплений за месяц: ${savingsRate.toFixed(1)}% от дохода.`,
    largestCategory
      ? `Крупнейшая статья месяца: ${largestCategory.name} на ${largestCategory.total.toLocaleString('ru-RU')} ₽.`
      : 'После первых операций появится аналитика по категориям.',
    monthlyBudgetLeft >= 0
      ? `До месячного лимита осталось ${monthlyBudgetLeft.toLocaleString('ru-RU')} ₽.`
      : `Лимит превышен на ${Math.abs(monthlyBudgetLeft).toLocaleString('ru-RU')} ₽.`
  ];

  function handleSettingChange(
    key: keyof DashboardSettings,
    event: ChangeEvent<HTMLInputElement>
  ) {
    setSettings((prev) => ({
      ...prev,
      [key]: Number(event.target.value) || 0
    }));
  }

  return (
    <div className="page-grid">
      <section className="hero-banner panel">
        <div className="hero-banner__content">
          <span className="eyebrow">Сводка по бюджету</span>
          <h2>Доходы, расходы и текущая картина по выбранному месяцу</h2>
          <p>
            Выберите месяц, чтобы посмотреть баланс периода, структуру категорий и последние
            операции без перехода в другие разделы.
          </p>

          <div className="month-filter">
            <label>
              Период анализа
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="hero-highlight">
          <span>Состояние бюджета</span>
          <strong>{healthLabel}</strong>
          <p>
            Здесь собрана краткая оценка по доходам, расходам и общему балансу за {monthLabel}.
            Если подключен кошелёк, его состояние тоже учитывается в общей сводке.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <StatsCard
          title="Общий баланс"
          value={`${summary.overallBalance.toLocaleString('ru-RU')} ₽`}
          accent="slate"
        />
        <StatsCard
          title={`Доходы за ${monthLabel}`}
          value={`${summary.totalIncome.toLocaleString('ru-RU')} ₽`}
          accent="emerald"
        />
        <StatsCard
          title={`Расходы за ${monthLabel}`}
          value={`${summary.totalExpense.toLocaleString('ru-RU')} ₽`}
          accent="rose"
        />
      </section>

      {summary.walletBalance !== null ? (
        <section className="stats-grid">
          <StatsCard
            title="Основной счет кошелька"
            value={`${summary.mainAccountBalance.toLocaleString('ru-RU')} ₽`}
            accent="slate"
          />
          <StatsCard
            title="Сумма всех счетов кошелька"
            value={`${summary.walletBalance.toLocaleString('ru-RU')} ₽`}
            accent="emerald"
          />
        </section>
      ) : null}

      <section className="panel quick-actions-panel">
        <div className="panel-heading">
          <h3>Быстрые переходы</h3>
          <p>Откройте нужный раздел одним нажатием, если хотите сразу перейти к полной истории операций.</p>
        </div>

        <div className="quick-actions-grid">
          <Link to="/transactions" className="quick-action-card">
            <span className="eyebrow">Журнал</span>
            <strong>Все операции</strong>
            <p>Полная история с фильтрами по типу, категории, месяцу и диапазону дат.</p>
          </Link>
        </div>
      </section>

      <section className="chart-grid">
        <DonutChartCard
          title="Структура доходов"
          monthLabel={monthLabel}
          total={summary.totalIncome}
          accent="income"
          categories={summary.incomeCategories}
        />
        <DonutChartCard
          title="Структура расходов"
          monthLabel={monthLabel}
          total={summary.totalExpense}
          accent="expense"
          categories={summary.expenseCategories}
        />
      </section>

      <section className="insight-grid">
        <div className={`panel health-panel health-panel--${healthTone}`}>
          <div className="panel-heading">
            <h3>Индекс устойчивости</h3>
            <p>Сводный показатель на основе месячного баланса, накоплений и расходной нагрузки.</p>
          </div>

          <div className="health-score">
            <strong>{Math.max(0, Math.min(100, Math.round(50 + savingsRate + summary.balance / 5000)))}</strong>
            <span>из 100</span>
          </div>

          <div className="insight-list">
            {insights.map((item) => (
              <div className="insight-item" key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="panel planner-panel">
          <div className="panel-heading">
            <h3>План на месяц</h3>
            <p>Лимиты и цели сравниваются с фактическими расходами за выбранный период.</p>
          </div>

          <div className="planner-grid">
            <label>
              Лимит расходов на месяц
              <input
                type="number"
                min="0"
                value={settings.monthlyBudget}
                onChange={(event) => handleSettingChange('monthlyBudget', event)}
              />
            </label>

            <label>
              Цель накоплений
              <input
                type="number"
                min="0"
                value={settings.savingsGoal}
                onChange={(event) => handleSettingChange('savingsGoal', event)}
              />
            </label>
          </div>

          <div className="progress-card">
            <div className="progress-meta">
              <span>Использование бюджета</span>
              <strong>{budgetUsage.toFixed(0)}%</strong>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${budgetUsage}%` }} />
            </div>
            <p>
              {monthlyBudgetLeft >= 0 ? 'Остаток' : 'Перерасход'}:{' '}
              {Math.abs(monthlyBudgetLeft).toLocaleString('ru-RU')} ₽
            </p>
          </div>

          <div className="progress-card">
            <div className="progress-meta">
              <span>Прогресс по цели</span>
              <strong>{savingsProgress.toFixed(0)}%</strong>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill progress-fill--accent"
                style={{ width: `${savingsProgress}%` }}
              />
            </div>
            <p>
              Общий положительный баланс: {Math.max(summary.overallBalance, 0).toLocaleString('ru-RU')} ₽
            </p>
          </div>
        </div>
      </section>

      <section className="dashboard-columns">
        <div className="panel">
          <div className="panel-heading">
            <h3>Категории периода</h3>
            <p>Какие категории сильнее всего влияют на бюджет в выбранном месяце.</p>
          </div>

          <div className="category-list">
            {summary.categories.length === 0 ? (
              <div className="empty-state">За выбранный месяц пока нет операций.</div>
            ) : (
              summary.categories.map((category) => (
                <div className="category-item category-item--rich" key={category.name}>
                  <div className="category-item__header">
                    <span>{category.name}</span>
                    <strong>{category.total.toLocaleString('ru-RU')} ₽</strong>
                  </div>
                  <div className="category-bar">
                    <div
                      className="category-bar__fill"
                      style={{ width: `${(category.total / categoryMax) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <TransactionList
          transactions={summary.recentTransactions}
          title="Последние операции месяца"
          description="Свежие изменения за выбранный период анализа."
        />
      </section>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { api, ForecastSummary, TransactionItem } from '../services/api';

type AnalyticsRange = 'week' | 'month' | 'year';

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatBucketLabel(date: Date, range: AnalyticsRange) {
  if (range === 'year') {
    return date.toLocaleDateString('ru-RU', { month: 'short' });
  }

  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: range === 'month' ? 'short' : undefined
  });
}

function buildRangeBuckets(range: AnalyticsRange) {
  const today = startOfToday();

  if (range === 'week') {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return {
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString('ru-RU', { weekday: 'short' }),
        date
      };
    });
  }

  if (range === 'month') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(firstDay);
      date.setDate(firstDay.getDate() + index);
      return {
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString('ru-RU', { day: '2-digit' }),
        date
      };
    });
  }

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(today.getFullYear(), index, 1);
    return {
      key: `${date.getFullYear()}-${String(index + 1).padStart(2, '0')}`,
      label: formatBucketLabel(date, 'year'),
      date
    };
  });
}

export function AnalyticsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [forecast, setForecast] = useState<ForecastSummary | null>(null);
  const [range, setRange] = useState<AnalyticsRange>('month');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getTransactions(), api.getForecast()])
      .then(([loadedTransactions, loadedForecast]) => {
        setTransactions(loadedTransactions);
        setForecast(loadedForecast);
      })
      .catch((fetchError: Error) => setError(fetchError.message));
  }, []);

  const buckets = useMemo(() => buildRangeBuckets(range), [range]);

  const analytics = useMemo(() => {
    const byBucket = buckets.map((bucket) => ({
      ...bucket,
      income: 0,
      expense: 0,
      balanceFlow: 0
    }));

    const bucketIndex = new Map(byBucket.map((bucket, index) => [bucket.key, index]));

    for (const transaction of transactions) {
      const date = new Date(transaction.transactionDate);
      const key =
        range === 'year' ? date.toISOString().slice(0, 7) : date.toISOString().slice(0, 10);
      const index = bucketIndex.get(key);

      if (index === undefined) {
        continue;
      }

      const amount = Number(transaction.amount);
      if (transaction.type === 'income') {
        byBucket[index].income += amount;
        byBucket[index].balanceFlow += amount;
      } else {
        byBucket[index].expense += amount;
        byBucket[index].balanceFlow -= amount;
      }
    }

    let runningBalance = 0;
    const computedLinePoints = byBucket.map((bucket) => {
      runningBalance += bucket.balanceFlow;
      return {
        ...bucket,
        runningBalance
      };
    });

    const activeLinePoints =
      range === 'year'
        ? computedLinePoints
        : computedLinePoints.filter((point) => point.income !== 0 || point.expense !== 0);

    const linePoints = activeLinePoints.length
      ? activeLinePoints
      : computedLinePoints.slice(-Math.min(computedLinePoints.length, range === 'week' ? 7 : 1));

    const topCategories = Object.entries(
      transactions.reduce<Record<string, number>>((acc, transaction) => {
        const date = new Date(transaction.transactionDate);
        const isInRange =
          range === 'year'
            ? date.getFullYear() === startOfToday().getFullYear()
            : range === 'month'
              ? date.getFullYear() === startOfToday().getFullYear() &&
                date.getMonth() === startOfToday().getMonth()
              : date >= new Date(startOfToday().getTime() - 6 * 24 * 60 * 60 * 1000);

        if (transaction.type === 'expense' && isInRange) {
          acc[transaction.category] = (acc[transaction.category] ?? 0) + Number(transaction.amount);
        }

        return acc;
      }, {})
    )
      .map(([name, total]) => ({ name, total }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 5);

    const monthlyComparison = Array.from({ length: 6 }, (_, offset) => {
      const base = new Date();
      base.setMonth(base.getMonth() - (5 - offset));
      const key = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;

      const monthTransactions = transactions.filter(
        (transaction) => transaction.transactionDate.slice(0, 7) === key
      );

      return {
        month: base.toLocaleDateString('ru-RU', { month: 'short' }),
        income: monthTransactions
          .filter((transaction) => transaction.type === 'income')
          .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
        expense: monthTransactions
          .filter((transaction) => transaction.type === 'expense')
          .reduce((sum, transaction) => sum + Number(transaction.amount), 0)
      };
    });

    return {
      linePoints,
      topCategories,
      monthlyComparison,
      totalIncome: linePoints.reduce((sum, item) => sum + item.income, 0),
      totalExpense: linePoints.reduce((sum, item) => sum + item.expense, 0)
    };
  }, [buckets, range, transactions]);

  const maxExpense = Math.max(...analytics.linePoints.map((item) => item.expense), 1);
  const lineValues = analytics.linePoints.map((item) => item.runningBalance);
  const rawMinLine = Math.min(...lineValues, 0);
  const rawMaxLine = Math.max(...lineValues, 0);
  const linePadding = Math.max((rawMaxLine - rawMinLine) * 0.12, Math.max(Math.abs(rawMaxLine), Math.abs(rawMinLine)) * 0.05, 1);
  const minLine = rawMinLine - linePadding;
  const maxLine = rawMaxLine + linePadding;
  const linePath = analytics.linePoints
    .map((point, index) => {
      const x = analytics.linePoints.length === 1 ? 0 : (index / (analytics.linePoints.length - 1)) * 100;
      const y = maxLine === minLine ? 50 : 100 - ((point.runningBalance - minLine) / (maxLine - minLine)) * 100;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  return (
    <div className="page-grid">
      <section className="hero-banner panel">
        <div className="hero-banner__content">
          <span className="eyebrow">Аналитика</span>
          <h2>Полноценная финансовая аналитика по периодам</h2>
          <p>
            Здесь собраны режимы `Неделя`, `Месяц` и `Год`, динамика баланса, столбчатая диаграмма
            расходов, сравнение нескольких месяцев и прогноз на следующий период.
          </p>

          <div className="range-switch">
            {([
              ['week', 'Нед'],
              ['month', 'Мес'],
              ['year', 'Год']
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={range === value ? 'range-switch__button active' : 'range-switch__button'}
                onClick={() => setRange(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="hero-highlight hero-highlight--stable">
          <span>Ключевой вывод периода</span>
          <strong>
            {(analytics.totalIncome - analytics.totalExpense).toLocaleString('ru-RU')} ₽
          </strong>
          <p>Чистый результат выбранного периода: доходы минус расходы.</p>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stats-card stats-card--emerald">
          <span>Доходы периода</span>
          <strong>{analytics.totalIncome.toLocaleString('ru-RU')} ₽</strong>
        </div>
        <div className="stats-card stats-card--rose">
          <span>Расходы периода</span>
          <strong>{analytics.totalExpense.toLocaleString('ru-RU')} ₽</strong>
        </div>
        <div className="stats-card stats-card--slate">
          <span>Прогноз на следующий месяц</span>
          <strong>{forecast ? forecast.forecastBalance.toLocaleString('ru-RU') : 0} ₽</strong>
        </div>
      </section>

      <section className="dashboard-columns">
        <div className="panel">
          <div className="panel-heading">
            <h3>Линейный график изменения баланса</h3>
            <p>Кумулятивная динамика финансового результата внутри выбранного периода.</p>
          </div>

          <div className="line-chart">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="line-chart__svg">
              <path d={linePath} className="line-chart__path" />
              {analytics.linePoints.map((point, index) => {
                const x = analytics.linePoints.length === 1 ? 50 : (index / (analytics.linePoints.length - 1)) * 100;
                const y = maxLine === minLine ? 50 : 100 - ((point.runningBalance - minLine) / (maxLine - minLine)) * 100;
                return <circle key={point.key} cx={x} cy={y} r="1.6" className="line-chart__dot" />;
              })}
            </svg>
            <div className="line-chart__labels">
              {analytics.linePoints.map((point) => (
                <span key={point.key}>{point.label}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h3>Столбчатая диаграмма расходов</h3>
            <p>Распределение расходной нагрузки по выбранным дням или месяцам.</p>
          </div>

          <div className="bar-chart">
            {analytics.linePoints.map((point) => (
              <div className="bar-chart__item" key={point.key}>
                <div
                  className="bar-chart__bar"
                  style={{ height: `${(point.expense / maxExpense) * 100}%` }}
                />
                <span>{point.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-columns">
        <div className="panel">
          <div className="panel-heading">
            <h3>Сравнение доходов и расходов за 6 месяцев</h3>
            <p>Сравнительная картина поведения бюджета по последним месяцам.</p>
          </div>

          <div className="comparison-list">
            {analytics.monthlyComparison.map((item) => (
              <div className="comparison-row" key={item.month}>
                <strong>{item.month}</strong>
                <span>Доходы: {item.income.toLocaleString('ru-RU')} ₽</span>
                <span>Расходы: {item.expense.toLocaleString('ru-RU')} ₽</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h3>Топ категорий за период</h3>
            <p>Категории, которые сильнее всего формируют расходную структуру.</p>
          </div>

          <div className="category-list">
            {analytics.topCategories.length ? (
              analytics.topCategories.map((category) => (
                <div className="category-item category-item--rich" key={category.name}>
                  <div className="category-item__header">
                    <span>{category.name}</span>
                    <strong>{category.total.toLocaleString('ru-RU')} ₽</strong>
                  </div>
                  <div className="category-bar">
                    <div
                      className="category-bar__fill"
                      style={{ width: `${(category.total / analytics.topCategories[0].total) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">Недостаточно операций для аналитики категорий.</div>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Прогноз на следующий месяц</h3>
          <p>Графическое сравнение текущего состояния и ожидаемого следующего шага бюджета.</p>
        </div>

        <div className="forecast-compare">
          <div className="forecast-compare__item">
            <span>Текущий баланс</span>
            <strong>{forecast ? forecast.currentBalance.toLocaleString('ru-RU') : 0} ₽</strong>
          </div>
          <div className="forecast-compare__item">
            <span>Прогнозный баланс</span>
            <strong>{forecast ? forecast.forecastBalance.toLocaleString('ru-RU') : 0} ₽</strong>
          </div>
          <div className="forecast-compare__item">
            <span>Безопасный лимит</span>
            <strong>{forecast ? forecast.safeSpendLimit.toLocaleString('ru-RU') : 0} ₽</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

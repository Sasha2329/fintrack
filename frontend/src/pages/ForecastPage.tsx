import { useEffect, useMemo, useState } from 'react';
import { StatsCard } from '../components/StatsCard';
import { api, ForecastSummary } from '../services/api';

function formatMonthLabel(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric'
  });
}

export function ForecastPage() {
  const [forecast, setForecast] = useState<ForecastSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getForecast()
      .then(setForecast)
      .catch((fetchError: Error) => setError(fetchError.message));
  }, []);

  const trendTone = useMemo(() => {
    if (!forecast) {
      return 'focus';
    }

    if (forecast.forecastBalance >= forecast.currentBalance && forecast.healthScore >= 65) {
      return 'stable';
    }

    if (forecast.forecastBalance >= 0) {
      return 'focus';
    }

    return 'risk';
  }, [forecast]);

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  if (!forecast) {
    return <div className="panel">Загрузка прогноза...</div>;
  }

  const monthLabel = formatMonthLabel(forecast.currentMonth);
  const delta = forecast.forecastBalance - forecast.currentBalance;

  return (
    <div className="page-grid">
      <section className="hero-banner panel">
        <div className="hero-banner__content">
          <span className="eyebrow">Прогнозирование</span>
          <h2>Оценка будущего баланса и безопасного расхода</h2>
          <p>
            Прогноз строится по истории последних месяцев и текущему темпу доходов и расходов.
            Он помогает понять, сколько можно тратить и какой остаток ожидается дальше.
          </p>
        </div>

        <div className={`hero-highlight hero-highlight--${trendTone}`}>
          <span>Прогноз на следующий месяц</span>
          <strong>{forecast.forecastBalance.toLocaleString('ru-RU')} ₽</strong>
          <p>
            {delta >= 0 ? 'Ожидается рост баланса' : 'Ожидается снижение баланса'} на{' '}
            {Math.abs(delta).toLocaleString('ru-RU')} ₽ относительно текущего значения.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <StatsCard
          title="Текущий баланс"
          value={`${forecast.currentBalance.toLocaleString('ru-RU')} ₽`}
          accent="slate"
        />
        <StatsCard
          title="Прогноз доходов"
          value={`${forecast.forecastIncome.toLocaleString('ru-RU')} ₽`}
          accent="emerald"
        />
        <StatsCard
          title="Прогноз расходов"
          value={`${forecast.forecastExpense.toLocaleString('ru-RU')} ₽`}
          accent="rose"
        />
      </section>

      <section className="insight-grid">
        <div className={`panel health-panel health-panel--${trendTone}`}>
          <div className="panel-heading">
            <h3>Индекс прогноза</h3>
            <p>Сводная оценка устойчивости бюджета на основе истории последних месяцев.</p>
          </div>

          <div className="health-score">
            <strong>{forecast.healthScore}</strong>
            <span>из 100</span>
          </div>

          <div className="insight-list">
            {forecast.recommendations.map((item) => (
              <div className="insight-item" key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="panel planner-panel">
          <div className="panel-heading">
            <h3>Что стоит оставить в бюджете</h3>
            <p>
              Практические ориентиры на основе прогноза за {monthLabel} и последних месяцев.
            </p>
          </div>

          <div className="forecast-grid">
            <div className="forecast-tile">
              <span>Средний доход</span>
              <strong>{forecast.averageIncome.toLocaleString('ru-RU')} ₽</strong>
            </div>
            <div className="forecast-tile">
              <span>Средний расход</span>
              <strong>{forecast.averageExpense.toLocaleString('ru-RU')} ₽</strong>
            </div>
            <div className="forecast-tile">
              <span>Безопасный лимит трат</span>
              <strong>{forecast.safeSpendLimit.toLocaleString('ru-RU')} ₽</strong>
            </div>
            <div className="forecast-tile">
              <span>Рекомендуемый резерв</span>
              <strong>{forecast.reserveTarget.toLocaleString('ru-RU')} ₽</strong>
            </div>
          </div>

          <div className="progress-card">
            <div className="progress-meta">
              <span>Покрытие расходов доходами</span>
              <strong>
                {forecast.forecastIncome > 0
                  ? `${Math.min(999, Math.round((forecast.forecastExpense / forecast.forecastIncome) * 100))}%`
                  : '0%'}
              </strong>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(
                    100,
                    forecast.forecastIncome > 0
                      ? (forecast.forecastExpense / forecast.forecastIncome) * 100
                      : 0
                  )}%`
                }}
              />
            </div>
            <p>
              Чем ниже процент, тем больше у бюджета остается пространства для накоплений и
              безопасных трат.
            </p>
          </div>
        </div>
      </section>

      <section className="dashboard-columns">
        <div className="panel">
          <div className="panel-heading">
            <h3>Категории риска</h3>
            <p>Категории расходов, которые сильнее всего влияют на прогноз.</p>
          </div>

          <div className="category-list">
            {forecast.topExpenseCategories.length === 0 ? (
              <div className="empty-state">Недостаточно истории, чтобы выделить категории риска.</div>
            ) : (
              forecast.topExpenseCategories.map((category) => (
                <div className="category-item category-item--rich" key={category.name}>
                  <div className="category-item__header">
                    <span>{category.name}</span>
                    <strong>{category.total.toLocaleString('ru-RU')} ₽</strong>
                  </div>
                  <div className="category-bar">
                    <div
                      className="category-bar__fill"
                      style={{
                        width: `${(category.total / forecast.topExpenseCategories[0].total) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h3>Логика прогноза</h3>
            <p>Как система рассчитывает возможный баланс на будущее.</p>
          </div>

          <div className="insight-list">
            <div className="insight-item">
              Анализируются последние месяцы активности пользователя.
            </div>
            <div className="insight-item">
              Вычисляются средние доходы и расходы за историю наблюдений.
            </div>
            <div className="insight-item">
              Учитывается текущий темп расходов и доходов в активном месяце.
            </div>
            <div className="insight-item">
              Формируются рекомендации: безопасный лимит трат и резерв на следующий месяц.
            </div>
          </div>

          <div className="forecast-months">
            {forecast.monthsAnalyzed.map((month) => (
              <span className="forecast-month-tag" key={month}>
                {formatMonthLabel(month)}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}


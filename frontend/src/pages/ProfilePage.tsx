import { useEffect, useState } from 'react';
import { api, DashboardSummary } from '../services/api';
import { getStoredSession } from '../services/auth';

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
}

export function ProfilePage() {
  const session = getStoredSession();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfileSummary() {
      try {
        const data = await api.getSummary(currentMonthKey());
        setSummary(data);
      } catch (profileError) {
        const message =
          profileError instanceof Error ? profileError.message : 'Не удалось загрузить профиль';
        setError(message);
      }
    }

    void loadProfileSummary();
  }, []);

  return (
    <div className="profile-page">
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="hero-banner profile-hero">
        <div className="hero-content">
          <span className="eyebrow">Личный кабинет</span>
          <h2>Мой профиль</h2>
          <p>
            Здесь собрана краткая информация о пользователе и текущем состоянии финансов
            в системе «Финтрек».
          </p>
        </div>

        <div className="hero-highlight profile-hero__card">
          <span>Активный аккаунт</span>
          <strong>{session?.user.fullName ?? 'Пользователь'}</strong>
          <p>{session?.user.email ?? 'email не найден'}</p>
        </div>
      </section>

      <div className="stats-grid">
        <article className="stats-card">
          <span>ФИО</span>
          <strong>{session?.user.fullName ?? 'Не указано'}</strong>
        </article>

        <article className="stats-card stats-card--muted">
          <span>Электронная почта</span>
          <strong>{session?.user.email ?? 'Не указано'}</strong>
        </article>

        <article className="stats-card stats-card--accent">
          <span>Общий баланс</span>
          <strong>{summary ? formatCurrency(summary.overallBalance) : 'Загрузка...'}</strong>
        </article>
      </div>

      <section className="panel profile-summary-panel">
        <div className="panel-heading">
          <h3>Краткая сводка</h3>
        </div>

        <div className="profile-summary-grid">
          <div className="profile-summary-item">
            <span>Доходы за месяц</span>
            <strong>{summary ? formatCurrency(summary.totalIncome) : '—'}</strong>
          </div>
          <div className="profile-summary-item">
            <span>Расходы за месяц</span>
            <strong>{summary ? formatCurrency(summary.totalExpense) : '—'}</strong>
          </div>
          <div className="profile-summary-item">
            <span>Текущий период</span>
            <strong>{summary?.periodMonth ?? currentMonthKey()}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
